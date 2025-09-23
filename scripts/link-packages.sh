#!/bin/bash

# This script links the workspace packages for Docker builds
# It should be run before the Next.js build process
#
# why do we even need this file?

echo "Linking workspace packages for Docker build..."

# Function to link a package
link_package() {
  local package_name=$1
  local package_path=$2
  local target_path=$3

  echo "Linking $package_name..."

  # Create target directory
  mkdir -p $target_path

  # Check if the package has a dist directory (compiled output)
  if [ -d "$package_path/dist" ]; then
    echo "  - Copying dist directory"
    mkdir -p $target_path/dist
    cp -r $package_path/dist/* $target_path/dist/
  fi

  # Copy source files
  if [ -d "$package_path/src" ]; then
    echo "  - Copying src directory"
    mkdir -p $target_path/src
    cp -r $package_path/src/* $target_path/src/
  fi

  # Copy package.json
  echo "  - Copying package.json"
  cp $package_path/package.json $target_path/

  echo "  ✓ $package_name linked successfully"
}

# Link blockchain package
link_package "@rentinity/blockchain" "packages/blockchain" "apps/web/node_modules/@rentinity/blockchain"

# Link shared package
link_package "@supa/shared" "packages/shared" "apps/web/node_modules/@supa/shared"

# Link supabase package
link_package "@supa/supabase" "packages/supabase" "apps/web/node_modules/@supa/supabase"

# Link UI package
link_package "@supa/ui" "packages/ui" "apps/web/node_modules/@supa/ui"

echo "All workspace packages linked successfully!"
