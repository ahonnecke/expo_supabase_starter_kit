# Row Level Security (RLS) Policies

This document outlines the Row Level Security (RLS) policies used in the Rentinity database.

## Transactions Table

The transactions table has the following RLS policies:

1. **transactions_select_own**
   - Allows users to select their own transactions
   - Allows admins to select all transactions

2. **transactions_insert_admin**
   - Allows users with admin privileges to insert any transaction

3. **transactions_insert_purchase_own**
   - Allows regular users to insert purchase transactions for themselves
   - This policy is necessary for the property investment flow to work correctly

## User Profiles Table

The user_profiles table has the following RLS policies:

1. **User profiles viewable by owner**
   - Allows users to view their own profile

2. **User profiles updatable by owner**
   - Allows users to update their own profile

3. **User profiles insertable by owner**
   - Allows users to insert their own profile

## Admin Access

Admin access is determined by the `preferences->>'isAdmin'` field in the user_profiles table. This is a JSONB field that contains a boolean value.

To grant admin access to a user, update their user_profiles record:

```sql
UPDATE public.user_profiles
SET preferences = jsonb_set(preferences, '{isAdmin}', 'true')
WHERE id = 'user-uuid';
```

To revoke admin access:

```sql
UPDATE public.user_profiles
SET preferences = preferences - 'isAdmin'
WHERE id = 'user-uuid';
```
