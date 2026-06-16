"use client";
import { useState, useEffect } from "react";
import {
  Plus, Search, Flame, ThermometerSun, Snowflake, Minus, Phone,
  Mail, MapPin, Euro, Brain, X, Loader2, Filter, ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatRelative } from "@/lib/utils";
import type { Client } from "@/types";

const HEAT = {
  hot:  { icon: Flame, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Heiß" },
  warm: { icon: ThermometerSun, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Warm" },
  cold: { icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Kalt" },
  dead: { icon: Minus, color: "text-[#555]", bg: "bg-[#1a1a1a]", border: "border-[#222]", label: "Inaktiv" },
};

const EMPTY_CLIENT = {
  full_name: "", email: "", phone: "", client_type: "Käufer",
  city: "", district: "", budget_min: "", budget_max: "",
  heat_score: "warm", notes: "", source: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [heatFilter, setHeatFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState("");

  useEffect(() => { loadClients(); }, []);
  useEffect(() => {
    let list = clients;
    if (search) list = list.filter(c =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    );
    if (heatFilter !== "all") list = list.filter(c => c.heat_score === heatFilter);
    setFiltered(list);
  }, [clients, search, heatFilter]);

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .not("full_name", "ilike", "test %")
      .order("created_at", { ascending: false });
    setClients(data || []);
  }

  async function saveClient() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      ...form,
      user_id: user.id,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      last_contact_at: new Date().toISOString(),
    };
    await supabase.from("clients").insert(payload);
    setShowModal(false);
    setForm(EMPTY_CLIENT);
    loadClients();
    setSaving(false);
  }

  async function generateAiNote(client: Client) {
    setAiLoading(true);
    setAiNote("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Als Immobilienmakler-KI: Erstelle eine kurze Gesprächsnotiz und Empfehlung für Kunden ${client.full_name}. 
Typ: ${client.client_type}, Budget: ${client.budget_min ? formatCurrency(client.budget_min) : "–"} – ${client.budget_max ? formatCurrency(client.budget_max) : "–"}, Stadt: ${client.city || "–"}, Status: ${HEAT[client.heat_score as keyof typeof HEAT]?.label}.
Letzter Kontakt: ${client.last_contact_at ? formatRelative(client.last_contact_at) : "unbekannt"}.
Sei präzise, auf Deutsch, max 3 Sätze.`
          }],
        }),
      });
      const d = await res.json();
      setAiNote(d.content?.[0]?.text || "Keine KI-Antwort erhalten.");
    } catch { setAiNote("Fehler bei KI-Anfrage."); }
    setAiLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Kund:innen</h1>
          <p className="text-[#666] text-sm mt-0.5">{clients.length} Kund:innen im CRM</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
          <Plus className="w-4 h-4" />
          Neuer Kunde
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, E-Mail oder Stadt suchen..."
            className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["all", "hot", "warm", "cold", "dead"].map((h) => (
            <button
              key={h}
              onClick={() => setHeatFilter(h)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                heatFilter === h
                  ? "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]"
                  : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
              }`}
            >
              {h === "all" ? "Alle" : HEAT[h as keyof typeof HEAT]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client list */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{search || heatFilter !== "all" ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}</p>
            {!search && heatFilter === "all" && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-[#c9a84c] hover:underline text-sm">
                Ersten Kunden anlegen →
              </button>
            )}
          </div>
        ) : filtered.map((client) => {
          const h = HEAT[client.heat_score as keyof typeof HEAT] || HEAT.cold;
          return (
            <div
              key={client.id}
              className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/25 transition-all cursor-pointer group"
              onClick={() => { setSelected(client); setAiNote(""); }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] border border-[#333] flex items-center justify-center text-sm text-[#888] font-semibold flex-shrink-0">
                {client.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#f5f5f5]">{client.full_name}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${h.bg} ${h.border} ${h.color}`}>
                    <h.icon className="w-3 h-3" />
                    {h.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[#555]">
                  <span>{client.client_type}</span>
                  {client.city && <><MapPin className="w-3 h-3" /><span>{client.city}</span></>}
                  {client.budget_max && <><Euro className="w-3 h-3" /><span>bis {formatCurrency(client.budget_max)}</span></>}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3 text-[#555]">
                {client.phone && <Phone className="w-4 h-4 hover:text-[#c9a84c] cursor-pointer transition-colors" />}
                {client.email && <Mail className="w-4 h-4 hover:text-[#c9a84c] cursor-pointer transition-colors" />}
                {client.last_contact_at && (
                  <span className="text-[10px] text-[#444]">{formatRelative(client.last_contact_at)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Client Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-[#555] hover:text-[#f5f5f5]">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center text-[#0a0a0a] font-semibold text-lg">
                {selected.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{selected.full_name}</h2>
                <span className={`text-xs ${HEAT[selected.heat_score as keyof typeof HEAT]?.color}`}>
                  {HEAT[selected.heat_score as keyof typeof HEAT]?.label}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              {selected.email && <div><div className="text-[#555] text-xs mb-0.5">E-Mail</div><div className="text-[#ccc]">{selected.email}</div></div>}
              {selected.phone && <div><div className="text-[#555] text-xs mb-0.5">Telefon</div><div className="text-[#ccc]">{selected.phone}</div></div>}
              {selected.city && <div><div className="text-[#555] text-xs mb-0.5">Stadt</div><div className="text-[#ccc]">{selected.city}</div></div>}
              <div><div className="text-[#555] text-xs mb-0.5">Typ</div><div className="text-[#ccc]">{selected.client_type}</div></div>
              {(selected.budget_min || selected.budget_max) && (
                <div className="col-span-2">
                  <div className="text-[#555] text-xs mb-0.5">Budget</div>
                  <div className="text-[#ccc]">
                    {selected.budget_min ? formatCurrency(selected.budget_min) : "–"} – {selected.budget_max ? formatCurrency(selected.budget_max) : "–"}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div className="col-span-2">
                  <div className="text-[#555] text-xs mb-0.5">Notizen</div>
                  <div className="text-[#ccc] text-sm">{selected.notes}</div>
                </div>
              )}
            </div>
            {/* AI analysis */}
            <div className="border-t border-[#1a1a1a] pt-4">
              <button
                onClick={() => generateAiNote(selected)}
                disabled={aiLoading}
                className="flex items-center gap-2 text-sm text-[#c9a84c] hover:text-[#e8c96a] transition-colors disabled:opacity-60"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                KI-Analyse generieren
              </button>
              {aiNote && (
                <div className="mt-3 p-3 bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-lg text-sm text-[#ccc]">
                  {aiNote}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[#555] hover:text-[#f5f5f5]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-semibold mb-5">Neuer Kunde</h2>
            <div className="space-y-3">
              {[
                { field: "full_name", label: "Vollständiger Name *", placeholder: "Dr. Max Mustermann" },
                { field: "email", label: "E-Mail", placeholder: "max@beispiel.at" },
                { field: "phone", label: "Telefon", placeholder: "+43 699 123 45 67" },
                { field: "city", label: "Stadt", placeholder: "Wien" },
                { field: "district", label: "Bezirk / Stadtteil", placeholder: "1030 Landstraße" },
                { field: "source", label: "Herkunft", placeholder: "Empfehlung, Willhaben, ..." },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-[#888] mb-1.5">{label}</label>
                  <input
                    value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Budget von (€)</label>
                  <input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                    placeholder="200000" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Budget bis (€)</label>
                  <input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                    placeholder="500000" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Kundentyp</label>
                  <select value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50 transition-all">
                    {["Käufer", "Mieter", "Verkäufer", "Vermieter"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Wärmestatus</label>
                  <select value={form.heat_score} onChange={(e) => setForm({ ...form, heat_score: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50 transition-all">
                    {Object.entries(HEAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Notizen</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Besondere Wünsche, Anmerkungen..."
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-[#333] text-[#888] rounded-lg py-2.5 text-sm hover:border-[#444] hover:text-[#f5f5f5] transition-all">
                Abbrechen
              </button>
              <button onClick={saveClient} disabled={!form.full_name || saving} className="flex-1 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Kunde anlegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
