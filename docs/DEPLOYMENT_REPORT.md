# DEPLOYMENT REPORT & PRODUCTION AUDIT — DOC-GROUNDED BUILDER AGENT

## 1. Release Overview & Cryptographic Provenance

- **Project:** Pharos Doc-Grounded Builder Agent
- **Arena Task:** [https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent](https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent)
- **Task Category:** Hard | Cross-tool / Advanced
- **Base Scoring:** 200 points
- **GitHub Repository:** [https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent](https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)
- **Production Commit SHA:** `b35065b4908b084073c5c8744dde93967efd4146`
- **Vercel Project Name:** `pharos-doc-grounded-builder-agent`
- **Canonical Production URL:** [https://pharos-doc-grounded-builder-agent.vercel.app](https://pharos-doc-grounded-builder-agent.vercel.app)
- **Direct Vercel Deployment URL:** `https://pharos-doc-grounded-builder-agent-6rdgcs935-jamism123.vercel.app`
- **Vercel Deployment ID:** `dpl_3mqh4HPsHeB81Tmfnnorf5Av4RNH`
- **Deployment Status:** `READY` / Fully Operational
- **Target Network:** Pharos Pacific Mainnet (Chain ID `1672`)
- **Official Docs MCP:** `https://docs.pharos.xyz/~gitbook/mcp`
- **Official Chain MCP:** `https://mcp.pharos.xyz/mcp`
- **Execution Date:** November 11, 2026

---

## 2. Production Smoke Test Verification

Live probes executed against `https://pharos-doc-grounded-builder-agent.vercel.app` confirmed:

### 2.1 Health Check (`/api/health`)
- **HTTP Status:** `200 OK`
- **Service Status:** `HEALTHY`
- **Docs MCP Status:** `ONLINE` (`docs.pharos.xyz MCP Server v0.28.0`)
- **Chain MCP Status:** `ONLINE` (`Pharos Pacific Mainnet 1672`, latest block verified live)

### 2.2 Workflow 1: MultiCall3 Contract State Query
- **Question:** `"How do I query live block timestamp and chain ID from MultiCall3 on Pharos?"`
- **Citations Retrieved:** [Canonical Contracts](https://docs.pharos.xyz/getting-started/canonical-contracts) (`0xcA11bde05977b3631167028862bE2a173976CA11`)
- **MCP Execution:** `eth_call` executed on MultiCall3 for `getCurrentBlockTimestamp()` and `getChainId()`.
- **Decoded Values:** Verified chain ID `1672` and live block timestamp.
- **Final Status:** `VERIFIED`

### 2.3 Workflow 2: Account Balance & Nonce Inspection
- **Question:** `"How do I check the native PROS balance and transaction count (nonce) of an address on Pharos?"`
- **Citations Retrieved:** [Block Explorer](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer), [Pharos MCP](https://docs.pharos.xyz/tooling-and-infrastructure/mcp)
- **MCP Execution:** `get_balance`, `get_transaction_count`, and `get_gas_price` against address `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`.
- **Values:** Confirmed `0 PROS`, nonce `5`, gas price `10 Gwei`.
- **Final Status:** `VERIFIED`

### 2.4 Workflow 3: Unsigned Transaction Preparation
- **Question:** `"How do I prepare a native PROS transfer on Pharos Pacific Mainnet?"`
- **Citations Retrieved:** [Pharos Skill Engine Guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide), [Pharos MCP Non-Custodial Specs](https://docs.pharos.xyz/tooling-and-infrastructure/mcp)
- **MCP Execution:** Gas price estimated at `10 Gwei`, gas limit simulated at `21000`.
- **Payload:** Raw unsigned transaction prepared for user signature review (`signed: false`, `broadcast: false`).
- **Final Status:** `AWAITING_USER_SIGNATURE`

### 2.5 Workflow 4: Unsupported Request Safety Refusal (Requirement 5)
- **Question:** `"How do I stake with Lido liquid staking on Pharos?"`
- **Docs MCP Query:** `"lido"` -> 0 documentation matches found.
- **Safety Enforcement:** Agent refused to improvise. Dispatched 0 Chain MCP calls.
- **Final Status:** `UNSUPPORTED`

---

## 3. Strict Boundary Compliance

1. **Non-Custodial Architecture:** Zero private keys or seed phrases requested or stored.
2. **Zero Automated Signing:** All state-changing operations stop before signature.
3. **Strict No-Mock Policy:** All data originates live from official Pharos endpoints.
4. **Zero State Mutation:** $0.00 spent across tests and deployment.
5. **Sibling Directory Isolation:** All 24 other workspaces in `C:\Users\NO GO NO\pharosbuild` remain completely untouched.
