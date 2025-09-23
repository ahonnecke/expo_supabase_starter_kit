-- 0006_rent_distribution.sql
-- Rent Distribution Schema for Rentinity

-- Rent Payments table
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  payment_date date not null,
  amount numeric not null,
  status text not null check (status in ('pending', 'processed', 'failed')) default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Dividend Distributions table
create table if not exists public.dividend_distributions (
  id uuid primary key default gen_random_uuid(),
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  amount numeric not null,
  shares_owned integer not null,
  status text not null check (status in ('pending', 'processed', 'failed')) default 'pending',
  payment_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Set up triggers for updated_at
create trigger set_rent_payments_updated_at
  before update on public.rent_payments
  for each row execute function public.handle_updated_at();

create trigger set_dividend_distributions_updated_at
  before update on public.dividend_distributions
  for each row execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.rent_payments enable row level security;
alter table public.dividend_distributions enable row level security;

-- RLS Policies for rent_payments
create policy "rent_payments_select_admin"
  on public.rent_payments for select to authenticated
  using (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "rent_payments_insert_admin"
  on public.rent_payments for insert to authenticated
  with check (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "rent_payments_update_admin"
  on public.rent_payments for update to authenticated
  using (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- RLS Policies for dividend_distributions
create policy "dividend_distributions_select_own"
  on public.dividend_distributions for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "dividend_distributions_insert_admin"
  on public.dividend_distributions for insert to authenticated
  with check (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "dividend_distributions_update_admin"
  on public.dividend_distributions for update to authenticated
  using (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- Create indexes for performance
create index if not exists idx_rent_payments_property_id on public.rent_payments (property_id);
create index if not exists idx_rent_payments_payment_date on public.rent_payments (payment_date);
create index if not exists idx_rent_payments_status on public.rent_payments (status);

create index if not exists idx_dividend_distributions_rent_payment_id on public.dividend_distributions (rent_payment_id);
create index if not exists idx_dividend_distributions_user_id on public.dividend_distributions (user_id);
create index if not exists idx_dividend_distributions_property_id on public.dividend_distributions (property_id);
create index if not exists idx_dividend_distributions_status on public.dividend_distributions (status);
