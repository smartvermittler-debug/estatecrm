"use client";
import { useState, useEffect } from "react";
import { Zap, Plus, Check, Clock, Mail, Users, Gift } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SUGGESTIONS = [
  {
    id: "inactive_60",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Kund:in 60 Tage inaktiv → Nachfass-E-Mail senden",
    description: "Wenn eine/r Ihrer Kund:innen 60 Tage keinen Kontakt hatte, wird automatisch eine persönliche Nachfass-E-Mail generiert und zur Überprüfung bereitgestellt.",
    trigger: "60 Tage Inaktivität",
    action: "Nachfass-E-Mail erstellen",
  },
  {
    id: "new_listing",
    icon: Zap,
    color: "text-[#c9a84c]",
    bg: "bg-[#c9a84c]/10",
    border: "border-[#c9a84c]/20",
    title: "Neues Objekt → Passende Kund:innen benachrichtigen",
    description: "Sobald ein neues Objekt angelegt wird, analysiert die KI Ihre Kund:innen und benachrichtigt passende Interessent:innen automatisch.",
    trigger: "Neues Objekt angelegt",
    action: "Kund:innen matchen & informieren",
  },
  {
    id: "birthday",
    icon: Gift,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    title: "Geburtstag in 3 Tagen → Glückwunsch senden",
    description: "Drei Tage vor dem Geburtstag eines Kontakts wird automatisch eine persönliche Glückwunschnachricht vorbereitet.",
    trigger: "Geburtstag in 3 Tagen",
    action: "Glückwunsch-E-Mail erstellen",
  },
  {
    id: "email_unopened",
    icon: Mail,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    title: "E-Mail nicht geöffnet nach 7 Tagen → Erinnerung",
    description: "Wenn eine gesendete E-Mail nach 7 Tagen ungeöffnet bleibt, erstellt die KI automatisch eine freundliche Erinnerungsnachricht.",
    trigger: "E-Mail nach 7 Tagen ungeöffnet",
    action: "Erinnerung senden",
  },
  {
    id: "new_client",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    title: "Neuer Kund:in → Willkommens-E-Mail senden",
    description: "Bei jeder neuen Kund:in wird automatisch eine individuelle Willkommens-E-Mail mit Ihrem persönlichen Stil generiert.",
    trigger: "Neuer Kontakt angelegt",
    action: "Willkommens-E-Mail generieren",
  },
];

export default function AutomationenPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRules(data || []);
    setLoading(false);
  }

  async function activate(s: typeof SUGGESTIONS[0]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActivating(s.id);
    await supabase.from("automation_rules").insert({
      user_id: user.id,
      rule_id: s.id,
      title: s.title,
      trigger_event: s.trigger,
      action_type: s.action,
      active: true,
    });
    setJustActivated(prev => new Set([...prev, s.id]));
    setActivating(null);
    load();
  }

  const activeRuleIds = new Set(rules.map(r => r.rule_id));
  const pendingSuggestions = SUGGESTIONS.filter(s => !activeRuleIds.has(s.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Zap className="w-6 h-6 text-[#c9a84c] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Automationen</h1>
        <p className="text-[#666] text-sm mt-0.5">
          Automatische Abläufe für Ihren Makleralltag
        </p>
      </div>

      {/* Aktive Regeln */}
      {rules.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5">
          <h2 className="text-sm font-medium mb-4">Aktive Regeln ({rules.length})</h2>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#222]">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span className="text-sm text-[#ccc] flex-1 truncate">{rule.title}</span>
                <span className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/10 rounded-full px-2 py-0.5 flex-shrink-0">
                  Aktiv
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vorschläge */}
      {pendingSuggestions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#888] mb-3">
            {rules.length === 0
              ? "Empfohlene Automationen — jetzt aktivieren:"
              : "Weitere verfügbare Automationen:"}
          </h2>
          <div className="space-y-3">
            {pendingSuggestions.map((s) => {
              const Icon = s.icon;
              const isActivating = activating === s.id;
              const isJustDone = justActivated.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-start gap-4 p-5 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/20 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${s.bg} ${s.border}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#f5f5f5] mb-1">{s.title}</div>
                    <div className="text-xs text-[#666] leading-relaxed">{s.description}</div>
                    <div className="flex items-center gap-3 mt-2.5 text-[10px] text-[#555]">
                      <span className="border border-[#222] rounded-full px-2 py-0.5">
                        Auslöser: {s.trigger}
                      </span>
                      <span className="border border-[#222] rounded-full px-2 py-0.5">
                        Aktion: {s.action}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => activate(s)}
                    disabled={isActivating || isJustDone}
                    className={`flex items-center gap-1.5 text-xs rounded-lg px-4 py-2 transition-all flex-shrink-0 border ${
                      isJustDone
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-gradient-to-r from-[#c9a84c] to-[#a07830] border-transparent text-[#0a0a0a] font-semibold hover:shadow-[0_0_10px_rgba(201,168,76,0.3)]"
                    } disabled:opacity-60`}
                  >
                    {isJustDone ? (
                      <><Check className="w-3.5 h-3.5" /> Aktiviert</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Aktivieren</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingSuggestions.length === 0 && rules.length > 0 && (
        <div className="text-center py-8 text-[#555] text-sm">
          Alle verfügbaren Automationen sind bereits aktiv.
        </div>
      )}
    </div>
  );
}
