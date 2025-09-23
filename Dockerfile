# ============================================================================
# RENTINITY MONOREPO DOCKERFILE
# ============================================================================
# This Dockerfile implements a carefully designed build process to avoid common
# issues with pnpm monorepos in Docker. The key issues addressed are:
#
# 1. WORKSPACE DUPLICATION: Using `COPY . .` after copying package.json files
#    causes pnpm to detect duplicate workspaces, resulting in the error:
#    "Failed to add workspace, it already exists at..."
#
# 2. MISSING PACKAGES: Some referenced packages might not exist in the repo
#    but are still expected by the workspace configuration.
#
# 3. DIRECTORY STRUCTURE: Creating proper directory structure before copying
#    files prevents "cannot copy to non-directory" errors.
#
# The solution uses a staged approach where we:
# - First create the directory structure
# - Copy only package.json files for dependency resolution
# - Create placeholder package.json files for missing packages
# - Install dependencies
# - Then copy the rest of the source code
# ============================================================================

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
# These files define the workspace structure and dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# IMPORTANT: Create directory structure for workspace packages BEFORE copying files
# This prevents "cannot copy to non-directory" errors that can occur when Docker
# tries to copy files to directories that don't exist yet
RUN mkdir -p apps/web apps/mobile packages/blockchain packages/shared packages/supabase packages/ui supabase/functions/notify supabase/functions/payments

# Copy package.json files for workspace packages
# We copy these individually rather than using COPY . . to avoid workspace duplication
# which causes the error: "Failed to add workspace, it already exists at..."
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/blockchain/package.json ./packages/blockchain/
COPY packages/shared/package.json ./packages/shared/
COPY packages/supabase/package.json ./packages/supabase/

# Create package.json for UI package if it doesn't exist in the repo
# CRITICAL: The name MUST match what's referenced in other packages ("@supa/ui")
# Using the wrong name here will cause dependency resolution errors like:
# "@supa/ui@workspace:* is in the dependencies but no package named @supa/ui is present"
RUN echo '{"name": "@supa/ui", "version": "1.0.0", "private": true}' > ./packages/ui/package.json

# Create empty package.json files for Supabase functions
# These directories exist but might not have package.json files
# Without these, the build will fail with "failed to calculate checksum" errors
RUN echo '{"name": "notify-function", "version": "1.0.0", "private": true}' > ./supabase/functions/notify/package.json && \
    echo '{"name": "payments-function", "version": "1.0.0", "private": true}' > ./supabase/functions/payments/package.json

# Install dependencies BEFORE copying the rest of the source code
# This allows Docker to cache the dependency installation step
# and only re-run it when package.json files change
RUN pnpm install

# Now copy the rest of the source code
# This happens AFTER dependency installation to leverage Docker's layer caching
# IMPORTANT: This won't cause workspace duplication because pnpm has already
# processed the workspace structure from the initial package.json files
COPY . .

# Make sure scripts are executable
# The link-packages.sh script is used in the prebuild step of the web app
RUN chmod +x scripts/link-packages.sh

# Build packages and app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm build

# ---- runner ----
# The runner stage creates a minimal production image with only the built application
# This significantly reduces the final image size by excluding development dependencies,
# source code, and build tools that are not needed at runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1

# Copy only the built application from the builder stage
# Next.js creates a standalone directory with all necessary files for production
COPY --from=builder /app/apps/web/.next/standalone ./

# Copy static assets and public files
# These paths must match the Next.js output directory structure
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Expose the port that the Next.js server will listen on
EXPOSE 3000

# Start the Next.js server
CMD ["node", "apps/web/server.js"]
