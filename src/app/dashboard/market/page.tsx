"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp, Brain, Loader2, MapPin, Euro, Building,
  BarChart3, Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, AUSTRIAN_CITIES, PROPERTY_TYPES } from "@/lib/utils";

const WIEN_DISTRICTS = [
  "1010 Innere Stadt","1020 Leopoldstadt","1030 Landstraße","1040 Wieden",
  "1050 Margareten","1060 Mariahilf","1070 Neubau","1080 Josefstadt",
  "1090 Alsergrund","1100 Favoriten","1120 Meidling","1130 Hietzing",
  "1140 Penzing","1150 Rudolfsheim-Fünfhaus","1160 Ottakring",
  "1170 Hernals","1180 Währing","1190 Döbling","1200 Brigittenau",
  "1210 Floridsdorf","1220 Donaustadt","1230 Liesing",
];

export default function MarketPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [city, setCity] = useState("Wien");
  const [district, setDistrict] = useState("");
  const [propType, setPropType] = useState("Wohnung");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("market_reports").select("*").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(10);
    setReports(data || []);
  }

  async function analyze() {
    setLoading(true);
    setResult(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prompt = `Als österreichischer Immobilienmarktexperte: Erstelle eine detaillierte Marktanalyse für:
Objekttyp: ${propType} (${area ? `ca. ${area}m²` : "alle Größen"})
Standort: ${city}${district ? `, ${district}` : ""}
Transaktion: Kauf und Miete

Antworte NUR mit einem JSON-Objekt:
{
  "price_min": <Kaufpreis min €>,
  "price_max": <Kaufpreis max €>,
  "price_median": <Kaufpreis median €>,
  "price_per_m2_avg": <€/m² Durchschnitt>,
  "rent_per_m2": <Miete €/m²>,
  "market_trend": "steigend" | "stabil" | "fallend",
  "trend_pct": <Prozent Veränderung ggü. Vorjahr>,
  "fair_price": <Faire Bewertung für ${area || 75}m² €>,
  "comparable_count": <geschätzte Vergleichsobjekte>,
  "ai_analysis": "<3-4 Sätze Marktanalyse auf Österreichisch>",
  "top_neighborhoods": ["<Bezirk 1>", "<Bezirk 2>", "<Bezirk 3>"],
  "demand_level": "sehr hoch" | "hoch" | "mittel" | "niedrig"
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await res.json();
    try {
      const text = d.content?.[0]?.text?.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setResult(parsed);
      await supabase.from("market_reports").insert({
        user_id: user.id,
        city,
        district: district || null,
        property_type: propType,
        area_m2: area ? Number(area) : null,
        price_min: parsed.price_min,
        price_max: parsed.price_max,
        price_median: parsed.price_median,
        price_per_m2_avg: parsed.price_per_m2_avg,
        comparable_count: parsed.comparable_count,
        market_trend: parsed.market_trend,
        trend_pct: parsed.trend_pct,
        fair_price: parsed.fair_price,
        ai_analysis: parsed.ai_analysis,
      });
      loadReports();
    } catch { setResult({ error: "Fehler bei der Analyse." }); }
    setLoading(false);
  }

  const trendColor = result?.market_trend === "steigend" ? "text-green-400" :
    result?.market_trend === "fallend" ? "text-red-400" : "text-[#888]";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Marktanalyse</h1>
        <p className="text-[#666] text-sm mt-0.5">KI-basierte Preisanalyse für den österreichischen Immobilienmarkt</p>
      </div>

      {/* Analysis form */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="w-4 h-4 text-[#c9a84c]" />
          <span className="text-sm font-medium">Marktanalyse erstellen</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Stadt</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
              {AUSTRIAN_CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Bezirk (optional)</label>
            {city === "Wien" ? (
              <select value={district} onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                <option value="">Alle Bezirke</option>
                {WIEN_DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            ) : (
              <input value={district} onChange={(e) => setDistrict(e.target.value)}
                placeholder="Stadtteil..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50" />
            )}
          </div>
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Objekttyp</label>
            <select value={propType} onChange={(e) => setPropType(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
              {PROPERTY_TYPES.slice(0, 5).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Fläche (m²)</label>
            <input type="number" value={area} onChange={(e) => setArea(e.target.value)}
              placeholder="75"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50" />
          </div>
        </div>
        <button onClick={analyze} disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-5 py-2.5 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all disabled:opacity-60">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysiere...</> : <><Search className="w-4 h-4" />Marktanalyse starten</>}
        </button>
      </div>

      {/* Result */}
      {result && !result.error && (
        <div className="bg-[#111] border border-[#c9a84c]/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {propType} · {city}{district ? `, ${district}` : ""}
            </h2>
            <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
              {result?.market_trend === "steigend" ? "↑" : result?.market_trend === "fallend" ? "↓" : "→"}
              {result.market_trend} ({result.trend_pct > 0 ? "+" : ""}{result.trend_pct}%)
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Kaufpreis Ø", value: formatCurrency(result.price_median) },
              { label: "€/m² Ø", value: `€ ${result.price_per_m2_avg?.toLocaleString("de-AT")}` },
              { label: "Miete €/m²", value: `€ ${result.rent_per_m2}/m²` },
              { label: "Faire Bewertung", value: formatCurrency(result.fair_price), highlight: true },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl border ${item.highlight ? "bg-[#c9a84c]/5 border-[#c9a84c]/20" : "bg-[#1a1a1a] border-[#222]"}`}>
                <div className="text-xs text-[#666] mb-1">{item.label}</div>
                <div className={`font-display text-lg font-semibold ${item.highlight ? "text-[#c9a84c]" : "text-[#f5f5f5]"}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-xl">
              <div className="text-xs text-[#666] mb-2">Preisspanne</div>
              <div className="text-sm text-[#ccc]">
                {formatCurrency(result.price_min)} – {formatCurrency(result.price_max)}
              </div>
              <div className="text-xs text-[#555] mt-1">{result.comparable_count} Vergleichsobjekte</div>
            </div>
            <div className="p-4 bg-[#1a1a1a] border border-[#222] rounded-xl">
              <div className="text-xs text-[#666] mb-2">Nachfrageintensität</div>
              <div className={`text-sm font-medium ${
                result.demand_level === "sehr hoch" ? "text-red-400" :
                result.demand_level === "hoch" ? "text-amber-400" :
                result.demand_level === "mittel" ? "text-blue-400" : "text-[#888]"
              }`}>{result.demand_level}</div>
            </div>
          </div>

          {result.ai_analysis && (
            <div className="p-4 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-xs text-[#c9a84c] font-medium">KI-Markteinschätzung</span>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed">{result.ai_analysis}</p>
            </div>
          )}

          {result.top_neighborhoods && (
            <div>
              <div className="text-xs text-[#666] mb-2">Empfohlene Lagen</div>
              <div className="flex flex-wrap gap-2">
                {result.top_neighborhoods.map((n: string) => (
                  <span key={n} className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#888]">
                    <MapPin className="w-3 h-3" />{n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past reports */}
      {reports.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#888] mb-3">Frühere Analysen</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/25 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#c9a84c]">{r.property_type}</span>
                  <span className={`text-[10px] ${r.market_trend === "steigend" ? "text-green-400" : r.market_trend === "fallend" ? "text-red-400" : "text-[#888]"}`}>
                    {r.market_trend}
                  </span>
                </div>
                <div className="text-sm font-medium text-[#f5f5f5]">{r.city}{r.district ? `, ${r.district}` : ""}</div>
                {r.price_per_m2_avg && <div className="text-xs text-[#666] mt-1">Ø €{r.price_per_m2_avg.toLocaleString("de-AT")}/m²</div>}
                <div className="text-[10px] text-[#444] mt-2">
                  {new Date(r.generated_at).toLocaleDateString("de-AT")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
