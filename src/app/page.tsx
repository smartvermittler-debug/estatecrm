"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, Building2, Users, Mail, FileText, TrendingUp, Star,
  ArrowRight, Check, ChevronRight, Zap, Shield, Globe, Menu, X,
} from "lucide-react";

const DEMO_MESSAGES = [
  { role: "user", text: "Erstelle ein Expose für Wohnung 85m², Wien 1070, €485.000" },
  { role: "ai", text: "Exklusives Stadtapartment im Herzen Neubaus\n\nDiese charmante 85 m² große Wohnung in der begehrten Lage des 7. Bezirks vereint historischen Wiener Charme mit modernem Wohnkomfort. Das helle Wohnzimmer mit Parkettboden lädt zum Verweilen ein..." },
  { role: "user", text: "Analysiere meinen Kunden: Budget €600k, sucht Penthouse Wien" },
  { role: "ai", text: "Kundenprofil: Hohe Kaufbereitschaft (Heat: 🔥)\n\n3 passende Objekte in Ihrem Portfolio:\n• 1010 Wien, Ringstraße — €590.000 ✓\n• 1030 Wien, Landstraße — €615.000 (verhandelbar)\n• 1090 Wien, Alsergrund — €578.000 ✓\n\nEmpfehlung: Sofortiger Kontakt mit Expose für Ringstraße." },
];

const FEATURES = [
  { icon: Brain, title: "KI-Gehirn", desc: "Lernt Ihren Stil, Ihre Kunden, Ihren Markt. Jede Aktion macht EstateFlow klüger." },
  { icon: Mail, title: "KI-E-Mails", desc: "Professionelle E-Mails in Ihrer Sprache — in 10 Sekunden, nicht 10 Minuten." },
  { icon: FileText, title: "Exposé-Generator", desc: "Verkaufstexte die begeistern. Rechtskonforme Beschreibungen auf Knopfdruck." },
  { icon: TrendingUp, title: "Marktanalyse", desc: "Echtzeitdaten für Wien, Graz, Salzburg. Preisfindung mit KI-Bewertung." },
  { icon: Users, title: "Intelligentes CRM", desc: "Heat-Scoring, automatische Nachverfolgung, Matching — ohne manuelle Arbeit." },
  { icon: Shield, title: "Grundbuch-KI", desc: "Analysiert Grundbuchauszüge und Energieausweise in Sekunden." },
];

const PLANS = [
  { id: "starter", name: "Starter", price: 49, credits: 500, features: ["500 KI-Credits/Monat", "KI-E-Mails", "CRM bis 50 Kunden", "5 Objekte aktiv", "E-Mail Support"] },
  { id: "pro", name: "Profi", price: 99, credits: 3000, features: ["3.000 KI-Credits/Monat", "Exposé-Generator", "KI-Bewertung", "Grundbuch-Analyse", "Marktberichte", "Prioritäts-Support"], popular: true },
  { id: "team", name: "Team", price: 199, credits: 10000, features: ["10.000 KI-Credits/Monat", "Bis 5 Makler", "Gemeinsames Dashboard", "Team-Analytics", "Onboarding-Session"] },
];

const STATS = [
  { value: "2.4h", label: "täglich gespart" },
  { value: "340%", label: "mehr Antworten" },
  { value: "93%", label: "Kundenzufriedenheit" },
  { value: "47s", label: "Ø Exposé-Erstellung" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const msg = DEMO_MESSAGES[messageIdx];
    if (!msg) return;
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const speed = msg.role === "ai" ? 18 : 35;
    const timer = setInterval(() => {
      i++;
      setDisplayedText(msg.text.slice(0, i));
      if (i >= msg.text.length) {
        clearInterval(timer);
        setIsTyping(false);
        setTimeout(() => {
          setMessageIdx((prev) => (prev + 1) % DEMO_MESSAGES.length);
        }, 2200);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [messageIdx]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#222] bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <span className="font-display text-lg font-semibold">EstateFlow <span className="text-[#c9a84c]">AI</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-[#888]">
            <a href="#features" className="hover:text-[#f5f5f5] transition-colors">Funktionen</a>
            <a href="#demo" className="hover:text-[#f5f5f5] transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-[#f5f5f5] transition-colors">Preise</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth" className="text-sm text-[#888] hover:text-[#f5f5f5] transition-colors px-4 py-2">
              Anmelden
            </Link>
            <Link href="/auth?tab=signup" className="btn-gold text-sm px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all">
              14 Tage gratis
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-[#888]">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#111] border-t border-[#222] p-4 flex flex-col gap-3 text-sm">
            <a href="#features" className="text-[#888] hover:text-[#f5f5f5]" onClick={() => setMenuOpen(false)}>Funktionen</a>
            <a href="#demo" className="text-[#888] hover:text-[#f5f5f5]" onClick={() => setMenuOpen(false)}>Demo</a>
            <a href="#pricing" className="text-[#888] hover:text-[#f5f5f5]" onClick={() => setMenuOpen(false)}>Preise</a>
            <Link href="/auth" className="text-[#888] hover:text-[#f5f5f5]">Anmelden</Link>
            <Link href="/auth?tab=signup" className="bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-medium rounded-lg px-4 py-2 text-center">
              14 Tage gratis
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Powered by Claude AI — Österreichisches Markt-Wissen integriert
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] mb-6">
            Der intelligenteste
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#e8c96a]">
              Maklerbetrieb
            </span>
            <br />
            Österreichs
          </h1>

          <p className="text-[#888] text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            EstateFlow AI lernt wie Sie arbeiten, schreibt wie Sie schreiben und denkt wie ein erfahrener Wiener Makler.
            Mehr Abschlüsse. Weniger Verwaltung.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth?tab=signup" className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-xl px-7 py-3.5 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:scale-[1.02] transition-all">
              Kostenlos starten
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#demo" className="flex items-center gap-2 border border-[#333] text-[#888] hover:text-[#f5f5f5] hover:border-[#c9a84c]/40 rounded-xl px-7 py-3.5 transition-all">
              Live Demo ansehen
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <p className="text-[#555] text-sm mt-5">14 Tage gratis · Keine Kreditkarte · Jederzeit kündbar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-4 border border-[#222] rounded-xl bg-[#111]">
              <div className="font-display text-3xl font-semibold text-[#c9a84c]">{s.value}</div>
              <div className="text-[#666] text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="label-sm text-[#c9a84c] mb-3">Live Demo</div>
            <h2 className="font-display text-4xl font-semibold">Sehen Sie die KI in Aktion</h2>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0d0d0d]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[#555] text-xs">EstateFlow AI — Dashboard</span>
            </div>

            <div className="grid md:grid-cols-2">
              {/* Chat side */}
              <div className="p-6 border-r border-[#222]">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-[#0a0a0a]" />
                  </div>
                  <span className="text-sm font-medium">EstateFlow AI</span>
                  <div className="w-2 h-2 rounded-full bg-[#22c55e] ml-auto animate-pulse" />
                </div>

                <div className="space-y-4 min-h-[200px]">
                  {DEMO_MESSAGES.slice(0, messageIdx + 1).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#f5f5f5]"
                          : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc]"
                      }`}>
                        {i === messageIdx ? displayedText : msg.text}
                        {i === messageIdx && isTyping && (
                          <span className="inline-block w-0.5 h-4 bg-[#c9a84c] ml-0.5 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#555]">
                    Schreiben Sie Ihre Anfrage...
                  </div>
                  <button className="w-8 h-8 rounded-lg bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c]">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Features side */}
              <div className="p-6">
                <p className="text-[#666] text-xs uppercase tracking-wider mb-4">Was EstateFlow kann</p>
                <div className="space-y-3">
                  {[
                    "KI-Exposés in 47 Sekunden",
                    "Automatische Kundennachverfolgung",
                    "Marktpreisanalyse Wien/Graz/Salzburg",
                    "Grundbuch & Energieausweis-Analyse",
                    "E-Mail-Generierung in Ihrem Stil",
                    "Automatische Käufer-Objekt-Matches",
                    "Wöchentliche KI-Berichte",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-sm text-[#888]">
                      <div className="w-5 h-5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-[#c9a84c]" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[#0d0d0d] rounded-xl border border-[#1e1e1e]">
                  <p className="text-[#555] text-xs mb-2">Nächste Schritte heute</p>
                  <div className="space-y-2">
                    {["Müller, Peter — Follow-up überfällig", "Listing #A4721 — Expose ausstehend", "3 neue Matches generiert"].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-xs text-[#777]">
                        <div className="w-1 h-1 rounded-full bg-[#c9a84c]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="label-sm text-[#c9a84c] mb-3">Funktionen</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">Alles was ein Makler braucht</h2>
            <p className="text-[#666] max-w-xl mx-auto">Entwickelt für den österreichischen Markt. MRG, WEG, Maklergesetz — alles bekannt.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/30 hover:shadow-[0_0_20px_rgba(201,168,76,0.08)] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mb-4 group-hover:bg-[#c9a84c]/15 transition-colors">
                  <f.icon className="w-5 h-5 text-[#c9a84c]" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="label-sm text-[#c9a84c] mb-3">Preise</div>
            <h2 className="font-display text-4xl font-semibold mb-4">Transparent & Fair</h2>
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm ${!annual ? "text-[#f5f5f5]" : "text-[#666]"}`}>Monatlich</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-[#c9a84c]" : "bg-[#333]"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? "translate-x-7" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm ${annual ? "text-[#f5f5f5]" : "text-[#666]"}`}>
                Jährlich <span className="text-[#c9a84c] text-xs">−20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div key={p.id} className={`relative p-6 rounded-xl border transition-all ${
                p.popular
                  ? "border-[#c9a84c]/50 bg-[#111] shadow-[0_0_30px_rgba(201,168,76,0.1)]"
                  : "border-[#222] bg-[#0d0d0d]"
              }`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] text-xs font-semibold rounded-full">
                    Beliebteste Wahl
                  </div>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <div className="mt-3 mb-5">
                  <span className="font-display text-4xl font-semibold">€{annual ? Math.round(p.price * 0.8) : p.price}</span>
                  <span className="text-[#666] text-sm">/Monat</span>
                </div>
                <div className="text-xs text-[#c9a84c] mb-4">{p.credits.toLocaleString("de-AT")} KI-Credits/Monat</div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#888]">
                      <Check className="w-4 h-4 text-[#c9a84c] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth?tab=signup" className={`block text-center rounded-lg py-2.5 text-sm font-medium transition-all ${
                  p.popular
                    ? "bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]"
                    : "border border-[#333] text-[#888] hover:border-[#c9a84c]/40 hover:text-[#f5f5f5]"
                }`}>
                  14 Tage kostenlos testen
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 bg-[#111] border border-[#c9a84c]/20 rounded-2xl shadow-[0_0_60px_rgba(201,168,76,0.08)]">
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
              Bereit für den smarten<br />Maklerbetrieb?
            </h2>
            <p className="text-[#666] mb-8">Starten Sie heute — kostenlos, ohne Risiko.</p>
            <Link href="/auth?tab=signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-xl px-8 py-4 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:scale-[1.02] transition-all text-lg">
              Jetzt kostenlos starten
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-[#444] text-sm mt-4">14 Tage Probezeit · Keine Kreditkarte erforderlich</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#444]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#c9a84c]" />
            <span>EstateFlow AI — Österreich</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#888] transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-[#888] transition-colors">Impressum</a>
            <a href="#" className="hover:text-[#888] transition-colors">AGB</a>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            Wien, Österreich
          </div>
        </div>
      </footer>
    </div>
  );
}
