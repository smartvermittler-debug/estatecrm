"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PROPERTY_TYPES = ["Wohnung", "Haus", "Villa", "Büro", "Gewerbe", "Grundstück"];
const AUSTRIAN_CITIES = ["Wien", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Wels", "St. Pölten", "Dornbirn", "Villach"];
const CONDITIONS = ["Neuwertig", "Sehr gut", "Gepflegt", "Renovierungsbedürftig", "Sanierungsbedürftig"];
const ENERGY_CLASSES = ["A++", "A+", "A", "B", "C", "D", "E", "F", "G"];
const FEATURES_LIST = ["Balkon", "Terrasse", "Garten", "Garage", "Stellplatz", "Keller", "Lift", "Klimaanlage", "Fußbodenheizung", "Smart Home", "Pool", "Barrierefrei", "Dachterrasse", "Loggia"];

interface Valuation {
  market_value: number;
  value_range_low: number;
  value_range_high: number;
  price_per_sqm: number;
  confidence: string;
  confidence_percentage: number;
  methodology: string;
  market_trend: string;
  trend_percentage: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  recommended_asking_price: number;
  recommended_minimum_price: number;
  time_to_sell_estimate: string;
  rental_potential_monthly: number;
  gross_rental_yield: number;
  analysis_text: string;
  comparable_analysis: string;
  location_score: number;
  location_analysis: string;
  recommendations: string[];
  valid_until: string;
}

export default function ValuationPage() {
  const [form, setForm] = useState({
    address: "",
    city: "Wien",
    postal_code: "",
    property_type: "Wohnung",
    area_sqm: "",
    rooms: "",
    floor: "",
    year_built: "",
    condition: "Gepflegt",
    energy_class: "",
    features: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [error, setError] = useState("");

  function toggleFeature(f: string) {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
    }));
  }

  async function runValuation() {
    if (!form.address || !form.area_sqm) return;
    setLoading(true);
    setError("");
    setValuation(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-valuation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ...form,
            area_sqm: Number(form.area_sqm),
            rooms: Number(form.rooms) || undefined,
            floor: Number(form.floor) || undefined,
            year_built: Number(form.year_built) || undefined,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setValuation(data.valuation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const trendColor = valuation?.market_trend === "steigend" ? "text-green-400" : valuation?.market_trend === "fallend" ? "text-red-400" : "text-zinc-400";
  const trendIcon = valuation?.market_trend === "steigend" ? "↑" : valuation?.market_trend === "fallend" ? "↓" : "→";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-white">Automatische Bewertung</h1>
        <p className="text-zinc-400 mt-1 text-sm">KI-Marktwertschätzung nach österreichischem Standard · 5 Credits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <h2 className="font-medium text-white">Objektdaten</h2>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Adresse *</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Mariahilfer Str. 1"
                className="input-dark w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Stadt</label>
                <select
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="input-dark w-full"
                >
                  {AUSTRIAN_CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">PLZ</label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))}
                  placeholder="1060"
                  className="input-dark w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Objekttyp</label>
              <select
                value={form.property_type}
                onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}
                className="input-dark w-full"
              >
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Fläche (m²) *</label>
                <input
                  type="number"
                  value={form.area_sqm}
                  onChange={e => setForm(p => ({ ...p, area_sqm: e.target.value }))}
                  placeholder="85"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Zimmer</label>
                <input
                  type="number"
                  value={form.rooms}
                  onChange={e => setForm(p => ({ ...p, rooms: e.target.value }))}
                  placeholder="3"
                  className="input-dark w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Stockwerk</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                  placeholder="3"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Baujahr</label>
                <input
                  type="number"
                  value={form.year_built}
                  onChange={e => setForm(p => ({ ...p, year_built: e.target.value }))}
                  placeholder="1990"
                  className="input-dark w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Zustand</label>
                <select
                  value={form.condition}
                  onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                  className="input-dark w-full"
                >
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Energieklasse</label>
                <select
                  value={form.energy_class}
                  onChange={e => setForm(p => ({ ...p, energy_class: e.target.value }))}
                  className="input-dark w-full"
                >
                  <option value="">–</option>
                  {ENERGY_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Ausstattung</label>
              <div className="flex flex-wrap gap-2">
                {FEATURES_LIST.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFeature(f)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      form.features.includes(f)
                        ? "border-gold-500 bg-gold-500/10 text-gold-400"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={runValuation}
            disabled={!form.address || !form.area_sqm || loading}
            className="w-full btn-gold py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Bewertung läuft...
              </>
            ) : (
              <>🏠 Bewertung starten (5 Credits)</>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {!valuation && !loading && (
            <div className="card flex flex-col items-center justify-center py-32 text-center">
              <div className="text-5xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-white mb-2">Marktwertschätzung</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                Füllen Sie das Formular aus und erhalten Sie eine KI-gestützte Bewertung nach österreichischem Standard.
              </p>
            </div>
          )}

          {loading && (
            <div className="card flex flex-col items-center justify-center py-32">
              <div className="w-16 h-16 border-4 border-zinc-800 border-t-gold-500 rounded-full animate-spin mb-4" />
              <p className="text-zinc-400">KI analysiert Marktdaten...</p>
              <p className="text-zinc-600 text-xs mt-1">Vergleichswert- und Sachwertverfahren</p>
            </div>
          )}

          {valuation && (
            <div className="space-y-4">
              {/* Main value card */}
              <div className="card bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/30">
                <div className="text-center py-4">
                  <p className="text-zinc-400 text-sm mb-1">Marktwert</p>
                  <p className="text-4xl font-display font-semibold text-white">
                    €{valuation.market_value.toLocaleString("de-AT")}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    Bandbreite: €{valuation.value_range_low.toLocaleString("de-AT")} – €{valuation.value_range_high.toLocaleString("de-AT")}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <span className="text-xs text-zinc-400">€{valuation.price_per_sqm.toLocaleString("de-AT")}/m²</span>
                    <span className={`text-xs font-medium ${trendColor}`}>{trendIcon} {valuation.market_trend} ({valuation.trend_percentage}%)</span>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                  <p className="text-xs text-zinc-500 mb-1">Empfohlener Angebotspreis</p>
                  <p className="text-lg font-semibold text-white">€{valuation.recommended_asking_price.toLocaleString("de-AT")}</p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-zinc-500 mb-1">Verkaufsdauer</p>
                  <p className="text-lg font-semibold text-white">{valuation.time_to_sell_estimate}</p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-zinc-500 mb-1">Mietpotenzial</p>
                  <p className="text-lg font-semibold text-white">€{valuation.rental_potential_monthly?.toLocaleString("de-AT")}/Mo.</p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-zinc-500 mb-1">Brutto-Rendite</p>
                  <p className="text-lg font-semibold text-white">{valuation.gross_rental_yield}%</p>
                </div>
              </div>

              {/* Confidence + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <p className="text-xs text-zinc-500 mb-2">Bewertungssicherheit</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gold-500"
                        style={{ width: `${valuation.confidence_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white">{valuation.confidence_percentage}%</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{valuation.confidence} · {valuation.methodology}</p>
                </div>
                <div className="card">
                  <p className="text-xs text-zinc-500 mb-2">Lage-Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(valuation.location_score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white">{valuation.location_score}/10</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{valuation.location_analysis?.split(".")[0]}</p>
                </div>
              </div>

              {/* SWOT */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Stärken</h3>
                  <ul className="space-y-1">
                    {valuation.strengths?.map((s, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-green-500">+</span>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Schwächen</h3>
                  <ul className="space-y-1">
                    {valuation.weaknesses?.map((s, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-red-500">−</span>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Chancen</h3>
                  <ul className="space-y-1">
                    {valuation.opportunities?.map((s, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-blue-500">↑</span>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Risiken</h3>
                  <ul className="space-y-1">
                    {valuation.risks?.map((s, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-amber-500">!</span>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Analysis */}
              <div className="card">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Bewertungsanalyse</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{valuation.analysis_text}</p>
              </div>

              {/* Recommendations */}
              <div className="card">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Handlungsempfehlungen</h3>
                <ul className="space-y-2">
                  {valuation.recommendations?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-gold-400 mt-0.5">→</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-zinc-600 text-xs text-center">
                Bewertung gültig bis: {valuation.valid_until} · Alle Angaben ohne Gewähr · Irrtümer vorbehalten
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
