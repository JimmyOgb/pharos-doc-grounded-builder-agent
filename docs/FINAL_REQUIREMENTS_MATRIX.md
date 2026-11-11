# FINAL REQUIREMENTS MATRIX — DOC-GROUNDED BUILDER AGENT

## Official Judging Requirements Compliance Matrix

| Requirement | Description | Implementation Location | Automated Test | Production Evidence | Status | Limitations / Notes |
|:---|:---|:---|:---|:---|:---|:---|
| **REQ-01: Docs MCP Plans Before Acting** | Uses Docs MCP to plan, with sources cited, before acting. | `src/core/docs-client.ts`, `src/core/planner.ts`, `src/core/agent.ts` | `tests/unit/unit.test.ts` (Plan Generation suite), `tests/integration/integration.test.ts` | Complete citations (`https://docs.pharos.xyz/...`), ordered step plan generated prior to any tool call. | **VERIFIED** | Search query semantic matching depends on official GitBook MCP uptime. |
| **REQ-02: Safe Execution via Chain MCP / SkillEngine** | Executes the plan with Chain MCP and/or SkillEngine; anything moving funds is prepared for signature. | `src/core/chain-client.ts`, `src/core/agent.ts` | `tests/integration/integration.test.ts` (Workflows 1, 2, 3) | Live `eth_call`, `get_balance`, `get_gas_price`. State-changing transactions stop at raw unsigned tx object (`signed: false`). | **VERIFIED** | Strictly non-custodial. No private keys accepted or stored. |
| **REQ-03: On-Chain Outcome Verification** | Verifies the outcome on chain and reports success or failure against the plan. | `src/core/verifier.ts`, `src/core/agent.ts` | `tests/unit/unit.test.ts`, `tests/integration/integration.test.ts` | Output contains Planned vs Actual comparison table, explicit status (`VERIFIED`, `AWAITING_USER_SIGNATURE`, `UNSUPPORTED`). | **VERIFIED** | Outcome verification checks confirmed block headers, state, and gas estimates. |
| **REQ-04: Support 3 Different "How do I..." Requests** | Works for at least 3 genuinely different "how do I…" requests. | `src/core/agent.ts`, `src/core/intent.ts`, `public/index.html` | `tests/integration/integration.test.ts` (All 3 workflows pass) | 1. Canonical MultiCall3 Contract Query<br>2. Account Balance & Nonce Inspection<br>3. Unsigned Native Transfer Preparation | **VERIFIED** | Three distinct operational capabilities with zero overlap. |
| **REQ-05: Safe Handling of Undocumented Requests** | Handles a request the docs don't cover by saying so instead of improvising. | `src/core/intent.ts`, `src/core/agent.ts`, `src/core/verifier.ts` | `tests/unit/unit.test.ts`, `tests/integration/integration.test.ts` | Negative test with Lido staking: 0 tool calls executed, clear statement of missing documentation, status `UNSUPPORTED`. | **VERIFIED** | Agent safely refuses to invent smart contracts or improvise execution. |

---

## Invariant and Safety Verification

1. **Non-Custodial Architecture:** Zero private keys, seed phrases, or keystores requested or stored. **VERIFIED**
2. **Zero Transaction Signing / Broadcasting:** Unsigned transactions remain strictly unsigned with `signed: false` and `broadcast: false`. **VERIFIED**
3. **Strict No-Mock Policy:** All live queries execute directly against `https://docs.pharos.xyz/~gitbook/mcp` and `https://mcp.pharos.xyz/mcp`. **VERIFIED**
4. **Zero State Mutation:** No funds spent, $0.00 cost maintained. **VERIFIED**
5. **Sibling Workspace Isolation:** All other directories in `C:\Users\NO GO NO\pharosbuild` remain completely untouched. **VERIFIED**
