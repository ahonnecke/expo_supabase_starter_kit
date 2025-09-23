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

### Common Docker Build Issues

#### Module Not Found Errors

If you encounter "Module not found" errors:

1. Check that all package names in imports match the actual package names in `package.json` files
2. Verify that the package is listed in the dependencies section of the appropriate package.json

#### Directory Structure Errors

If you see errors like `cannot copy to non-directory`:

1. This is likely due to a conflict between a file and a directory in the Docker build process
2. Our Dockerfile creates the directory structure first with `mkdir -p` to avoid this issue
3. If the error persists, try running `docker system prune` to clean up Docker's cache

#### Stage Name Errors

If you see errors about missing stage names (like `failed to resolve source metadata for docker.io/library/builder:latest`):

1. Make sure all `COPY --from=X` statements reference a stage that exists in the Dockerfile
2. Check that stage names are consistent throughout the Dockerfile

### Environment Variables

If you see errors about missing environment variables:

1. Ensure your `.env` file exists and contains all required variables
2. Make sure the variables are passed correctly to Docker with `--build-arg` or through docker-compose

### Performance Tips

1. Use Docker's layer caching by organizing your Dockerfile from least to most frequently changing parts
2. Consider using Docker BuildKit: `export DOCKER_BUILDKIT=1` before building
3. For development, mount source code as volumes to avoid rebuilding the image for code changes

## CI/CD Integration

### GitHub Actions

For CI/CD pipelines using GitHub Actions:

```yaml
name: Docker Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Build Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: false
          build-args: |
            NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Best Practices

1. Always use specific versions for base images (e.g., `node:20.5.1-alpine` instead of `node:20-alpine`)
2. Consider using multi-platform builds for broader compatibility
3. Implement proper secret management for environment variables
4. Add automated testing as part of the CI/CD pipeline
