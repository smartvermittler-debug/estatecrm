import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Du bist das KI-Gehirn von EstateFlow AI.
Du analysierst Makler-Daten und triffst intelligente Entscheidungen.
Du kennst den österreichischen Immobilienmarkt sehr gut.
Antworte NUR mit validem JSON — keine Erklärungen, kein Markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  let processed = 0;

  try {
    // Get all active users
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (!users) return new Response(JSON.stringify({ processed: 0 }), { headers: CORS });

    for (const user of users) {
      try {
        await processUser(supabase, apiKey, user);
        processed++;
      } catch (e) {
        console.error(`Error processing user ${user.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, total: users.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

async function processUser(supabase: any, apiKey: string, user: any) {
  const now = new Date();
  const since15min = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const since7days = new Date(now.getTime() - 7 * 86400000).toISOString();
  const since12days = new Date(now.getTime() - 12 * 86400000).toISOString();

  // Gather context
  const [
    { data: recentOpens },
    { data: hotClients },
    { data: newMatches },
    { data: inactiveClients },
    { data: agentStyle },
  ] = await Promise.all([
    // Emails opened in last 15 min
    supabase.from("email_campaigns")
      .select("id, client_id, subject, opened_at")
      .eq("user_id", user.id)
      .eq("opened", true)
      .gte("opened_at", since15min),

    // Hot clients
    supabase.from("clients")
      .select("id, full_name, heat_status, last_contact_date")
      .eq("user_id", user.id)
      .eq("heat_status", "heiss")
      .not("full_name", "ilike", "test %"),

    // New unnotified matches
    supabase.from("listing_matches")
      .select("id, listing_id, client_id, score")
      .eq("user_id", user.id)
      .eq("notified", false)
      .gte("created_at", since15min),

    // Clients with no contact for 12+ days
    supabase.from("clients")
      .select("id, full_name, last_contact_date")
      .eq("user_id", user.id)
      .not("last_contact_date", "is", null)
      .lt("last_contact_date", since12days)
      .not("full_name", "ilike", "test %")
      .limit(3),

    // Agent writing style
    supabase.from("agent_style")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Build context for Claude
  const context = {
    agent: { id: user.id, name: user.full_name },
    events: {
      emails_opened_now: recentOpens?.length || 0,
      hot_clients: hotClients?.length || 0,
      new_matches: newMatches?.length || 0,
      inactive_clients: inactiveClients?.length || 0,
    },
    data: {
      recent_opens: recentOpens?.slice(0, 3),
      new_matches: newMatches?.slice(0, 3),
      inactive: inactiveClients?.slice(0, 3),
    },
    style: agentStyle,
  };

  // Only call Claude if there's something interesting
  const hasEvents = (recentOpens?.length || 0) > 0 ||
    (newMatches?.length || 0) > 0;

  if (!hasEvents) return;

  // Ask Claude what to do
  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Analysiere diese Makler-Situation und entscheide, welche Aktionen nötig sind:

${JSON.stringify(context, null, 2)}

Antworte mit diesem JSON:
{
  "actions": [
    {
      "type": "create_queue_item",
      "priority": 1-10,
      "client_id": "uuid oder null",
      "listing_id": "uuid oder null",
      "signal_type": "new_match|follow_up|urgent_call|birthday",
      "signal_label": "Kurze Beschreibung auf Deutsch",
      "reasoning": "Warum diese Aktion?"
    }
  ],
  "insights": "Eine Beobachtung über den Makler oder seine Kunden"
}

Erstelle nur Aktionen wenn es wirklich wichtig ist. Maximal 3 Aktionen.`,
      }],
    }),
  });

  const aiData = await aiRes.json();
  const raw = aiData.content?.[0]?.text || "{}";

  let decisions: any;
  try {
    decisions = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return;
  }

  // Execute decisions
  for (const action of (decisions.actions || [])) {
    if (action.type === "create_queue_item") {
      await supabase.from("relationship_queue").insert({
        user_id: user.id,
        client_id: action.client_id,
        listing_id: action.listing_id,
        signal_type: action.signal_type,
        signal_label: action.signal_label,
        status: "pending",
        priority: action.priority || 5,
      });
    }
  }

  // Log the decision
  if (decisions.insights) {
    await supabase.from("ai_decisions").insert({
      user_id: user.id,
      decision_type: "brain_tick",
      reasoning: decisions.insights,
      action_taken: JSON.stringify(decisions.actions),
    });
  }

  // Update agent profile with learning
  if (agentStyle && (recentOpens?.length || 0) > 0) {
    await supabase.from("learning_log").insert({
      user_id: user.id,
      event_type: "email_opened",
      event_data: { count: recentOpens?.length, time: new Date().toISOString() },
      what_learned: `${recentOpens?.length} E-Mails um ${new Date().getHours()}:00 Uhr geöffnet`,
    });
  }
}
