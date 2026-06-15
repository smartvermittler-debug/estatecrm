-- ============================================================
-- EstateFlow AI v2 — Migration 002
-- Dokumente, Marktdaten, Abrechnung
-- ============================================================

-- ABONNEMENTS & ABRECHNUNG
create table if not exists public.plans (
  id text primary key,
  name_de text not null,
  price_monthly numeric not null,
  credits_included int not null,
  max_agents int default 1,
  features jsonb default '[]',
  stripe_price_id text,
  is_active boolean default true,
  sort_order int default 0
);

insert into public.plans values
  ('starter','Starter',49,500,1,'["KI-E-Mails","Objekte","CRM"]',null,true,1),
  ('pro','Profi',99,3000,1,'["Expose","Bewertung","Grundbuch","Marktdaten"]',null,true,2),
  ('team','Team',199,10000,5,'["5 Makler","Gemeinsames Dashboard"]',null,true,3),
  ('agency','Agentur',399,50000,-1,'["Unbegrenzt","White Label","API"]',null,true,4)
on conflict (id) do nothing;

create table if not exists public.credit_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  amount int not null,
  transaction_type text not null,
  feature_used text,
  description text,
  balance_after int,
  created_at timestamptz default now()
);

create table if not exists public.credit_purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  credits_bought int not null,
  amount_eur numeric not null,
  stripe_payment_intent_id text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- DOKUMENTE
create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete set null,
  client_id uuid references public.clients on delete set null,
  document_type text not null,
  title text not null,
  file_url text,
  file_size_kb int,
  status text default 'uploaded',
  analysis_result jsonb,
  einlagezahl text,
  katastralgemeinde text,
  eigentuemer jsonb,
  pfandrechte jsonb,
  dienstbarkeiten jsonb,
  hwb_value numeric,
  energy_class text,
  valid_until date,
  ai_summary text,
  ai_warnings text[],
  ai_recommendations text[],
  expires_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MARKTDATEN
create table if not exists public.market_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  city text not null,
  district text,
  postal_code text,
  property_type text not null,
  area_m2 numeric,
  rooms numeric,
  year_built int,
  transaction_type text not null,
  price numeric not null,
  price_per_m2 numeric,
  transaction_date date,
  source text default 'manual',
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.market_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete set null,
  city text not null,
  district text,
  property_type text not null,
  area_m2 numeric,
  price_min numeric,
  price_max numeric,
  price_median numeric,
  price_per_m2_avg numeric,
  comparable_count int,
  market_trend text,
  trend_pct numeric,
  fair_price numeric,
  ai_analysis text,
  comparables jsonb,
  data_sources text[] default '{"internal"}',
  generated_at timestamptz default now()
);

create table if not exists public.immo_united_cache (
  id uuid default uuid_generate_v4() primary key,
  query_hash text unique,
  city text,
  district text,
  property_type text,
  data jsonb,
  fetched_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- FUNKTIONEN
create or replace function public.use_credits(
  p_user_id uuid, p_amount int, p_feature text, p_description text default null
) returns boolean language plpgsql security definer as $$
declare v_balance int;
begin
  select credit_balance into v_balance from public.user_credits
  where user_id = p_user_id for update;
  if v_balance < p_amount then return false; end if;
  update public.user_credits
  set credit_balance = credit_balance - p_amount,
      total_used = total_used + p_amount, updated_at = now()
  where user_id = p_user_id;
  insert into public.credit_transactions
    (user_id, amount, transaction_type, feature_used, description, balance_after)
  values (p_user_id, -p_amount, 'usage', p_feature,
    coalesce(p_description, p_feature), v_balance - p_amount);
  return true;
end;
$$;

create or replace function public.add_credits(
  p_user_id uuid, p_amount int,
  p_transaction_type text default 'purchase', p_description text default null
) returns void language plpgsql security definer as $$
declare v_balance int;
begin
  update public.user_credits
  set credit_balance = credit_balance + p_amount, updated_at = now()
  where user_id = p_user_id returning credit_balance into v_balance;
  insert into public.credit_transactions
    (user_id, amount, transaction_type, description, balance_after)
  values (p_user_id, p_amount, p_transaction_type,
    coalesce(p_description, 'Credits aufgeladen'), v_balance);
end;
$$;

-- RLS
alter table public.documents enable row level security;
alter table public.market_transactions enable row level security;
alter table public.market_reports enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.credit_purchases enable row level security;

create policy "Eigene Dokumente" on public.documents for all using (auth.uid() = user_id);
create policy "Eigene Marktdaten" on public.market_transactions for all using (auth.uid() = user_id);
create policy "Eigene Berichte" on public.market_reports for all using (auth.uid() = user_id);
create policy "Eigene Credits" on public.credit_transactions for all using (auth.uid() = user_id);
create policy "Eigene Käufe" on public.credit_purchases for all using (auth.uid() = user_id);

-- REALTIME
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.credit_transactions;

-- INDEXES
create index if not exists idx_docs_user on public.documents (user_id, document_type);
create index if not exists idx_market_city on public.market_transactions (city, property_type);
create index if not exists idx_credits on public.credit_transactions (user_id, created_at desc);
