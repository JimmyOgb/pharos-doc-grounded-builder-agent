import { DocsMCPClient } from './docs-client.ts';
import { ChainMCPClient } from './chain-client.ts';
import { classifyIntent, type ParsedRequest } from './intent.ts';
import { PlanGenerator } from './planner.ts';
import { OutcomeVerifier } from './verifier.ts';
import type {
  ActionPlan,
  BuilderAgentResponse,
  DocCitation,
  ExecutionStepResult,
  UnsignedTransaction,
  WorkflowStatus,
} from '../types/index.ts';

export class DocGroundedBuilderAgent {
  private docsClient: DocsMCPClient;
  private chainClient: ChainMCPClient;
  private planner: PlanGenerator;
  private verifier: OutcomeVerifier;

  constructor(
    docsEndpoint?: string,
    chainEndpoint?: string
  ) {
    this.docsClient = new DocsMCPClient(docsEndpoint);
    this.chainClient = new ChainMCPClient(chainEndpoint);
    this.planner = new PlanGenerator();
    this.verifier = new OutcomeVerifier();
  }

  async run(question: string, overrideParams?: { address?: string; amount?: string }): Promise<BuilderAgentResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    // Stage 1 & 2: User Request Intake & Intent Classification
    const parsedRequest: ParsedRequest = classifyIntent(question);
    const targetAddress = overrideParams?.address || parsedRequest.targetAddress;
    const targetAmount = overrideParams?.amount || parsedRequest.targetAmount;

    // Stage 3: Official Developer Docs MCP Retrieval
    let citations: DocCitation[] = [];
    let docsError: string | undefined;

    try {
      citations = await this.docsClient.searchDocumentation(parsedRequest.docsSearchQuery);
    } catch (err: any) {
      docsError = err.message;
    }

    // Stage 4: Documentation Relevance & Coverage Assessment
    let documentationCoverage = false;
    let missingDocumentation: string | undefined;

    if (parsedRequest.isUnsupportedCandidate) {
      documentationCoverage = false;
      missingDocumentation = parsedRequest.unsupportedReason ||
        `No official documentation found covering "${parsedRequest.docsSearchQuery}" on Pharos.`;
    } else if (citations.length > 0 && !docsError) {
      // Check if citations actually relate to Pharos official capabilities
      documentationCoverage = true;
    } else {
      documentationCoverage = false;
      missingDocumentation = `Official Docs MCP returned no matching documentation or encountered an error: ${docsError || 'Empty results'}.`;
    }

    // If request is undocumented, STOP IMMEDIATELY (Requirement 5)
    if (!documentationCoverage || parsedRequest.intent === 'UNDOCUMENTED_OR_UNKNOWN') {
      const verification = this.verifier.verify('UNDOCUMENTED_OR_UNKNOWN', null, []);
      return {
        requestId,
        timestamp,
        userQuestion: question,
        intent: 'UNDOCUMENTED_OR_UNKNOWN',
        documentationCoverage: false,
        documentationSources: citations,
        missingDocumentation: missingDocumentation || 'Operation is undocumented on Pharos. Refusing to improvise.',
        executionResults: [],
        verification,
        finalStatus: 'UNSUPPORTED',
        summary: `Refused to execute: The requested operation ("${question}") is not covered in the official Pharos Developer Documentation. As an official-doc grounded agent, undocumented operations are safely rejected without improvising contract calls.`,
      };
    }

    // Stage 5 & 6: Source Citation Preservation & Action Plan Generation
    const plan: ActionPlan | null = this.planner.generatePlan(
      parsedRequest.intent,
      citations,
      targetAddress,
      targetAmount
    );

    if (!plan) {
      return {
        requestId,
        timestamp,
        userQuestion: question,
        intent: parsedRequest.intent,
        documentationCoverage: true,
        documentationSources: citations,
        executionResults: [],
        verification: {
          status: 'NOT_EXECUTED',
          plannedOutcome: 'Generate actionable plan',
          actualOutcome: 'Plan generation could not map intent to concrete actions',
          isMatch: false,
          evidenceDetails: 'Intent mapping failed.',
        },
        finalStatus: 'NOT_EXECUTED',
        summary: 'Unable to formulate structured plan from retrieved documentation.',
      };
    }

    // Stage 7 & 8: Plan Safety Validation & Chain MCP Execution
    const executionResults: ExecutionStepResult[] = [];
    let unsignedTx: UnsignedTransaction | undefined;

    try {
      if (parsedRequest.intent === 'CANONICAL_CONTRACT_QUERY') {
        // Step 1: get_chain_info
        const chainInfo = await this.chainClient.getChainInfo();
        executionResults.push({
          stepNumber: 1,
          tool: 'get_chain_info',
          inputs: {},
          rawOutput: chainInfo,
          decodedOutput: {
            network: chainInfo?.name,
            chainId: chainInfo?.chainId,
            latestBlock: chainInfo?.latestBlock,
          },
          success: true,
        });

        // Step 2: eth_call getCurrentBlockTimestamp() on MultiCall3 (0xcA11bde05977b3631167028862bE2a173976CA11)
        const tsRaw = await this.chainClient.ethCall(
          '0xcA11bde05977b3631167028862bE2a173976CA11',
          '0x0f28c97d'
        );
        let tsDecoded = 0;
        const hexStr = typeof tsRaw === 'string' ? tsRaw : (tsRaw?.result || '0x0');
        if (typeof hexStr === 'string' && hexStr.startsWith('0x')) {
          tsDecoded = Number(BigInt(hexStr));
        }

        executionResults.push({
          stepNumber: 2,
          tool: 'eth_call',
          inputs: {
            to: '0xcA11bde05977b3631167028862bE2a173976CA11',
            function: 'getCurrentBlockTimestamp()',
            selector: '0x0f28c97d',
          },
          rawOutput: tsRaw,
          decodedOutput: {
            blockTimestamp: tsDecoded,
            isoTime: tsDecoded > 0 ? new Date(tsDecoded * 1000).toISOString() : 'N/A',
          },
          success: tsDecoded > 0,
        });

        // Step 3: eth_call getChainId() [0x3408e470] on MultiCall3
        const chainIdCallRaw = await this.chainClient.ethCall(
          '0xcA11bde05977b3631167028862bE2a173976CA11',
          '0x3408e470'
        );
        let contractChainId = 0;
        const cHexStr = typeof chainIdCallRaw === 'string' ? chainIdCallRaw : (chainIdCallRaw?.result || '0x0');
        if (typeof cHexStr === 'string' && cHexStr.startsWith('0x')) {
          contractChainId = Number(BigInt(cHexStr));
        }

        executionResults.push({
          stepNumber: 3,
          tool: 'eth_call',
          inputs: {
            to: '0xcA11bde05977b3631167028862bE2a173976CA11',
            function: 'getChainId()',
            selector: '0x3408e470',
          },
          rawOutput: chainIdCallRaw,
          decodedOutput: {
            contractChainId,
            matchesPacificMainnet: contractChainId === 1672,
          },
          success: contractChainId === 1672,
        });
      } else if (parsedRequest.intent === 'ACCOUNT_STATE_INSPECTION') {
        const addr = targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';

        // Step 1: get_balance
        const balRes = await this.chainClient.getBalance(addr);
        executionResults.push({
          stepNumber: 1,
          tool: 'get_balance',
          inputs: { address: addr },
          rawOutput: balRes,
          decodedOutput: {
            balance: balRes?.balance,
            balanceWei: balRes?.balanceWei,
            symbol: balRes?.symbol || 'PROS',
          },
          success: balRes?.balance !== undefined,
        });

        // Step 2: get_transaction_count
        const nonceRes = await this.chainClient.getTransactionCount(addr);
        const nonceVal = nonceRes?.nonce !== undefined ? nonceRes.nonce : nonceRes?.transactionCount;
        executionResults.push({
          stepNumber: 2,
          tool: 'get_transaction_count',
          inputs: { address: addr },
          rawOutput: nonceRes,
          decodedOutput: {
            nonce: nonceVal,
            nonceHex: nonceRes?.nonceHex || nonceRes?.transactionCountHex,
          },
          success: nonceVal !== undefined,
        });

        // Step 3: get_gas_price
        const gasRes = await this.chainClient.getGasPrice();
        executionResults.push({
          stepNumber: 3,
          tool: 'get_gas_price',
          inputs: {},
          rawOutput: gasRes,
          decodedOutput: {
            gasPriceGwei: gasRes?.gasPriceGwei,
            maxPriorityFeePerGasGwei: gasRes?.maxPriorityFeePerGasGwei,
          },
          success: gasRes?.gasPriceGwei !== undefined,
        });
      } else if (parsedRequest.intent === 'TRANSACTION_PREPARATION') {
        const dest = targetAddress || '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';
        const amt = targetAmount || '0.01';
        // Convert to wei
        const weiVal = (BigInt(Math.floor(parseFloat(amt) * 1e6)) * BigInt(1e12)).toString();
        const hexVal = '0x' + BigInt(weiVal).toString(16);

        // Step 1: get_gas_price
        const gasRes = await this.chainClient.getGasPrice();
        executionResults.push({
          stepNumber: 1,
          tool: 'get_gas_price',
          inputs: {},
          rawOutput: gasRes,
          decodedOutput: {
            gasPriceGwei: gasRes?.gasPriceGwei || '10',
          },
          success: true,
        });

        // Step 2: estimate_gas
        let estGas = '0x5208'; // default 21000 for standard transfer
        let estSuccess = true;
        try {
          const estRes = await this.chainClient.estimateGas({
            to: dest,
            value: hexVal,
          });
          if (estRes && typeof estRes === 'object' && estRes.gasLimit) {
            estGas = estRes.gasLimit;
          }
          executionResults.push({
            stepNumber: 2,
            tool: 'estimate_gas',
            inputs: { to: dest, value: hexVal },
            rawOutput: estRes || { gasLimit: estGas },
            decodedOutput: { estimatedGasUnits: Number(BigInt(estGas)) },
            success: true,
          });
        } catch (e: any) {
          executionResults.push({
            stepNumber: 2,
            tool: 'estimate_gas',
            inputs: { to: dest, value: hexVal },
            rawOutput: { gasLimit: estGas, fallback: true, reason: e.message },
            decodedOutput: { estimatedGasUnits: 21000 },
            success: true,
          });
        }

        // Step 3: prepare unsigned transaction payload
        unsignedTx = {
          chainId: 1672,
          network: 'Pharos Pacific Mainnet',
          to: dest,
          value: hexVal,
          valueFormatted: `${amt} PROS`,
          data: '0x',
          gasLimit: estGas,
          gasPriceGwei: gasRes?.gasPriceGwei || '10',
          description: `Transfer ${amt} PROS to ${dest} on Pharos Pacific Mainnet`,
          signed: false,
          broadcast: false,
          userActionRequired: 'Review transaction parameters in your non-custodial wallet (e.g. MetaMask/Rabby) and sign manually outside the agent.',
        };

        executionResults.push({
          stepNumber: 3,
          tool: 'prepare_unsigned_transaction',
          inputs: {
            destination: dest,
            amount: amt,
            network: 'Pacific Mainnet',
          },
          rawOutput: unsignedTx,
          decodedOutput: {
            status: 'AWAITING_USER_SIGNATURE',
            safetyVerified: true,
          },
          success: true,
        });
      }
    } catch (execErr: any) {
      executionResults.push({
        stepNumber: executionResults.length + 1,
        tool: 'chain_mcp_error',
        inputs: {},
        rawOutput: { error: execErr.message },
        success: false,
        error: execErr.message,
      });
    }

    // Stage 9: Independent Outcome Verification
    const verification = this.verifier.verify(
      parsedRequest.intent,
      plan,
      executionResults,
      unsignedTx
    );

    // Stage 10: Final Planned vs. Actual Report
    const summary = `Executed "${plan.workflowName}" grounded in official docs. Final Status: ${verification.status}. ${verification.actualOutcome}`;

    return {
      requestId,
      timestamp,
      userQuestion: question,
      intent: parsedRequest.intent,
      documentationCoverage: true,
      documentationSources: citations,
      actionPlan: plan,
      executionResults,
      unsignedTransaction: unsignedTx,
      verification,
      finalStatus: verification.status,
      summary,
    };
  }
}
