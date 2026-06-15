export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  office_address: string | null;
  gisa_number: string | null;
  website_url: string | null;
  plan: "solo" | "starter" | "pro" | "team" | "agency";
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  client_type: "Käufer" | "Mieter" | "Verkäufer" | "Vermieter";
  city: string | null;
  district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  heat_score: "hot" | "warm" | "cold" | "dead";
  notes: string | null;
  source: string | null;
  last_contact_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  property_type: string;
  transaction_type: "Verkauf" | "Miete";
  status: "aktiv" | "reserviert" | "verkauft" | "vermietet" | "archiviert";
  address: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
  area_m2: number | null;
  rooms: number | null;
  price: number | null;
  price_per_m2: number | null;
  year_built: number | null;
  floor: number | null;
  total_floors: number | null;
  energy_class: string | null;
  hwb_value: number | null;
  heating_type: string | null;
  parking: boolean;
  balcony: boolean;
  garden: boolean;
  elevator: boolean;
  description: string | null;
  ai_description: string | null;
  cover_image_url: string | null;
  images: string[];
  expose_url: string | null;
  created_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  client_id: string | null;
  listing_id: string | null;
  subject: string;
  body: string;
  status: "draft" | "sent" | "scheduled";
  sent_at: string | null;
  created_at: string;
  client?: Client;
  listing?: Listing;
}

export interface Document {
  id: string;
  user_id: string;
  listing_id: string | null;
  client_id: string | null;
  document_type: string;
  title: string;
  file_url: string | null;
  file_size_kb: number | null;
  status: "uploaded" | "analyzing" | "analyzed" | "error";
  ai_summary: string | null;
  ai_warnings: string[] | null;
  ai_recommendations: string[] | null;
  energy_class: string | null;
  hwb_value: number | null;
  created_at: string;
}

export interface UserCredits {
  user_id: string;
  credit_balance: number;
  total_used: number;
}

export interface MarketReport {
  id: string;
  user_id: string;
  city: string;
  district: string | null;
  property_type: string;
  area_m2: number | null;
  price_min: number | null;
  price_max: number | null;
  price_median: number | null;
  price_per_m2_avg: number | null;
  comparable_count: number | null;
  market_trend: string | null;
  trend_pct: number | null;
  fair_price: number | null;
  ai_analysis: string | null;
  generated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: "active" | "trialing" | "canceled" | "past_due";
  trial_ends_at: string | null;
  current_period_end: string | null;
}
