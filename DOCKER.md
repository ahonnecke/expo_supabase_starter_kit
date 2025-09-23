# Docker Build Instructions

This document provides instructions for building and running the Rentinity application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js and pnpm installed (for local development)
- Supabase credentials (for authentication and database)

## Docker Build Strategy

Our Docker build process uses a layered approach to optimize build times:

1. **Dependencies Layer**: First copies only package.json files and installs dependencies
2. **Source Layer**: Then copies the rest of the source code
3. **Build Layer**: Builds packages and the web application

This approach leverages Docker's layer caching to avoid reinstalling dependencies when only source code changes.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Building the Application

### Using NPM Scripts (Recommended)

We've created several convenience scripts to make Docker builds easier:

```bash
# Standard build (uses Dockerfile)
pnpm run docker:build

# Development build (uses Dockerfile.multistage with dev-builder target)
pnpm run docker:build:dev

# Production build (uses Dockerfile.multistage with runner target)
pnpm run docker:build:prod

# Build with automatic lockfile update if needed
pnpm run docker:build:update
```

These scripts will automatically:
1. Check if your .env file exists and has the required variables
2. Verify if the lockfile is up to date
3. Build the Docker image with the appropriate configuration

### Manual Docker Commands

#### Standard Build

To build the application using the standard Dockerfile:

```bash
docker build -t rentinity-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
  .
```

#### Multi-stage Build

For more flexibility, you can use the multi-stage Dockerfile:

```bash
# Development build
docker build -t rentinity-web-dev \
  --target dev-builder \
  -f Dockerfile.multistage \
  .

# Production build
docker build -t rentinity-web-prod \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
  -f Dockerfile.multistage \
  .
```

### Using Docker Compose

For convenience, you can use Docker Compose to build and run the application:

```bash
# Development build
docker-compose -f docker-compose.build.yaml up web-dev

# Production build
docker-compose -f docker-compose.build.yaml up web-prod
```

## Updating Dependencies

### Adding or Updating Dependencies

To add or update dependencies:

```bash
# Add a new dependency
pnpm add <package-name> --filter <workspace>

# Update a dependency
pnpm update <package-name> --filter <workspace>

# Example: Add React to the web app
pnpm add react --filter web
```

After updating dependencies, commit the updated `pnpm-lock.yaml` file to the repository.

### Best Practices

1. Always commit the updated lockfile to the repository to ensure consistent builds
2. Use the development build target (`dev-builder`) during development for faster builds
3. Keep dependencies up to date to avoid security vulnerabilities

### Docker Caching

Our Docker build process is designed to leverage caching effectively:

- If only source code changes, dependencies won't be reinstalled
- If package.json files change, only the dependencies layer will be rebuilt
- Full rebuilds happen only when necessary

## Troubleshooting

### Module Not Found Errors

If you encounter "Module not found" errors during the build, it might be due to workspace package linking issues. The build process should handle this automatically, but if you're still having issues:

1. Check that all package names in imports match the actual package names in `package.json` files
2. Make sure the directory structure is created before copying files

### Directory Structure Errors

If you see errors like `cannot copy to non-directory`, this typically means there's a conflict between a file and a directory. Our Dockerfile is designed to avoid this by:

1. Creating the directory structure first with `mkdir -p`
2. Installing dependencies before copying the source code
3. Avoiding the use of the `link-packages.sh` script during the Docker build

### Dependency Installation Errors

If you encounter errors during dependency installation:

1. Make sure your `pnpm-lock.yaml` file is up to date with your package.json files
2. Check for incompatible dependencies between packages
3. Try clearing your local pnpm cache: `pnpm store prune`

### Build Performance

If Docker builds are slow:

1. Make sure you're leveraging Docker's layer caching
2. Use the development build for faster iteration: `pnpm run docker:build:dev`
3. Consider using Docker BuildKit: `export DOCKER_BUILDKIT=1` before building

## CI/CD Integration

For CI/CD pipelines, use the production build with the `--frozen-lockfile` flag to ensure consistent builds. Make sure to update and commit the lockfile whenever dependencies change.
