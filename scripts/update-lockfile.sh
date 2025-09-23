#!/bin/bash

# This script updates the pnpm-lock.yaml file after changes to package.json files
# It should be run locally after adding or updating dependencies

echo "Updating pnpm-lock.yaml file..."

# Run pnpm install to update the lockfile
pnpm install

# Verify the lockfile was updated
if [ $? -eq 0 ]; then
  echo "✅ pnpm-lock.yaml updated successfully"
  echo "You can now commit the updated lockfile to the repository"
else
  echo "❌ Failed to update pnpm-lock.yaml"
  exit 1
fi

echo ""
echo "Note: After committing the updated lockfile, you can restore --frozen-lockfile in the Dockerfile"
echo "      for more reliable and faster CI/CD builds."
