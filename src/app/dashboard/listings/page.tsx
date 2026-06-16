"use client";
import { useState, useEffect } from "react";
import {
  Plus, Search, Home, Euro, Maximize, Building, MapPin,
  X, Loader2, Brain, Zap, ChevronRight, Image,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, PROPERTY_TYPES, AUSTRIAN_CITIES } from "@/lib/utils";
import type { Listing } from "@/types";

const STATUS_CONFIG = {
  aktiv:      { label: "Aktiv",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  reserviert: { label: "Reserviert", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  verkauft:   { label: "Verkauft",   color: "text-[#555]",     bg: "bg-[#1a1a1a]",     border: "border-[#222]" },
  vermietet:  { label: "Vermietet",  color: "text-[#555]",     bg: "bg-[#1a1a1a]",     border: "border-[#222]" },
  archiviert: { label: "Archiviert", color: "text-[#444]",     bg: "bg-[#111]",        border: "border-[#1a1a1a]" },
};

const EMPTY = {
  title: "", property_type: "Wohnung", transaction_type: "Verkauf",
  status: "aktiv", address: "", city: "Wien", district: "",
  area_m2: "", rooms: "", price: "", year_built: "", floor: "",
  description: "", energy_class: "", heating_type: "",
  parking: false, balcony: false, garden: false, elevator: false,
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filtered, setFiltered] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let list = listings;
    if (search) list = list.filter(l =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase()) ||
      l.address?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") list = list.filter(l => l.status === statusFilter);
    setFiltered(list);
  }, [listings, search, statusFilter]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setListings(data || []);
  }

  async function generateDesc() {
    if (!form.property_type || !form.city) return;
    setAiLoading(true);
    setAiDesc("");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `Erstelle eine professionelle Immobilienbeschreibung auf Österreichisch für:
Typ: ${form.property_type}, ${form.transaction_type}
Stadt: ${form.city}${form.district ? `, ${form.district}` : ""}
Fläche: ${form.area_m2 || "–"}m², Zimmer: ${form.rooms || "–"}
Preis: ${form.price ? formatCurrency(Number(form.price)) : "–"}
${form.year_built ? `Baujahr: ${form.year_built}` : ""}
${form.balcony ? "Balkon vorhanden. " : ""}${form.garden ? "Garten vorhanden. " : ""}${form.elevator ? "Aufzug vorhanden." : ""}
Nur die Beschreibung, kein Titel, 3-4 Sätze.`
        }],
      }),
    });
    const d = await res.json();
    const text = d.content?.[0]?.text || "";
    setAiDesc(text);
    setForm(f => ({ ...f, description: text }));
    setAiLoading(false);
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("listings").insert({
      ...form,
      user_id: user.id,
      area_m2: form.area_m2 ? Number(form.area_m2) : null,
      rooms: form.rooms ? Number(form.rooms) : null,
      price: form.price ? Number(form.price) : null,
      year_built: form.year_built ? Number(form.year_built) : null,
      floor: form.floor ? Number(form.floor) : null,
    });
    setShowModal(false);
    setForm(EMPTY);
    setAiDesc("");
    load();
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Objekte</h1>
          <p className="text-[#666] text-sm mt-0.5">{listings.length} Objekte insgesamt</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
          <Plus className="w-4 h-4" />
          Neues Objekt
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Objekte suchen..."
            className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...Object.keys(STATUS_CONFIG)].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${statusFilter === s ? "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]" : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"}`}>
              {s === "all" ? "Alle" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-[#555]">
            <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{search || statusFilter !== "all" ? "Keine Objekte gefunden." : "Noch keine Objekte angelegt."}</p>
            {!search && statusFilter === "all" && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-[#c9a84c] hover:underline text-sm">Erstes Objekt anlegen →</button>
            )}
          </div>
        ) : filtered.map((l) => {
          const s = STATUS_CONFIG[l.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.aktiv;
          return (
            <div key={l.id} onClick={() => setSelected(l)} className="group bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#c9a84c]/30 transition-all cursor-pointer">
              <div className="h-32 bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center">
                {l.cover_image_url ? (
                  <img src={l.cover_image_url} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-[#444]">
                    <Image className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs">Kein Foto</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-[#f5f5f5] line-clamp-1">{l.title}</h3>
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#666] mb-2">
                  <MapPin className="w-3 h-3" />
                  {l.city}{l.district ? `, ${l.district}` : ""}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#555]">
                  {l.area_m2 && <span><Maximize className="w-3 h-3 inline mr-0.5" />{l.area_m2}m²</span>}
                  {l.rooms && <span><Building className="w-3 h-3 inline mr-0.5" />{l.rooms} Zi.</span>}
                </div>
                {l.price && (
                  <div className="mt-2 font-display text-lg font-semibold text-[#c9a84c]">{formatCurrency(l.price)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Listing Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
            <h2 className="font-display text-xl font-semibold mb-1">{selected.title}</h2>
            <p className="text-[#666] text-sm mb-4">{selected.address || selected.city}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                ["Typ", selected.property_type],
                ["Transaktion", selected.transaction_type],
                ["Status", STATUS_CONFIG[selected.status as keyof typeof STATUS_CONFIG]?.label],
                ["Fläche", selected.area_m2 ? `${selected.area_m2}m²` : "–"],
                ["Zimmer", selected.rooms || "–"],
                ["Preis", selected.price ? formatCurrency(selected.price) : "–"],
                ["Baujahr", selected.year_built || "–"],
                ["Etage", selected.floor !== null ? selected.floor : "–"],
              ].map(([k, v]) => (
                <div key={k}><div className="text-[#555] text-xs mb-0.5">{k}</div><div className="text-[#ccc]">{v}</div></div>
              ))}
            </div>
            {selected.description && (
              <div className="mb-4">
                <div className="text-[#555] text-xs mb-1">Beschreibung</div>
                <p className="text-[#aaa] text-sm leading-relaxed">{selected.description}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.parking && <span className="text-xs px-2 py-1 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#888]">🚗 Parkplatz</span>}
              {selected.balcony && <span className="text-xs px-2 py-1 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#888]">🌿 Balkon</span>}
              {selected.garden && <span className="text-xs px-2 py-1 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#888]">🌳 Garten</span>}
              {selected.elevator && <span className="text-xs px-2 py-1 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#888]">🛗 Aufzug</span>}
            </div>
          </div>
        </div>
      )}

      {/* New Listing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
            <h2 className="font-display text-xl font-semibold mb-5">Neues Objekt</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#888] mb-1.5">Titel *</label>
                <input value={form.title} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, title: v })); }}
                  placeholder="Moderne 3-Zimmer-Wohnung mit Terrasse" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
              </div>
              {[
                { field: "address", label: "Adresse", placeholder: "Mariahilfer Str. 100" },
                { field: "district", label: "Bezirk", placeholder: "1060 Mariahilf" },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-[#888] mb-1.5">{label}</label>
                  <input value={(form as any)[field]} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, [field]: v })); }}
                    placeholder={placeholder} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Objekttyp</label>
                <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                  {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Stadt</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                  {AUSTRIAN_CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {[
                { field: "area_m2", label: "Fläche (m²)", placeholder: "85" },
                { field: "rooms", label: "Zimmer", placeholder: "3" },
                { field: "price", label: "Preis (€)", placeholder: "485000" },
                { field: "year_built", label: "Baujahr", placeholder: "1970" },
                { field: "floor", label: "Etage", placeholder: "3" },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-[#888] mb-1.5">{label}</label>
                  <input type="number" value={(form as any)[field]} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, [field]: v })); }}
                    placeholder={placeholder} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Transaktion</label>
                <select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                  <option>Verkauf</option><option>Miete</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Energieklasse</label>
                <select value={form.energy_class} onChange={(e) => setForm({ ...form, energy_class: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                  <option value="">–</option>
                  {["A++","A+","A","B","C","D","E","F","G"].map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                {[["parking","🚗 Parkplatz"],["balcony","🌿 Balkon"],["garden","🌳 Garten"],["elevator","🛗 Aufzug"]].map(([f, l]) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(form as any)[f]} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, [f]: v })); }}
                      className="w-4 h-4 rounded border-[#333] bg-[#1a1a1a] accent-[#c9a84c]" />
                    <span className="text-sm text-[#888]">{l}</span>
                  </label>
                ))}
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-[#888]">Beschreibung</label>
                  <button type="button" onClick={generateDesc} disabled={aiLoading || !form.city}
                    className="flex items-center gap-1.5 text-xs text-[#c9a84c] hover:text-[#e8c96a] disabled:opacity-50 transition-colors">
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    KI-Beschreibung generieren
                  </button>
                </div>
                <textarea value={form.description} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, description: v })); }}
                  placeholder="Immobilienbeschreibung..."
                  rows={4} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-[#333] text-[#888] rounded-lg py-2.5 text-sm hover:border-[#444] hover:text-[#f5f5f5] transition-all">Abbrechen</button>
              <button onClick={save} disabled={!form.title || saving}
                className="flex-1 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Objekt anlegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
