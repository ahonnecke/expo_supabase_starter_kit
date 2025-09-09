-- 0005_kyc_verification.sql
-- KYC Verification Schema for Rentinity

-- KYC Verifications table
create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'verified', 'rejected', 'expired')) default 'pending',
  provider text not null,
  provider_reference_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Set up trigger for updated_at
create trigger set_kyc_verifications_updated_at
  before update on public.kyc_verifications
  for each row execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.kyc_verifications enable row level security;

-- RLS Policies for kyc_verifications
create policy "kyc_verifications_select_own" 
  on public.kyc_verifications for select to authenticated 
  using (user_id = auth.uid() or exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

create policy "kyc_verifications_insert_own" 
  on public.kyc_verifications for insert to authenticated 
  with check (user_id = auth.uid());

create policy "kyc_verifications_update_admin" 
  on public.kyc_verifications for update to authenticated 
  using (exists (
    select 1 from public.user_profiles up 
    where up.id = auth.uid() and (up.preferences->>'isAdmin')::boolean = true
  ));

-- Create indexes for performance
create index if not exists idx_kyc_verifications_user_id on public.kyc_verifications (user_id);
create index if not exists idx_kyc_verifications_status on public.kyc_verifications (status);
create index if not exists idx_kyc_verifications_provider_reference_id on public.kyc_verifications (provider_reference_id);

-- Add KYC status to user_profiles
alter table public.user_profiles add column if not exists kyc_verified boolean not null default false;
