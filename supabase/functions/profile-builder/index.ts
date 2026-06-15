import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  try {
    const { data: users } = await supabase.from("profiles").select("id, full_name");

    for (const user of users || []) {
      try {
        await buildAgentProfile(supabase, apiKey, user);
      } catch (e) {
        console.error(`Profile build error for ${user.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ built: users?.length || 0 }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

async function buildAgentProfile(supabase: any, apiKey: string, user: any) {
  const since30days = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: emails },
    { data: clients },
    { data: listings },
    { data: learningLogs },
  ] = await Promise.all([
    supabase.from("email_campaigns")
      .select("subject, body, sent_at, opened, replied, tone")
      .eq("user_id", user.id)
      .not("sent_at", "is", null)
      .gte("sent_at", since30days)
      .limit(20),
    supabase.from("clients")
      .select("created_at, heat_status, last_contact_date")
      .eq("user_id", user.id)
      .not("full_name", "ilike", "test %"),
    supabase.from("listings")
      .select("created_at, property_type, city, price")
      .eq("user_id", user.id)
      .gte("created_at", since30days),
    supabase.from("learning_log")
      .select("event_type, what_learned, applied_at")
      .eq("user_id", user.id)
      .gte("applied_at", since30days)
      .limit(50),
  ]);

  if (!emails?.length && !clients?.length) return;

  // Analyze work patterns
  const workHours = (emails || [])
    .filter((e: any) => e.sent_at)
    .map((e: any) => new Date(e.sent_at).getHours());

  const hourCounts: Record<number, number> = {};
  workHours.forEach((h: number) => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Analyze writing style from sent emails
  const sampleBodies = (emails || [])
    .filter((e: any) => e.body)
    .slice(0, 5)
    .map((e: any) => e.body);

  const avgLength = sampleBodies.length > 0
    ? Math.round(sampleBodies.reduce((sum: number, b: string) => sum + b.split(' ').length, 0) / sampleBodies.length)
    : 80;

  // Performance metrics
  const openRate = emails?.length
    ? Math.round((emails.filter((e: any) => e.opened).length / emails.length) * 100)
    : 0;
  const replyRate = emails?.length
    ? Math.round((emails.filter((e: any) => e.replied).length / emails.length) * 100)
    : 0;

  // Ask Claude to analyze
  const prompt = `Analysiere diesen Immobilienmakler basierend auf seinen Aktivitäten:

Name: ${user.full_name}
Gesendete E-Mails (30 Tage): ${emails?.length || 0}
Öffnungsrate: ${openRate}%
Antwortrate: ${replyRate}%
Neue Kunden (30 Tage): ${clients?.filter((c: any) => new Date(c.created_at) > new Date(Date.now() - 30 * 86400000)).length || 0}
Neue Objekte (30 Tage): ${listings?.length || 0}
Aktivste Stunde: ${peakHour ? `${peakHour}:00 Uhr` : 'unbekannt'}

Beispiel E-Mail-Texte:
${sampleBodies.slice(0, 2).map((b: string) => b.substring(0, 200)).join('\n---\n')}

Lernprotokoll:
${(learningLogs || []).map((l: any) => l.what_learned).join('\n')}

Antworte mit JSON:
{
  "strengths": ["Stärke 1", "Stärke 2"],
  "blind_spots": ["Schwäche 1", "Schwäche 2"],
  "personality_summary": "2-3 Sätze über diesen Makler",
  "writing_style": {
    "tone": "warm|professional|direct|formal",
    "avg_length": ${avgLength},
    "style_notes": "Beschreibung seines Schreibstils"
  },
  "recommendations": ["Empfehlung 1", "Empfehlung 2"]
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
      max_tokens: 800,
      system: "Du bist ein Experte für Makler-Coaching. Analysiere sachlich und konstruktiv. Antworte NUR mit JSON.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const aiData = await aiRes.json();
  const raw = aiData.content?.[0]?.text || "{}";

  let analysis: any;
  try {
    analysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch { return; }

  // Update agent profile
  await supabase.from("agent_profile").upsert({
    user_id: user.id,
    work_patterns: {
      active_hours: workHours,
      peak_hour: peakHour,
      emails_per_month: emails?.length || 0,
    },
    strengths: analysis.strengths || [],
    blind_spots: analysis.blind_spots || [],
    personality_summary: analysis.personality_summary,
    performance: { open_rate: openRate, reply_rate: replyRate },
    updated_at: new Date().toISOString(),
  });

  // Update agent style
  await supabase.from("agent_style").upsert({
    user_id: user.id,
    avg_email_length: avgLength,
    tone: analysis.writing_style?.tone || "professional",
    sample_emails: sampleBodies.slice(0, 3),
    best_send_hours: peakHour ? [parseInt(peakHour)] : [9, 10, 11],
    updated_at: new Date().toISOString(),
  });
}
