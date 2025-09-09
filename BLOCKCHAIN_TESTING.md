# Blockchain Testing Guide

This guide covers how to test the blockchain integration for the Rentinity platform.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- MetaMask browser extension
- Test MATIC tokens (for Mumbai testnet)

## Testing Environments

### 1. Local Development Environment

Start the local blockchain and services:

```bash
# Start local Hardhat node and services
docker-compose -f docker-compose.dev.yaml up -d

# Or run Hardhat node directly
cd packages/contracts
npm install
npx hardhat node
```

The local Hardhat node will be available at `http://localhost:8545` with pre-funded test accounts.

### 2. Polygon Mumbai Testnet

For testing with the actual testnet:

1. Get Mumbai MATIC from faucets:
   - https://faucet.polygon.technology/
   - https://mumbaifaucet.com/

2. Configure MetaMask for Mumbai:
   - Network Name: Polygon Mumbai
   - RPC URL: https://rpc-mumbai.maticvigil.com
   - Chain ID: 80001
   - Symbol: MATIC
   - Block Explorer: https://mumbai.polygonscan.com

## Running Tests

### Smart Contract Tests

```bash
cd packages/contracts

# Install dependencies
npm install

# Run all tests
npm test

# Run specific test files
npx hardhat test test/PropertyToken.test.ts
npx hardhat test test/integration.test.ts

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run tests with coverage
npm run coverage
```

### API Integration Tests

```bash
cd apps/web

# Install dependencies
npm install

# Run API tests
npm run test:api

# Run specific blockchain API tests
npm test -- --testPathPattern=blockchain
```

### Frontend Component Tests

```bash
cd apps/web

# Run component tests
npm run test:components

# Run with watch mode
npm run test:watch
```

## Manual Testing Workflow

### 1. Property Token Creation (Admin)

1. **Setup Environment:**
   ```bash
   # Copy environment variables
   cp .env.example .env
   
   # Fill in required values:
   # - PRIVATE_KEY (admin wallet private key)
   # - POLYGON_MUMBAI_RPC_URL
   # - NEXT_PUBLIC_PROPERTY_TOKEN_FACTORY_ADDRESS (after deployment)
   ```

2. **Deploy Contracts:**
   ```bash
   cd packages/contracts
   
   # Deploy to local network
   npx hardhat run scripts/deploy.ts --network localhost
   
   # Deploy to Mumbai testnet
   npx hardhat run scripts/deploy.ts --network mumbai
   ```

3. **Create Property and Token:**
   - Login as admin user
   - Navigate to `/app/admin/properties`
   - Create or approve a property
   - Click "Create Blockchain Token" button
   - Verify token creation on block explorer

### 2. Token Minting (Investor)

1. **Make Investment:**
   - Login as regular user
   - Invest in an approved property
   - Note the investment amount and shares

2. **Connect Wallet:**
   - Navigate to `/app/blockchain`
   - Click "Connect Wallet"
   - Approve MetaMask connection
   - Ensure you're on the correct network (Mumbai)

3. **Mint Tokens:**
   - Find your investment in the table
   - Click "Mint Tokens"
   - Approve the transaction
   - Verify tokens in your wallet

### 3. Token Transfer Testing

1. **Setup KYC (Admin):**
   ```bash
   # Use Hardhat console to interact with contracts
   npx hardhat console --network mumbai
   
   # Get contract instance
   const factory = await ethers.getContractAt("PropertyTokenFactory", "FACTORY_ADDRESS");
   const tokenAddress = await factory.propertyIdToToken("PROPERTY_ID");
   const token = await ethers.getContractAt("PropertyToken", tokenAddress);
   
   # Set KYC status for addresses
   await token.setKycStatus("WALLET_ADDRESS", true);
   ```

2. **Test Transfers:**
   - Try transferring tokens before lockup (should fail)
   - Wait for lockup period or fast-forward in local environment
   - Transfer tokens between KYC-approved addresses
   - Try transferring to non-KYC address (should fail)

## Test Scenarios

### Happy Path Tests

1. **Complete Property Tokenization:**
   - [ ] Admin creates property
   - [ ] Admin approves property
   - [ ] Admin creates blockchain token
   - [ ] Investor makes investment
   - [ ] Investor connects wallet
   - [ ] Investor mints tokens
   - [ ] Tokens appear in wallet

2. **Token Trading:**
   - [ ] Both parties are KYC approved
   - [ ] Lockup period has passed
   - [ ] Transfer completes successfully
   - [ ] Balances update correctly

### Error Handling Tests

1. **Access Control:**
   - [ ] Non-admin cannot create tokens
   - [ ] Non-owner cannot mint tokens
   - [ ] Non-owner cannot set KYC status

2. **Business Logic:**
   - [ ] Cannot mint more tokens than shares owned
   - [ ] Cannot transfer during lockup period
   - [ ] Cannot transfer to non-KYC addresses
   - [ ] Cannot create duplicate property tokens

3. **Network Issues:**
   - [ ] Graceful handling of RPC failures
   - [ ] Transaction timeout handling
   - [ ] Gas estimation errors

## Debugging

### Common Issues

1. **"Transaction reverted" errors:**
   ```bash
   # Check transaction details
   npx hardhat run scripts/debug-transaction.ts --network mumbai
   ```

2. **MetaMask connection issues:**
   - Clear browser cache
   - Reset MetaMask account
   - Check network configuration

3. **Contract interaction failures:**
   - Verify contract addresses in environment
   - Check if contracts are deployed
   - Validate ABI matches deployed contract

### Logging and Monitoring

1. **Contract Events:**
   ```bash
   # Listen for contract events
   npx hardhat run scripts/listen-events.ts --network mumbai
   ```

2. **API Logs:**
   ```bash
   # Check API logs
   docker-compose logs web
   
   # Follow logs in real-time
   docker-compose logs -f web
   ```

3. **Database State:**
   ```sql
   -- Check property token addresses
   SELECT id, address, token_contract_address, metadata 
   FROM properties 
   WHERE token_contract_address IS NOT NULL;
   
   -- Check ownership records
   SELECT ol.*, p.address as property_address 
   FROM ownership_ledger ol 
   JOIN properties p ON ol.property_id = p.id;
   ```

## Performance Testing

### Load Testing Smart Contracts

```bash
cd packages/contracts

# Run gas optimization tests
npm run test:gas

# Benchmark contract operations
npm run benchmark
```

### API Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery run test/load-test.yml
```

## Security Testing

### Smart Contract Security

1. **Static Analysis:**
   ```bash
   # Install Slither
   pip install slither-analyzer
   
   # Run analysis
   slither packages/contracts/contracts/
   ```

2. **Formal Verification:**
   ```bash
   # Install Mythril
   pip install mythril
   
   # Analyze contracts
   myth analyze packages/contracts/contracts/PropertyToken.sol
   ```

### API Security Testing

1. **Authentication Tests:**
   - Test with invalid JWT tokens
   - Test with expired tokens
   - Test admin-only endpoints with regular users

2. **Input Validation:**
   - Test with malformed JSON
   - Test with SQL injection attempts
   - Test with XSS payloads

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Environment variables configured
- [ ] Backup and recovery procedures tested

### Deployment Steps

1. **Deploy Contracts:**
   ```bash
   # Deploy to testnet first
   npx hardhat run scripts/deploy.ts --network mumbai
   
   # Verify contracts
   npx hardhat verify --network mumbai FACTORY_ADDRESS OWNER_ADDRESS
   ```

2. **Update Configuration:**
   ```bash
   # Update environment variables
   export NEXT_PUBLIC_PROPERTY_TOKEN_FACTORY_ADDRESS="DEPLOYED_ADDRESS"
   
   # Update database
   # Add factory address to configuration table
   ```

3. **Deploy Application:**
   ```bash
   # Build and deploy
   docker-compose up -d
   
   # Verify deployment
   curl http://localhost:3000/api/health
   ```

### Post-deployment

- [ ] Smoke tests completed
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team training completed

## Troubleshooting

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "PropertyToken: addresses must be KYC whitelisted" | Transfer between non-KYC addresses | Set KYC status for both addresses |
| "PropertyToken: tokens are still in lockup period" | Transfer during lockup | Wait for lockup to expire |
| "PropertyTokenFactory: property ID already exists" | Duplicate property creation | Use unique property ID |
| "Admin access required" | Non-admin trying admin operation | Use admin account |
| "Cannot mint more tokens than shares owned" | Minting excess tokens | Check ownership records |

### Getting Help

1. Check the [blockchain package documentation](./packages/blockchain/README.md)
2. Review contract source code and comments
3. Check recent transactions on block explorer
4. Review application logs for detailed error messages

## Monitoring and Maintenance

### Key Metrics to Monitor

- Contract deployment success rate
- Token creation success rate
- Token minting success rate
- Transfer success rate
- Gas usage trends
- API response times

### Regular Maintenance Tasks

- Monitor contract gas usage
- Update RPC endpoints if needed
- Rotate private keys securely
- Update dependencies
- Review and update KYC whitelist
- Monitor for unusual transaction patterns
