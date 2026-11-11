import type { WorkflowIntent } from '../types/index.ts';

export interface ParsedRequest {
  intent: WorkflowIntent;
  targetAddress?: string;
  targetAmount?: string;
  docsSearchQuery: string;
  isUnsupportedCandidate: boolean;
  unsupportedReason?: string;
}

const ETH_ADDRESS_REGEX = /(0x[a-fA-F0-9]{40})/i;

export function classifyIntent(question: string): ParsedRequest {
  const qLower = question.toLowerCase();

  // Extract address if provided
  const matchAddr = question.match(ETH_ADDRESS_REGEX);
  const targetAddress = matchAddr ? matchAddr[1] : undefined;

  // Check for explicitly unsupported / undocumented queries
  const unsupportedKeywords = [
    'lido',
    'steth',
    'liquid staking',
    'flash loan',
    'uniswap v4',
    'curve pool',
    'solana anchor',
    'bitcoin ordinals',
    'eigenlayer restaking',
    'arbitrage bot execution',
  ];

  for (const kw of unsupportedKeywords) {
    if (qLower.includes(kw)) {
      return {
        intent: 'UNDOCUMENTED_OR_UNKNOWN',
        docsSearchQuery: kw,
        isUnsupportedCandidate: true,
        unsupportedReason: `The requested protocol feature ("${kw}") is not documented in the official Pharos Developer Documentation.`,
      };
    }
  }

  // 1. Transaction Preparation (Fund-moving or state mutation)
  if (
    qLower.includes('transfer') ||
    qLower.includes('send') ||
    qLower.includes('prepare transaction') ||
    qLower.includes('send pros') ||
    qLower.includes('transfer token')
  ) {
    return {
      intent: 'TRANSACTION_PREPARATION',
      targetAddress: targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2',
      targetAmount: '0.01',
      docsSearchQuery: 'Skill Engine transfer transactions cast send',
      isUnsupportedCandidate: false,
    };
  }

  // 2. Account / Token State Inspection
  if (
    qLower.includes('balance') ||
    qLower.includes('nonce') ||
    qLower.includes('transaction count') ||
    qLower.includes('inspect account') ||
    qLower.includes('wallet')
  ) {
    return {
      intent: 'ACCOUNT_STATE_INSPECTION',
      targetAddress: targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2',
      docsSearchQuery: 'check balance account transactions explorer',
      isUnsupportedCandidate: false,
    };
  }

  // 3. Canonical Contract Queries (MultiCall3, EntryPoint, Permit2)
  if (
    qLower.includes('multicall') ||
    qLower.includes('canonical') ||
    qLower.includes('chain info') ||
    qLower.includes('block timestamp') ||
    qLower.includes('permit2') ||
    qLower.includes('create2') ||
    qLower.includes('contract')
  ) {
    return {
      intent: 'CANONICAL_CONTRACT_QUERY',
      targetAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
      docsSearchQuery: 'Canonical Contracts MultiCall3 Pacific Mainnet',
      isUnsupportedCandidate: false,
    };
  }

  // Default fallback to docs search
  return {
    intent: 'UNDOCUMENTED_OR_UNKNOWN',
    docsSearchQuery: question,
    isUnsupportedCandidate: false,
  };
}
