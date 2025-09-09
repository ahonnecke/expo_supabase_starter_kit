.PHONY: setup.all setup.create-project setup.link setup.link-and-migrate sb.run-migrations sb.reset-db sb.local-start sb.local-stop sb.sync-config sb.list-migrations sb.login sb.logout sp.login sp.logout sb.migration-status docker.up docker.down docker.build docker.dev docker.logs docker.clean dev.all dev.web dev.mobile dev.install dev.typecheck dev.test dev.lint dev.format blockchain.install blockchain.compile blockchain.test blockchain.test-integration blockchain.test-gas blockchain.deploy-local blockchain.deploy-mumbai blockchain.node blockchain.console-local blockchain.console-mumbai blockchain.verify blockchain.test-all clean.all clean.node-modules clean.docker clean.blockchain test.all test.contracts test.api test.e2e lint.all format.all help

# Default Supabase CLI command
SUPABASE_CMD := npx supabase

# Login to Supabase
sb.login:
	@echo "Running Supabase login..."
	$(SUPABASE_CMD) login

# Logout from Supabase
sb.logout:
	@echo "Logging out from Supabase..."
	$(SUPABASE_CMD) logout

# Sync config from remote project
sb.sync-config:
	@echo "Syncing config from remote project..."
	$(SUPABASE_CMD) db pull

# Reset database and run all migrations
sb.reset-db:
	@echo "Resetting database and running all migrations..."
	$(SUPABASE_CMD) db reset

# Start local Supabase
sb.local-start:
	@echo "Starting local Supabase..."
	$(SUPABASE_CMD) start

# Stop local Supabase
sb.local-stop:
	@echo "Stopping local Supabase..."
	$(SUPABASE_CMD) stop

# List migrations
sb.list-migrations:
	@echo "Listing migrations..."
	$(SUPABASE_CMD) migration list

# Check migration status
sb.migration-status:
	@echo "Checking migration status..."
	$(SUPABASE_CMD) migration status

# Create a new Supabase project (always interactive)
setup.create-project:
	@echo "Creating new Supabase project..."
	python3 ./tools/scripts/create-project.py

# Link to existing project
setup.link:
	@echo "Linking to Supabase project..."
	python3 ./tools/scripts/link.py

# Apply migrations to linked project
sb.run-migrations:
	@echo "Applying migrations to Supabase project..."
	python3 ./tools/scripts/migrate.py

# Link and run migrations in one step
setup.link-and-migrate:
	@echo "Linking to project and applying migrations..."
	python3 ./tools/scripts/link-and-migrate.py

# Complete setup (create project, link, configure, and run migrations)
setup.all: setup.create-project setup.link-and-migrate
	@echo "Supabase setup complete!"

# Docker commands
docker.up:
	@echo "Starting Docker containers..."
	docker compose up -d web

# Build and start Docker containers
docker.build:
	@echo "Building and starting Docker containers..."
	docker compose up --build web

# Stop Docker containers
docker.down:
	@echo "Stopping Docker containers..."
	docker compose down

# Install dependencies
dev.install:
	@echo "Installing dependencies..."
	pnpm install

# Run development servers
dev.all:
	@echo "Starting development servers..."
	pnpm dev

# Run web development server
dev.web:
	@echo "Starting web development server..."
	pnpm --filter web dev

# Run mobile development server
dev.mobile:
	@echo "Starting mobile development server..."
	pnpm --filter mobile dev

# Run TypeScript checks
dev.typecheck:
	@echo "Running TypeScript checks..."
	pnpm typecheck

# Run tests
dev.test:
	@echo "Running tests..."
	pnpm test

# Run linting
dev.lint:
	@echo "Running linting..."
	pnpm lint

# Run formatting
dev.format:
	@echo "Running code formatting..."
	pnpm format

# ===== BLOCKCHAIN COMMANDS =====

# Install blockchain dependencies
blockchain.install:
	@echo "Installing blockchain dependencies..."
	pnpm install
	cd packages/contracts && npm install
	cd packages/blockchain && npm install

# Compile smart contracts
blockchain.compile:
	@echo "Compiling smart contracts..."
	cd packages/contracts && npm run build

# Run smart contract tests
blockchain.test:
	@echo "Running smart contract tests..."
	cd packages/contracts && npm test

# Run integration tests
blockchain.test-integration:
	@echo "Running blockchain integration tests..."
	cd packages/contracts && npm run test:integration

# Run gas analysis tests
blockchain.test-gas:
	@echo "Running gas analysis..."
	cd packages/contracts && npm run test:gas

# Run all blockchain tests
blockchain.test-all: blockchain.test blockchain.test-integration blockchain.test-gas
	@echo "All blockchain tests completed!"

# Start local Hardhat node
blockchain.node:
	@echo "Starting local Hardhat node..."
	cd packages/contracts && npm run node

# Deploy contracts to localhost
blockchain.deploy-local:
	@echo "Deploying contracts to localhost..."
	cd packages/contracts && npm run deploy:localhost

# Deploy contracts to Mumbai testnet
blockchain.deploy-mumbai:
	@echo "Deploying contracts to Mumbai testnet..."
	cd packages/contracts && npm run deploy:mumbai

# Open Hardhat console for localhost
blockchain.console-local:
	@echo "Opening Hardhat console for localhost..."
	cd packages/contracts && npm run console:localhost

# Open Hardhat console for Mumbai
blockchain.console-mumbai:
	@echo "Opening Hardhat console for Mumbai..."
	cd packages/contracts && npm run console:mumbai

# Verify contracts on Mumbai
blockchain.verify:
	@echo "Verifying contracts on Mumbai..."
	cd packages/contracts && npm run verify:mumbai

# ===== DOCKER COMMANDS (ENHANCED) =====

# Start development environment with blockchain
docker.dev:
	@echo "Starting development environment with blockchain..."
	docker compose -f docker-compose.dev.yaml up -d

# View Docker logs
docker.logs:
	@echo "Viewing Docker logs..."
	docker compose logs -f

# Clean Docker containers and volumes
docker.clean:
	@echo "Cleaning Docker containers and volumes..."
	docker compose down -v
	docker compose -f docker-compose.dev.yaml down -v
	docker system prune -f

# ===== TESTING COMMANDS =====

# Run all tests
test.all: test.contracts test.api
	@echo "All tests completed!"

# Run contract tests
test.contracts:
	@echo "Running smart contract tests..."
	./scripts/test-blockchain.sh

# Run API tests
test.api:
	@echo "Running API tests..."
	cd apps/web && npm run test:api

# Run E2E tests (placeholder)
test.e2e:
	@echo "Running E2E tests..."
	@echo "⚠️  E2E tests not implemented yet"

# ===== LINTING AND FORMATTING =====

# Run all linting
lint.all:
	@echo "Running linting for all packages..."
	pnpm lint
	cd packages/contracts && npm run lint || echo "No lint script in contracts"
	cd packages/blockchain && npm run lint || echo "No lint script in blockchain"

# Format all code
format.all:
	@echo "Formatting all code..."
	pnpm format || echo "No format script in root"
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"

# ===== CLEANUP COMMANDS =====

# Clean all node_modules
clean.node-modules:
	@echo "Cleaning all node_modules..."
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
	find . -name "package-lock.json" -delete
	find . -name "yarn.lock" -delete

# Clean blockchain artifacts
clean.blockchain:
	@echo "Cleaning blockchain artifacts..."
	cd packages/contracts && rm -rf artifacts cache typechain-types deployments || true

# Clean everything
clean.all: clean.node-modules clean.blockchain docker.clean
	@echo "Cleaned everything!"

# ===== QUICK START COMMANDS =====

# Full setup for new developers
setup.dev: dev.install blockchain.install blockchain.compile
	@echo "Development environment setup complete!"
	@echo "Next steps:"
	@echo "1. Configure your .env file"
	@echo "2. Run 'make sb.local-start' to start Supabase"
	@echo "3. Run 'make blockchain.node' to start local blockchain"
	@echo "4. Run 'make dev.web' to start the web app"

# Quick blockchain setup
setup.blockchain: blockchain.install blockchain.compile blockchain.deploy-local
	@echo "Blockchain setup complete!"

# Start full development environment
start.dev: sb.local-start docker.dev
	@echo "Full development environment started!"
	@echo "Services running:"
	@echo "- Supabase: http://localhost:54323"
	@echo "- Hardhat node: http://localhost:8545"
	@echo "- PostgreSQL: localhost:5432"

# Stop full development environment
stop.dev: sb.local-stop docker.down
	@echo "Development environment stopped!"

# ===== DEPLOYMENT COMMANDS =====

# Deploy to production (placeholder)
deploy.prod:
	@echo "Deploying to production..."
	@echo "⚠️  Production deployment not configured yet"

# Deploy contracts to mainnet (placeholder)
deploy.mainnet:
	@echo "⚠️  Mainnet deployment requires careful review!"
	@echo "This command is intentionally not implemented for safety"

# ===== MAINTENANCE COMMANDS =====

# Update all dependencies
update.deps:
	@echo "Updating dependencies..."
	pnpm update
	cd packages/contracts && npm update
	cd packages/blockchain && npm update

# Security audit
audit.security:
	@echo "Running security audit..."
	pnpm audit
	cd packages/contracts && npm audit
	cd packages/blockchain && npm audit

# Check outdated packages
check.outdated:
	@echo "Checking for outdated packages..."
	pnpm outdated || true
	cd packages/contracts && npm outdated || true
	cd packages/blockchain && npm outdated || true

# Help command
help:
	@echo "🚀 RENTINITY DEVELOPMENT COMMANDS"
	@echo ""
	@echo "📋 QUICK START:"
	@echo "  make setup.dev          - Full setup for new developers"
	@echo "  make start.dev          - Start full development environment"
	@echo "  make stop.dev           - Stop development environment"
	@echo "  make setup.blockchain   - Quick blockchain setup"
	@echo ""
	@echo "🏗️  SETUP COMMANDS:"
	@echo "  make setup.all          - Complete Supabase setup"
	@echo "  make setup.create-project - Create new Supabase project"
	@echo "  make setup.link         - Link to existing Supabase project"
	@echo "  make setup.link-and-migrate - Link and run migrations"
	@echo ""
	@echo "🗄️  SUPABASE COMMANDS:"
	@echo "  make sb.login           - Login to Supabase"
	@echo "  make sb.logout          - Logout from Supabase"
	@echo "  make sb.local-start     - Start local Supabase"
	@echo "  make sb.local-stop      - Stop local Supabase"
	@echo "  make sb.reset-db        - Reset database and run migrations"
	@echo "  make sb.run-migrations  - Apply migrations to project"
	@echo "  make sb.sync-config     - Sync config from remote"
	@echo "  make sb.list-migrations - List all migrations"
	@echo ""
	@echo "⛓️  BLOCKCHAIN COMMANDS:"
	@echo "  make blockchain.install - Install blockchain dependencies"
	@echo "  make blockchain.compile - Compile smart contracts"
	@echo "  make blockchain.test    - Run contract tests"
	@echo "  make blockchain.test-all - Run all blockchain tests"
	@echo "  make blockchain.node    - Start local Hardhat node"
	@echo "  make blockchain.deploy-local - Deploy to localhost"
	@echo "  make blockchain.deploy-mumbai - Deploy to Mumbai testnet"
	@echo "  make blockchain.console-local - Open Hardhat console (local)"
	@echo "  make blockchain.console-mumbai - Open Hardhat console (Mumbai)"
	@echo "  make blockchain.verify  - Verify contracts on Mumbai"
	@echo ""
	@echo "🐳 DOCKER COMMANDS:"
	@echo "  make docker.up          - Start Docker containers"
	@echo "  make docker.build       - Build and start containers"
	@echo "  make docker.dev         - Start dev environment with blockchain"
	@echo "  make docker.down        - Stop Docker containers"
	@echo "  make docker.logs        - View Docker logs"
	@echo "  make docker.clean       - Clean containers and volumes"
	@echo ""
	@echo "💻 DEVELOPMENT COMMANDS:"
	@echo "  make dev.install        - Install all dependencies"
	@echo "  make dev.all            - Start all development servers"
	@echo "  make dev.web            - Start web development server"
	@echo "  make dev.mobile         - Start mobile development server"
	@echo "  make dev.typecheck      - Run TypeScript checks"
	@echo "  make dev.test           - Run tests"
	@echo "  make dev.lint           - Run linting"
	@echo "  make dev.format         - Format code"
	@echo ""
	@echo "🧪 TESTING COMMANDS:"
	@echo "  make test.all           - Run all tests"
	@echo "  make test.contracts     - Run smart contract tests"
	@echo "  make test.api           - Run API tests"
	@echo "  make test.e2e           - Run E2E tests"
	@echo ""
	@echo "🔧 CODE QUALITY:"
	@echo "  make lint.all           - Run linting for all packages"
	@echo "  make format.all         - Format all code"
	@echo ""
	@echo "🧹 CLEANUP COMMANDS:"
	@echo "  make clean.all          - Clean everything"
	@echo "  make clean.node-modules - Clean all node_modules"
	@echo "  make clean.blockchain   - Clean blockchain artifacts"
	@echo "  make clean.docker       - Clean Docker containers/volumes"
	@echo ""
	@echo "🚀 DEPLOYMENT COMMANDS:"
	@echo "  make deploy.prod        - Deploy to production (placeholder)"
	@echo "  make deploy.mainnet     - Deploy contracts to mainnet (disabled)"
	@echo ""
	@echo "🔧 MAINTENANCE COMMANDS:"
	@echo "  make update.deps        - Update all dependencies"
	@echo "  make audit.security     - Run security audit"
	@echo "  make check.outdated     - Check for outdated packages"
	@echo ""
	@echo "📚 COMMON WORKFLOWS:"
	@echo "  New Developer Setup:"
	@echo "    1. make setup.dev"
	@echo "    2. Configure .env file"
	@echo "    3. make start.dev"
	@echo "    4. make dev.web"
	@echo ""
	@echo "  Blockchain Development:"
	@echo "    1. make blockchain.node (in separate terminal)"
	@echo "    2. make blockchain.deploy-local"
	@echo "    3. make blockchain.test-all"
	@echo ""
	@echo "  Testing Everything:"
	@echo "    1. make test.all"
	@echo "    2. make lint.all"
	@echo "    3. make audit.security"
