"use client";
import { useState, useEffect } from "react";
import { Settings, Save, Loader2, User, Building, Phone, Globe, Hash, Brain, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: profile.full_name,
      company_name: profile.company_name,
      phone: profile.phone,
      office_address: profile.office_address,
      gisa_number: profile.gisa_number,
      website_url: profile.website_url,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-[#c9a84c] animate-spin" />
    </div>
  );

  const Field = ({ label, field, placeholder, type = "text" }: { label: string; field: string; placeholder: string; type?: string }) => (
    <div>
      <label className="block text-xs text-[#888] mb-1.5">{label}</label>
      <input
        type={type}
        value={profile?.[field] || ""}
        onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold">Einstellungen</h1>
        <p className="text-[#666] text-sm mt-0.5">Ihr Maklerprofil und Präferenzen</p>
      </div>

      {/* Profile section */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-[#c9a84c]" />
          <h2 className="text-sm font-medium">Persönliche Daten</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Vollständiger Name" field="full_name" placeholder="Mag. Maria Müller" />
          <Field label="Maklerunternehmen" field="company_name" placeholder="Müller Immobilien GmbH" />
          <Field label="Telefonnummer" field="phone" placeholder="+43 699 123 45 67" />
          <Field label="Website" field="website_url" placeholder="https://meine-makleragentur.at" />
        </div>
      </div>

      {/* Company section */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Building className="w-4 h-4 text-[#c9a84c]" />
          <h2 className="text-sm font-medium">Büro & Zulassung</h2>
        </div>
        <div className="space-y-4">
          <Field label="Büroadresse" field="office_address" placeholder="Mariahilfer Straße 100, 1060 Wien" />
          <Field label="GISA-Zahl (Gewerbebehörde)" field="gisa_number" placeholder="12345678" />
        </div>
      </div>

      {/* AI settings */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[#c9a84c]" />
          <h2 className="text-sm font-medium">KI-Einstellungen</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "KI lernt meinen Schreibstil", desc: "EstateFlow analysiert Ihre E-Mails und passt sich an", enabled: true },
            { label: "Automatische Follow-up-Erinnerungen", desc: "KI erinnert Sie an überfällige Kundenkontakte", enabled: true },
            { label: "Wöchentlicher KI-Bericht", desc: "Zusammenfassung Ihrer Aktivitäten jeden Montag", enabled: false },
            { label: "Automatisches Käufer-Objekt-Matching", desc: "KI findet passende Objekte für neue Kunden", enabled: true },
          ].map((setting) => (
            <div key={setting.label} className="flex items-start justify-between p-3 bg-[#1a1a1a] rounded-lg">
              <div className="flex-1 pr-4">
                <div className="text-sm text-[#ccc]">{setting.label}</div>
                <div className="text-xs text-[#555] mt-0.5">{setting.desc}</div>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${setting.enabled ? "bg-[#c9a84c]" : "bg-[#333]"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${setting.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API info */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-[#c9a84c]" />
          <h2 className="text-sm font-medium">System-Information</h2>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2">
            <span className="text-[#666]">Supabase-Projekt</span>
            <span className="text-[#888] font-mono">jvvzzxwrxlpdewjitnvt</span>
          </div>
          <div className="flex justify-between p-2">
            <span className="text-[#666]">KI-Modell</span>
            <span className="text-[#888]">Claude Sonnet 4.6</span>
          </div>
          <div className="flex justify-between p-2">
            <span className="text-[#666]">Version</span>
            <span className="text-[#888]">EstateFlow AI v2.0</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-xl px-6 py-3 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? "Gespeichert ✓" : "Änderungen speichern"}
      </button>
    </div>
  );
}
