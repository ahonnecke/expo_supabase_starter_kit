# ---- base ----
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" NEXT_TELEMETRY_DISABLED=1
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate \
  && apt-get update && apt-get install -y --no-install-recommends \
     git python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- builder ----
FROM base AS builder
WORKDIR /app

# Copy root package.json and workspace config first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Create directory structure for workspace packages
RUN mkdir -p apps/web apps/mobile packages/blockchain packages/shared packages/supabase packages/ui supabase/functions/notify supabase/functions/payments

# Copy package.json files for workspace packages
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/blockchain/package.json ./packages/blockchain/
COPY packages/shared/package.json ./packages/shared/
COPY packages/supabase/package.json ./packages/supabase/

# Create package.json for UI package if it doesn't exist in the repo
RUN echo '{"name": "@supa/ui", "version": "1.0.0", "private": true}' > ./packages/ui/package.json

# Create empty package.json files for Supabase functions
RUN echo '{"name": "notify-function", "version": "1.0.0", "private": true}' > ./supabase/functions/notify/package.json && \
    echo '{"name": "payments-function", "version": "1.0.0", "private": true}' > ./supabase/functions/payments/package.json

# Install dependencies
RUN pnpm install

# Now copy the rest of the source code
COPY . .

# Make sure scripts are executable
RUN chmod +x scripts/link-packages.sh

# Build packages and app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm build

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
