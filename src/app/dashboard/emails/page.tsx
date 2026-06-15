"use client";
import { useState, useEffect } from "react";
import {
  Plus, Mail, Brain, Loader2, X, Send, Copy, Check,
  User, Home, Sparkles, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/utils";

const EMAIL_TYPES = [
  { id: "erstkontakt", label: "Erstkontakt", icon: "👋" },
  { id: "followup", label: "Follow-up", icon: "📞" },
  { id: "expose", label: "Exposé-Versand", icon: "📄" },
  { id: "besichtigung", label: "Besichtigung", icon: "🏠" },
  { id: "angebot", label: "Angebot", icon: "💼" },
  { id: "kaufanbot", label: "Kaufanbot", icon: "✍️" },
  { id: "danke", label: "Dankeschön", icon: "🙏" },
  { id: "markt", label: "Marktinfo", icon: "📊" },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [emailType, setEmailType] = useState("erstkontakt");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedListing, setSelectedListing] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [emailsRes, clientsRes, listingsRes] = await Promise.all([
      supabase.from("emails").select("*, client:clients(full_name), listing:listings(title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("clients").select("id, full_name, email, client_type").eq("user_id", user.id).order("full_name").limit(50),
      supabase.from("listings").select("id, title, city, price, property_type").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setEmails(emailsRes.data || []);
    setClients(clientsRes.data || []);
    setListings(listingsRes.data || []);
  }

  async function generateEmail() {
    setGenerating(true);
    setGeneratedSubject("");
    setGeneratedBody("");
    const client = clients.find(c => c.id === selectedClient);
    const listing = listings.find(l => l.id === selectedListing);
    const type = EMAIL_TYPES.find(t => t.id === emailType);

    const prompt = `Erstelle eine professionelle E-Mail für einen österreichischen Immobilienmakler.
E-Mail-Typ: ${type?.label}
${client ? `Empfänger: ${client.full_name} (${client.client_type})` : ""}
${listing ? `Objekt: ${listing.title}, ${listing.city}` : ""}
${customContext ? `Zusätzlicher Kontext: ${customContext}` : ""}

Antworte NUR mit einem JSON-Objekt: {"subject": "...", "body": "..."}
Der Betreff soll professionell und konkret sein. Der E-Mail-Text soll warm, professionell und österreichisch sein (Anrede "Sehr geehrte/r", Grußformel "Freundliche Grüße").`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await res.json();
    try {
      const text = d.content?.[0]?.text?.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setGeneratedSubject(parsed.subject || "");
      setGeneratedBody(parsed.body || "");
    } catch {
      setGeneratedBody(d.content?.[0]?.text || "Fehler bei Generierung.");
    }
    setGenerating(false);
  }

  async function saveEmail() {
    if (!generatedBody) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("emails").insert({
      user_id: user.id,
      client_id: selectedClient || null,
      listing_id: selectedListing || null,
      subject: generatedSubject,
      body: generatedBody,
      status: "draft",
    });
    setShowCompose(false);
    setGeneratedBody("");
    setGeneratedSubject("");
    load();
    setSaving(false);
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">E-Mails</h1>
          <p className="text-[#666] text-sm mt-0.5">{emails.length} E-Mails gespeichert</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
          <Plus className="w-4 h-4" />
          KI-E-Mail erstellen
        </button>
      </div>

      {/* Email list */}
      <div className="space-y-3">
        {emails.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine E-Mails. Erstellen Sie Ihre erste KI-E-Mail.</p>
            <button onClick={() => setShowCompose(true)} className="mt-3 text-[#c9a84c] hover:underline text-sm">E-Mail erstellen →</button>
          </div>
        ) : emails.map((email) => (
          <div key={email.id} onClick={() => setSelectedEmail(email)}
            className="p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/25 transition-all cursor-pointer group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-[#c9a84c] flex-shrink-0" />
                  <span className="text-sm font-medium text-[#f5f5f5] truncate">{email.subject || "(Kein Betreff)"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#555]">
                  {email.client?.full_name && <span><User className="w-3 h-3 inline mr-0.5" />{email.client.full_name}</span>}
                  {email.listing?.title && <span><Home className="w-3 h-3 inline mr-0.5" />{email.listing.title}</span>}
                </div>
                <p className="text-xs text-[#666] mt-1.5 line-clamp-2">{email.body}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  email.status === "sent" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  email.status === "draft" ? "bg-[#1a1a1a] text-[#666] border-[#222]" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>{email.status === "sent" ? "Gesendet" : email.status === "draft" ? "Entwurf" : "Geplant"}</span>
                <div className="text-[10px] text-[#444] mt-1">{formatRelative(email.created_at)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email detail modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEmail(null)} />
          <div className="relative w-full max-w-2xl bg-[#111] border border-[#222] rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between">
              <h2 className="font-medium text-[#f5f5f5]">{selectedEmail.subject || "(Kein Betreff)"}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => copyToClipboard(selectedEmail.body)}
                  className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#f5f5f5] border border-[#333] rounded-lg px-3 py-1.5 transition-all">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Kopiert</> : <><Copy className="w-3.5 h-3.5" />Kopieren</>}
                </button>
                <button onClick={() => setSelectedEmail(null)} className="text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6">
              <pre className="text-sm text-[#ccc] whitespace-pre-wrap font-sans leading-relaxed">{selectedEmail.body}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
          <div className="relative w-full max-w-2xl bg-[#111] border border-[#222] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-display text-lg font-semibold">KI-E-Mail erstellen</h2>
              </div>
              <button onClick={() => setShowCompose(false)} className="text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* E-Mail type */}
              <div>
                <label className="block text-xs text-[#888] mb-2">E-Mail-Typ wählen</label>
                <div className="grid grid-cols-4 gap-2">
                  {EMAIL_TYPES.map((t) => (
                    <button key={t.id} onClick={() => setEmailType(t.id)}
                      className={`p-2 rounded-lg border text-xs text-center transition-all ${emailType === t.id ? "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]" : "bg-[#1a1a1a] border-[#222] text-[#666] hover:border-[#333]"}`}>
                      <div className="text-lg mb-0.5">{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Kunde (optional)</label>
                  <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                    <option value="">– Kein Kunde –</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Objekt (optional)</label>
                  <select value={selectedListing} onChange={(e) => setSelectedListing(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                    <option value="">– Kein Objekt –</option>
                    {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Zusätzlicher Kontext (optional)</label>
                <textarea value={customContext} onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="z.B. Besichtigung war letzte Woche, Kunde hat starkes Interesse gezeigt..."
                  rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 resize-none" />
              </div>

              <button onClick={generateEmail} disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] rounded-lg py-2.5 text-sm font-medium hover:bg-[#c9a84c]/15 transition-all disabled:opacity-60">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generiere E-Mail...</> : <><Sparkles className="w-4 h-4" />E-Mail mit KI generieren</>}
              </button>

              {generatedSubject && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Betreff</label>
                    <input value={generatedSubject} onChange={(e) => setGeneratedSubject(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-1">E-Mail-Text</label>
                    <textarea value={generatedBody} onChange={(e) => setGeneratedBody(e.target.value)}
                      rows={10} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50 resize-none font-mono" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => copyToClipboard(generatedBody)}
                      className="flex-1 flex items-center justify-center gap-2 border border-[#333] text-[#888] rounded-lg py-2.5 text-sm hover:border-[#444] hover:text-[#f5f5f5] transition-all">
                      {copied ? <><Check className="w-4 h-4 text-green-400" />Kopiert</> : <><Copy className="w-4 h-4" />Kopieren</>}
                    </button>
                    <button onClick={saveEmail} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Als Entwurf speichern
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
