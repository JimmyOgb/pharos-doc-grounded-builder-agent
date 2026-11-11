# PHASE 1 — OFFICIAL TASK AND RESOURCE AUDIT

## 1. Official Task Metadata

- **Task Name:** Doc-Grounded Builder Agent
- **Task URL:** [https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent](https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent)
- **Difficulty Tier:** Hard
- **Category:** Cross-tool / Advanced
- **Base Scoring:** 200 points
- **Bonus Scoring:** +50 points with qualifying demo video
- **Max Potential:** 250 points
- **Official Host Platforms:** `ai.pharos.xyz`, `DevHub`, `Agent-Native Pharos`
- **Product Concept:** An agent that answers "How do I do X on Pharos?" end-to-end: finds the answer in Developer Docs MCP, cites sources, explains steps, converts them into a structured execution plan, actually does X using Chain MCP and/or SkillEngine, and verifies the result on-chain against the plan.

---

## 2. The Five Judging Requirements

| # | Official Requirement | Criteria & Verification Bar |
|---|---|---|
| **01** | **Uses Docs MCP to plan, with sources cited, before acting** | The agent must query the official Docs MCP (`https://docs.pharos.xyz/~gitbook/mcp`), preserve source titles and canonical URLs (`https://docs.pharos.xyz/...`), cite them directly, explain prerequisites and parameters, and construct a structured execution plan *before* initiating any action. Fallbacks or searches alone without plan synthesis do not qualify. |
| **02** | **Executes the plan with Chain MCP and/or SkillEngine; anything that moves funds is prepared for signature** | Execute the plan using official Chain MCP (`https://mcp.pharos.xyz/mcp`) and/or SkillEngine. Read operations execute directly and capture raw/decoded telemetry. State-changing actions (fund transfers, approvals, contract mutations) strictly prepare an unsigned transaction with full calldata, gas estimates, nonces, and parameters for external user signature. Zero automated signing or broadcasting. |
| **03** | **Verifies the outcome on chain and reports success or failure against the plan** | After execution or preparation, the agent independently checks the live on-chain state or receipt against expected plan parameters. Produces a planned vs. actual outcome report with explicit status (`VERIFIED`, `PARTIALLY_VERIFIED`, `FAILED`, `NOT_EXECUTED`, `UNSUPPORTED`, `AWAITING_USER_SIGNATURE`). |
| **04** | **Works for at least 3 different "how do I…" requests** | Demonstrates at least three genuinely distinct, reproducible workflows covering different capabilities (e.g., querying canonical contracts via `eth_call`, inspecting account balances and nonces via `get_balance`/`get_transaction_count`, and preparing an unsigned transaction with gas estimation and parameter validation). |
| **05** | **Handles a request the docs don't cover by saying so instead of improvising** | When an unsupported or undocumented operation is requested, the agent queries Docs MCP, determines the absence of documented procedures, refuses to improvise or fabricate contracts, explains what was searched and what is missing, and halts safely with `UNSUPPORTED`. |

---

## 3. Official Resources and Endpoints Audited

### 3.1 Official Developer Docs MCP
- **Endpoint:** `https://docs.pharos.xyz/~gitbook/mcp`
- **Transport / Protocol:** Server-Sent Events (SSE) / JSON-RPC 2.0
- **Server Name:** `docs.pharos.xyz/~gitbook/mcp` (`docs.pharos.xyz MCP Server`)
- **Supported Tools:**
  1. `searchDocumentation(query: string)`: Returns contextual excerpts with titles and links across official docs.
  2. `getPage(url: string)`: Returns the complete markdown document for any canonical docs URL.
  3. `askQuestion(question: string, goal?: string)`: Synthesizes direct answers linked to documentation pages.
  4. `sendFeedback(content: string, pageUrl: string, goal?: string)`: Submits documentation feedback.

### 3.2 Official Chain MCP
- **Endpoint:** `https://mcp.pharos.xyz/mcp`
- **Transport / Protocol:** SSE JSON-RPC 2.0 with session negotiation (`mcp-session-id` header).
- **Supported Tools:**
  1. `get_chain_info()`: Returns Pharos chain ID (1672), client version (`portal/1.0.0`), latest block, native symbol (`PROS`), and RPC URL (`https://rpc.pharos.xyz`).
  2. `get_block_number()`: Returns latest block number.
  3. `get_balance(address: string, block?: string|number)`: Returns native PROS balance in wei and formatted string.
  4. `get_transaction_count(address: string, block?: string|number)`: Returns nonce.
  5. `get_gas_price()`: Returns current gas price (e.g. 10 Gwei) and priority fees.
  6. `get_block(block?: string|number, includeTransactions?: boolean)`: Returns block details.
  7. `get_transaction(hash: string)`: Returns transaction parameters.
  8. `get_transaction_receipt(hash: string)`: Returns status, gas used, logs, and block numbers.
  9. `get_code(address: string, block?: string|number)`: Returns bytecode.
  10. `get_storage_at(address: string, position: string, block?: string|number)`: Reads contract storage slot.
  11. `eth_call(transaction: object, block?: string|number)`: Executes read-only EVM contract call.
  12. `estimate_gas(transaction: object)`: Estimates gas units for a transaction without sending it.
  13. `get_logs(address?: string|string[], topics?: any[], fromBlock?: any, toBlock?: any)`: Reads EVM event logs (max 1000 block window).
  14. `send_raw_transaction(rawTransaction: string)`: Broadcasts pre-signed hex payload only; never receives private keys.

### 3.3 Pharos Network Topology & Canonical Contracts
- **Production Network:** Pharos Pacific Mainnet
  - **Chain ID:** `1672` (`0x688`)
  - **Native Token:** `PROS`
  - **RPC Endpoint:** `https://rpc.pharos.xyz`
  - **Explorer:** `https://pharos.socialscan.io/`
- **Testnet Network:** Pharos Atlantic Testnet
  - **Chain ID:** `688689` (`0xa8231`)
  - **RPC Endpoint:** `https://atlantic.dplabs-internal.com`
- **Canonical Contracts (Documented at https://docs.pharos.xyz/getting-started/canonical-contracts):**
  - **MultiCall3:** `0xcA11bde05977b3631167028862bE2a173976CA11`
  - **Permit2:** `0x000000000022D473030F116dDEE9F6B43aC78BA3`
  - **Create2Deployer:** `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`
  - **EntryPoint (v0.7.0):** `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

---

## 4. Verification and Safety Boundaries

1. **Non-Custodial Invariant:** The agent never requests, stores, prints, or processes private keys or seed phrases.
2. **Transaction Safety:** All fund-moving or state-changing operations stop at an unsigned transaction object. No broadcasting or automated execution.
3. **Strict No-Mock Policy:** All documentation retrieval and chain operations execute against live official endpoints (`docs.pharos.xyz/~gitbook/mcp` and `mcp.pharos.xyz/mcp`).
4. **Docs-First Guarantee:** Execution cannot begin until Docs MCP queries return verified citations and generate a concrete step-by-step plan.
