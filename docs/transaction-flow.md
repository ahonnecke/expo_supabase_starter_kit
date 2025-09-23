# Transaction Flow

This document outlines the transaction flow for property investments in the Rentinity platform.

## Overview

To ensure security and compliance with real estate investment regulations, all property investment transactions follow a two-step process:

1. User submits an investment request
2. Admin approves or rejects the request

This flow ensures proper oversight of all financial transactions on the platform.

## Database Schema

The transaction flow uses two main tables:

### 1. transaction_requests

This table stores user-initiated investment requests:

```sql
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
```

### 2. transactions

This table stores completed transactions after admin approval:

```sql
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
```

## User Flow

1. User navigates to a property detail page
2. User enters investment amount or number of shares
3. User clicks "Request Investment" button
4. System creates a pending transaction request
5. User is redirected to a pending page
6. Admin reviews and approves/rejects the request
7. If approved:
   - System creates a completed transaction
   - System updates the ownership ledger
   - User is notified of approval
8. If rejected:
   - User is notified of rejection

## Admin Flow

1. Admin navigates to the Transaction Requests page
2. Admin reviews pending requests
3. For each request, admin can:
   - Approve: Creates a transaction and updates ownership
   - Reject: Marks the request as rejected

## Row-Level Security

The following RLS policies are in place:

### transaction_requests table

- **transaction_requests_select_own**: Users can view their own requests, admins can view all
- **transaction_requests_insert_own**: Users can create their own requests
- **transaction_requests_update_admin**: Only admins can update requests

### transactions table

- **transactions_select_own**: Users can view their own transactions, admins can view all
- **transactions_insert_admin**: Only admins can create transactions

## Best Practices

1. Always validate investment amounts and share calculations on both client and server
2. Store detailed metadata for audit purposes
3. Include timestamps for all state changes
4. Record the admin who approved/rejected each request
