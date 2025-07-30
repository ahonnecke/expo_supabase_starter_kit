# 📋 Next Steps: Polygon-Based NNN Fractional Real Estate Platform (Lofty Clone)

## 🧐 Vision

Build a real estate investment platform that enables fractional ownership in **NNN (Triple Net Lease)** properties with low-touch rental income and eventual liquidity. Start with 1–2 tokenized properties as proof of concept.

---

## 🪙 Blockchain

Base L2 and Polygon seem to be the leading contenders [see BLOCKCHAIN.md for details](https://github.com/ahonnecke/rentinity/blob/main/BLOCKCHAIN.md "BLOCKCHAIN")

---

## 🦁 Property & Investment Lifecycle (Lofty.ai-style)

### 1. 📜 Seller Onboarding

* Seller creates an account on the platform.
* Seller profile is KYC’d and verified.

### 2. 🏢 Entity Formation

* The platform forms a **Wyoming Series LLC**.

  * Option A: One LLC per property
  * Option B: Master LLC with Series for each property

### 3. 🏠 Property Transfer

* Seller transfers the deed to the new LLC.
* Title insurance and verification handled by internal legal team or partner.

### 4. 🧹 Tokenization & Lockup

* The LLC issues **ERC-20 tokens** on Polygon representing fractional ownership.
* Example: 100,000 tokens = 100% of the property.
* Tokens may be subject to a **60-day lockup** before becoming tradable.
* Transfer restrictions may be enforced by smart contract (e.g. whitelisting).
* Cap table must be tracked on-chain and/or mirrored off-chain.

### 5. 💸 Profit Disbursement

* Clarify how proceeds from token sales are distributed:

  * Option A: Proceeds go to the LLC, then disbursed to seller after expenses
  * Option B: Seller receives upfront payment from platform; platform keeps token proceeds
  * Option C: Seller keeps some tokens and only partially liquidates
  * Option D: Other?
* @RentinityDev: Finalize which model fits our investor, legal, and cash flow needs

### 6. 💸 Offering Launch

* Property listing goes live on the marketplace with:

  * Offering circular / PPM
  * Tenant and lease info
  * Yield, rent amount, cap rate, valuation
* Investors can:

  * Buy tokens via USDC, ACH, or card
  * Hold them in a Polygon wallet (or abstract wallet)

### 7. 🏦 Rent Collection & Distribution

* Rent flows from tenant → property LLC → platform escrow → investors
* Monthly USDC or fiat distribution sent based on token ownership %

### 8. 🔄 Secondary Trading (Future)

* After lockup (e.g., 60 days), tokens become tradeable:

  * Internal order book
  * Or integrated with licensed ATS (like tZERO or Securitize)

### 9. 🔠 Governance

* Token holders will be able to vote on major events (property sale, lease renewals, etc.)
* This may not be in the MVP but should be scoped as a phase 2 feature
* Voting may be implemented off-chain initially with token-weighted logic
* @RentinityDev: Confirm legal framework for investor governance rights

---

## 🔮 Tokenomics Strategy

* Default: 100,000 tokens = 100% of a property
* Token price fixed? (e.g., \$50 or \$100 per token)
* Platform may:
  * Retain a portion as fee or carry
  * Mint more tokens if recapitalization needed
  * Lock team-held tokens with vesting schedule
* @RentinityDev: Align on pricing model, liquidity buffer, and carry structure

---

## 🧪 MVP Proposal: Start Off-Chain

| Step | Component           | Off-Chain Approach                          |
| ---- | ------------------- | ------------------------------------------- |
| 1    | Account creation    | Email + password login                      |
| 2    | KYC                 | Alloy, Persona, or Stripe Identity          |
| 3    | Property onboarding | Manual LLC formation + form-based intake    |
| 4    | Investment ledger   | PostgreSQL ownership table                  |
| 5    | Rent distributions  | Stripe Treasury or ACH                      |
| 6    | Governance          | Weighted email-based or dashboard voting    |
| 7    | Cap Table           | Simple DB table mapping tokens to investors |

This will help validate:

* Investor appetite
* Legal workflow
* Seller interest
* Rent payout UX

---

## ⚠️ Internal Question: Why Blockchain?

> "Why does this platform **need to be on a blockchain now**?"

Questions for @RentinityDev:

* Is transparency of ownership a differentiator or a burden?
* Are investors comfortable with wallets and token custody?
* Is rent distribution more efficient via crypto or ACH/fiat?
* Is there a near-term plan for **liquidity** that blockchain enables?

Plan:

* Start off-chain, launch with 1–2 LLC-backed properties
* Transition to Polygon when:

  * Rent flow is stable
  * Liquidity becomes a real ask
  * Wallet abstraction is proven out

---

## 🔹 Blockchain Interaction Models

### Option 1: Direct-to-Blockchain (Wallet-Based, Web3 Native)

* Users interact directly with smart contracts via wallet
* Tools: Wagmi, RainbowKit, MetaMask

Pros:

* User self-custody
* Transparent ownership
* Real-time tx + governance

Cons:

* UX friction for mainstream users
* Gas cost exposure
* KYC + transfer restriction complexity

### Option 2: Backend-Managed (API-Led, Web2 UX)

* Frontend only talks to API; API handles on-chain writes
* Wallets may be Fireblocks, Web3Auth, Biconomy-based

Questions for @RentinityDev:

* What happens in case of user account deletion or fraud?

Questions for @ahonnecke:

* Who controls the keys to user wallets?
* Can users export keys or withdraw tokens?
* Will wallets be whitelisted or KYC-gated?
* How do we handle gas for backend-signed transactions?

Pros:

* Web2-style UX
* Full KYC + compliance control

Cons:

* Custody risk
* Key management complexity
* Limited user control unless we support withdrawal

---

## 🔢 Operational Questions (For Later Phases)

[See OPS.md](https://github.com/ahonnecke/rentinity/blob/main/BLOCKCHAIN.md "ops")

---

## ✅ Immediate Next Steps

### @RentinityDev
1. [ ] Finalize jurisdiction + legal counsel for LLC formation (Wyoming?)

### @ahonnecke
1. [ ] Choose off-chain MVP stack (e.g., Supabase + Stripe + React)
1. [ ] Build smart contract PoC on Polygon Mumbai
1. [ ] Create investor-facing dashboard for fake token balances

### @all
1. [ ] Internal call to align on blockchain justification + phasing

---

## 📌 Resources

* [Polygon Docs](https://docs.polygon.technology/)
* [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
* [Hardhat](https://hardhat.org/)
* [Lofty.ai Whitepaper](https://www.lofty.ai/learn)

---

*Prepared: July 2025*
