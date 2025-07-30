# 📆 OPS.md

## Questions

Questions for @RentinityDev:
* Do we need SOC2 or security audits for custodial infra?
* Will we need automated 1099s or K1s for investors?

Questions for @ahonnecke:
* Hosting: AWS? Render? Vercel?
* RPC: Alchemy, Infura, or QuickNode?
* Will we self-host an indexer or use The Graph?

## 🛠️ Hosting Strategy

### 🚀 Deployment Targets (for MVP and beyond)

| Layer          | Platform Options                       | Recommendation (MVP)              |
| -------------- | -------------------------------------- | --------------------------------- |
| Frontend       | Vercel, Render, Netlify, DigitalOcean  | **Vercel or Render**              |
| Backend (API)  | Render, DigitalOcean, Fly.io, AWS EC2  | **DigitalOcean (Droplet)**        |
| DB (Postgres)  | Supabase, Render, DigitalOcean Managed | **DigitalOcean Managed Postgres** |
| Workers / Cron | DigitalOcean, Fly.io, Render           | **DigitalOcean Docker container** |

### ✅ Why DigitalOcean?

* Predictable flat pricing
* Good Docker and bare-metal support
* Great for backend-heavy or compute-bound services
* CLI and Terraform support for infra-as-code

### ⚠️ Tradeoffs

* Requires managing SSL, scaling, logs, monitoring manually
* No built-in serverless functions or deploy UI

---

## 🔌 RPC Provider Strategy

### Options Considered:

| Provider  | Supports Polygon | Free Tier  | Enhanced APIs           | Notes                             |
| --------- | ---------------- | ---------- | ----------------------- | --------------------------------- |
| Alchemy   | ✅ Yes            | ✅ Generous | ✅ (webhooks, NFT, etc.) | Best dev UX + analytics           |
| Infura    | ✅ Yes            | ✅ Limited  | ✅                       | Ethereum-first, reliable fallback |
| QuickNode | ✅ Yes            | ✅ Limited  | ✅ (GraphQL, streams)    | Good multi-chain support          |

### MVP Plan:

* Use **Alchemy** for Polygon Mumbai + Mainnet
* Include webhook triggers for rent distributions, token mints
* Reassess after MVP if traffic exceeds free tier or multiple chains added

---

## 📊 Indexer Strategy

### What Does an Indexer Do?

An indexer is a service that listens to blockchain events and stores structured data for fast querying. Instead of scanning the blockchain manually every time you need:

* A wallet's token balance
* A history of transfers
* Governance votes by address
* Token ownership over time

...you use an indexer that has already parsed and stored that data in a queryable format (often via GraphQL or REST).

Indexers allow you to:

* Build fast, responsive dashboards
* Sync cap tables and payouts
* Run compliance snapshots and audits
* Reduce RPC overhead

### Options:

| Option                           | Pros                             | Cons                                          |
| -------------------------------- | -------------------------------- | --------------------------------------------- |
| **The Graph (hosted)**           | Easy to integrate, fast dev time | Only supports EVM; hosted is semi-centralized |
| **The Graph (self-hosted)**      | Full control, better scaling     | Requires infra ops + syncing overhead         |
| **Custom indexer (Node/Python)** | Full flexibility, tailored logic | Must write + host full sync logic             |

### MVP Plan:

* **Use The Graph (hosted service)** to index:

  * Token mints
  * Transfers
  * Governance votes
* Define subgraph schema for cap table syncing
* Use fallback polling from Alchemy RPC if Graph is unavailable

### Later Phase Option:

* Consider custom lightweight indexer for:

  * Rent payment reconciliation
  * Compliance audit logs
  * Ownership snapshots pre-trade

---

## ✅ Ops Next Steps

1. [ ] Set up Polygon Mumbai RPC via Alchemy
2. [ ] Deploy backend API on DigitalOcean Droplet
3. [ ] Configure frontend deploy on Vercel (or Render)
4. [ ] Deploy hosted Graph subgraph for token + transfer indexing
5. [ ] Define cap table structure + GraphQL schema for ownership tracking
6. [ ] Set up basic log monitoring (e.g. Logtail, Grafana, or DO metrics)

---

*Prepared: July 2025*

## ✅ Ops Next Steps

1. [ ] Set up Polygon Mumbai RPC on Alchemy
2. [ ] Create DigitalOcean Droplet for backend + API
3. [ ] Configure frontend deploy on Vercel (or Render)
4. [ ] Deploy first Graph subgraph to hosted service
5. [ ] Configure basic monitoring/logging for API

---

*Prepared: July 2025*
