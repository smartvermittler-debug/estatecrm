"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, LayoutDashboard, Users, Home, Mail, FileText,
  TrendingUp, CreditCard, Settings, Brain, ChevronDown,
  LogOut, Bell, Menu, X, Zap, Star, BookOpen, Calculator,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Übersicht", exact: true },
  { href: "/dashboard/clients", icon: Users, label: "Kunden" },
  { href: "/dashboard/listings", icon: Home, label: "Objekte" },
  { href: "/dashboard/emails", icon: Mail, label: "E-Mails" },
  { href: "/dashboard/documents", icon: FileText, label: "Dokumente" },
  { href: "/dashboard/expose", icon: BookOpen, label: "Exposé", badge: "KI" },
  { href: "/dashboard/valuation", icon: Calculator, label: "Bewertung", badge: "KI" },
  { href: "/dashboard/market", icon: TrendingUp, label: "Markt" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Abrechnung" },
  { href: "/dashboard/settings", icon: Settings, label: "Einstellungen" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return; }
      supabase.from("profiles").select("*").eq("id", data.user.id).single()
        .then(({ data: p }) => { if (p) setProfile(p); });
      supabase.from("user_credits").select("credit_balance").eq("user_id", data.user.id).single()
        .then(({ data: c }) => { if (c) setCredits(c.credit_balance); });
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  function isActive(item: typeof NAV[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-[#1a1a1a]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a1a1a]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#0a0a0a]" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold">EstateFlow <span className="text-[#c9a84c]">AI</span></div>
            <div className="text-[10px] text-[#555]">Profi-Paket</div>
          </div>
        </Link>
      </div>

      {/* Credits badge */}
      {credits !== null && (
        <div className="mx-4 mt-4 px-3 py-2 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span className="text-[11px] text-[#888]">KI-Credits</span>
            </div>
            <span className="text-[#c9a84c] text-xs font-semibold">{credits.toLocaleString("de-AT")}</span>
          </div>
          <div className="mt-1.5 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c9a84c] to-[#a07830] rounded-full transition-all"
              style={{ width: `${Math.min(100, (credits / 3000) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              isActive(item)
                ? "bg-[#c9a84c]/10 text-[#f5f5f5] border border-[#c9a84c]/20"
                : "text-[#666] hover:text-[#ccc] hover:bg-white/3"
            }`}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive(item) ? "text-[#c9a84c]" : ""}`} />
            <span className="flex-1">{item.label}</span>
            {item.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">{item.badge}</span>}
          </Link>
        ))}
      </nav>

      {/* AI Brain indicator */}
      <div className="mx-4 mb-3 px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#222]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#c9a84c] animate-pulse" />
          <div>
            <div className="text-[11px] text-[#888]">KI-Gehirn aktiv</div>
            <div className="text-[10px] text-[#555]">Lernt Ihren Stil</div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="px-4 py-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center text-[#0a0a0a] font-semibold text-sm">
            {profile?.full_name?.charAt(0) || "M"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#ccc] truncate">{profile?.full_name || "Makler"}</div>
            <div className="text-[10px] text-[#555] truncate">{profile?.company_name || ""}</div>
          </div>
          <button onClick={handleLogout} className="text-[#555] hover:text-[#c9a84c] transition-colors" title="Abmelden">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0">
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-[#666] hover:text-[#ccc]">
            <Menu className="w-5 h-5" />
          </button>
          <div className="md:hidden" />

          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-[#666] hover:text-[#ccc] transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#c9a84c] rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center text-[#0a0a0a] font-semibold text-xs">
              {profile?.full_name?.charAt(0) || "M"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
