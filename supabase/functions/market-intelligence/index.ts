import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { city, district, property_type, area_m2, rooms, transaction_type, listing_id } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht autorisiert");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Nicht autorisiert");

    const { data: ok } = await supabase.rpc("use_credits", {
      p_user_id: user.id, p_amount: 15,
      p_feature: "market_intelligence",
      p_description: `Marktanalyse: ${city} ${district || ""}`,
    });
    if (!ok) return new Response(JSON.stringify({ error: "Nicht genug Credits" }), { status: 402, headers: CORS });

    // Interne Marktdaten abrufen
    const { data: internal } = await supabase
      .from("market_transactions")
      .select("price, price_per_m2, area_m2, rooms, transaction_date, condition")
      .eq("city", city)
      .eq("property_type", property_type)
      .eq("transaction_type", transaction_type)
      .gte("transaction_date", new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0])
      .order("transaction_date", { ascending: false })
      .limit(20);

    // ImmoUnited API (wenn verfügbar)
    let immoUnitedData = null;
    const immoKey = Deno.env.get("IMMO_UNITED_API_KEY");
    if (immoKey) {
      try {
        const cacheKey = `${city}_${district}_${property_type}_${transaction_type}`;
        const { data: cached } = await supabase
          .from("immo_united_cache")
          .select("data")
          .eq("query_hash", cacheKey)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (cached) {
          immoUnitedData = cached.data;
        } else {
          const iuRes = await fetch(
            `https://api.immounited.com/v1/transactions?city=${city}&district=${district}&type=${property_type}`,
            { headers: { "Authorization": `Bearer ${immoKey}` } }
          );
          if (iuRes.ok) {
            immoUnitedData = await iuRes.json();
            await supabase.from("immo_united_cache").upsert({
              query_hash: cacheKey, city, district, property_type,
              data: immoUnitedData,
              expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn("ImmoUnited nicht verfügbar:", e);
      }
    }

    // KI-Analyse
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const internalStr = (internal || []).length > 0
      ? `Interne Transaktionen:\n${(internal || []).slice(0, 10).map((t: any) =>
          `- €${t.price?.toLocaleString("de-AT")}, ${t.area_m2}m², €${t.price_per_m2}/m², ${t.transaction_date}`
        ).join("\n")}`
      : "Keine internen Daten verfügbar.";

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `Du bist ein österreichischer Immobiliensachverständiger. Analysiere Marktdaten präzise. Antworte NUR mit JSON.`,
        messages: [{
          role: "user",
          content: `Erstelle eine Marktanalyse für:
Standort: ${city}${district ? `, ${district}` : ""}
Objektart: ${property_type}
Transaktion: ${transaction_type === "sale" ? "Verkauf" : "Miete"}
Fläche: ${area_m2}m²
Zimmer: ${rooms || "k.A."}

${internalStr}
${immoUnitedData ? `\nImmoUnited-Daten:\n${JSON.stringify(immoUnitedData).substring(0, 1000)}` : ""}

Antworte mit:
{
  "price_min": 0,
  "price_max": 0,
  "price_median": 0,
  "price_per_m2_avg": 0,
  "fair_price": 0,
  "comparable_count": 0,
  "market_trend": "steigend|stabil|fallend",
  "trend_pct": 0,
  "ai_analysis": "3-4 Sätze Markteinschätzung auf Österreichisch",
  "comparables": [
    {"beschreibung": "Vergleichsobjekt", "preis": 0, "flaeche": 0, "datum": "2025-01"}
  ],
  "verhandlungsspielraum": "Wie viel Prozent sind verhandelbar?",
  "empfehlungen": ["Empfehlung für den Makler"]
}`
        }],
      }),
    });

    const aiData = await aiRes.json();
    const analysis = JSON.parse(aiData.content[0]?.text?.replace(/```json|```/g, "").trim() || "{}");

    // Bericht speichern
    const { data: report } = await supabase.from("market_reports").insert({
      user_id: user.id, listing_id: listing_id || null,
      city, district, property_type, area_m2,
      price_min: analysis.price_min,
      price_max: analysis.price_max,
      price_median: analysis.price_median,
      price_per_m2_avg: analysis.price_per_m2_avg,
      comparable_count: analysis.comparable_count,
      market_trend: analysis.market_trend,
      trend_pct: analysis.trend_pct,
      fair_price: analysis.fair_price,
      ai_analysis: analysis.ai_analysis,
      comparables: analysis.comparables,
      data_sources: immoUnitedData ? ["internal", "immo_united"] : ["internal"],
    }).select("id").single();

    return new Response(JSON.stringify({ success: true, report_id: report?.id, analysis }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
