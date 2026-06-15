import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Can be called per-client or for all clients
    const { client_id } = await req.json().catch(() => ({}));

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

    // Check credits (matching costs 2 credits per client)
    const { data: credits } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.balance < 2) {
      return new Response(JSON.stringify({ error: "Nicht genug Credits" }), {
        status: 402,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch clients and listings in parallel
    const [{ data: clients }, { data: listings }] = await Promise.all([
      client_id
        ? supabase.from("clients").select("*").eq("id", client_id).eq("user_id", user.id)
        : supabase.from("clients").select("*").eq("user_id", user.id).in("heat_score", ["hot", "warm"]).limit(20),
      supabase.from("listings").select("*").eq("user_id", user.id).eq("status", "active").limit(50),
    ]);

    if (!clients?.length) throw new Error("Keine Kunden gefunden");
    if (!listings?.length) {
      return new Response(JSON.stringify({ matches: [], message: "Keine aktiven Inserate verfügbar" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const listingsSummary = listings.map(l => ({
      id: l.id,
      title: l.title,
      type: l.property_type,
      city: l.city,
      price: l.price,
      area: l.area_sqm,
      rooms: l.rooms,
      features: l.features,
    }));

    const allMatches = [];

    // Process clients in batches to avoid token limits
    for (const client of clients) {
      const prompt = `Du bist ein österreichischer Immobilienmakler-Assistent. 
Analysiere welche Immobilien am besten zu diesem Kunden passen.

KUNDE:
- Name: ${client.name}
- Budget: €${client.budget_min?.toLocaleString("de-AT") || "0"} - €${client.budget_max?.toLocaleString("de-AT") || "unbegrenzt"}
- Suchregion: ${client.search_region || "Österreich"}
- Gewünschter Typ: ${client.desired_property_type || "alle"}
- Mindestfläche: ${client.min_area || 0} m²
- Mindest-Zimmer: ${client.min_rooms || 1}
- Wunschfeatures: ${client.desired_features || "keine Angabe"}
- Notizen: ${client.notes || "keine"}
- Heat Score: ${client.heat_score}

VERFÜGBARE IMMOBILIEN (${listings.length} insgesamt):
${JSON.stringify(listingsSummary, null, 2)}

Antworte NUR mit JSON (kein Markdown):
{
  "client_id": "${client.id}",
  "client_name": "${client.name}",
  "matches": [
    {
      "listing_id": "uuid",
      "match_score": 92,
      "match_label": "Sehr gute Übereinstimmung",
      "reasons": ["Grund 1", "Grund 2", "Grund 3"],
      "concerns": ["Möglicher Einwand (optional)"],
      "suggested_message": "Kurztext für erste Kontaktaufnahme (2-3 Sätze auf Österreichisch)"
    }
  ],
  "summary": "Kurze Zusammenfassung der Suche für ${client.name}"
}

Gib maximal 5 passende Immobilien zurück, sortiert nach Übereinstimmung (höchster Score zuerst).
Gib nur Immobilien mit Score >= 60 zurück.`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const aiData = await aiRes.json();
      const raw = aiData.content[0].text.replace(/```json|```/g, "").trim();
      const matchResult = JSON.parse(raw);

      // Enrich matches with full listing data
      const enrichedMatches = matchResult.matches?.map((m: any) => {
        const listing = listings.find(l => l.id === m.listing_id);
        return { ...m, listing };
      }).filter((m: any) => m.listing) || [];

      // Save matches to client_memory
      if (enrichedMatches.length > 0) {
        const topMatch = enrichedMatches[0];
        await supabase.from("client_memory").upsert({
          client_id: client.id,
          user_id: user.id,
          ai_matches: enrichedMatches,
          last_match_at: new Date().toISOString(),
          best_match_score: topMatch.match_score,
        }, { onConflict: "client_id" });
      }

      allMatches.push({ ...matchResult, matches: enrichedMatches });
    }

    // Deduct credits
    await supabase.rpc("use_credits", {
      p_user_id: user.id,
      p_amount: Math.min(clients.length * 2, credits.balance),
      p_action: "match_listings",
      p_description: `Matching für ${clients.length} Kunden`,
    });

    return new Response(JSON.stringify({
      success: true,
      clients_processed: clients.length,
      matches: allMatches,
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
