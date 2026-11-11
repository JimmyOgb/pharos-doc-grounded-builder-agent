# Pharos Doc-Grounded Builder Agent

A production-ready autonomous builder agent for the Pharos blockchain ecosystem. Grounded strictly in official Pharos Developer Documentation retrieved through the Developer Docs MCP, the agent answers "How do I do X on Pharos?" questions by retrieving authoritative documentation, citing sources, synthesizing an actionable execution plan, executing supported read-only actions through the official Chain MCP, and preparing safe unsigned transactions for state-changing operations.

---

## Key Features

1. **Official Docs MCP Grounding**: Queries `https://docs.pharos.xyz/~gitbook/mcp` to retrieve canonical pages, titles, and excerpts before taking any action.
2. **Pre-Action Execution Planning**: Converts documented procedures into an ordered step-by-step action plan before any tool calls are dispatched.
3. **Chain MCP Execution**: Executes queries through `https://mcp.pharos.xyz/mcp` against Pharos Pacific Mainnet (Chain ID `1672`).
4. **Independent On-Chain Verification**: Verifies returned data against the action plan, presenting a planned vs. actual outcome comparison.
5. **Three Distinct Workflows**:
   - **Canonical Contract Queries**: Interacts with canonical MultiCall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`) to read block timestamps and verify chain ID.
   - **Account & Wallet State Inspection**: Queries native PROS balance, confirmed nonce, and gas market metrics.
   - **Unsigned Transaction Preparation**: Simulates gas limit and gas price to prepare an unsigned transaction envelope, stopping before signature.
6. **Safe Handling of Undocumented Requests**: Explicitly detects requests not covered in official documentation (e.g. Lido staking, flash loans) and safely halts with status `UNSUPPORTED` without improvising contract calls.
7. **Strict Non-Custodial Safety**: Zero private keys or mnemonics are requested or stored. The agent never signs or broadcasts transactions.

---

## System Architecture

```
User Request ("How do I...")
           │
           ▼
┌──────────────────────────────────────┐
│ 1. Intent Classification & Intake    │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 2. Developer Docs MCP Retrieval      │  ──> https://docs.pharos.xyz/~gitbook/mcp
└──────────────────────────────────────┘
           │
     Docs Covered?
      /         \
    No           Yes
    │             │
    ▼             ▼
┌───────────┐  ┌──────────────────────────────────────┐
│ Refusal   │  │ 3. Citation & Plan Generation        │
│ (UNSUPP.) │  └──────────────────────────────────────┘
└───────────┘             │
                          ▼
               ┌──────────────────────────────────────┐
               │ 4. Safety Validation & Tool Routing  │
               └──────────────────────────────────────┘
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
        [ Read-Only ]        [ State-Changing ]
               │                     │
               ▼                     ▼
       Execute Chain MCP    Prepare Unsigned Tx
       (eth_call, balance)  (AWAITING_USER_SIGNATURE)
               │                     │
               └──────────┬──────────┘
                          │
                          ▼
               ┌──────────────────────────────────────┐
               │ 5. Outcome Verification & Report     │
               └──────────────────────────────────────┘
```

---

## Three Supported Workflows

### 1. Canonical MultiCall3 Contract State Query (Read-Only)
- **User Query**: `"How do I query live block timestamp and chain ID from MultiCall3 on Pharos?"`
- **Documentation**: [Canonical Contracts](https://docs.pharos.xyz/getting-started/canonical-contracts)
- **Action Plan**:
  1. Call `get_chain_info` to verify active network (Chain ID 1672).
  2. Call `eth_call` for `getCurrentBlockTimestamp()` on MultiCall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`).
  3. Call `eth_call` for `getChainId()` on MultiCall3.
- **Verification**: Verifies that decoded timestamp is current and returned chainId equals 1672.
- **Status**: `VERIFIED`

### 2. Account & Wallet State Inspection (Read-Only)
- **User Query**: `"How do I check the native PROS balance and transaction count (nonce) of an address on Pharos?"`
- **Documentation**: [Block Explorer](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer)
- **Action Plan**:
  1. Call `get_balance` for specified target address.
  2. Call `get_transaction_count` to fetch confirmed account nonce.
  3. Call `get_gas_price` to assess fee liquidity.
- **Verification**: Verifies confirmed PROS balance, nonce integer, and gas price.
- **Status**: `VERIFIED`

### 3. Native Transfer Preparation (Unsigned / Non-Custodial)
- **User Query**: `"How do I prepare a native PROS transfer on Pharos Pacific Mainnet?"`
- **Documentation**: [Pharos Skill Engine Guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)
- **Action Plan**:
  1. Call `get_gas_price` to fetch base fee and priority fee.
  2. Call `estimate_gas` to simulate transaction execution.
  3. Prepare full unsigned transaction payload for destination and amount.
- **Verification**: Confirms `signed === false`, `broadcast === false`, and gas limit valid.
- **Status**: `AWAITING_USER_SIGNATURE`

---

## Safety Model & Invariants

1. **Non-Custodial Architecture**:
   - Zero private keys or mnemonics requested or processed.
   - All state-changing actions halt at an unsigned transaction review panel.
   - The user remains in complete control of external wallet signing.
2. **Refusal to Improvise**:
   - When Docs MCP search reveals no official documentation, the agent refuses to fabricate a procedure.
   - Prevents hallucinations and undocumented smart contract interactions.
3. **No-Mock Policy**:
   - All integration tests and live workflows execute against official, live endpoints.
   - Zero synthetic receipts, fake transaction hashes, or simulated tool outputs.

---

## Getting Started

### Prerequisites
- Node.js v20+ (Node.js v24 recommended)
- npm

### Installation
```bash
git clone https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent.git
cd pharos-doc-grounded-builder-agent
npm install
```

### Running the Application Locally
```bash
npm start
```
The application will be accessible at `http://localhost:3000`.

### Building for Production
```bash
npm run build
```
This bundles the serverless API handlers in `src/api/*.ts` into zero-dependency standalone modules in `api/*.js` using `esbuild`.

---

## Running Automated Tests

### Unit Tests
```bash
npm test
```
Executes 12 unit tests verifying intent classification, plan generation, verification logic, and safety guardrails.

### Live Integration Tests
```bash
npm run test:integration
```
Executes 6 live integration tests connecting directly to official Docs MCP and Chain MCP endpoints.

### All Tests
```bash
npm run test:all
```

---

## Environment Variables

No secrets or private keys are required. The agent operates in a non-custodial manner using public RPC and MCP endpoints.

| Variable | Description | Default |
|:---|:---|:---|
| `CHAIN_MCP_URL` | Official Chain MCP endpoint | `https://mcp.pharos.xyz/mcp` |
| `DOCS_MCP_URL` | Official Developer Docs MCP endpoint | `https://docs.pharos.xyz/~gitbook/mcp` |
| `PORT` | Local server port | `3000` |

---

## Documentation Directory

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): System architecture and pipeline specifications.
- [`docs/DOCUMENTATION_PROVENANCE.md`](docs/DOCUMENTATION_PROVENANCE.md): Cryptographic and citation provenance tracking.
- [`docs/WORKFLOW_EVIDENCE.md`](docs/WORKFLOW_EVIDENCE.md): Live execution evidence for all three workflows.
- [`docs/EXECUTION_AND_VERIFICATION.md`](docs/EXECUTION_AND_VERIFICATION.md): Verification engine mechanics.
- [`docs/UNSUPPORTED_REQUEST_TEST.md`](docs/UNSUPPORTED_REQUEST_TEST.md): Detailed negative test evidence for undocumented requests.
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): Comprehensive test runner logs.
- [`docs/FINAL_REQUIREMENTS_MATRIX.md`](docs/FINAL_REQUIREMENTS_MATRIX.md): Detailed compliance mapping against all judging criteria.

---

## License

MIT © [JimmyOgb](https://github.com/JimmyOgb)
