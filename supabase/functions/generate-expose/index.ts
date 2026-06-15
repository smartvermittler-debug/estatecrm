import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { listing_id, style = "premium", include_floor_plan = false } = await req.json();

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

    // Check credits (expose costs 3 credits)
    const { data: credits } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.balance < 3) {
      return new Response(JSON.stringify({ error: "Nicht genug Credits" }), {
        status: 402,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const [{ data: listing }, { data: profile }] = await Promise.all([
      supabase.from("listings").select("*").eq("id", listing_id).eq("user_id", user.id).single(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    if (!listing) throw new Error("Immobilie nicht gefunden");

    const styleGuide = {
      premium: "Exklusiv, elegant, betont Einzigartigkeit und Prestige",
      family: "Warm, einladend, betont Wohnkomfort und Lebensqualität für Familien",
      investment: "Sachlich, renditeorientiert, betont Ertragspotenzial und Lage",
      modern: "Zeitgemäß, dynamisch, betont Design und Ausstattung",
    }[style] || styleGuide.premium;

    const prompt = `Du bist ein Experte für österreichische Immobilienexposés. 
Erstelle ein professionelles, verkaufswirksames Exposé auf Österreichisches Hochdeutsch.

IMMOBILIE:
- Titel: ${listing.title}
- Typ: ${listing.property_type}
- Adresse: ${listing.address}, ${listing.city} ${listing.postal_code}
- Preis: €${listing.price?.toLocaleString("de-AT")}
- Fläche: ${listing.area_sqm} m²
- Zimmer: ${listing.rooms}
- Stockwerk: ${listing.floor || "Erdgeschoss"}
- Baujahr: ${listing.year_built || "nicht angegeben"}
- Beschreibung: ${listing.description}
- Ausstattung: ${listing.features ? listing.features.join(", ") : "Standard"}
- Energieklasse: ${listing.energy_class || "nicht angegeben"}
- Betriebskosten: €${listing.monthly_costs || 0}/Monat
- Provision: ${listing.commission_rate || 3}% zzgl. MwSt.

MAKLER:
- Name: ${profile?.full_name || "Ihr Makler"}
- Unternehmen: ${profile?.company_name || ""}
- GISA: ${profile?.gisa_number || ""}

STIL: ${styleGuide}
${include_floor_plan ? "Erwähne, dass ein Grundriss auf Anfrage erhältlich ist." : ""}

Antworte NUR mit folgendem JSON (kein Markdown):
{
  "headline": "Schlagzeile (max 10 Wörter, wirkungsvoll)",
  "tagline": "Untertitel (max 20 Wörter)",
  "lage": "Lagenbeschreibung (2-3 Absätze, Micro- und Makrolage, Infrastruktur, Verkehr)",
  "objekt": "Objektbeschreibung (3-4 Absätze, Raumaufteilung, Ausstattung, Besonderheiten)",
  "highlights": ["highlight1", "highlight2", "highlight3", "highlight4", "highlight5"],
  "investment_info": "Investmentaspekte (1 Absatz, Mietpotenzial, Wertsteigerung)",
  "rechtliches": "Rechtliche Hinweise (Provision, MwSt., Irrtümer vorbehalten, DSGVO)",
  "seo_description": "Kurzbeschreibung für Portale wie Willhaben (max 300 Zeichen)",
  "kontakt_cta": "Call-to-Action für Besichtigungsanfrage"
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
    const expose = JSON.parse(raw);

    // Save to documents table and deduct credits
    const [{ data: doc }] = await Promise.all([
      supabase.from("documents").insert({
        user_id: user.id,
        listing_id,
        name: `Exposé – ${listing.title}`,
        document_type: "expose",
        content: JSON.stringify(expose),
        ai_summary: expose.tagline,
        status: "active",
      }).select().single(),
      supabase.rpc("use_credits", {
        p_user_id: user.id,
        p_amount: 3,
        p_action: "generate_expose",
        p_description: `Exposé erstellt: ${listing.title}`,
      }),
    ]);

    return new Response(JSON.stringify({ expose, document_id: doc?.id }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
