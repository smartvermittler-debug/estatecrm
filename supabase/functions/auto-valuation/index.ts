import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      listing_id,
      address,
      city,
      postal_code,
      property_type,
      area_sqm,
      rooms,
      floor,
      year_built,
      condition,
      features = [],
      energy_class,
    } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!user) throw new Error("Unauthorized");

    // Check credits (valuation costs 5 credits)
    const { data: credits } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.balance < 5) {
      return new Response(JSON.stringify({ error: "Nicht genug Credits (5 benötigt)" }), {
        status: 402,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch comparable listings from our DB for reference
    const { data: comparables } = await supabase
      .from("listings")
      .select("price, area_sqm, rooms, city, property_type, status")
      .eq("city", city)
      .eq("property_type", property_type)
      .eq("status", "active")
      .not("price", "is", null)
      .limit(10);

    const avgPricePerSqm = comparables && comparables.length > 0
      ? Math.round(comparables.reduce((sum, l) => sum + (l.price / l.area_sqm), 0) / comparables.length)
      : null;

    const prompt = `Du bist ein österreichischer Immobiliensachverständiger mit 20 Jahren Erfahrung.
Erstelle eine professionelle Marktwertschätzung nach österreichischem Standard (ÖNORM B 1802).

OBJEKT:
- Adresse: ${address}, ${postal_code} ${city}
- Typ: ${property_type}
- Fläche: ${area_sqm} m²
- Zimmer: ${rooms}
- Stockwerk: ${floor || "EG"}
- Baujahr: ${year_built || "unbekannt"}
- Zustand: ${condition || "gepflegt"}
- Ausstattung: ${features.join(", ") || "Standard"}
- Energieklasse: ${energy_class || "nicht bekannt"}

MARKTDATEN (interne Vergleichsobjekte):
- Durchschnittlicher Preis/m² in ${city} (${property_type}): ${avgPricePerSqm ? `€${avgPricePerSqm}/m²` : "keine Daten"}
- Anzahl Vergleichsobjekte: ${comparables?.length || 0}

ÖSTERREICHISCHE MARKTKENNTNIS:
- Wien: Innenbezirke €6.000-12.000/m², Außenbezirke €3.500-6.000/m²
- Graz: €3.000-5.500/m², Salzburg: €4.500-8.000/m², Innsbruck: €4.000-7.000/m²
- Linz: €2.500-4.500/m², Klagenfurt: €2.000-3.500/m²
- Grunderwerbsteuer: 3,5% | Maklercourtage: 3% zzgl. 20% MwSt.
- Kaufnebenkosten gesamt: ca. 10-12%

Antworte NUR mit JSON (kein Markdown):
{
  "market_value": 350000,
  "value_range_low": 320000,
  "value_range_high": 380000,
  "price_per_sqm": 3500,
  "confidence": "hoch",
  "confidence_percentage": 78,
  "methodology": "Vergleichswertverfahren kombiniert mit Sachwertverfahren",
  "market_trend": "steigend",
  "trend_percentage": 3.2,
  "strengths": ["Vorteil 1", "Vorteil 2", "Vorteil 3"],
  "weaknesses": ["Nachteil 1", "Nachteil 2"],
  "opportunities": ["Chance 1", "Chance 2"],
  "risks": ["Risiko 1"],
  "recommended_asking_price": 359000,
  "recommended_minimum_price": 315000,
  "time_to_sell_estimate": "3-5 Monate",
  "rental_potential_monthly": 1400,
  "gross_rental_yield": 4.8,
  "analysis_text": "Ausführliche Bewertungsanalyse (3-4 Absätze)",
  "comparable_analysis": "Analyse der Vergleichsobjekte (1-2 Absätze)",
  "location_score": 7.5,
  "location_analysis": "Lageanalyse (1-2 Absätze)",
  "recommendations": ["Empfehlung 1 für Verkauf", "Empfehlung 2"],
  "valid_until": "2025-09-30"
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const raw = aiData.content[0].text.replace(/```json|```/g, "").trim();
    const valuation = JSON.parse(raw);

    // Save valuation to market_reports and deduct credits
    await Promise.all([
      supabase.from("market_reports").insert({
        user_id: user.id,
        listing_id: listing_id || null,
        city,
        district: postal_code,
        property_type,
        area_sqm,
        ai_analysis: valuation.analysis_text,
        price_range_low: valuation.value_range_low,
        price_range_high: valuation.value_range_high,
        avg_price_per_sqm: valuation.price_per_sqm,
        market_trend: valuation.market_trend,
        report_data: valuation,
      }),
      supabase.rpc("use_credits", {
        p_user_id: user.id,
        p_amount: 5,
        p_action: "auto_valuation",
        p_description: `Bewertung: ${address}, ${city}`,
      }),
    ]);

    return new Response(JSON.stringify({ valuation, comparables_count: comparables?.length || 0 }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
