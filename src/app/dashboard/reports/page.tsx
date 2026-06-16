"use client";
import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, Home, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/utils";

export default function AuswertungenPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [clientsRes, listingsRes, emailsRes] = await Promise.all([
        supabase.from("clients").select("id, heat_score, created_at").eq("user_id", user.id).not("full_name", "ilike", "test %"),
        supabase.from("listings").select("id, status, created_at").eq("user_id", user.id),
        supabase.from("emails").select("id, status, created_at").eq("user_id", user.id),
      ]);

      const clients = clientsRes.data || [];
      const listings = listingsRes.data || [];
      const emails = emailsRes.data || [];

      setStats({
        totalClients: clients.length,
        hotClients: clients.filter(c => c.heat_score === "hot").length,
        warmClients: clients.filter(c => c.heat_score === "warm").length,
        activeListings: listings.filter(l => l.status === "aktiv").length,
        soldListings: listings.filter(l => l.status === "verkauft").length,
        sentEmails: emails.filter(e => e.status === "sent").length,
        draftEmails: emails.filter(e => e.status === "draft").length,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  const KPI_CARDS = [
    { label: "Kund:innen gesamt",   value: stats?.totalClients ?? 0,  icon: Users,      color: "text-blue-400" },
    { label: "Heiße Leads",          value: stats?.hotClients ?? 0,    icon: TrendingUp, color: "text-red-400" },
    { label: "Aktive Objekte",       value: stats?.activeListings ?? 0, icon: Home,       color: "text-green-400" },
    { label: "Gesendete E-Mails",    value: stats?.sentEmails ?? 0,    icon: Mail,       color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Auswertungen</h1>
        <p className="text-[#666] text-sm mt-0.5">Statistiken und Berichte zu Ihrer Maklertätigkeit</p>
      </div>

      {/* KPI-Karten */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const isZero = card.value === 0;
          return (
            <div key={card.label} className="p-5 bg-[#111] border border-[#222] rounded-xl">
              <card.icon className={`w-5 h-5 mb-3 ${isZero ? "text-[#333]" : card.color}`} />
              <div className={`font-display text-2xl font-semibold ${isZero ? "text-[#555]" : ""}`}>
                {card.value}
              </div>
              <div className="text-[#666] text-xs mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Kund:innen-Verteilung */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h2 className="text-sm font-medium mb-4">Kund:innen nach Status</h2>
        <div className="space-y-3">
          {[
            { label: "Heiß (Hot)",   value: stats?.hotClients ?? 0,  color: "bg-red-500",   total: stats?.totalClients || 1 },
            { label: "Warm",          value: stats?.warmClients ?? 0, color: "bg-amber-500", total: stats?.totalClients || 1 },
            { label: "Kalt & Inaktiv",value: Math.max(0, (stats?.totalClients ?? 0) - (stats?.hotClients ?? 0) - (stats?.warmClients ?? 0)), color: "bg-[#333]", total: stats?.totalClients || 1 },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-32 text-xs text-[#666]">{row.label}</div>
              <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${row.color}`}
                  style={{ width: `${Math.min(100, (row.value / row.total) * 100)}%` }}
                />
              </div>
              <div className={`w-8 text-xs text-right ${row.value === 0 ? "text-[#444]" : "text-[#aaa]"}`}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hinweis */}
      {stats?.totalClients === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-[#111] border border-[#222] rounded-xl">
          <BarChart2 className="w-12 h-12 text-[#2a2a2a] mb-4" />
          <h2 className="text-base font-medium mb-1">Noch keine Daten verfügbar</h2>
          <p className="text-[#555] text-sm max-w-sm">
            Sobald Sie Kund:innen, Objekte und E-Mails hinzufügen, erscheinen hier automatisch Auswertungen und Trends.
          </p>
        </div>
      )}
    </div>
  );
}
