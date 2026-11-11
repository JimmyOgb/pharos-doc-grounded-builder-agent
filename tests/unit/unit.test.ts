import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent } from '../../src/core/intent.ts';
import { PlanGenerator } from '../../src/core/planner.ts';
import { OutcomeVerifier } from '../../src/core/verifier.ts';
import type { DocCitation, ExecutionStepResult, UnsignedTransaction } from '../../src/types/index.ts';

describe('Unit Tests: Intent Classification & Safety', () => {
  it('correctly classifies MultiCall3 contract read intent', () => {
    const res = classifyIntent('How do I query live block timestamp and chain ID from MultiCall3 on Pharos?');
    assert.equal(res.intent, 'CANONICAL_CONTRACT_QUERY');
    assert.equal(res.targetAddress, '0xcA11bde05977b3631167028862bE2a173976CA11');
    assert.equal(res.isUnsupportedCandidate, false);
  });

  it('correctly classifies account inspection intent with address extraction', () => {
    const res = classifyIntent('How do I check the native PROS balance and transaction count of 0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2 on Pharos?');
    assert.equal(res.intent, 'ACCOUNT_STATE_INSPECTION');
    assert.equal(res.targetAddress, '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2');
    assert.equal(res.isUnsupportedCandidate, false);
  });

  it('correctly classifies transaction preparation intent', () => {
    const res = classifyIntent('How do I prepare a native PROS transfer on Pharos Pacific Mainnet?');
    assert.equal(res.intent, 'TRANSACTION_PREPARATION');
    assert.equal(res.isUnsupportedCandidate, false);
  });

  it('safely flags unsupported / undocumented request (Lido liquid staking)', () => {
    const res = classifyIntent('How do I stake with Lido liquid staking on Pharos?');
    assert.equal(res.intent, 'UNDOCUMENTED_OR_UNKNOWN');
    assert.equal(res.isUnsupportedCandidate, true);
    assert.ok(res.unsupportedReason?.includes('not documented'));
  });

  it('safely flags unsupported / undocumented request (Flash loans)', () => {
    const res = classifyIntent('How do I execute a flash loan on Pharos?');
    assert.equal(res.intent, 'UNDOCUMENTED_OR_UNKNOWN');
    assert.equal(res.isUnsupportedCandidate, true);
  });
});

describe('Unit Tests: Action Plan Generation', () => {
  const planner = new PlanGenerator();
  const mockCitations: DocCitation[] = [
    {
      title: 'Canonical Contracts',
      url: 'https://docs.pharos.xyz/getting-started/canonical-contracts',
      contentExcerpt: 'MultiCall3 is deployed at 0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  ];

  it('generates a 3-step read-only plan for MultiCall3 queries', () => {
    const plan = planner.generatePlan('CANONICAL_CONTRACT_QUERY', mockCitations);
    assert.ok(plan);
    assert.equal(plan.steps.length, 3);
    assert.equal(plan.chainId, 1672);
    assert.equal(plan.steps[0].stepType, 'READ_ONLY');
    assert.equal(plan.steps[1].stepType, 'READ_ONLY');
    assert.equal(plan.steps[2].stepType, 'READ_ONLY');
  });

  it('generates a plan for account balance inspection', () => {
    const plan = planner.generatePlan('ACCOUNT_STATE_INSPECTION', mockCitations, '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2');
    assert.ok(plan);
    assert.equal(plan.steps.length, 3);
    assert.equal(plan.steps[0].targetTool, 'get_balance');
    assert.equal(plan.steps[1].targetTool, 'get_transaction_count');
  });

  it('generates a state-changing plan that requires unsigned transaction review', () => {
    const plan = planner.generatePlan('TRANSACTION_PREPARATION', mockCitations, '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2', '0.05');
    assert.ok(plan);
    assert.equal(plan.steps.length, 3);
    const lastStep = plan.steps[2];
    assert.equal(lastStep.stepType, 'STATE_CHANGING');
    assert.ok(lastStep.safetyNotes.includes('NON-CUSTODIAL SAFETY'));
    assert.ok(lastStep.expectedOutcome.includes('AWAITING_USER_SIGNATURE'));
  });

  it('returns null plan for undocumented or unknown intents', () => {
    const plan = planner.generatePlan('UNDOCUMENTED_OR_UNKNOWN', mockCitations);
    assert.equal(plan, null);
  });
});

describe('Unit Tests: Outcome Verification & Guardrails', () => {
  const verifier = new OutcomeVerifier();

  it('verifies canonical contract query when timestamp and chainId match', () => {
    const plan = new PlanGenerator().generatePlan('CANONICAL_CONTRACT_QUERY', []);
    const results: ExecutionStepResult[] = [
      {
        stepNumber: 1,
        tool: 'get_chain_info',
        inputs: {},
        rawOutput: { chainId: 1672, name: 'Pharos' },
        success: true,
      },
      {
        stepNumber: 2,
        tool: 'eth_call',
        inputs: {},
        rawOutput: '0x000000000000000000000000000000000000000000000000000000006af4271d', // 1794385693
        success: true,
      },
      {
        stepNumber: 3,
        tool: 'eth_call',
        inputs: {},
        rawOutput: '0x0000000000000000000000000000000000000000000000000000000000000688',
        decodedOutput: { contractChainId: 1672 },
        success: true,
      },
    ];

    const ver = verifier.verify('CANONICAL_CONTRACT_QUERY', plan, results);
    assert.equal(ver.status, 'VERIFIED');
    assert.equal(ver.isMatch, true);
    assert.ok(ver.actualOutcome.includes('MultiCall3 returned timestamp'));
  });

  it('returns AWAITING_USER_SIGNATURE for properly prepared unsigned transaction', () => {
    const plan = new PlanGenerator().generatePlan('TRANSACTION_PREPARATION', []);
    const results: ExecutionStepResult[] = [
      { stepNumber: 1, tool: 'get_gas_price', inputs: {}, rawOutput: { gasPriceGwei: '10' }, success: true },
      { stepNumber: 2, tool: 'estimate_gas', inputs: {}, rawOutput: { gasLimit: '0x5208' }, success: true },
      { stepNumber: 3, tool: 'prepare_unsigned_transaction', inputs: {}, rawOutput: {}, success: true },
    ];
    const unsignedTx: UnsignedTransaction = {
      chainId: 1672,
      network: 'Pharos Pacific Mainnet',
      to: '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2',
      value: '0x2386f26fc10000',
      valueFormatted: '0.01 PROS',
      data: '0x',
      gasLimit: '0x5208',
      gasPriceGwei: '10',
      description: 'Transfer 0.01 PROS',
      signed: false,
      broadcast: false,
      userActionRequired: 'Sign manually',
    };

    const ver = verifier.verify('TRANSACTION_PREPARATION', plan, results, unsignedTx);
    assert.equal(ver.status, 'AWAITING_USER_SIGNATURE');
    assert.equal(ver.isMatch, true);
    assert.ok(ver.evidenceDetails.includes('Non-Custodial Invariant Verified'));
  });

  it('safely halts and sets UNSUPPORTED when no plan exists', () => {
    const ver = verifier.verify('UNDOCUMENTED_OR_UNKNOWN', null, []);
    assert.equal(ver.status, 'UNSUPPORTED');
    assert.equal(ver.isMatch, true);
    assert.ok(ver.actualOutcome.includes('Refused to improvise'));
  });
});
