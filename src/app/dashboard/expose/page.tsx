"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Listing {
  id: string;
  title: string;
  city: string;
  price: number;
  area_sqm: number;
  property_type: string;
}

interface Expose {
  headline: string;
  tagline: string;
  lage: string;
  objekt: string;
  highlights: string[];
  investment_info: string;
  rechtliches: string;
  seo_description: string;
  kontakt_cta: string;
}

const STYLES = [
  { value: "premium", label: "Premium", desc: "Exklusiv & Prestige", icon: "👑" },
  { value: "family", label: "Familie", desc: "Warm & Einladend", icon: "🏡" },
  { value: "investment", label: "Investment", desc: "Rendite-fokussiert", icon: "📈" },
  { value: "modern", label: "Modern", desc: "Zeitgemäß & Design", icon: "✨" },
];

export default function ExposePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState("");
  const [style, setStyle] = useState("premium");
  const [includeFloorPlan, setIncludeFloorPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expose, setExpose] = useState<Expose | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  useEffect(() => {
    fetchListings();
    fetchHistory();
  }, []);

  async function fetchListings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("listings")
      .select("id, title, city, price, area_sqm, property_type")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setListings(data || []);
  }

  async function fetchHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .eq("document_type", "expose")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(data || []);
  }

  async function generateExpose() {
    if (!selectedListing) return;
    setLoading(true);
    setError("");
    setExpose(null);
    setSaved(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-expose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            listing_id: selectedListing,
            style,
            include_floor_plan: includeFloorPlan,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExpose(data.expose);
      setSaved(true);
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copySection(text: string) {
    navigator.clipboard.writeText(text);
  }

  function copyAll() {
    if (!expose) return;
    const full = `${expose.headline}\n${expose.tagline}\n\nLAGE\n${expose.lage}\n\nOBJEKT\n${expose.objekt}\n\nHIGHLIGHTS\n${expose.highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nINVESTMENT\n${expose.investment_info}\n\nRECHTLICHES\n${expose.rechtliches}\n\n---\n${expose.kontakt_cta}`;
    navigator.clipboard.writeText(full);
  }

  const selectedListingData = listings.find(l => l.id === selectedListing);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">Exposé-Generator</h1>
          <p className="text-zinc-400 mt-1 text-sm">KI-generierte Verkaufsexposés in Sekunden · 3 Credits</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "generate" ? "bg-gold-500 text-black" : "text-zinc-400 hover:text-white"}`}
          >
            Erstellen
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "history" ? "bg-gold-500 text-black" : "text-zinc-400 hover:text-white"}`}
          >
            Verlauf ({history.length})
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        <div className="grid gap-4">
          {history.length === 0 ? (
            <div className="card text-center py-16 text-zinc-500">
              <div className="text-4xl mb-3">📄</div>
              <p>Noch keine Exposés erstellt</p>
            </div>
          ) : (
            history.map(doc => {
              const content = doc.content ? JSON.parse(doc.content) : null;
              return (
                <div key={doc.id} className="card hover:border-gold-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{doc.name}</h3>
                      {content?.tagline && <p className="text-zinc-400 text-sm mt-1">{content.tagline}</p>}
                      <p className="text-zinc-600 text-xs mt-2">{new Date(doc.created_at).toLocaleDateString("de-AT")}</p>
                    </div>
                    <button
                      onClick={() => { setExpose(content); setActiveTab("generate"); }}
                      className="text-gold-400 text-sm hover:text-gold-300"
                    >
                      Anzeigen →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Panel */}
          <div className="space-y-4">
            <div className="card space-y-4">
              <h2 className="font-medium text-white">Immobilie auswählen</h2>

              {listings.length === 0 ? (
                <p className="text-zinc-500 text-sm">Keine aktiven Inserate vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {listings.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedListing(l.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedListing === l.id
                          ? "border-gold-500 bg-gold-500/10"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-medium text-white truncate">{l.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {l.city} · {l.area_sqm} m² · €{l.price?.toLocaleString("de-AT")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card space-y-4">
              <h2 className="font-medium text-white">Stil</h2>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      style === s.value
                        ? "border-gold-500 bg-gold-500/10"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-xl">{s.icon}</div>
                    <div className="text-sm font-medium text-white mt-1">{s.label}</div>
                    <div className="text-xs text-zinc-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFloorPlan}
                  onChange={e => setIncludeFloorPlan(e.target.checked)}
                  className="w-4 h-4 accent-yellow-500"
                />
                <div>
                  <div className="text-sm font-medium text-white">Grundriss erwähnen</div>
                  <div className="text-xs text-zinc-500">Auf Anfrage erhältlich</div>
                </div>
              </label>
            </div>

            <button
              onClick={generateExpose}
              disabled={!selectedListing || loading}
              className="w-full btn-gold py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Generiere Exposé...
                </>
              ) : (
                <>✨ Exposé erstellen (3 Credits)</>
              )}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Expose Output */}
          <div className="lg:col-span-2 space-y-4">
            {!expose && !loading && (
              <div className="card flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-white mb-2">Exposé-Generator</h3>
                <p className="text-zinc-500 text-sm max-w-xs">
                  Wählen Sie eine Immobilie und einen Stil, und lassen Sie die KI ein professionelles Exposé erstellen.
                </p>
              </div>
            )}

            {loading && (
              <div className="card flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-gold-500 rounded-full animate-spin mb-4" />
                <p className="text-zinc-400">KI erstellt Ihr Exposé...</p>
                <p className="text-zinc-600 text-xs mt-1">Das dauert ca. 10-15 Sekunden</p>
              </div>
            )}

            {expose && (
              <div className="space-y-4">
                {/* Actions bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        ✓ Gespeichert
                      </span>
                    )}
                  </div>
                  <button onClick={copyAll} className="btn-gold text-sm px-4 py-2">
                    📋 Alles kopieren
                  </button>
                </div>

                {/* Headline */}
                <div className="card border-gold-500/30 bg-gradient-to-br from-gold-500/5 to-transparent">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-display font-semibold text-white leading-tight">{expose.headline}</h2>
                      <p className="text-gold-400 mt-1">{expose.tagline}</p>
                    </div>
                    <button onClick={() => copySection(`${expose.headline}\n${expose.tagline}`)} className="text-zinc-500 hover:text-zinc-300 text-xs flex-shrink-0">
                      kopieren
                    </button>
                  </div>
                </div>

                {/* Highlights */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Highlights</h3>
                    <button onClick={() => copySection(expose.highlights.join("\n"))} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {expose.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-gold-400 mt-0.5">✦</span>
                        <span className="text-zinc-300">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lage */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Lage</h3>
                    <button onClick={() => copySection(expose.lage)} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{expose.lage}</p>
                </div>

                {/* Objekt */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Objektbeschreibung</h3>
                    <button onClick={() => copySection(expose.objekt)} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{expose.objekt}</p>
                </div>

                {/* Investment */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Investment</h3>
                    <button onClick={() => copySection(expose.investment_info)} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">{expose.investment_info}</p>
                </div>

                {/* SEO */}
                <div className="card border-zinc-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Willhaben / Portal-Text</h3>
                    <button onClick={() => copySection(expose.seo_description)} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <p className="text-zinc-400 text-sm">{expose.seo_description}</p>
                  <p className="text-zinc-600 text-xs mt-2">{expose.seo_description.length} / 300 Zeichen</p>
                </div>

                {/* CTA + Legal */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Call-to-Action</h3>
                    <button onClick={() => copySection(expose.kontakt_cta)} className="text-zinc-500 hover:text-zinc-300 text-xs">kopieren</button>
                  </div>
                  <p className="text-gold-400 text-sm font-medium">{expose.kontakt_cta}</p>
                </div>

                <div className="card bg-zinc-900/50">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Rechtliche Hinweise</h3>
                  <p className="text-zinc-600 text-xs leading-relaxed">{expose.rechtliches}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
