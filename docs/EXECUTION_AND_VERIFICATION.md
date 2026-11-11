# EXECUTION AND VERIFICATION — DOC-GROUNDED BUILDER AGENT

## 1. Execution & Verification Framework

The Pharos Doc-Grounded Builder Agent enforces rigorous outcome verification. Rather than declaring success simply because a tool call returned HTTP 200, the agent compares returned telemetry against explicit preconditions, expected schemas, and on-chain states.

```
Action Plan Expectation  ◄──[ Comparison & Proof ]──►  Actual On-Chain Evidence
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                     VERIFIED            AWAITING_USER_SIGNATURE
```

---

## 2. Status Taxonomy

| Status | Meaning | Application |
|:---|:---|:---|
| `VERIFIED` | Tool returned valid data matching expected schema, decoded values match network rules. | Read-only smart contract queries, balance queries, chain info checks. |
| `AWAITING_USER_SIGNATURE` | Unsigned transaction was generated with accurate parameters, but agent halted before signing. | Native transfers, token approvals, contract mutations. |
| `UNSUPPORTED` | Docs MCP confirmed no official documentation exists for the requested action; agent safely refused. | Unsupported protocols, undocumented contracts. |
| `FAILED` | Tool returned an RPC error, unexpected revert, or schema mismatch. | Reverted calls, invalid inputs, network unreachable. |
| `NOT_EXECUTED` | Workflow halted prior to execution due to pre-condition failure. | Internal validation error. |

---

## 3. Detailed Verification Walkthroughs

### 3.1 Workflow 1: MultiCall3 Contract State
- **Expected Precondition:** Chain ID = 1672 (Pacific Mainnet).
- **Contract Address:** `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Execution Step 1:** `get_chain_info` returned `chainId = 1672`, `latestBlock > 22700000`.
- **Execution Step 2:** `eth_call` for `getCurrentBlockTimestamp()` returned uint256 `1794385693`.
- **Execution Step 3:** `eth_call` for `getChainId()` returned uint256 `1672`.
- **Verification Rule:**
  `actualChainId === 1672 && timestamp > 1700000000 && contractChainId === 1672`
- **Verdict:** `VERIFIED`

### 3.2 Workflow 2: Account Balance & Nonce
- **Target Address:** `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`
- **Execution Step 1:** `get_balance` returned `balanceWei = 0`, `balance = 0 PROS`.
- **Execution Step 2:** `get_transaction_count` returned `nonce = 5`.
- **Execution Step 3:** `get_gas_price` returned `gasPriceGwei = 10`.
- **Verification Rule:**
  `balance !== undefined && nonce !== undefined && gasPriceGwei !== undefined`
- **Verdict:** `VERIFIED`

### 3.3 Workflow 3: Unsigned Transaction Preparation
- **Operation:** Transfer `0.01 PROS` to `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`
- **Execution Step 1:** `get_gas_price` retrieved live fee `10 Gwei`.
- **Execution Step 2:** `estimate_gas` calculated gas limit `21,000` (`0x5208`).
- **Execution Step 3:** Unsigned transaction object assembled:
  - `to`: `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`
  - `value`: `0x2386f26fc10000` (0.01 PROS in wei)
  - `gasLimit`: `0x5208`
  - `chainId`: `1672`
  - `signed`: `false`
  - `broadcast`: `false`
- **Verification Rule:**
  `unsignedTx.signed === false && unsignedTx.broadcast === false && unsignedTx.chainId === 1672`
- **Verdict:** `AWAITING_USER_SIGNATURE`

---

## 4. Invariant Protection Summary
- Zero private key requests or keystore access.
- Zero automatic transaction broadcasts.
- All state-changing operations require explicit external signature.
