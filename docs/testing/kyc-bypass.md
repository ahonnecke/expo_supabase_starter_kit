# KYC Bypass for Testing

This document describes how to bypass KYC (Know Your Customer) verification for testing purposes in the Rentinity application.

## Overview

In production, Rentinity uses Stripe Identity for KYC verification, which requires users to submit government-issued ID and selfie verification. For testing and development purposes, we've implemented a way to bypass this requirement.

## Enabling KYC Bypass

To enable KYC bypass, set the following environment variable:

```bash
NEXT_PUBLIC_MOCK_KYC=true
```

This can be added to your `.env.local` file for local development or set in your Docker environment.

## How It Works

When `NEXT_PUBLIC_MOCK_KYC=true` is set:

1. The application will use a mock KYC provider instead of the real Stripe Identity provider
2. The mock provider automatically approves all verification requests
3. A "Bypass KYC Verification" button will appear on the KYC verification page
4. Clicking this button will instantly set the user's KYC status to "verified"

## Using with Docker

To use the KYC bypass with Docker, you can run:

```bash
docker compose up -d -e NEXT_PUBLIC_MOCK_KYC=true
```

Or modify your `.env` file to include:

```
NEXT_PUBLIC_MOCK_KYC=true
```

## Implementation Details

The mock KYC system consists of:

1. `MockKYCProvider` class in `packages/shared/src/kyc/mock-provider.ts`
2. Logic in `KYCProviderFactory` to use the mock provider when the environment variable is set
3. UI enhancements in the KYC verification page to show the bypass button
4. Direct database updates to create verified KYC records

## Security Warning

⚠️ **IMPORTANT**: This feature should NEVER be enabled in production environments. It bypasses critical regulatory compliance measures and should only be used for development and testing purposes.

## Troubleshooting

If the bypass button doesn't appear:

1. Make sure the `NEXT_PUBLIC_MOCK_KYC` environment variable is set to `true`
2. Ensure the variable is accessible to the client-side code
3. Try refreshing the page after setting the environment variable
4. Check browser console for any errors
