# DOCUMENTATION PROVENANCE — DOC-GROUNDED BUILDER AGENT

## 1. Overview & Provenance Guarantee

The Pharos Doc-Grounded Builder Agent enforces cryptographic and citation provenance across all operations. Before any action plan is synthesized or any blockchain RPC call is executed, the agent queries the official Pharos Developer Documentation via the GitBook Docs MCP server.

```
User Prompt ──> Docs MCP Search ──> Canonical URL Extraction ──> Excerpt Binding ──> Action Plan ──> Chain MCP
```

---

## 2. Docs MCP Server Coordinates

| Parameter | Official Value | Verification |
|:---|:---|:---|
| **Server URL** | `https://docs.pharos.xyz/~gitbook/mcp` | HTTP 200 SSE Endpoint |
| **Server Identifier** | `docs.pharos.xyz/~gitbook/mcp` | Verified via `initialize` |
| **Server Title** | `docs.pharos.xyz MCP Server` | Discovered via protocol handshake |
| **Protocol Version** | `2024-11-05` | Standard Model Context Protocol |
| **Primary Tool** | `searchDocumentation(query: string)` | Dispatches full-text semantic search |
| **Secondary Tool** | `getPage(url: string)` | Retrieves complete markdown document |

---

## 3. Provenance Mapping for Supported Workflows

### 3.1 MultiCall3 Canonical Contract
- **Query Dispatched:** `"Canonical Contracts MultiCall3 Pacific Mainnet"`
- **Canonical Document Title:** `Canonical Contracts`
- **Canonical URL:** [https://docs.pharos.xyz/getting-started/canonical-contracts](https://docs.pharos.xyz/getting-started/canonical-contracts)
- **Extracted Proof Fragment:**
  ```markdown
  ## Pacific Mainnet Canonical Contracts
  | Contract Name | Description | Address |
  | MultiCall3 | Allows bundling multiple transactions | 0xcA11bde05977b3631167028862bE2a173976CA11 |
  ```
- **Execution Binding:** The contract address `0xcA11bde05977b3631167028862bE2a173976CA11` used in `eth_call` originates directly from this documented table.

### 3.2 Account & Balances Tooling
- **Query Dispatched:** `"check balance account transactions explorer"`
- **Canonical Document Title:** `Block Explorer`
- **Canonical URL:** [https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer)
- **Secondary Document:** `Pharos Skill Engine Guide`
- **Canonical URL:** [https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)
- **Extracted Proof Fragment:**
  ```markdown
  Explore wallet addresses and balances, inspect blocks and network activity, view transaction count and nonce.
  ```
- **Execution Binding:** Direct grounding for `get_balance` and `get_transaction_count`.

### 3.3 Transaction Preparation & Gas Estimation
- **Query Dispatched:** `"Skill Engine transfer transactions cast send"`
- **Canonical Document Title:** `Pharos Skill Engine Guide`
- **Canonical URL:** [https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)
- **Extracted Proof Fragment:**
  ```markdown
  references/transaction.md: Transaction command reference - Full cast send / cast estimate specs.
  ```
- **Execution Binding:** Used for gas price query, gas estimation, and unsigned transaction envelope construction.

---

## 4. Citation Integrity and No-Mock Invariant

1. **No Hallucinated URLs:** Every citation returned by the agent is confirmed to exist under `https://docs.pharos.xyz/`.
2. **No Fabricated Excerpts:** Excerpts represent verbatim text returned by the Docs MCP tool call.
3. **Traceable Logs:** Every API response preserves `documentationSources` with title, canonical URL, and excerpt.
