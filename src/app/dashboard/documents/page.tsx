"use client";
import { useState, useEffect, useRef } from "react";
import {
  FileText, Upload, Brain, Loader2, AlertTriangle, CheckCircle,
  Info, X, Eye, Download, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  "Grundbuchauszug", "Energieausweis", "Flächenwidmungsplan",
  "Kaufvertrag", "Mietvertrag", "Hausverwaltung-Abrechnung",
  "Baubewilligung", "Sonstiges",
];

const STATUS_CONFIG = {
  uploaded:  { label: "Hochgeladen", color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/20" },
  analyzing: { label: "Analysiert", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  analyzed:  { label: "Analysiert", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  error:     { label: "Fehler",     color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20" },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [docType, setDocType] = useState("Grundbuchauszug");
  const [showUpload, setShowUpload] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setDocs(data || []);
  }

  async function analyzeDocument(doc: any, content: string) {
    setAnalyzing(true);
    const prompt = `Als KI-Experte für österreichische Immobiliendokumente: Analysiere dieses Dokument.
Typ: ${doc.document_type}
Titel: ${doc.title}
Inhalt:
${content.substring(0, 2000)}

Antworte NUR mit einem JSON-Objekt:
{
  "summary": "<Zusammenfassung in 3-4 Sätzen>",
  "warnings": ["<Warnung 1>", "<Warnung 2>"],
  "recommendations": ["<Empfehlung 1>", "<Empfehlung 2>"],
  "energy_class": "<nur wenn Energieausweis, sonst null>",
  "hwb_value": <nur wenn Energieausweis, sonst null>
}`;

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
      await supabase.from("documents").update({
        status: "analyzed",
        ai_summary: parsed.summary,
        ai_warnings: parsed.warnings,
        ai_recommendations: parsed.recommendations,
        energy_class: parsed.energy_class,
        hwb_value: parsed.hwb_value,
      }).eq("id", doc.id);
      load();
    } catch {}
    setAnalyzing(false);
  }

  async function handleUpload() {
    if (!docTitle) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("documents").insert({
      user_id: user.id,
      document_type: docType,
      title: docTitle,
      status: "uploaded",
    }).select().single();

    if (data && textContent) {
      await analyzeDocument(data, textContent);
    }

    setShowUpload(false);
    setDocTitle("");
    setTextContent("");
    load();
    setUploading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dokumente</h1>
          <p className="text-[#666] text-sm mt-0.5">{docs.length} Dokumente gespeichert</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
          <Upload className="w-4 h-4" />
          Dokument analysieren
        </button>
      </div>

      {/* Info banner */}
      <div className="p-4 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-xl flex items-start gap-3">
        <Brain className="w-4 h-4 text-[#c9a84c] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#888]">
          EstateFlow KI analysiert Grundbuchauszüge, Energieausweise und Kaufverträge nach österreichischem Recht (MRG, WEG). Warnungen und Empfehlungen werden automatisch generiert.
        </p>
      </div>

      {/* Documents list */}
      <div className="grid gap-3">
        {docs.length === 0 ? (
          <div className="text-center py-16 text-[#555]">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine Dokumente. Laden Sie Ihr erstes Dokument hoch.</p>
            <button onClick={() => setShowUpload(true)} className="mt-3 text-[#c9a84c] hover:underline text-sm">Dokument hinzufügen →</button>
          </div>
        ) : docs.map((doc) => {
          const s = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.uploaded;
          return (
            <div key={doc.id} onClick={() => setSelected(doc)}
              className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#c9a84c]/25 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#f5f5f5] truncate">{doc.title}</div>
                <div className="text-xs text-[#555]">{doc.document_type} · {formatDate(doc.created_at)}</div>
                {doc.ai_summary && <p className="text-xs text-[#666] mt-1 line-clamp-1">{doc.ai_summary}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.ai_warnings?.length > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs">{doc.ai_warnings.length}</span>
                  </div>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#c9a84c] transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-xl bg-[#111] border border-[#222] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-medium text-[#f5f5f5]">{selected.title}</h2>
                <p className="text-xs text-[#555]">{selected.document_type}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {selected.energy_class && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#1a1a1a] border border-[#222] rounded-xl">
                    <div className="text-xs text-[#666] mb-1">Energieklasse</div>
                    <div className="text-2xl font-display font-bold text-[#c9a84c]">{selected.energy_class}</div>
                  </div>
                  {selected.hwb_value && (
                    <div className="p-3 bg-[#1a1a1a] border border-[#222] rounded-xl">
                      <div className="text-xs text-[#666] mb-1">HWB-Wert</div>
                      <div className="text-2xl font-display font-bold text-[#f5f5f5]">{selected.hwb_value} kWh/m²a</div>
                    </div>
                  )}
                </div>
              )}

              {selected.ai_summary && (
                <div className="p-4 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs text-[#c9a84c] font-medium">KI-Zusammenfassung</span>
                  </div>
                  <p className="text-sm text-[#ccc] leading-relaxed">{selected.ai_summary}</p>
                </div>
              )}

              {selected.ai_warnings?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Warnungen ({selected.ai_warnings.length})
                  </div>
                  {selected.ai_warnings.map((w: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {selected.ai_recommendations?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Empfehlungen
                  </div>
                  {selected.ai_recommendations.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-green-300">{r}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload/Analyze Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl">
            <button onClick={() => setShowUpload(false)} className="absolute top-4 right-4 text-[#555] hover:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-display text-lg font-semibold">Dokument analysieren</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Dokumenttyp</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#c9a84c]/50">
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Titel *</label>
                <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="z.B. Grundbuchauszug Mariahilfer Str. 100"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">
                  Dokumentinhalt einfügen (für KI-Analyse)
                </label>
                <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Text aus dem Dokument einfügen (z.B. aus PDF kopiert)..."
                  rows={6} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#444] focus:outline-none focus:border-[#c9a84c]/50 resize-none font-mono text-xs" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowUpload(false)} className="flex-1 border border-[#333] text-[#888] rounded-lg py-2.5 text-sm hover:border-[#444] hover:text-[#f5f5f5] transition-all">Abbrechen</button>
              <button onClick={handleUpload} disabled={!docTitle || uploading || analyzing}
                className="flex-1 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {(uploading || analyzing) ? <><Loader2 className="w-4 h-4 animate-spin" />Analysiere...</> : <><Brain className="w-4 h-4" />Speichern & analysieren</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
