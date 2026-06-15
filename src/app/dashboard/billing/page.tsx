"use client";
import { useState, useEffect } from "react";
import { CreditCard, Zap, Check, ArrowRight, TrendingDown, Clock, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

const PLANS = [
  { id: "starter", name: "Starter", price: 49, credits: 500, features: ["500 KI-Credits/Monat", "KI-E-Mails", "CRM bis 50 Kunden", "5 Objekte aktiv"] },
  { id: "pro", name: "Profi", price: 99, credits: 3000, features: ["3.000 KI-Credits/Monat", "Exposé-Generator", "KI-Bewertung", "Grundbuch-Analyse", "Marktberichte"], popular: true },
  { id: "team", name: "Team", price: 199, credits: 10000, features: ["10.000 KI-Credits/Monat", "Bis 5 Makler", "Gemeinsames Dashboard", "Team-Analytics"] },
];

const CREDIT_PACKS = [
  { credits: 500, price: 12, label: "500 Credits" },
  { credits: 1500, price: 29, label: "1.500 Credits" },
  { credits: 5000, price: 79, label: "5.000 Credits", popular: true },
  { credits: 15000, price: 199, label: "15.000 Credits" },
];

const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  "KI-E-Mail": { cost: 25, label: "E-Mail generieren" },
  "Exposé": { cost: 150, label: "Exposé erstellen" },
  "Marktanalyse": { cost: 200, label: "Marktanalyse" },
  "Dokument-Analyse": { cost: 100, label: "Dokument analysieren" },
  "KI-Bewertung": { cost: 250, label: "Auto-Bewertung" },
  "Wochenbericht": { cost: 100, label: "Wochenbericht" },
};

export default function BillingPage() {
  const [credits, setCredits] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [creditsRes, txRes, subRes, profileRes] = await Promise.all([
      supabase.from("user_credits").select("*").eq("user_id", user.id).single(),
      supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);
    setCredits(creditsRes.data);
    setTransactions(txRes.data || []);
    setSubscription(subRes.data);
    setProfile(profileRes.data);
    setLoading(false);
  }

  async function handleCheckout(planId: string) {
    setCheckoutLoading(planId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: planId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { alert("Fehler beim Checkout. Bitte versuchen Sie es erneut."); }
    setCheckoutLoading("");
  }

  const creditPct = credits ? Math.min(100, (credits.credit_balance / 3000) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-[#c9a84c] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Abrechnung</h1>
        <p className="text-[#666] text-sm mt-0.5">Credits und Abonnement verwalten</p>
      </div>

      {/* Credits overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 p-5 bg-[#111] border border-[#222] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#c9a84c]" />
              <span className="text-sm font-medium">KI-Credits</span>
            </div>
            <span className="text-2xl font-display font-semibold text-[#c9a84c]">
              {credits?.credit_balance?.toLocaleString("de-AT") || 0}
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-[#c9a84c] to-[#a07830] rounded-full transition-all" style={{ width: `${creditPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-[#555]">
            <span>Gesamt verbraucht: {credits?.total_used?.toLocaleString("de-AT") || 0}</span>
            <span>{creditPct.toFixed(0)}% verfügbar</span>
          </div>
        </div>

        <div className="p-5 bg-[#111] border border-[#222] rounded-xl">
          <div className="text-xs text-[#666] mb-2">Aktuelles Paket</div>
          <div className="font-display text-xl font-semibold capitalize">{subscription?.plan || profile?.plan || "Solo"}</div>
          <div className={`text-xs mt-1 ${subscription?.status === "active" ? "text-green-400" : subscription?.status === "trialing" ? "text-amber-400" : "text-[#666]"}`}>
            {subscription?.status === "active" ? "Aktiv" :
             subscription?.status === "trialing" ? "Probezeit" : "Kostenlos"}
          </div>
          {subscription?.trial_ends_at && (
            <div className="flex items-center gap-1 text-xs text-[#555] mt-2">
              <Clock className="w-3 h-3" />
              Endet {formatDate(subscription.trial_ends_at)}
            </div>
          )}
        </div>
      </div>

      {/* Credit costs */}
      <div className="p-5 bg-[#111] border border-[#222] rounded-xl">
        <h2 className="text-sm font-medium mb-4">Credit-Kosten pro Funktion</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          {Object.entries(CREDIT_COSTS).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
              <span className="text-xs text-[#888]">{v.label}</span>
              <span className="text-xs font-semibold text-[#c9a84c]">{v.cost} Credits</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-sm font-medium mb-4">Abonnement wählen</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = (subscription?.plan || profile?.plan || "solo") === plan.id;
            return (
              <div key={plan.id} className={`relative p-5 rounded-xl border transition-all ${
                plan.popular ? "border-[#c9a84c]/40 bg-[#111] shadow-[0_0_20px_rgba(201,168,76,0.08)]" : "border-[#222] bg-[#0d0d0d]"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] text-[10px] font-bold rounded-full">BELIEBT</div>
                )}
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="font-display text-3xl font-semibold">€{plan.price}</span>
                  <span className="text-[#666] text-sm">/Monat</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#888]">
                      <Check className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleCheckout(plan.id)}
                  disabled={isCurrent || checkoutLoading === plan.id}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    isCurrent ? "bg-[#1a1a1a] text-[#555] border border-[#222] cursor-default" :
                    plan.popular ? "bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]" :
                    "border border-[#333] text-[#888] hover:border-[#c9a84c]/40 hover:text-[#f5f5f5]"
                  }`}
                >
                  {checkoutLoading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isCurrent ? "Aktueller Plan" : "Jetzt upgraden"}
                  {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit packs */}
      <div>
        <h2 className="text-sm font-medium mb-4">Zusätzliche Credits kaufen</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.credits} className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:border-[#c9a84c]/30 ${pack.popular ? "border-[#c9a84c]/30 bg-[#c9a84c]/5" : "border-[#222] bg-[#111]"}`}>
              {pack.popular && <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#c9a84c] text-[#0a0a0a] text-[10px] font-bold rounded-full">BESTES ANGEBOT</div>}
              <div className="text-[#c9a84c] font-semibold">{pack.credits.toLocaleString("de-AT")}</div>
              <div className="text-xs text-[#666]">Credits</div>
              <div className="font-display text-xl font-semibold mt-2">€{pack.price}</div>
              <div className="text-[10px] text-[#555]">€{(pack.price / pack.credits * 1000).toFixed(1)}/1000</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-4">Letzte Credit-Transaktionen</h2>
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? "border-t border-[#1a1a1a]" : ""}`}>
                <div>
                  <div className="text-[#ccc]">{tx.description || tx.feature_used || "Credit-Transaktion"}</div>
                  <div className="text-[10px] text-[#555]">{formatDate(tx.created_at, "long")}</div>
                </div>
                <div className={`font-semibold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
