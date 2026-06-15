"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"login" | "signup">(
    params.get("tab") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, company_name: company } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          company_name: company,
          plan: "solo",
        });
        await supabase.from("user_credits").upsert({
          user_id: data.user.id,
          credit_balance: 3560,
        });
        setSuccess("Willkommen! Sie werden weitergeleitet...");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message === "Invalid login credentials"
          ? "E-Mail oder Passwort falsch."
          : err.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#666] hover:text-[#f5f5f5] text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Startseite
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#a07830] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0a0a0a]" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold">EstateFlow <span className="text-[#c9a84c]">AI</span></h1>
          <p className="text-[#666] text-sm mt-1">Für österreichische Immobilienmakler</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-7">
          {/* Tabs */}
          <div className="flex bg-[#0a0a0a] rounded-xl p-1 mb-7">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-[#c9a84c] text-[#0a0a0a]"
                    : "text-[#666] hover:text-[#f5f5f5]"
                }`}
              >
                {t === "login" ? "Anmelden" : "Registrieren"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Vollständiger Name</label>
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Mag. Maria Müller"
                    required
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Maklerunternehmen</label>
                  <input
                    type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                    placeholder="Müller Immobilien GmbH"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-[#888] mb-1.5">E-Mail-Adresse</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="makler@beispiel.at"
                required
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1.5">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "Mindestens 8 Zeichen" : "••••••••"}
                  required minLength={8}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 pr-11 text-sm text-[#f5f5f5] placeholder:text-[#555] focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === "login" ? "Anmelden" : "Konto erstellen"}
            </button>

            {tab === "signup" && (
              <p className="text-[#555] text-xs text-center">
                Mit der Registrierung stimmen Sie unseren{" "}
                <a href="#" className="text-[#c9a84c] hover:underline">AGB</a> und der{" "}
                <a href="#" className="text-[#c9a84c] hover:underline">Datenschutzerklärung</a> zu.
              </p>
            )}
          </form>
        </div>

        {tab === "signup" && (
          <div className="mt-4 text-center">
            <p className="text-[#555] text-sm">
              14 Tage Probezeit · Alle Profi-Funktionen inklusive · Keine Kreditkarte
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#c9a84c] animate-spin" /></div>}>
      <AuthForm />
    </Suspense>
  );
}
