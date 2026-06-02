create extension if not exists pgcrypto;

create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_type text not null,
  stay_type text not null,
  value numeric(10, 2) not null check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vehicle_type, stay_type)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plate text not null,
  model text not null,
  brand text not null,
  color text not null,
  owner_cpf text not null,
  vehicle_type text not null,
  stay_type text not null,
  entry_at timestamptz not null default now(),
  exit_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  billing_cycle text not null default 'monthly',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active', 'canceled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists vehicles_user_entry_idx on public.vehicles (user_id, entry_at desc);
create index if not exists vehicles_user_active_idx on public.vehicles (user_id, plate) where exit_at is null;
create index if not exists rates_user_idx on public.rates (user_id);
create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status);

alter table public.rates enable row level security;
alter table public.vehicles enable row level security;
alter table public.contacts enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "rates owned by authenticated user" on public.rates;
create policy "rates owned by authenticated user"
on public.rates
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "vehicles owned by authenticated user" on public.vehicles;
create policy "vehicles owned by authenticated user"
on public.vehicles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "anyone can create contact" on public.contacts;
create policy "anyone can create contact"
on public.contacts
for insert
to anon, authenticated
with check (true);

drop policy if exists "anyone can read active plans" on public.plans;
create policy "anyone can read active plans"
on public.plans
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "subscriptions owned by authenticated user" on public.subscriptions;
create policy "subscriptions owned by authenticated user"
on public.subscriptions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.plans (slug, name, price, billing_cycle, features)
values (
  'basic',
  'Basico',
  0,
  'monthly',
  '["Registro de veiculos", "Historico em tempo real", "Dashboards interativos", "Cadastro de entrada e saida", "Controle diario", "Suporte basico"]'::jsonb
)
on conflict (slug) do update
set
  name = excluded.name,
  price = excluded.price,
  billing_cycle = excluded.billing_cycle,
  features = excluded.features,
  is_active = true;
