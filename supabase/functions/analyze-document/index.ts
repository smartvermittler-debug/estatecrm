import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COSTS: Record<string, number> = {
  grundbuch: 20, energieausweis: 15, kaufanbot: 25,
  mietvertrag: 25, bauplan: 20, sonstiges: 10,
};

const SYSTEM = `Du bist ein österreichischer Immobilienjurist mit 20 Jahren Erfahrung.
Du analysierst Dokumente auf Österreichisch und erkennst rechtliche Risiken sofort.
Antworte IMMER auf Deutsch und NUR mit validem JSON — kein Markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { document_id, document_type, text_content } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht autorisiert");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Nicht autorisiert");
    const cost = CREDIT_COSTS[document_type] || 10;
    const { data: ok } = await supabase.rpc("use_credits", {
      p_user_id: user.id, p_amount: cost,
      p_feature: `document_${document_type}`,
      p_description: `Dokumentenanalyse: ${document_type}`,
    });
    if (!ok) return new Response(JSON.stringify({ error: "Nicht genug Credits" }), { status: 402, headers: CORS });
    await supabase.from("documents").update({ status: "analyzing" }).eq("id", document_id);
    const prompt = buildPrompt(document_type, text_content);
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);
    const analysis = JSON.parse(aiData.content[0]?.text?.replace(/```json|```/g, "").trim() || "{}");
    const update: any = {
      status: "analyzed", analysis_result: analysis,
      ai_summary: analysis.zusammenfassung,
      ai_warnings: analysis.warnungen || [],
      ai_recommendations: analysis.empfehlungen || [],
      updated_at: new Date().toISOString(),
    };
    if (document_type === "grundbuch") {
      Object.assign(update, { einlagezahl: analysis.einlagezahl, katastralgemeinde: analysis.katastralgemeinde, eigentuemer: analysis.eigentuemer, pfandrechte: analysis.pfandrechte, dienstbarkeiten: analysis.dienstbarkeiten });
    }
    if (document_type === "energieausweis") {
      Object.assign(update, { hwb_value: analysis.hwb_value, energy_class: analysis.energy_class, valid_until: analysis.valid_until, expires_at: analysis.valid_until });
    }
    await supabase.from("documents").update(update).eq("id", document_id);
    return new Response(JSON.stringify({ success: true, analysis }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});

function buildPrompt(type: string, content: string): string {
  const prompts: Record<string, string> = {
    grundbuch: `Analysiere diesen Grundbuchauszug:\n${content}\nJSON: {"einlagezahl":"","katastralgemeinde":"","eigentuemer":[{"name":"","anteil":"","seit":""}],"pfandrechte":[{"glaeubiger":"","betrag":0,"rang":""}],"dienstbarkeiten":[{"art":"","zugunsten":""}],"warnungen":[],"zusammenfassung":"","empfehlungen":[],"risiko_score":1}`,
    energieausweis: `Analysiere diesen Energieausweis:\n${content}\nJSON: {"hwb_value":0,"energy_class":"","fgee_value":0,"valid_until":"","heizung":"","zusammenfassung":"","warnungen":[],"empfehlungen":[]}`,
    kaufanbot: `Analysiere dieses Kaufanbot nach österreichischem Recht:\n${content}\nJSON: {"kaufpreis":0,"zahlungsbedingungen":"","uebergabedatum":"","bedingungen":[],"warnungen":[],"fehlende_klauseln":[],"zusammenfassung":"","empfehlungen":[],"risiko_score":1}`,
    mietvertrag: `Analysiere diesen Mietvertrag nach MRG:\n${content}\nJSON: {"miete_netto":0,"betriebskosten":0,"miete_brutto":0,"mietdauer":"","kaution":0,"mrg_anwendbar":true,"warnungen":[],"unzulaessige_klauseln":[],"zusammenfassung":"","empfehlungen":[],"risiko_score":1}`,
    sonstiges: `Analysiere dieses Immobiliendokument:\n${content}\nJSON: {"dokument_art":"","wichtige_informationen":[],"warnungen":[],"zusammenfassung":"","empfehlungen":[],"risiko_score":1}`,
  };
  return prompts[type] || prompts.sonstiges;
}
