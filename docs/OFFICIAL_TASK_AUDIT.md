# OFFICIAL TASK AUDIT — DOC-GROUNDED BUILDER AGENT

## Executive Summary
This document provides the formal audit and technical specification mapping for the Pharos Agent Arena **Doc-Grounded Builder Agent** task (Category: Hard / Cross-tool / Advanced, 200 base points + 50 video bonus).

---

## 1. Official Task Scope & Objectives

- **Task Name:** `doc-grounded-builder-agent`
- **Official Specification:** [https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent](https://pharos-agent-arena.vercel.app/tasks/doc-grounded-builder-agent)
- **Primary Objective:** Build an autonomous builder agent that takes arbitrary "How do I do X on Pharos?" natural-language requests, grounds its understanding in official Pharos Developer Documentation retrieved through the Developer Docs MCP, builds an actionable plan citing source pages, executes the supported actions via Chain MCP / SkillEngine, verifies the outcome on-chain, and safely refuses to improvise when documentation does not cover the request.

---

## 2. Requirement Traceability Matrix

| Requirement | Description | Agent Capability Mapping | Proof Mechanism |
|:---|:---|:---|:---|
| **REQ-01: Docs-Grounded Planning** | Query Docs MCP, cite canonical sources, generate execution plan prior to any tool action. | `DocsMCPClient.search()` / `getPage()` extracts titles, links, and text. `PlanGenerator` builds ordered step plan with safety checks. | Retrieved docs log with URL provenance; structured plan artifact before tool call. |
| **REQ-02: Safe Execution via Chain MCP** | Execute plan via Chain MCP; prepare unsigned transactions for fund-moving actions. | `ChainMCPClient` calls `eth_call`, `get_balance`, `get_chain_info`, `estimate_gas`, `get_gas_price`. State-changing intents stop at `unsigned_tx`. | Live JSON-RPC SSE response logs; unsigned transaction payload with zero signature/broadcast. |
| **REQ-03: On-Chain Outcome Verification** | Independently verify results against planned expectations on chain. | `OutcomeVerifier` checks on-chain state, block headers, or receipts vs. predicted values. | Planned vs. Actual outcome comparison table with explicit verification status (`VERIFIED`, `AWAITING_USER_SIGNATURE`, etc.). |
| **REQ-04: Multi-Workflow Breadth** | Support at least 3 genuinely different "How do I..." requests. | Implements 3 distinct capabilities: (1) Canonical contract state reading (MultiCall3 block/timestamp), (2) Account & wallet inspection (balance & nonce), (3) Unsigned transaction preparation (native transfer with gas estimation). | Independent end-to-end execution logs and test cases for each distinct workflow. |
| **REQ-05: Safe Rejection of Undocumented Requests** | Identify requests not covered by documentation and refuse to improvise. | Intent classifier queries Docs MCP. When search returns no relevant coverage, agent halts execution, provides missing topic analysis, and flags status `UNSUPPORTED`. | Negative test suite with undocumented queries (e.g., unsupported staking, foreign protocol hooks) showing safe refusal. |

---

## 3. Tool and Service Audit

### 3.1 Developer Docs MCP
- **URL:** `https://docs.pharos.xyz/~gitbook/mcp`
- **Protocol:** JSON-RPC 2.0 over Server-Sent Events (SSE).
- **Available Tools:** `searchDocumentation`, `getPage`, `askQuestion`, `sendFeedback`.
- **Latency / Response Profile:** ~1.2s - 2.5s per query.
- **Coverage:** Pharos network configuration, canonical contracts (MultiCall3, Permit2, Create2Deployer, EntryPoint), SkillEngine CLI guides, x402 payment specifications, developer guides.

### 3.2 Chain MCP
- **URL:** `https://mcp.pharos.xyz/mcp`
- **Protocol:** SSE JSON-RPC 2.0 with session ID handshake (`mcp-session-id`).
- **Target Network:** Pharos Pacific Mainnet (Chain ID 1672).
- **Available Tools:** `get_chain_info`, `get_block_number`, `get_balance`, `get_transaction_count`, `get_gas_price`, `get_block`, `get_transaction`, `get_transaction_receipt`, `get_code`, `get_storage_at`, `eth_call`, `estimate_gas`, `get_logs`, `send_raw_transaction`.
- **Operational Boundaries:** Strictly non-custodial. No private keys stored or processed. Unsigned transactions prepared for user review.

---

## 4. Verification and Compliance Standards

1. Zero mocks in production workflows.
2. Complete provenance tracking from user input to documentation URL, action plan, MCP call, and on-chain outcome.
3. Explicit status codes:
   - `VERIFIED`
   - `PARTIALLY_VERIFIED`
   - `FAILED`
   - `NOT_EXECUTED`
   - `UNSUPPORTED`
   - `AWAITING_USER_SIGNATURE`
