-- ============================================================
-- EstateFlow AI v2 — Complete Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_cron";

-- ============================================================
-- PROFILES & AUTH
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company_name text,
  phone text,
  email text,
  logo_url text,
  office_address text,
  gisa_number text,
  website_url text,
  plan text default 'solo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'solo',
  status text default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table public.user_credits (
  user_id uuid references public.profiles on delete cascade primary key,
  credit_balance int default 3560,
  total_used int default 0,
  updated_at timestamptz default now()
);

-- ============================================================
-- AGENT INTELLIGENCE (NEW)
-- ============================================================

create table public.agent_profile (
  user_id uuid references public.profiles on delete cascade primary key,
  work_patterns jsonb default '{}',
  writing_style jsonb default '{}',
  strengths text[] default '{}',
  blind_spots text[] default '{}',
  performance jsonb default '{}',
  personality_summary text,
  updated_at timestamptz default now()
);

create table public.agent_style (
  user_id uuid references public.profiles on delete cascade primary key,
  avg_email_length int default 100,
  tone text default 'professional',
  greeting_style text default 'Hallo {name},',
  closing_style text default 'Beste Grüße',
  common_phrases text[] default '{}',
  best_send_hours int[] default '{9, 10, 11}',
  avoid_days text[] default '{}',
  sample_emails text[] default '{}',
  updated_at timestamptz default now()
);

create table public.learning_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  event_type text not null,
  event_data jsonb default '{}',
  what_learned text,
  applied_at timestamptz default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================

create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  full_name text not null,
  email text,
  phone text,
  client_type text default 'Käufer',
  city text,
  district text,
  budget_min numeric,
  budget_max numeric,
  rooms_min numeric,
  area_min numeric,
  property_types text[] default '{}',
  notes text,
  free_description text,
  status text default 'active',
  heat_status text default 'kalt',
  last_contact_date timestamptz,
  contact_rhythm text default 'monthly',
  birthday date,
  source text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Filter test data at DB level
  constraint no_test_clients check (full_name not ilike 'test %')
);

create table public.client_memory (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  behavior jsonb default '{}',
  preferences jsonb default '{}',
  buying_signals jsonb default '{}',
  conversation_summary text,
  intent_score int default 0 check (intent_score >= 0 and intent_score <= 100),
  predicted_ready_date date,
  embedding vector(1536),
  updated_at timestamptz default now()
);

create table public.client_interactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  interaction_type text not null, -- email_sent, email_opened, email_replied, call, visit
  details jsonb default '{}',
  occurred_at timestamptz default now()
);

-- ============================================================
-- LISTINGS
-- ============================================================

create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  title text,
  property_type text not null,
  transaction_type text, -- sale, rent
  city text,
  district text,
  street text,
  postal_code text,
  price numeric,
  area_m2 numeric,
  land_area_m2 numeric,
  rooms numeric,
  condition text,
  description text,
  notes text,
  tags text[] default '{}',
  highlights text[] default '{}',
  images text[] default '{}',
  details jsonb default '{}',
  status text default 'active',
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.listing_matches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete cascade,
  client_id uuid references public.clients on delete cascade,
  score numeric check (score >= 0 and score <= 1), -- MAX 1.0 = 100%
  notified boolean default false,
  created_at timestamptz default now(),
  unique(listing_id, client_id)
);

create table public.listing_publications (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  platform text not null, -- willhaben, immoscout, immowelt, instagram, linkedin
  status text default 'pending', -- pending, published, failed
  external_id text,
  published_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

create table public.media_jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete cascade,
  job_type text not null, -- cinematic_video, reel, enhance_images
  status text default 'pending', -- pending, processing, done, failed
  input_data jsonb default '{}',
  output_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- EMAILS & COMMUNICATION
-- ============================================================

create table public.email_campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  client_id uuid references public.clients on delete cascade,
  listing_id uuid references public.listings,
  subject text,
  body text,
  tone text default 'professional',
  status text default 'draft', -- draft, sent, failed
  sent_at timestamptz,
  opened boolean default false,
  opened_at timestamptz,
  replied boolean default false,
  replied_at timestamptz,
  open_count int default 0,
  created_at timestamptz default now()
);

create table public.email_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  name text not null,
  category text,
  subject text,
  body text,
  variables text[] default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

create table public.relationship_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  client_id uuid references public.clients on delete cascade,
  listing_id uuid references public.listings,
  signal_type text, -- new_match, follow_up, birthday, inactivity
  signal_label text,
  draft_subject text,
  draft_body text,
  status text default 'pending', -- pending, awaiting_approval, sent, dismissed
  priority int default 5,
  created_at timestamptz default now()
);

create table public.scheduled_emails (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  client_id uuid references public.clients on delete cascade,
  subject text,
  body text,
  scheduled_for timestamptz,
  sent boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- AUTOMATIONS
-- ============================================================

create table public.automation_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb default '{}',
  action_type text not null,
  action_config jsonb default '{}',
  is_active boolean default true,
  is_default boolean default false,
  last_run_at timestamptz,
  run_count int default 0,
  created_at timestamptz default now()
);

create table public.automation_logs (
  id uuid default uuid_generate_v4() primary key,
  rule_id uuid references public.automation_rules on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  status text,
  details jsonb default '{}',
  executed_at timestamptz default now()
);

-- ============================================================
-- AI MEMORY (CENTRAL - pgvector)
-- ============================================================

create table public.ai_memory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  entity_type text not null, -- agent, client, listing
  entity_id uuid not null,
  memory_type text not null, -- behavior, preference, prediction, style
  content text not null,
  embedding vector(1536),
  importance int default 5 check (importance >= 1 and importance <= 10),
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table public.ai_decisions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  decision_type text not null,
  reasoning text,
  action_taken text,
  outcome text,
  created_at timestamptz default now()
);

-- ============================================================
-- DEFAULT AUTOMATION RULES (5 pre-built)
-- ============================================================

create or replace function public.create_default_automations(p_user_id uuid)
returns void language plpgsql as $$
begin
  insert into public.automation_rules
    (user_id, name, trigger_type, trigger_config, action_type, action_config, is_default)
  values
    (p_user_id,
     'Inaktiver Kund:in — Nachfassen',
     'client_inactive',
     '{"days": 60}',
     'create_email_draft',
     '{"template": "reactivation"}',
     true),
    (p_user_id,
     'Neues Objekt — Passende Kund:innen benachrichtigen',
     'new_listing',
     '{"min_score": 0.7}',
     'create_email_draft',
     '{"template": "new_listing_match"}',
     true),
    (p_user_id,
     'Geburtstag in 3 Tagen — Glückwunsch senden',
     'birthday_upcoming',
     '{"days_before": 3}',
     'create_email_draft',
     '{"template": "birthday"}',
     true),
    (p_user_id,
     'E-Mail nicht geöffnet — Erinnerung',
     'email_not_opened',
     '{"days": 7}',
     'create_email_draft',
     '{"template": "reminder"}',
     true),
    (p_user_id,
     'Neuer Kund:in — Willkommen',
     'new_client',
     '{}',
     'create_email_draft',
     '{"template": "welcome"}',
     true);
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);

  insert into public.user_credits (user_id, credit_balance)
  values (new.id, 3560);

  insert into public.agent_profile (user_id) values (new.id);
  insert into public.agent_style (user_id) values (new.id);

  perform public.create_default_automations(new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update heat status automatically
create or replace function public.update_client_heat()
returns trigger language plpgsql as $$
declare
  days_since int;
  opens_30d int;
begin
  -- Calculate days since last contact
  if new.last_contact_date is null then
    new.heat_status := 'kalt';
    return new;
  end if;

  days_since := extract(day from now() - new.last_contact_date)::int;

  -- Get email opens in last 30 days
  select count(*) into opens_30d
  from public.email_campaigns
  where client_id = new.id
    and opened = true
    and opened_at > now() - interval '30 days';

  -- Set heat status
  if opens_30d >= 3 then
    new.heat_status := 'heiss';
  elsif days_since <= 7 then
    new.heat_status := 'warm';
  elsif days_since <= 12 then
    new.heat_status := 'kalt';
  elsif days_since > 42 then
    new.heat_status := 'inaktiv';
  else
    new.heat_status := 'kalt';
  end if;

  return new;
end;
$$;

create or replace trigger update_heat_on_client_update
  before update on public.clients
  for each row execute procedure public.update_client_heat();

-- Deduct credits function
create or replace function public.deduct_credits(p_user_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  update public.user_credits
  set credit_balance = greatest(0, credit_balance - p_amount),
      total_used = total_used + p_amount,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Match score similarity search
create or replace function public.match_clients_for_listing(
  p_listing_id uuid,
  p_user_id uuid,
  p_max_results int default 10
)
returns table (
  client_id uuid,
  client_name text,
  score numeric
) language plpgsql as $$
declare
  listing_embedding vector(1536);
begin
  select embedding into listing_embedding
  from public.listings where id = p_listing_id;

  if listing_embedding is null then
    return;
  end if;

  return query
  select
    c.id,
    c.full_name,
    -- Score capped at 1.0 (100%)
    least(1.0, 1 - (cm.embedding <=> listing_embedding)) as score
  from public.clients c
  join public.client_memory cm on cm.client_id = c.id
  where c.user_id = p_user_id
    and cm.embedding is not null
    and c.full_name not ilike 'test %'
  order by cm.embedding <=> listing_embedding
  limit p_max_results;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.listings enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.relationship_queue enable row level security;
alter table public.automation_rules enable row level security;
alter table public.agent_profile enable row level security;
alter table public.client_memory enable row level security;
alter table public.ai_memory enable row level security;
alter table public.user_credits enable row level security;
alter table public.listing_matches enable row level security;
alter table public.listing_publications enable row level security;

-- RLS Policies
create policy "Users own their data" on public.profiles
  for all using (auth.uid() = id);

create policy "Users own their clients" on public.clients
  for all using (auth.uid() = user_id);

create policy "Users own their listings" on public.listings
  for all using (auth.uid() = user_id);

create policy "Users own their emails" on public.email_campaigns
  for all using (auth.uid() = user_id);

create policy "Users own their queue" on public.relationship_queue
  for all using (auth.uid() = user_id);

create policy "Users own their automations" on public.automation_rules
  for all using (auth.uid() = user_id);

create policy "Users own their agent profile" on public.agent_profile
  for all using (auth.uid() = user_id);

create policy "Users own their client memory" on public.client_memory
  for all using (auth.uid() = user_id);

create policy "Users own their ai memory" on public.ai_memory
  for all using (auth.uid() = user_id);

create policy "Users own their credits" on public.user_credits
  for all using (auth.uid() = user_id);

create policy "Users own their matches" on public.listing_matches
  for all using (auth.uid() = user_id);

create policy "Users own their publications" on public.listing_publications
  for all using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.relationship_queue;
alter publication supabase_realtime add table public.media_jobs;
alter publication supabase_realtime add table public.listing_matches;
alter publication supabase_realtime add table public.user_credits;
alter publication supabase_realtime add table public.email_campaigns;

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.clients (user_id, heat_status);
create index on public.clients (user_id, last_contact_date);
create index on public.listings (user_id, status);
create index on public.listing_matches (user_id, notified);
create index on public.email_campaigns (user_id, sent_at desc);
create index on public.client_memory using ivfflat (embedding vector_cosine_ops);
create index on public.listings using ivfflat (embedding vector_cosine_ops);
create index on public.ai_memory using ivfflat (embedding vector_cosine_ops);

-- ============================================================
-- WEEKLY REPORT CRON
-- ============================================================

select cron.schedule(
  'weekly-report-sunday',
  '0 8 * * 0',
  $$
  select net.http_post(
    url := 'https://knlekgesfoihxvctftrs.supabase.co/functions/v1/weekly-report',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'
  )
  $$
);

-- Brain tick every 15 minutes
select cron.schedule(
  'brain-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://knlekgesfoihxvctftrs.supabase.co/functions/v1/brain-tick',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'
  )
  $$
);
