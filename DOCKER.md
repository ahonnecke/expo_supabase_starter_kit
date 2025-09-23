# Docker Build Instructions

This document provides instructions for building and running the Rentinity application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js and pnpm installed (for local development)
- Supabase credentials (for authentication and database)

## Docker Build Strategy

Our Docker build process uses a simple multi-stage approach to optimize build times:

1. **Base Stage**: Sets up the Node.js environment with pnpm
2. **Builder Stage**: Installs dependencies and builds the application
3. **Runner Stage**: Creates a minimal production image

This approach leverages Docker's layer caching to avoid reinstalling dependencies when only source code changes.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Building the Application

### Using NPM Scripts (Recommended)

We've created convenience scripts to make Docker builds easier:

```bash
# Build the Docker image
pnpm run docker:build

# Start the Docker containers
pnpm run docker:up

# Stop the Docker containers
pnpm run docker:down
```

### Manual Docker Commands

#### Building

To build the application manually:

```bash
docker build -t rentinity-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
  .
```

#### Running with Docker Compose

To run the application with Docker Compose:

```bash
# Build and start containers
docker compose up -d

# View logs
docker compose logs -f

# Stop containers
docker compose down
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
