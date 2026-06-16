"use client";
import { useState } from "react";
import { FileText, Plus, Mail, Home, Users } from "lucide-react";

const CATEGORIES = [
  { id: "email", label: "E-Mail-Vorlagen", icon: Mail },
  { id: "expose", label: "Exposé-Texte", icon: Home },
  { id: "client", label: "Kund:innen-Ansprache", icon: Users },
];

export default function VorlagenPage() {
  const [activeCategory, setActiveCategory] = useState("email");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Vorlagen</h1>
          <p className="text-[#666] text-sm mt-0.5">E-Mail- und Textvorlagen für Ihren Makleralltag</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all">
          <Plus className="w-4 h-4" />
          Neue Vorlage
        </button>
      </div>

      {/* Kategorien */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              activeCategory === cat.id
                ? "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leer-Zustand */}
      <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111] border border-[#222] rounded-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-[#333]" />
        </div>
        <h2 className="text-lg font-medium mb-1">Noch keine Vorlagen</h2>
        <p className="text-[#555] text-sm max-w-sm">
          Erstellen Sie Textvorlagen für häufig verwendete E-Mails, Angebote und Nachrichten — die KI passt diese automatisch an Ihre Kund:innen an.
        </p>
        <button className="mt-4 flex items-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0a0a0a] rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" />
          Erste Vorlage erstellen
        </button>
      </div>
    </div>
  );
}
