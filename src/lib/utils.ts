import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}

export function formatDate(date: string | Date, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit", month: style === "long" ? "long" : "2-digit", year: "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
  return formatDate(date);
}

export const HEAT_LABELS: Record<string, string> = {
  hot: "Heiß", warm: "Warm", cold: "Kalt", dead: "Inaktiv",
};

export const PROPERTY_TYPES = [
  "Wohnung", "Haus", "Villa", "Penthouse", "Büro", "Geschäftslokal", "Grundstück", "Garage",
];

export const AUSTRIAN_CITIES = [
  "Wien", "Graz", "Salzburg", "Linz", "Innsbruck", "Klagenfurt", "Wels", "St. Pölten",
];
