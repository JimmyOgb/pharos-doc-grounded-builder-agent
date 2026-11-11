import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DocsMCPClient } from '../../src/core/docs-client.ts';
import { ChainMCPClient } from '../../src/core/chain-client.ts';
import { DocGroundedBuilderAgent } from '../../src/core/agent.ts';

describe('Live Integration Tests: Official MCP Endpoints', { timeout: 40000 }, () => {
  it('connects to live Docs MCP and retrieves canonical contract citations', async () => {
    const docsClient = new DocsMCPClient();
    const citations = await docsClient.searchDocumentation('Canonical Contracts MultiCall3');
    assert.ok(citations.length > 0, 'Docs MCP should return at least one citation');
    const first = citations[0];
    assert.ok(first.title.length > 0);
    assert.ok(first.url.startsWith('https://docs.pharos.xyz'));
  });

  it('connects to live Chain MCP and retrieves chain ID 1672', async () => {
    const chainClient = new ChainMCPClient();
    const info = await chainClient.getChainInfo();
    assert.equal(info.chainId, 1672, 'Expected Pacific Mainnet Chain ID 1672');
    assert.equal(info.nativeSymbol, 'PROS');
    assert.equal(info.rpcUrl, 'https://rpc.pharos.xyz');
  });
});

describe('Live Integration Tests: The Three Distinct Workflows + Unsupported Safeguard', { timeout: 60000 }, () => {
  const agent = new DocGroundedBuilderAgent();

  it('Workflow 1 (Read-Only): Query MultiCall3 block timestamp and verify chain ID', async () => {
    const res = await agent.run('How do I query live block timestamp and chain ID from MultiCall3 on Pharos?');
    assert.equal(res.intent, 'CANONICAL_CONTRACT_QUERY');
    assert.equal(res.documentationCoverage, true);
    assert.ok(res.documentationSources.length > 0);
    assert.ok(res.actionPlan);
    assert.equal(res.actionPlan.steps.length, 3);
    assert.equal(res.finalStatus, 'VERIFIED');
    assert.equal(res.verification.status, 'VERIFIED');
    assert.ok(res.verification.isMatch);
  });

  it('Workflow 2 (Inspect Account): Query native PROS balance and nonce', async () => {
    const res = await agent.run(
      'How do I check the native PROS balance and transaction count (nonce) of an address on Pharos?',
      { address: '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2' }
    );
    assert.equal(res.intent, 'ACCOUNT_STATE_INSPECTION');
    assert.equal(res.documentationCoverage, true);
    assert.ok(res.documentationSources.length > 0);
    assert.ok(res.actionPlan);
    assert.equal(res.finalStatus, 'VERIFIED');
    assert.equal(res.verification.status, 'VERIFIED');
    assert.ok(res.verification.isMatch);
  });

  it('Workflow 3 (Prepare State-Changing): Prepare unsigned native PROS transfer', async () => {
    const res = await agent.run(
      'How do I prepare a native PROS transfer on Pharos Pacific Mainnet?',
      { address: '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2', amount: '0.01' }
    );
    assert.equal(res.intent, 'TRANSACTION_PREPARATION');
    assert.equal(res.documentationCoverage, true);
    assert.ok(res.actionPlan);
    assert.equal(res.finalStatus, 'AWAITING_USER_SIGNATURE');
    assert.ok(res.unsignedTransaction);
    assert.equal(res.unsignedTransaction.signed, false);
    assert.equal(res.unsignedTransaction.broadcast, false);
    assert.equal(res.unsignedTransaction.chainId, 1672);
  });

  it('Requirement 5 (Unsupported Request): Refuse to improvise for undocumented operation', async () => {
    const res = await agent.run('How do I stake with Lido liquid staking on Pharos?');
    assert.equal(res.intent, 'UNDOCUMENTED_OR_UNKNOWN');
    assert.equal(res.documentationCoverage, false);
    assert.equal(res.finalStatus, 'UNSUPPORTED');
    assert.equal(res.executionResults.length, 0, 'Must execute zero chain tools for unsupported requests');
    assert.ok(res.summary.includes('Refused to execute'));
  });
});
