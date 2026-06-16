"use client";
import { useState, useEffect } from "react";
import { Brain, Zap, Users, Home, Clock, AlertTriangle, Inbox, Check } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/utils";

const SIGNAL_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  new_match:      { label: "Neues Objekt gefunden",  icon: Home,          color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10", border: "border-[#c9a84c]/20" },
  follow_up:      { label: "Nachfass erforderlich",  icon: Users,         color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  urgent_call:    { label: "Dringender Anruf",        icon: AlertTriangle, color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20" },
  birthday:       { label: "Geburtstag",              icon: Zap,           color: "text-purple-400",bg: "bg-purple-500/10",border: "border-purple-500/20" },
  interval_check: { label: "Regelmäßiger Check",     icon: Clock,         color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/20" },
};

export default function InboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("relationship_queue")
      .select("*, clients(full_name, heat_score), listings(title, city, price)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data || []);
    setLoading(false);
  }

  async function markDone(id: string) {
    setDoneIds(prev => new Set([...prev, id]));
    await supabase.from("relationship_queue").update({ status: "done" }).eq("id", id);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== id));
      setDoneIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 600);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Brain className="w-6 h-6 text-[#c9a84c] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Beziehungs-Inbox</h1>
        <p className="text-[#666] text-sm mt-0.5">
          KI-priorisierte Aktionen für Ihre Kund:innen
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-[#c9a84c]" />
          </div>
          <h2 className="text-lg font-medium mb-1">Inbox ist leer</h2>
          <p className="text-[#555] text-sm max-w-sm">
            Das KI-Gehirn überwacht Ihre Daten und erstellt automatisch Aktionen, wenn etwas Wichtiges passiert.
          </p>
          <Link href="/dashboard/clients" className="mt-4 text-sm text-[#c9a84c] hover:underline">
            Zu den Kund:innen →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = SIGNAL_CONFIG[item.signal_type] ?? {
              label: item.signal_label || item.signal_type || "Aktion",
              icon: Brain,
              color: "text-[#888]",
              bg: "bg-[#1a1a1a]",
              border: "border-[#222]",
            };
            const Icon = cfg.icon;
            const isDone = doneIds.has(item.id);

            // Listing-Titel sicher auflösen — kein "[NEUES OBJEKT] —"
            const listingTitle: string | null = item.listings?.title ?? null;
            const listingCity: string | null = item.listings?.city ?? null;
            const clientName: string = item.clients?.full_name ?? "Unbekannte/r Kund:in";

            return (
              <div
                key={item.id}
                className={`p-4 bg-[#111] border rounded-xl transition-all ${
                  isDone
                    ? "opacity-50 border-[#1a1a1a]"
                    : "border-[#222] hover:border-[#c9a84c]/25"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Signal-Badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[#444] border border-[#222] rounded-full px-2 py-0.5">
                        Priorität {item.priority ?? 5}/10
                      </span>
                    </div>

                    {/* Kund:in */}
                    <div className="text-sm text-[#ddd] font-medium">{clientName}</div>

                    {/* Objekt — nur anzeigen wenn Daten vorhanden */}
                    {listingTitle ? (
                      <div className="text-xs text-[#888] mt-0.5">
                        Objekt: {listingTitle}{listingCity ? ` · ${listingCity}` : ""}
                      </div>
                    ) : item.listing_id ? (
                      <div className="text-xs text-[#444] mt-0.5">Objekt-Details werden geladen …</div>
                    ) : null}

                    {/* Zusätzliche Nachricht */}
                    {item.signal_label && item.signal_label !== cfg.label && (
                      <div className="text-xs text-[#666] mt-1 leading-relaxed">{item.signal_label}</div>
                    )}

                    <div className="text-[10px] text-[#444] mt-1.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatRelative(item.created_at)}
                    </div>
                  </div>

                  <button
                    onClick={() => markDone(item.id)}
                    disabled={isDone}
                    className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all flex-shrink-0 border ${
                      isDone
                        ? "border-green-500/20 bg-green-500/10 text-green-400"
                        : "border-[#222] text-[#555] hover:text-[#c9a84c] hover:border-[#c9a84c]/30"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isDone ? "Erledigt" : "Erledigen"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
