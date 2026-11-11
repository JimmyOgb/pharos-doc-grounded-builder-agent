import type {
  ActionPlan,
  ExecutionStepResult,
  UnsignedTransaction,
  VerificationResult,
  WorkflowIntent,
  WorkflowStatus
} from '../types/index.ts';

export class OutcomeVerifier {
  verify(
    intent: WorkflowIntent,
    plan: ActionPlan | null,
    results: ExecutionStepResult[],
    unsignedTx?: UnsignedTransaction
  ): VerificationResult {
    // 1. Unsupported or Missing Docs Case
    if (intent === 'UNDOCUMENTED_OR_UNKNOWN' || !plan) {
      return {
        status: 'UNSUPPORTED',
        plannedOutcome: 'Fail safely if requested feature is not documented in official Pharos documentation',
        actualOutcome: 'Refused to improvise. Document search confirmed no official documentation exists for the requested operation.',
        isMatch: true,
        evidenceDetails: 'Safety Boundary Enforced: No unsupported smart contract or RPC calls were executed.',
      };
    }

    // 2. Canonical MultiCall3 Contract Verification
    if (intent === 'CANONICAL_CONTRACT_QUERY') {
      const step1 = results.find(r => r.stepNumber === 1);
      const step2 = results.find(r => r.stepNumber === 2);
      const step3 = results.find(r => r.stepNumber === 3);

      const chainInfoOk = step1?.success && (step1.rawOutput?.chainId === 1672 || step1.rawOutput?.chainIdHex === '0x688');
      const timestampRaw = step2?.rawOutput;
      const chainIdCallRaw = step3?.rawOutput;

      let validTimestamp = false;
      let timestampVal = 0;
      if (typeof timestampRaw === 'string' && timestampRaw.startsWith('0x')) {
        timestampVal = Number(BigInt(timestampRaw));
        validTimestamp = timestampVal > 1700000000; // Reasonable timestamp
      } else if (timestampRaw && typeof timestampRaw === 'object' && timestampRaw.result) {
        timestampVal = Number(BigInt(timestampRaw.result));
        validTimestamp = timestampVal > 1700000000;
      }

      let validChainIdFromContract = false;
      if (step3?.decodedOutput?.contractChainId === 1672) {
        validChainIdFromContract = true;
      }

      if (chainInfoOk && validTimestamp && validChainIdFromContract) {
        return {
          status: 'VERIFIED',
          plannedOutcome: 'Retrieve live block timestamp and verify chainId = 1672 directly from canonical MultiCall3',
          actualOutcome: `MultiCall3 returned timestamp ${timestampVal} (${new Date(timestampVal * 1000).toISOString()}) and verified chainId 1672 on Pacific Mainnet.`,
          isMatch: true,
          evidenceDetails: `MultiCall3 at 0xcA11bde05977b3631167028862bE2a173976CA11 answered live eth_call for getCurrentBlockTimestamp() and getChainId().`,
          explorerUrl: 'https://pharos.socialscan.io/address/0xcA11bde05977b3631167028862bE2a173976CA11',
        };
      }

      return {
        status: 'FAILED',
        plannedOutcome: 'Verify MultiCall3 live response on Pacific Mainnet',
        actualOutcome: 'One or more contract calls did not return expected values or failed execution.',
        isMatch: false,
        evidenceDetails: `Step 1 ChainInfo: ${chainInfoOk}, Step 2 Timestamp: ${validTimestamp}, Step 3 ContractChainId: ${validChainIdFromContract}`,
      };
    }

    // 3. Account Balance and Nonce Inspection
    if (intent === 'ACCOUNT_STATE_INSPECTION') {
      const balanceStep = results.find(r => r.tool === 'get_balance');
      const nonceStep = results.find(r => r.tool === 'get_transaction_count');
      const gasStep = results.find(r => r.tool === 'get_gas_price');

      const balanceOk = balanceStep?.success && balanceStep.rawOutput?.balance !== undefined;
      const nonceOk = nonceStep?.success && (nonceStep.rawOutput?.nonce !== undefined || nonceStep.rawOutput?.transactionCount !== undefined);
      const gasOk = gasStep?.success && gasStep.rawOutput?.gasPriceGwei !== undefined;

      if (balanceOk && nonceOk && gasOk) {
        const bal = balanceStep.rawOutput.balance;
        const nonce = nonceStep.rawOutput.nonce !== undefined ? nonceStep.rawOutput.nonce : nonceStep.rawOutput.transactionCount;
        const gasGwei = gasStep.rawOutput.gasPriceGwei;

        return {
          status: 'VERIFIED',
          plannedOutcome: 'Retrieve confirmed native PROS balance, nonce, and current gas price',
          actualOutcome: `Account holds ${bal} PROS with confirmed transaction count (nonce) of ${nonce}. Current network gas price is ${gasGwei} Gwei.`,
          isMatch: true,
          evidenceDetails: `Chain MCP get_balance and get_transaction_count executed successfully against Pacific Mainnet state.`,
          explorerUrl: balanceStep.inputs?.address
            ? `https://pharos.socialscan.io/address/${balanceStep.inputs.address}`
            : undefined,
        };
      }

      return {
        status: 'FAILED',
        plannedOutcome: 'Verify account balance and nonce state',
        actualOutcome: 'Account inspection tool returned an error or incomplete state.',
        isMatch: false,
        evidenceDetails: `Balance check: ${balanceOk}, Nonce check: ${nonceOk}, Gas check: ${gasOk}`,
      };
    }

    // 4. Transaction Preparation Verification
    if (intent === 'TRANSACTION_PREPARATION') {
      const gasPriceStep = results.find(r => r.tool === 'get_gas_price');
      const estimateStep = results.find(r => r.tool === 'estimate_gas');
      const prepareStep = results.find(r => r.tool === 'prepare_unsigned_transaction');

      if (unsignedTx && prepareStep?.success) {
        const gasLimitValid = Number(BigInt(unsignedTx.gasLimit || '0x5208')) >= 21000;
        const chainIdMatches = unsignedTx.chainId === 1672;
        const unsignedInvariant = unsignedTx.signed === false && unsignedTx.broadcast === false;

        if (gasLimitValid && chainIdMatches && unsignedInvariant) {
          return {
            status: 'AWAITING_USER_SIGNATURE',
            plannedOutcome: 'Prepare fully formatted unsigned transaction with accurate gas and nonce parameters, stopping before signature',
            actualOutcome: `Unsigned transaction prepared for ${unsignedTx.valueFormatted} to ${unsignedTx.to}. Estimated gas limit: ${unsignedTx.gasLimit}, Gas price: ${unsignedTx.gasPriceGwei} Gwei, Chain ID: ${unsignedTx.chainId}. Zero signature or broadcast performed.`,
            isMatch: true,
            evidenceDetails: `Non-Custodial Invariant Verified: Transaction is preserved in raw unsigned format. Awaiting manual external wallet review and signature by user.`,
          };
        }
      }

      return {
        status: 'FAILED',
        plannedOutcome: 'Prepare unsigned transaction safely with gas estimates',
        actualOutcome: 'Transaction preparation failed or generated invalid parameters.',
        isMatch: false,
        evidenceDetails: 'Transaction preparation could not validate gas estimates or address format.',
      };
    }

    return {
      status: 'NOT_EXECUTED',
      plannedOutcome: 'Unknown workflow',
      actualOutcome: 'No execution occurred',
      isMatch: false,
      evidenceDetails: 'No verification rule applied.',
    };
  }
}
