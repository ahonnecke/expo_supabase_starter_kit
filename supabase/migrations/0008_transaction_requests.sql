-- 0007_transaction_requests.sql
-- Create a transaction_requests table for user-initiated transactions

-- Create transaction_requests table
create table if not exists public.transaction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('purchase', 'sale')),
  amount numeric not null,
  shares integer,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Set up trigger for updated_at
create trigger set_transaction_requests_updated_at
  before update on public.transaction_requests
  for each row execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.transaction_requests enable row level security;

-- RLS Policies for transaction_requests
create policy "transaction_requests_select_own"
  on public.transaction_requests for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "transaction_requests_insert_own"
  on public.transaction_requests for insert to authenticated
  with check (auth.uid() = user_id);

create policy "transaction_requests_update_admin"
  on public.transaction_requests for update to authenticated
  using (exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- Create indexes for performance
create index if not exists idx_transaction_requests_user_id on public.transaction_requests (user_id);
create index if not exists idx_transaction_requests_property_id on public.transaction_requests (property_id);
create index if not exists idx_transaction_requests_status on public.transaction_requests (status);
