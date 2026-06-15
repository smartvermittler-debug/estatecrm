"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  FileText, Upload, AlertTriangle, CheckCircle2,
  Clock, Loader2, Shield, Zap, ChevronRight,
} from "lucide-react";

type Document = {
  id: string;
  document_type: string;
  file_name: string;
  status: string;
  warnings: string[];
  analysis_result: any;
  created_at: string;
  listing_id: string;
};

const DOC_TYPES = [
  { id: "grundbuch",       label: "Grundbuch",              icon: "🏛️", credits: 20, pro: true  },
  { id: "energieausweis",  label: "Energieausweis",         icon: "⚡", credits: 15, pro: true  },
  { id: "kaufanbot",       label: "Kaufanbot",              icon: "📋", credits: 25, pro: false },
  { id: "mietvertrag",     label: "Mietvertrag",            icon: "📄", credits: 20, pro: false },
  { id: "flächenwidmung",  label: "Flächenwidmungsplan",    icon: "🗺️", credits: 15, pro: true  },
  { id: "baugenehmigung",  label: "Baugenehmigung",         icon: "🏗️", credits: 15, pro: false },
  { id: "hausordnung",     label: "Hausordnung",            icon: "🏠", credits: 10, pro: false },
  { id: "sonstiges",       label: "Sonstiges Dokument",     icon: "📁", credits: 10, pro: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Ausstehend",  color: "text-zinc-400",   icon: Clock        },
  analyzing: { label: "Analysiere…", color: "text-gold",       icon: Loader2      },
  analyzed:  { label: "Analysiert",  color: "text-green-400",  icon: CheckCircle2 },
  expired:   { label: "Abgelaufen",  color: "text-red-400",    icon: AlertTriangle},
  missing:   { label: "Fehlend",     color: "text-amber-400",  icon: AlertTriangle},
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<Document | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("property_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (docType: string, file: File, listingId?: string) => {
    setUploading(docType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload file
      const path = `${user.id}/documents/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(path);

      // Create document record
      const { data: doc } = await supabase.from("property_documents").insert({
        user_id: user.id,
        listing_id: listingId || null,
        document_type: docType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: "pending",
      }).select("id").single();

      // Trigger AI analysis
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("analyze-document", {
        body: {
          document_id: doc?.id,
          document_type: docType,
          file_url: urlData.publicUrl,
          listing_id: listingId,
        },
      });

      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(null);
    }
  };

  const totalWarnings = documents.reduce((sum, d) => sum + (d.warnings?.length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-medium flex items-center gap-3">
          <Shield className="h-7 w-7 text-gold" />
          Rechtliche Dokumente
        </h1>
        <p className="text-muted-foreground mt-1">
          KI-gestützte Analyse von Grundbuch, Energieausweis, Kaufanbot und mehr.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Dokumente gesamt", value: documents.length, icon: FileText },
          { label: "Analysiert",       value: documents.filter(d => d.status === "analyzed").length, icon: CheckCircle2 },
          { label: "Warnungen",        value: totalWarnings, icon: AlertTriangle, warn: totalWarnings > 0 },
        ].map((s) => (
          <div key={s.label} className={`card-hover ${s.warn ? "border-amber-500/30" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={`h-4 w-4 ${s.warn ? "text-amber-400" : "text-gold"}`} />
              <span className="label-sm">{s.label}</span>
            </div>
            <div className={`font-display text-3xl font-medium ${s.warn ? "text-amber-400" : ""}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="font-display text-xl font-medium mb-4">
          Dokument hochladen & analysieren
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOC_TYPES.map((dt) => (
            <label
              key={dt.id}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border
                cursor-pointer transition-all duration-200
                ${uploading === dt.id
                  ? "border-gold bg-gold/5"
                  : "border-border hover:border-gold/40 hover:bg-white/5"
                }
              `}
            >
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(dt.id, file);
                }}
              />
              <span className="text-2xl">{dt.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {dt.label}
              </span>
              <span className="text-2xs text-muted-foreground">
                {dt.credits} Credits
              </span>
              {dt.pro && (
                <span className="absolute top-1 right-1 text-[9px] bg-gold/20 text-gold px-1 rounded">
                  Pro
                </span>
              )}
              {uploading === dt.id && (
                <Loader2 className="h-4 w-4 animate-spin text-gold absolute bottom-2" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-medium">Hochgeladene Dokumente</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : documents.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Noch keine Dokumente hochgeladen.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const dtype = DOC_TYPES.find(d => d.id === doc.document_type);

            return (
              <div
                key={doc.id}
                className="card-hover cursor-pointer"
                onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{dtype?.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dtype?.label || doc.document_type}</span>
                      {(doc.warnings?.length || 0) > 0 && (
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {doc.warnings.length} Warnung{doc.warnings.length > 1 ? "en" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{doc.file_name}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm ${cfg.color}`}>
                    <cfg.icon className={`h-4 w-4 ${doc.status === "analyzing" ? "animate-spin" : ""}`} />
                    {cfg.label}
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selected?.id === doc.id ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded Analysis */}
                {selected?.id === doc.id && doc.analysis_result && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in">
                    {/* Warnings */}
                    {doc.warnings?.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2 text-amber-400 font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          Warnungen
                        </div>
                        <ul className="space-y-1">
                          {doc.warnings.map((w, i) => (
                            <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                              <span className="mt-0.5">•</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Summary */}
                    {doc.analysis_result?.ai_summary && (
                      <div className="rounded-xl border border-border bg-white/5 p-4">
                        <div className="flex items-center gap-2 mb-2 text-gold font-medium text-sm">
                          <Zap className="h-3.5 w-3.5" />
                          KI-Zusammenfassung
                        </div>
                        <p className="text-sm leading-relaxed">
                          {doc.analysis_result.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Key Data */}
                    <div className="grid grid-cols-2 gap-2">
                      {doc.document_type === "grundbuch" && doc.analysis_result?.einlagezahl && (
                        <>
                          <InfoItem label="Einlagezahl" value={doc.analysis_result.einlagezahl} />
                          <InfoItem label="Katastralgemeinde" value={doc.analysis_result.katastralgemeinde} />
                          <InfoItem label="Eigentümer" value={`${doc.analysis_result.eigentuemer?.length || 0} Person(en)`} />
                          <InfoItem label="Pfandrechte" value={`${doc.analysis_result.pfandrechte?.length || 0}`} />
                        </>
                      )}
                      {doc.document_type === "energieausweis" && (
                        <>
                          <InfoItem label="HWB-Klasse" value={doc.analysis_result.hwb_class} />
                          <InfoItem label="HWB-Wert" value={`${doc.analysis_result.hwb_value} kWh/m²a`} />
                          <InfoItem label="Gültig bis" value={doc.analysis_result.valid_until} />
                        </>
                      )}
                    </div>

                    {/* Legal disclaimer */}
                    <p className="text-2xs text-muted-foreground border-t border-border pt-3">
                      ⚠️ Diese Analyse dient als erste Orientierung und ersetzt keine Rechtsberatung.
                      Für verbindliche Auskünfte wenden Sie sich an einen Rechtsanwalt oder Notar.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const InfoItem = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-lg bg-white/5 p-3">
    <div className="label-sm mb-1">{label}</div>
    <div className="text-sm font-medium">{value || "—"}</div>
  </div>
);
