# Rentinity Scripts

This directory contains utility scripts for the Rentinity project.

## Sample Data Generator

The `generate-sample-data.ts` script populates the database with sample data for testing purposes.

### What it creates:

- **Sample Properties**: 5 properties with different statuses (active and pending)
- **Sample Users**: 3 users with different roles (admin and regular users)
- **Sample Ownership Records**: Distributes ownership of properties among users
- **Sample Governance Proposals**: Creates governance proposals with voting options

### Prerequisites:

1. Make sure your Supabase instance is running
2. Ensure your `.env` file has the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (not the anon key)

### Running the script:

```bash
# From the project root
pnpm gen:sample-data
```

### Sample Users:

The script creates the following users (if they don't already exist):

1. **Admin User**
   - Email: admin@rentinity.com
   - Password: Password123!
   - Role: Admin

2. **Investor User**
   - Email: investor@rentinity.com
   - Password: Password123!
   - Role: Regular user

3. **Developer User**
   - Email: developer@rentinity.com
   - Password: Password123!
   - Role: Admin

You can use these accounts to test different user roles and permissions in the application.

### Notes:

- The script is idempotent for users (won't create duplicates if they already exist)
- Properties, ownership records, and proposals will be created each time you run the script
- If you want to clear existing data before running the script, you'll need to manually delete records from the database
