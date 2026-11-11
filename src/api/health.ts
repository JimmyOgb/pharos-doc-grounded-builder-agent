import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChainMCPClient } from '../core/chain-client.ts';
import { DocsMCPClient } from '../core/docs-client.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const startTime = Date.now();
  let chainStatus = 'UNKNOWN';
  let docsStatus = 'UNKNOWN';
  let chainInfo: any = null;
  let docsInfo: any = null;

  try {
    const chainClient = new ChainMCPClient();
    chainInfo = await chainClient.getChainInfo();
    chainStatus = chainInfo?.chainId === 1672 ? 'ONLINE' : 'DEGRADED';
  } catch (err: any) {
    chainStatus = 'OFFLINE';
    chainInfo = { error: err.message };
  }

  try {
    const docsClient = new DocsMCPClient();
    docsInfo = await docsClient.initialize();
    docsStatus = docsInfo?.serverInfo ? 'ONLINE' : 'DEGRADED';
  } catch (err: any) {
    docsStatus = 'OFFLINE';
    docsInfo = { error: err.message };
  }

  const isHealthy = chainStatus === 'ONLINE' && docsStatus === 'ONLINE';

  res.statusCode = isHealthy ? 200 : 503;
  res.end(
    JSON.stringify({
      service: 'Pharos Doc-Grounded Builder Agent',
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      mcpEndpoints: {
        chainMcp: {
          url: 'https://mcp.pharos.xyz/mcp',
          status: chainStatus,
          chainInfo,
        },
        docsMcp: {
          url: 'https://docs.pharos.xyz/~gitbook/mcp',
          status: docsStatus,
          serverInfo: docsInfo?.serverInfo,
        },
      },
    })
  );
}
