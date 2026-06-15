import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { client_id, listing_id, intent, tone } = await req.json();

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

    // Fetch all context in parallel
    const [
      { data: client },
      { data: listing },
      { data: agentStyle },
      { data: agentProfile },
      { data: clientMemory },
      { data: previousEmails },
    ] = await Promise.all([
      supabase.from("clients").select("*").eq("id", client_id).single(),
      listing_id
        ? supabase.from("listings").select("*").eq("id", listing_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("agent_style").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("agent_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("client_memory").select("*").eq("client_id", client_id).maybeSingle(),
      supabase.from("email_campaigns")
        .select("subject, body, sent_at, opened, replied")
        .eq("user_id", user.id)
        .eq("client_id", client_id)
        .order("sent_at", { ascending: false })
        .limit(3),
    ]);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Build rich context
    const systemPrompt = `Du bist der persönliche KI-Assistent von ${agentStyle?.greeting_style?.replace('{name}', '') || 'dem Makler'}.

Du schreibst E-Mails in seinem/ihrem persönlichen Stil:
- Durchschnittliche Länge: ${agentStyle?.avg_email_length || 100} Wörter
- Ton: ${agentStyle?.tone || 'professionell aber persönlich'}
- Begrüßung: ${agentStyle?.greeting_style || 'Hallo {name},'}
- Abschluss: ${agentStyle?.closing_style || 'Beste Grüße'}
- Typische Phrasen: ${(agentStyle?.common_phrases || []).join(', ')}

Die E-Mail soll authentisch klingen — wie vom Makler persönlich geschrieben, NICHT wie KI.
Antworte NUR mit JSON.`;

    const userPrompt = `Schreibe eine E-Mail an diesen Kunden:

KUNDE:
- Name: ${client?.full_name}
- Typ: ${client?.client_type}
- Stadt: ${client?.city || 'nicht angegeben'}
- Budget: ${client?.budget_max ? `bis €${client.budget_max.toLocaleString('de-AT')}` : 'nicht angegeben'}
- Zimmer: ${client?.rooms_min ? `ab ${client.rooms_min}` : 'nicht angegeben'}
- Wärme-Status: ${client?.heat_status || 'kalt'}
${clientMemory?.conversation_summary ? `- Gesprächshistorie: ${clientMemory.conversation_summary}` : ''}
${clientMemory?.buying_signals?.intent_score ? `- Kaufabsicht-Score: ${clientMemory.buying_signals.intent_score}%` : ''}

${listing ? `OBJEKT:
- Titel: ${listing.title || listing.property_type}
- Typ: ${listing.property_type}
- Stadt: ${listing.city}
- Preis: €${listing.price?.toLocaleString('de-AT')}
- Fläche: ${listing.area_m2}m²
- Zimmer: ${listing.rooms}` : ''}

ZWECK: ${intent || 'Nachfassen'}
TON: ${tone || 'professionell und persönlich'}

${previousEmails?.length ? `LETZTE E-MAILS (zur Vermeidung von Wiederholungen):
${previousEmails.map((e: any) => `- "${e.subject}" (${e.opened ? 'geöffnet' : 'nicht geöffnet'})`).join('\n')}` : ''}

Antworte mit:
{
  "subject": "Betreff der E-Mail",
  "body": "Vollständiger E-Mail-Text",
  "tone_used": "warm|professional|direct|formal",
  "personalization_notes": "Was wurde personalisiert?"
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const raw = aiData.content[0]?.text || "{}";
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Save to email campaigns as draft
    const { data: draft } = await supabase.from("email_campaigns").insert({
      user_id: user.id,
      client_id,
      listing_id: listing_id || null,
      subject: result.subject,
      body: result.body,
      tone: result.tone_used,
      status: "draft",
    }).select("id").single();

    // Deduct credits
    await supabase.rpc("deduct_credits", { p_user_id: user.id, p_amount: 5 });

    // Log interaction for learning
    await supabase.from("client_interactions").insert({
      client_id,
      user_id: user.id,
      interaction_type: "email_draft_created",
      details: { subject: result.subject, tone: result.tone_used },
    });

    return new Response(JSON.stringify({ ...result, draft_id: draft?.id }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
