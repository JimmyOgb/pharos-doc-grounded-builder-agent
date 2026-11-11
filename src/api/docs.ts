import type { IncomingMessage, ServerResponse } from 'node:http';
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

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const query = (url.searchParams.get('q') || url.searchParams.get('query') || 'canonical contracts').trim();

  try {
    const docsClient = new DocsMCPClient();
    const citations = await docsClient.searchDocumentation(query);

    res.statusCode = 200;
    res.end(
      JSON.stringify(
        {
          query,
          count: citations.length,
          citations,
        },
        null,
        2
      )
    );
  } catch (err: any) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'Docs MCP query error',
        message: err.message,
      })
    );
  }
}
