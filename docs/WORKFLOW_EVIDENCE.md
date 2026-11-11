# WORKFLOW EVIDENCE — DOC-GROUNDED BUILDER AGENT

This report documents genuine, live execution evidence for the three distinct workflows supported by the Pharos Doc-Grounded Builder Agent, tested against official endpoints (`https://docs.pharos.xyz/~gitbook/mcp` and `https://mcp.pharos.xyz/mcp`).

---

## Workflow 1: Canonical Contract State Reading (MultiCall3)

### 1. Exact User Question
`"How do I query live block timestamp and chain ID from MultiCall3 on Pharos?"`

### 2. Retrieved Documentation & Provenance Citations
- **Source 1:** *Canonical Contracts*  
  **Canonical Link:** [https://docs.pharos.xyz/getting-started/canonical-contracts](https://docs.pharos.xyz/getting-started/canonical-contracts)  
  **Retrieved Excerpt:**
  ```text
  ## Pacific Mainnet Canonical Contracts
  | Contract Name | Description | Address |
  | MultiCall3 | Allows bundling multiple transactions | 0xcA11bde05977b3631167028862bE2a173976CA11 |
  ```
- **Source 2:** *Network*  
  **Canonical Link:** [https://docs.pharos.xyz/getting-started/network](https://docs.pharos.xyz/getting-started/network)  
  **Retrieved Excerpt:**
  ```text
  Pacific Mainnet is the production network. Chain ID: 1672 (0x688). Native token: PROS.
  ```

### 3. Structured Action Plan (Generated Before Execution)
1. **Step 1:** Call `get_chain_info` to verify network connectivity and ensure active Chain ID is 1672. (Type: `READ_ONLY`)
2. **Step 2:** Call `eth_call` with target `0xcA11bde05977b3631167028862bE2a173976CA11` and calldata `0x0f28c97d` (`getCurrentBlockTimestamp()`). (Type: `READ_ONLY`)
3. **Step 3:** Call `eth_call` with target `0xcA11bde05977b3631167028862bE2a173976CA11` and calldata `0x3408e470` (`getChainId()`). (Type: `READ_ONLY`)

### 4. Actual Chain MCP Calls & Live Responses
- **Tool Call 1:** `get_chain_info()`
  ```json
  {
    "name": "Pharos",
    "chainId": 1672,
    "chainIdHex": "0x688",
    "expectedChainId": 1672,
    "chainIdMatches": true,
    "latestBlock": "22732471",
    "nativeSymbol": "PROS",
    "clientVersion": "portal/1.0.0",
    "rpcUrl": "https://rpc.pharos.xyz"
  }
  ```
- **Tool Call 2:** `eth_call({"to": "0xcA11bde05977b3631167028862bE2a173976CA11", "data": "0x0f28c97d"})`
  - **Raw Output:** `0x000000000000000000000000000000000000000000000000000000006af4271d`
  - **Decoded Value:** `1794385693` (Timestamp UTC)
- **Tool Call 3:** `eth_call({"to": "0xcA11bde05977b3631167028862bE2a173976CA11", "data": "0x3408e470"})`
  - **Raw Output:** `0x0000000000000000000000000000000000000000000000000000000000000688`
  - **Decoded Value:** `1672` (Pacific Mainnet Chain ID)

### 5. Verification & Final Status
- **Status:** `VERIFIED`
- **Planned vs. Actual:** Plan anticipated non-zero uint256 timestamp and chainId 1672. Contract returned exact expected chainId 1672 and timestamp `1794385693`.
- **Explorer Evidence:** [https://pharos.socialscan.io/address/0xcA11bde05977b3631167028862bE2a173976CA11](https://pharos.socialscan.io/address/0xcA11bde05977b3631167028862bE2a173976CA11)

---

## Workflow 2: Account & Wallet State Inspection

### 1. Exact User Question
`"How do I check the native PROS balance and transaction count (nonce) of an address on Pharos?"`

### 2. Retrieved Documentation & Provenance Citations
- **Source 1:** *Block Explorer & Account Tooling*  
  **Canonical Link:** [https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer)  
  **Retrieved Excerpt:**
  ```text
  Explore wallet addresses and balances, inspect blocks and network activity, view transaction count and nonce.
  ```
- **Source 2:** *Pharos Skill Engine Guide*  
  **Canonical Link:** [https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)  
  **Retrieved Excerpt:**
  ```text
  Check balances, query transactions, inspect account status across Atlantic Testnet and Pacific Mainnet.
  ```

### 3. Structured Action Plan (Generated Before Execution)
1. **Step 1:** Call `get_balance` for address `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`. (Type: `READ_ONLY`)
2. **Step 2:** Call `get_transaction_count` for address `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`. (Type: `READ_ONLY`)
3. **Step 3:** Call `get_gas_price` to check current fee market. (Type: `READ_ONLY`)

### 4. Actual Chain MCP Calls & Live Responses
- **Tool Call 1:** `get_balance({"address": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2"})`
  ```json
  {
    "address": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2",
    "balanceWei": "0",
    "balance": "0",
    "symbol": "PROS",
    "balanceHex": "0x0"
  }
  ```
- **Tool Call 2:** `get_transaction_count({"address": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2"})`
  ```json
  {
    "nonce": "5",
    "nonceHex": "0x5"
  }
  ```
- **Tool Call 3:** `get_gas_price()`
  ```json
  {
    "gasPriceWei": "10000000000",
    "gasPriceGwei": "10",
    "gasPriceHex": "0x2540be400",
    "maxPriorityFeePerGasWei": "0",
    "maxPriorityFeePerGasGwei": "0"
  }
  ```

### 5. Verification & Final Status
- **Status:** `VERIFIED`
- **Planned vs. Actual:** Successfully returned verified balance (`0 PROS`), confirmed nonce (`5`), and gas price (`10 Gwei`).
- **Explorer Evidence:** [https://pharos.socialscan.io/address/0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2](https://pharos.socialscan.io/address/0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2)

---

## Workflow 3: Unsigned Transaction Preparation (Non-Custodial)

### 1. Exact User Question
`"How do I prepare a native PROS transfer on Pharos Pacific Mainnet?"`

### 2. Retrieved Documentation & Provenance Citations
- **Source 1:** *Pharos Skill Engine Guide*  
  **Canonical Link:** [https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)  
  **Retrieved Excerpt:**
  ```text
  Transaction command reference: cast send / cast estimate / gas estimation and transaction construction.
  ```

### 3. Structured Action Plan (Generated Before Execution)
1. **Step 1:** Call `get_gas_price` to fetch current network gas price. (Type: `READ_ONLY`)
2. **Step 2:** Call `estimate_gas` to simulate gas consumption for standard native transfer. (Type: `READ_ONLY`)
3. **Step 3:** Prepare complete unsigned transaction payload with destination, amount, gas limit, and chainId 1672. (Type: `STATE_CHANGING`)  
   *Safety Note: Stops before signing or broadcasting. Awaits manual user signature.*

### 4. Actual Chain MCP Calls & Live Responses
- **Tool Call 1:** `get_gas_price()` -> `10 Gwei`
- **Tool Call 2:** `estimate_gas({"transaction": {"to": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2", "value": "0x2386f26fc10000"}})`
  - **Estimated Gas Limit:** `21000` (`0x5208`)
- **Unsigned Transaction Object Generated:**
  ```json
  {
    "chainId": 1672,
    "network": "Pharos Pacific Mainnet",
    "to": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2",
    "value": "0x2386f26fc10000",
    "valueFormatted": "0.01 PROS",
    "data": "0x",
    "gasLimit": "0x5208",
    "gasPriceGwei": "10",
    "description": "Transfer 0.01 PROS to 0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2 on Pharos Pacific Mainnet",
    "signed": false,
    "broadcast": false,
    "userActionRequired": "Review transaction parameters in your non-custodial wallet and sign manually outside the agent."
  }
  ```

### 5. Verification & Final Status
- **Status:** `AWAITING_USER_SIGNATURE`
- **Planned vs. Actual:** Zero automated signatures were generated; zero transactions were broadcast. Transaction details match destination, amount in wei, and network gas estimates.
- **Safety Verified:** Non-custodial boundary strictly preserved.
