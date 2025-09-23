#!/bin/bash

# Blockchain Testing Script for Rentinity Platform
# This script runs comprehensive tests for the blockchain integration

set -e

echo "🚀 Starting Blockchain Integration Tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install it with: npm install -g pnpm"
    exit 1
fi

print_status "Prerequisites check passed"

# Setup environment
echo "🔧 Setting up test environment..."

if [ ! -f .env ]; then
    cp .env.example .env
    print_warning "Created .env file from .env.example - please configure it"
fi

# Install dependencies using pnpm (handles workspace protocol)
echo "📦 Installing dependencies..."
pnpm install

print_status "Dependencies installed"

# Start test environment
echo "🐳 Starting test environment..."

# Stop any existing containers
docker compose -f docker-compose.dev.yaml down

# Start fresh containers
docker compose -f docker-compose.dev.yaml up -d hardhat-node

# Wait for Hardhat node to be ready
echo "⏳ Waiting for Hardhat node to start..."
sleep 10

# Check if Hardhat node is running
if ! curl -s http://localhost:8545 > /dev/null; then
    print_error "Hardhat node failed to start"
    docker compose -f docker-compose.dev.yaml logs hardhat-node
    exit 1
fi

print_status "Hardhat node is running"

# Run smart contract tests
echo "🧪 Running smart contract tests..."

cd packages/contracts

# Compile contracts
npm run build

# Run basic tests
echo "Running basic contract tests..."
if npm test; then
    print_status "Basic contract tests passed"
else
    print_error "Basic contract tests failed"
    exit 1
fi

# Run integration tests
echo "Running integration tests..."
if npm run test:integration; then
    print_status "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Run gas analysis
echo "Running gas analysis..."
if npm run test:gas; then
    print_status "Gas analysis completed"
else
    print_warning "Gas analysis had issues"
fi

cd ../..

# Deploy contracts to local network
echo "🚀 Deploying contracts to local network..."

cd packages/contracts

if npm run deploy:localhost; then
    print_status "Contracts deployed successfully"

    # Extract contract addresses from deployment
    FACTORY_ADDRESS=$(cat deployments/localhost.json | grep -o '"propertyTokenFactory":"[^"]*' | cut -d'"' -f4)
    echo "PropertyTokenFactory deployed at: $FACTORY_ADDRESS"

    # Update environment variable
    if [ -n "$FACTORY_ADDRESS" ]; then
        sed -i "s/NEXT_PUBLIC_PROPERTY_TOKEN_FACTORY_ADDRESS=.*/NEXT_PUBLIC_PROPERTY_TOKEN_FACTORY_ADDRESS=$FACTORY_ADDRESS/" ../../.env
        print_status "Updated factory address in .env"
    fi
else
    print_error "Contract deployment failed"
    exit 1
fi

cd ../..

# Test blockchain service
echo "🔧 Testing blockchain service..."

cd packages/blockchain

# Build the service
if npm run build; then
    print_status "Blockchain service built successfully"
else
    print_error "Blockchain service build failed"
    exit 1
fi

cd ../..

# Start web application for API testing
echo "🌐 Starting web application..."

# Start the web service
docker compose -f docker-compose.dev.yaml up -d postgres
sleep 5

# Wait for postgres to be ready
echo "⏳ Waiting for database..."
until docker compose -f docker-compose.dev.yaml exec postgres pg_isready -U postgres; do
    sleep 1
done

print_status "Database is ready"

# Run database migrations (if using Supabase locally)
# This would need to be adapted based on your Supabase setup

# Test API endpoints
echo "🧪 Testing API endpoints..."

# Start the Next.js app in background for testing
cd apps/web
npm run build
npm start &
WEB_PID=$!

# Wait for web server to start
echo "⏳ Waiting for web server..."
sleep 15

# Test health endpoint
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    print_status "Web server is running"
else
    print_warning "Web server health check failed"
fi

# Kill the web server
kill $WEB_PID 2>/dev/null || true

cd ../..

# Run end-to-end tests
echo "🎭 Running end-to-end tests..."

# This would run Playwright or Cypress tests
# For now, we'll just check that the blockchain page loads
print_warning "E2E tests not implemented yet - manual testing required"

# Cleanup
echo "🧹 Cleaning up..."

# Stop all containers
docker compose -f docker-compose.dev.yaml down

print_status "Test environment cleaned up"

# Summary
echo ""
echo "📊 Test Summary:"
echo "✅ Smart contract tests: PASSED"
echo "✅ Contract deployment: PASSED"
echo "✅ Blockchain service: PASSED"
echo "⚠️  API tests: MANUAL TESTING REQUIRED"
echo "⚠️  E2E tests: MANUAL TESTING REQUIRED"

echo ""
echo "🎉 Blockchain integration tests completed!"
echo ""
echo "📝 Next steps:"
echo "1. Run manual tests following BLOCKCHAIN_TESTING.md"
echo "2. Test with MetaMask on localhost:8545"
echo "3. Deploy to Mumbai testnet for full testing"
echo "4. Configure monitoring and alerts"

echo ""
echo "🔗 Useful commands:"
echo "  Start local blockchain: docker compose -f docker-compose.dev.yaml up hardhat-node"
echo "  Deploy contracts: cd packages/contracts && npm run deploy:localhost"
echo "  Run contract tests: cd packages/contracts && npm test"
echo "  Start web app: cd apps/web && npm run dev"

exit 0
