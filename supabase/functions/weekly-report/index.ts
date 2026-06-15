import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    // Allow cron invocation with service role
    const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let targetUserId: string | null = null;

    if (!isCron) {
      if (!authHeader) throw new Error("No auth");
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (!user) throw new Error("Unauthorized");
      targetUserId = user.id;
    }

    // Get all active users if cron, or just the requesting user
    const { data: profiles } = targetUserId
      ? await supabase.from("profiles").select("*").eq("id", targetUserId)
      : await supabase.from("profiles").select("*").eq("weekly_report_enabled", true);

    const reports = [];

    for (const profile of profiles || []) {
      const userId = profile.id;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoISO = weekAgo.toISOString();

      // Fetch all data for this user from the past week
      const [
        { data: newClients },
        { data: activeClients },
        { data: newListings },
        { data: activeListings },
        { data: sentEmails },
        { data: openedEmails },
        { data: repliedEmails },
        { data: createdDocs },
        { data: creditsUsed },
        { data: hotLeads },
      ] = await Promise.all([
        supabase.from("clients").select("id, name, heat_score, created_at").eq("user_id", userId).gte("created_at", weekAgoISO),
        supabase.from("clients").select("id, name, heat_score").eq("user_id", userId).in("heat_score", ["hot", "warm"]),
        supabase.from("listings").select("id, title, price, city, status, created_at").eq("user_id", userId).gte("created_at", weekAgoISO),
        supabase.from("listings").select("id, title, price, status").eq("user_id", userId).eq("status", "active"),
        supabase.from("email_campaigns").select("id").eq("user_id", userId).gte("sent_at", weekAgoISO).not("sent_at", "is", null),
        supabase.from("email_campaigns").select("id").eq("user_id", userId).eq("opened", true).gte("updated_at", weekAgoISO),
        supabase.from("email_campaigns").select("id").eq("user_id", userId).eq("replied", true).gte("updated_at", weekAgoISO),
        supabase.from("documents").select("id, name").eq("user_id", userId).gte("created_at", weekAgoISO),
        supabase.from("credit_transactions").select("amount").eq("user_id", userId).gte("created_at", weekAgoISO).lt("amount", 0),
        supabase.from("clients").select("id, name, heat_score, last_contact").eq("user_id", userId).eq("heat_score", "hot").order("last_contact", { ascending: true }).limit(5),
      ]);

      const totalCreditsUsed = creditsUsed?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      const emailOpenRate = sentEmails?.length ? Math.round((openedEmails?.length || 0) / sentEmails.length * 100) : 0;
      const replyRate = sentEmails?.length ? Math.round((repliedEmails?.length || 0) / sentEmails.length * 100) : 0;

      const totalPortfolioValue = activeListings?.reduce((sum, l) => sum + (l.price || 0), 0) || 0;

      const prompt = `Du bist der KI-Assistent von EstateFlow für österreichische Makler.
Erstelle einen persönlichen Wochenbericht für ${profile.full_name || "den Makler"} von ${profile.company_name || "Ihrem Unternehmen"}.

DATEN DER LETZTEN 7 TAGE:
- Neue Kunden: ${newClients?.length || 0} (${newClients?.map(c => c.name).join(", ") || "keine"})
- Aktive heiße/warme Leads: ${activeClients?.length || 0}
- Neue Inserate: ${newListings?.length || 0}
- Aktive Inserate gesamt: ${activeListings?.length || 0}
- Portfoliowert gesamt: €${totalPortfolioValue.toLocaleString("de-AT")}
- Versendete E-Mails: ${sentEmails?.length || 0}
- E-Mail-Öffnungsrate: ${emailOpenRate}%
- Antwortrate: ${replyRate}%
- Erstellte Dokumente: ${createdDocs?.length || 0}
- Verwendete AI-Credits: ${totalCreditsUsed}
- Heiße Leads die Kontakt brauchen: ${hotLeads?.map(c => c.name).join(", ") || "keine"}

Antworte NUR mit JSON (kein Markdown):
{
  "greeting": "Persönliche Begrüßung (1 Satz)",
  "week_summary": "Zusammenfassung der Woche (2-3 Sätze, motivierend)",
  "top_achievement": "Beste Leistung diese Woche",
  "key_metrics": {
    "performance_score": 75,
    "performance_label": "Sehr gut",
    "trend": "steigend"
  },
  "action_items": [
    {"priority": "hoch", "action": "Handlungsempfehlung 1", "reason": "Begründung"},
    {"priority": "mittel", "action": "Handlungsempfehlung 2", "reason": "Begründung"},
    {"priority": "niedrig", "action": "Handlungsempfehlung 3", "reason": "Begründung"}
  ],
  "client_alerts": [
    {"client_name": "Name", "alert": "Benötigt Kontaktaufnahme", "urgency": "hoch"}
  ],
  "market_insight": "Aktueller Markthinweis für österreichische Makler (2-3 Sätze)",
  "ai_tip_of_week": "KI-Tipp der Woche für mehr Effizienz",
  "motivational_quote": "Motivierendes Zitat zum Abschluss (auf Deutsch)",
  "next_week_focus": "Empfohlener Fokus für nächste Woche"
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
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const aiData = await aiRes.json();
      const raw = aiData.content[0].text.replace(/```json|```/g, "").trim();
      const report = JSON.parse(raw);

      // Save report
      await supabase.from("market_reports").insert({
        user_id: userId,
        city: "Österreich",
        district: "Gesamt",
        property_type: "Alle",
        ai_analysis: report.week_summary,
        report_data: {
          type: "weekly_report",
          ...report,
          stats: {
            new_clients: newClients?.length || 0,
            active_hot_leads: activeClients?.length || 0,
            new_listings: newListings?.length || 0,
            active_listings: activeListings?.length || 0,
            portfolio_value: totalPortfolioValue,
            emails_sent: sentEmails?.length || 0,
            email_open_rate: emailOpenRate,
            reply_rate: replyRate,
            credits_used: totalCreditsUsed,
          },
        },
      });

      reports.push({ user_id: userId, report });
    }

    return new Response(JSON.stringify({ success: true, reports_generated: reports.length, reports }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
