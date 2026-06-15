"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Home, Mail, TrendingUp, Brain, Zap, ArrowRight,
  Flame, ThermometerSun, Snowflake, Clock, Plus, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatRelative } from "@/lib/utils";

const HEAT_CONFIG = {
  hot:  { icon: Flame, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Heiß" },
  warm: { icon: ThermometerSun, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Warm" },
  cold: { icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Kalt" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState({ clients: 0, listings: 0, emails: 0, credits: 0 });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hour] = useState(new Date().getHours());

  const greeting = hour < 12 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, clientsRes, listingsRes, emailsRes, creditsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("clients").select("id, full_name, heat_score, last_contact_at, client_type, city").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("listings").select("id, title, price, city, status, property_type, area_m2").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("emails").select("id").eq("user_id", user.id).eq("status", "sent"),
        supabase.from("user_credits").select("credit_balance").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      setStats({
        clients: clientsRes.data?.length || 0,
        listings: listingsRes.data?.length || 0,
        emails: emailsRes.data?.length || 0,
        credits: creditsRes.data?.credit_balance || 0,
      });
      setRecentClients(clientsRes.data || []);
      setRecentListings(listingsRes.data || []);
      setAiTasks([
        { id: 1, type: "followup", text: "3 Kunden warten auf Follow-up", priority: "high", icon: Users },
        { id: 2, type: "expose", text: "2 Objekte ohne Exposé", priority: "medium", icon: Home },
        { id: 3, type: "market", text: "Marktbericht Wien verfügbar", priority: "low", icon: TrendingUp },
      ]);
      setLoading(false);
    }
    load();
  }, []);

  const STAT_CARDS = [
    { label: "Aktive Kunden", value: stats.clients, icon: Users, href: "/dashboard/clients", color: "text-blue-400" },
    { label: "Aktive Objekte", value: stats.listings, icon: Home, href: "/dashboard/listings", color: "text-green-400" },
    { label: "Gesendete E-Mails", value: stats.emails, icon: Mail, href: "/dashboard/emails", color: "text-purple-400" },
    { label: "KI-Credits", value: stats.credits.toLocaleString("de-AT"), icon: Zap, href: "/dashboard/billing", color: "text-[#c9a84c]" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Brain className="w-6 h-6 text-[#c9a84c] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {greeting}, {profile?.full_name?.split(" ")[0] || "Makler"}
          </h1>
          <p className="text-[#666] text-sm mt-1">
            {new Date().toLocaleDateString("de-AT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard/clients" className="flex items-center gap-2 border border-[#222] hover:border-[#c9a84c]/40 text-[#888] hover:text-[#f5f5f5] rounded-lg px-4 py-2 text-sm transition-all">
            <Plus className="w-4 h-4" />
            Neuer Kunde
          </Link>
          <Link href="/dashboard/listings" className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium transition-all hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]">
            <Plus className="w-4 h-4" />
            Neues Objekt
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="group p-5 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <ChevronRight className="w-3.5 h-3.5 text-[#444] group-hover:text-[#c9a84c] transition-colors" />
            </div>
            <div className="font-display text-2xl font-semibold">{card.value}</div>
            <div className="text-[#666] text-xs mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* KI-Aufgaben */}
        <div className="md:col-span-1 bg-[#111] border border-[#222] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#c9a84c]" />
            <span className="text-sm font-medium">KI empfiehlt heute</span>
          </div>
          <div className="space-y-2.5">
            {aiTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#222]">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  task.priority === "high" ? "bg-red-500/10" : task.priority === "medium" ? "bg-amber-500/10" : "bg-blue-500/10"
                }`}>
                  <task.icon className={`w-3.5 h-3.5 ${
                    task.priority === "high" ? "text-red-400" : task.priority === "medium" ? "text-amber-400" : "text-blue-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#ccc]">{task.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-xs text-[#555]">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              KI-Gehirn analysiert Ihre Daten
            </div>
          </div>
        </div>

        {/* Letzte Kunden */}
        <div className="md:col-span-2 bg-[#111] border border-[#222] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Letzte Kunden</h2>
            <Link href="/dashboard/clients" className="text-xs text-[#c9a84c] hover:underline">Alle anzeigen</Link>
          </div>
          {recentClients.length === 0 ? (
            <div className="text-center py-8 text-[#555] text-sm">
              Noch keine Kunden. <Link href="/dashboard/clients" className="text-[#c9a84c] hover:underline">Ersten Kunden anlegen</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentClients.map((client) => {
                const heat = HEAT_CONFIG[client.heat_score as keyof typeof HEAT_CONFIG] || HEAT_CONFIG.cold;
                return (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#222] to-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#888] font-medium flex-shrink-0">
                      {client.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#ddd] truncate">{client.full_name}</div>
                      <div className="text-xs text-[#555]">{client.client_type} · {client.city || "–"}</div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${heat.bg} ${heat.border} ${heat.color}`}>
                      <heat.icon className="w-3 h-3" />
                      {heat.label}
                    </div>
                    {client.last_contact_at && (
                      <div className="text-[#555] text-xs hidden lg:block">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatRelative(client.last_contact_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Letzte Objekte */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Aktuelle Objekte</h2>
          <Link href="/dashboard/listings" className="text-xs text-[#c9a84c] hover:underline">Alle anzeigen</Link>
        </div>
        {recentListings.length === 0 ? (
          <div className="text-center py-8 text-[#555] text-sm">
            Noch keine Objekte. <Link href="/dashboard/listings" className="text-[#c9a84c] hover:underline">Erstes Objekt anlegen</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentListings.map((listing) => (
              <Link key={listing.id} href={`/dashboard/listings`} className="p-4 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-[#c9a84c]/30 transition-all group">
                <div className="text-xs text-[#c9a84c] mb-1">{listing.property_type}</div>
                <div className="text-sm text-[#ddd] font-medium truncate mb-1">{listing.title}</div>
                <div className="text-xs text-[#666]">{listing.city} · {listing.area_m2 ? `${listing.area_m2}m²` : "–"}</div>
                {listing.price && (
                  <div className="mt-2 text-[#c9a84c] font-semibold text-sm">{formatCurrency(listing.price)}</div>
                )}
                <div className="mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    listing.status === "aktiv" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                    listing.status === "reserviert" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-[#222] text-[#555] border-[#2a2a2a]"
                  }`}>
                    {listing.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
