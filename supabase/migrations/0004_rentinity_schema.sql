-- 0004_rentinity_schema.sql
-- Rentinity Real Estate Platform Schema

-- Properties table
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  price numeric not null,
  lease_term_months integer not null,
  tenant_info jsonb not null default '{}'::jsonb,
  annual_yield_percent numeric not null,
  total_shares integer not null,
  status text not null check (status in ('pending', 'approved', 'active', 'sold')) default 'pending',
  token_contract_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- LLCs table (for property ownership entities)
create table if not exists public.llcs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_id uuid references public.properties(id) on delete restrict,
  formation_date date not null,
  legal_docs_url text,
  status text not null check (status in ('pending', 'active', 'dissolved')) default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Ownership ledger table
create table if not exists public.ownership_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  shares_owned integer not null check (shares_owned > 0),
  purchase_price_per_share numeric not null,
  wallet_address text,
  lockup_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(user_id, property_id)
);

-- Transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('purchase', 'sale', 'dividend', 'fee')),
  amount numeric not null,
  shares integer,
  status text not null check (status in ('pending', 'completed', 'failed')) default 'pending',
  blockchain_tx_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Set up triggers for updated_at
create trigger set_properties_updated_at
  before update on public.properties
  for each row execute function public.handle_updated_at();

create trigger set_llcs_updated_at
  before update on public.llcs
  for each row execute function public.handle_updated_at();

create trigger set_ownership_ledger_updated_at
  before update on public.ownership_ledger
  for each row execute function public.handle_updated_at();

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.properties enable row level security;
alter table public.llcs enable row level security;
alter table public.ownership_ledger enable row level security;
alter table public.transactions enable row level security;

-- RLS Policies for properties
create policy "properties_select_all" 
  on public.properties for select to authenticated using (true);

create policy "properties_insert_admin" 
  on public.properties for insert to authenticated 
  with check (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "properties_update_admin" 
  on public.properties for update to authenticated 
  using (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- RLS Policies for LLCs
create policy "llcs_select_all" 
  on public.llcs for select to authenticated using (true);

create policy "llcs_insert_admin" 
  on public.llcs for insert to authenticated 
  with check (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "llcs_update_admin" 
  on public.llcs for update to authenticated 
  using (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- RLS Policies for ownership_ledger
create policy "ownership_ledger_select_own" 
  on public.ownership_ledger for select to authenticated 
  using (user_id = auth.uid() or exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "ownership_ledger_insert_admin" 
  on public.ownership_ledger for insert to authenticated 
  with check (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "ownership_ledger_update_admin" 
  on public.ownership_ledger for update to authenticated 
  using (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- RLS Policies for transactions
create policy "transactions_select_own" 
  on public.transactions for select to authenticated 
  using (user_id = auth.uid() or exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "transactions_insert_admin" 
  on public.transactions for insert to authenticated 
  with check (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- Create indexes for performance
create index if not exists idx_properties_status on public.properties (status);
create index if not exists idx_llcs_property_id on public.llcs (property_id);
create index if not exists idx_ownership_ledger_user_id on public.ownership_ledger (user_id);
create index if not exists idx_ownership_ledger_property_id on public.ownership_ledger (property_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_property_id on public.transactions (property_id);
create index if not exists idx_transactions_transaction_type on public.transactions (transaction_type);

-- Create storage bucket for property documents
insert into storage.buckets (id, name, public) values ('property-docs', 'property-docs', false)
on conflict (id) do nothing;

-- Policies for property-docs (admin write, owner read)
create policy "property_docs_read_owner"
on storage.objects for select
to authenticated
using (
  bucket_id = 'property-docs'
  and exists (
    select 1 from public.ownership_ledger ol
    where ol.property_id::text = split_part(name, '/', 1)
      and ol.user_id = auth.uid()
  )
);

create policy "property_docs_write_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'property-docs'
  and exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  )
);
