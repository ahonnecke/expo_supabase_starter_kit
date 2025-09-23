#!/bin/bash

# This script builds the Docker image for the Rentinity application

set -e

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Please create one with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  exit 1
fi

# Load environment variables
source .env

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env file."
  exit 1
fi

# Parse command line arguments
DOCKERFILE="Dockerfile"
TARGET=""
TAG="rentinity-web"

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --multistage)
      DOCKERFILE="Dockerfile.multistage"
      shift
      ;;
    --target)
      TARGET="--target $2"
      shift
      shift
      ;;
    --tag)
      TAG="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build the Docker image
echo "Building Docker image with tag: $TAG"
echo "Using Dockerfile: $DOCKERFILE"
if [ -n "$TARGET" ]; then
  echo "Using target: $TARGET"
fi

docker build \
  -t "$TAG" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  $TARGET \
  -f "$DOCKERFILE" \
  .

echo "✅ Docker image built successfully: $TAG"
