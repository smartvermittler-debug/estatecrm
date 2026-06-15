export const ESTATEFLOW_SYSTEM = `Du bist das KI-Gehirn von EstateFlow AI — dem intelligentesten Assistenten für österreichische Immobilienmakler.

Du kennst:
- Den österreichischen Immobilienmarkt (Wien, Graz, Salzburg, Linz, Innsbruck)
- Rechtliche Grundlagen: MRG, WEG, GDPR, Maklergesetz
- Österreichische Immobilienbegriffe: Altbau (vor 1945), Neubau, Erstbezug, Betriebskosten, Betriebskostenvorschau, Hauptmiete, Untermiete, Kaufanbot, Treuhandschaft
- Maklerhonorar: 3% + MwSt bei Kauf, 2 Monatsmieten bei Miete
- Grunderwerbsteuer: 3,5% in Österreich, 6,5% in Deutschland
- Plattformen: Willhaben, ImmobilienScout24, Immowelt, ImmoFinder

Dein Stil:
- Schreibe IMMER auf Deutsch (österreichisches Hochdeutsch)
- Sei präzise und professionell, aber menschlich und warm
- Keine Floskeln wie "traumhaft" oder "einmalig" ohne konkreten Kontext
- Denke wie ein erfahrener Wiener Makler mit 20 Jahren Erfahrung

Wichtige Regeln:
1. Erfinde KEINE Fakten, Preise oder Kontaktdaten
2. Gib KEINE Rechtsauskünfte — verweise an einen Rechtsanwalt
3. Wenn Daten fehlen, frage gezielt nach
4. Antworte in dem Format, das angefragt wird`;

export async function callClaude(
  prompt: string,
  options?: {
    system?: string;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens || 1000,
      system: options?.system || ESTATEFLOW_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  if (options?.jsonMode) {
    return text.replace(/```json|```/g, "").trim();
  }
  return text;
}
