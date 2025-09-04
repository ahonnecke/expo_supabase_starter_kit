# 🧭 ROADMAP.md — Web3 Real Estate MVP

## 🎯 Goal

Create an MVP for a fractionalized NNN real estate platform with:
- Web2-compatible UX (email login, fiat UX)
- Polygon tokenization layer (ERC20 or ERC1404-style)
- Initial off-chain investor ledger using Supabase
- PoC blockchain integration using ConsenSys tooling

---

## ✅ Phase 0: Project Scaffolding

### 0.1 Initialize Monorepo (if needed)
- Tool: `pnpm`, `turborepo`, or `nx`
- Structure: `/apps/web`, `/apps/api`, `/packages/contracts`

### 0.2 Supabase Setup
- Create Supabase project
- Auth: Email/password, optional OAuth
- Tables:
  - `users`
  - `properties`
  - `ownership_ledger`
  - `llcs`
  - `transactions`

---

## 🧪 Phase 1: Off-Chain MVP

### 1.1 Account Creation & KYC
- Email/password login
- KYC provider integration (e.g., Persona, Alloy, Stripe Identity)

### 1.2 Property Onboarding Flow
- Form to capture:
  - Address, price, lease term, tenant info, yield
- Admin dashboard to approve and mint

### 1.3 Ownership Ledger (Postgres)
- Manual investor assignment (e.g., John owns 1,000 tokens)
- Table: `ownership_ledger (user_id, property_id, shares_owned)`

### 1.4 Rent Distribution
- Simulate monthly rent in `USD`
- Supabase cron + Stripe payouts to simulate yield

---

## 🔁 Phase 2: Smart Contract Integration

### 2.1 Set Up Contracts Package
- Use Hardhat or Foundry
- Write ERC20 or ERC1404-compliant token contract
- Add basic KYC whitelist (if enforcing security token rules)

### 2.2 Choose RPC Provider
- Pick from: **Alchemy**, **Infura**, or **QuickNode**
- Configure `.env`:
  ```env
  RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/KEY
  PRIVATE_KEY=...
  ```

### 2.3 Deploy to Polygon Testnet
- Target: **Polygon Mumbai**
- Deploy token contract per property

### 2.4 Write Blockchain Service (API)
- Node.js or Next.js API routes
- Functions:
  - `mintTokens(address, amount)`
  - `transferTokens(address, amount)`
  - `getBalance(address)`

---

## 🌐 Phase 3: Frontend Web3 Integration

### 3.1 Wallet Connectors
- Use `wagmi` + `RainbowKit` or `web3modal`
- Allow wallet connection via MetaMask, Coinbase Wallet

### 3.2 Read-Only Mode (for all users)
- Query token balances using `viem` or `ethers.js`
- Display:
  - Owned tokens
  - Monthly yield
  - Governance status

### 3.3 Admin Mode: Token Minting
- Button to mint tokens for testnet wallet
- Log events in Supabase `transactions` table

---

## 🧱 Phase 4: Governance & Compliance

### 4.1 Lockup Period Enforcement
- Either off-chain tracking
- Or `ERC1404`-style smart contract with `transferRestriction`

### 4.2 Voting Module (Optional MVP)
- Off-chain (Supabase) weighted voting UI:
  - One token = one vote
  - Periodic proposals with snapshot logic

---

## 🪙 Phase 5: On-Chain Transition Strategy

### 5.1 Mirror Postgres → Polygon
- Batch issue tokens to wallets when onboarding complete
- Start migrating ownership ledger

### 5.2 Custody Model Decision
- Abstract wallet (Web3Auth)
- Custodial (Fireblocks, Magic.link)
- Non-custodial (MetaMask + recovery UX)

---

## ⚙️ Ops Setup

### 6.1 DevOps
- CI/CD: GitHub Actions + Supabase CLI + Hardhat
- Secrets: `.env`, 1Password vault, or Doppler

### 6.2 Hosting
- **Frontend**: Vercel or DigitalOcean App Platform
- **API/Indexer**: DigitalOcean Droplet or Fly.io
- **Contracts**: Deployed via CLI, not hosted

---

## 🔎 Future Additions

- Automated rent escrow + payouts via USDC
- Full on-chain governance (snapshot, quorum, veto)
- Security token license (Reg A+/Reg D integration)
- Integration with secondary markets (e.g. tZERO, Securitize)

---

## 📝 Questions for LLMs

- Should we issue one token contract per property, or use a registry pattern?
- What contract pattern best supports KYC + transfer restrictions?
- What’s the best way to enforce lockups off-chain and on-chain?
- How do we abstract wallets while allowing user token withdrawals?
