# TEST REPORT — DOC-GROUNDED BUILDER AGENT

## 1. Test Suite Summary

- **Test Date:** November 11, 2026
- **Test Runner:** Node.js v24.15.0 Native Test Runner (`node --test --experimental-strip-types`)
- **Total Test Cases:** 18
- **Passed:** 18
- **Failed:** 0
- **Pass Rate:** **100%**
- **Test Mode:** Real integrations against official `https://docs.pharos.xyz/~gitbook/mcp` and `https://mcp.pharos.xyz/mcp` (zero simulation, zero mocks in integration suite).

---

## 2. Test Execution Details

### 2.1 Unit Tests (12 / 12 Passed)
Command: `npm test` (`node --dns-result-order=ipv4first --test --experimental-strip-types tests/unit/*.test.ts`)

| Suite | Test Case | Duration | Status |
|:---|:---|:---|:---|
| **Intent & Safety** | correctly classifies MultiCall3 contract read intent | 2.26ms | **PASS** |
| **Intent & Safety** | correctly classifies account inspection intent with address extraction | 0.36ms | **PASS** |
| **Intent & Safety** | correctly classifies transaction preparation intent | 0.24ms | **PASS** |
| **Intent & Safety** | safely flags unsupported / undocumented request (Lido liquid staking) | 2.20ms | **PASS** |
| **Intent & Safety** | safely flags unsupported / undocumented request (Flash loans) | 0.97ms | **PASS** |
| **Plan Generation** | generates a 3-step read-only plan for MultiCall3 queries | 1.16ms | **PASS** |
| **Plan Generation** | generates a plan for account balance inspection | 0.41ms | **PASS** |
| **Plan Generation** | generates a state-changing plan that requires unsigned transaction review | 0.46ms | **PASS** |
| **Plan Generation** | returns null plan for undocumented or unknown intents | 0.38ms | **PASS** |
| **Verification & Safety** | verifies canonical contract query when timestamp and chainId match | 3.97ms | **PASS** |
| **Verification & Safety** | returns AWAITING_USER_SIGNATURE for properly prepared unsigned transaction | 0.66ms | **PASS** |
| **Verification & Safety** | safely halts and sets UNSUPPORTED when no plan exists | 0.30ms | **PASS** |

### 2.2 Integration Tests (6 / 6 Passed)
Command: `npm run test:integration` (`node --dns-result-order=ipv4first --test --experimental-strip-types tests/integration/*.test.ts`)

| Suite | Test Case | Target Service | Status |
|:---|:---|:---|:---|
| **Official MCP Endpoints** | connects to live Docs MCP and retrieves canonical contract citations | `https://docs.pharos.xyz/~gitbook/mcp` | **PASS** |
| **Official MCP Endpoints** | connects to live Chain MCP and retrieves chain ID 1672 | `https://mcp.pharos.xyz/mcp` | **PASS** |
| **Three Workflows + Safety** | Workflow 1 (Read-Only): Query MultiCall3 block timestamp and verify chain ID | MultiCall3 `0xcA11bde0...` | **PASS** |
| **Three Workflows + Safety** | Workflow 2 (Inspect Account): Query native PROS balance and nonce | Pacific Mainnet RPC | **PASS** |
| **Three Workflows + Safety** | Workflow 3 (Prepare State-Changing): Prepare unsigned native PROS transfer | Chain MCP Gas Estimator | **PASS** |
| **Three Workflows + Safety** | Requirement 5 (Unsupported Request): Refuse to improvise for undocumented operation | Negative Safety Guardrail | **PASS** |

---

## 3. Strict No-Mock Verification

- Zero fake blockchain hashes.
- Zero mock MCP responses in live workflows.
- All network interactions connect to official Pharos Pacific Mainnet (Chain ID 1672).
- Non-custodial boundary tested: unsigned transactions strictly preserve `signed: false` and `broadcast: false`.
