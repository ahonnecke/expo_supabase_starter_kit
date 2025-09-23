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

# Copy only files needed for dependency resolution/caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# Copy ALL workspace manifests (match your "workspaces" globs)
COPY apps/*/package.json ./apps/*/
COPY packages/*/package.json ./packages/*/
COPY supabase/functions/*/package.json ./supabase/functions/*/

# Now bring in the source
COPY . .

RUN pnpm install

# Build packages and app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm --filter "@rentinity/blockchain" build
RUN pnpm --filter web build

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
