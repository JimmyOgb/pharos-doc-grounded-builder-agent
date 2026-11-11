import type { ActionPlan, DocCitation, PlanStep, WorkflowIntent } from '../types/index.ts';

export class PlanGenerator {
  generatePlan(
    intent: WorkflowIntent,
    citations: DocCitation[],
    targetAddress?: string,
    targetAmount?: string
  ): ActionPlan | null {
    if (intent === 'UNDOCUMENTED_OR_UNKNOWN') {
      return null;
    }

    const citationSummary = citations.map(c => `[${c.title}](${c.url})`).join(', ');

    if (intent === 'CANONICAL_CONTRACT_QUERY') {
      const steps: PlanStep[] = [
        {
          stepNumber: 1,
          description: 'Verify Pharos network connectivity and active Chain ID (expected 1672)',
          targetTool: 'get_chain_info',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only node introspection; zero state mutation',
          expectedOutcome: 'Chain ID 1672 (Pharos Pacific Mainnet) matches official network config',
        },
        {
          stepNumber: 2,
          description: 'Query canonical MultiCall3 contract (0xcA11bde05977b3631167028862bE2a173976CA11) for getCurrentBlockTimestamp() [selector: 0x0f28c97d]',
          targetTool: 'eth_call',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only smart contract call; zero state mutation',
          expectedOutcome: 'Returns a 32-byte hex string representing the live block timestamp as uint256',
        },
        {
          stepNumber: 3,
          description: 'Query canonical MultiCall3 contract for getChainId() [selector: 0x3408e470] and getBlockNumber() [selector: 0x42cbb15c]',
          targetTool: 'eth_call',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only smart contract call; zero state mutation',
          expectedOutcome: 'Returns chainId = 1672 and live block number matching Chain MCP',
        },
      ];

      return {
        workflowName: 'Canonical MultiCall3 Contract State Query',
        prerequisites: [
          'Pharos Pacific Mainnet RPC connection (Chain ID 1672)',
          'MultiCall3 deployed at canonical address 0xcA11bde05977b3631167028862bE2a173976CA11',
          `Cited Docs: ${citationSummary}`,
        ],
        targetNetwork: 'Pharos Pacific Mainnet',
        chainId: 1672,
        steps,
      };
    }

    if (intent === 'ACCOUNT_STATE_INSPECTION') {
      const addr = targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';
      const steps: PlanStep[] = [
        {
          stepNumber: 1,
          description: `Query live native PROS balance for address ${addr}`,
          targetTool: 'get_balance',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only account inspection; zero state mutation',
          expectedOutcome: 'Returns balanceWei and human-readable PROS balance',
        },
        {
          stepNumber: 2,
          description: `Query transaction count (nonce) for address ${addr}`,
          targetTool: 'get_transaction_count',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only account inspection; zero state mutation',
          expectedOutcome: 'Returns confirmed account nonce integer',
        },
        {
          stepNumber: 3,
          description: 'Retrieve current Pharos network gas price to assess account fee liquidity',
          targetTool: 'get_gas_price',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only network metric inspection',
          expectedOutcome: 'Returns gasPrice in wei and Gwei',
        },
      ];

      return {
        workflowName: 'Account Balance & Nonce State Inspection',
        prerequisites: [
          'Valid 20-byte EVM address formatted with 0x prefix',
          'Pharos Pacific Mainnet connection',
          `Cited Docs: ${citationSummary}`,
        ],
        targetNetwork: 'Pharos Pacific Mainnet',
        chainId: 1672,
        steps,
      };
    }

    if (intent === 'TRANSACTION_PREPARATION') {
      const destination = targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';
      const amount = targetAmount || '0.01';

      const steps: PlanStep[] = [
        {
          stepNumber: 1,
          description: 'Retrieve current gas price from Pharos Chain MCP',
          targetTool: 'get_gas_price',
          stepType: 'READ_ONLY',
          safetyNotes: 'Read-only gas market inspection',
          expectedOutcome: 'Returns current base fee and priority fee',
        },
        {
          stepNumber: 2,
          description: `Estimate gas limit for transferring ${amount} PROS to ${destination}`,
          targetTool: 'estimate_gas',
          stepType: 'READ_ONLY',
          safetyNotes: 'Simulation only; no transaction is signed or broadcast',
          expectedOutcome: 'Returns estimated gas units (standard transfer: ~21,000 gas)',
        },
        {
          stepNumber: 3,
          description: `Construct unsigned transaction object for ${amount} PROS transfer to ${destination}`,
          targetTool: 'prepare_unsigned_transaction',
          stepType: 'STATE_CHANGING',
          safetyNotes: 'MANDATORY NON-CUSTODIAL SAFETY: Agent stops before signing. Requires explicit user review.',
          expectedOutcome: 'Complete unsigned transaction payload formatted for external user wallet signature (Status: AWAITING_USER_SIGNATURE)',
        },
      ];

      return {
        workflowName: 'Native PROS Transfer Preparation (Unsigned)',
        prerequisites: [
          'Pharos Pacific Mainnet (Chain ID 1672)',
          'Valid destination address',
          'Verified gas price and gas limit estimation',
          `Cited Docs: ${citationSummary}`,
        ],
        targetNetwork: 'Pharos Pacific Mainnet',
        chainId: 1672,
        steps,
      };
    }

    return null;
  }
}
