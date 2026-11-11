import type { IncomingMessage, ServerResponse } from 'node:http';
import { DocGroundedBuilderAgent } from '../core/agent.ts';

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e: any) {
        reject(new Error(`Invalid JSON: ${e.message}`));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    let question = '';
    let address: string | undefined;
    let amount: string | undefined;

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      question = (body.question || '').trim();
      address = body.address ? String(body.address).trim() : undefined;
      amount = body.amount ? String(body.amount).trim() : undefined;
    } else if (req.method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      question = (url.searchParams.get('q') || url.searchParams.get('question') || '').trim();
      address = url.searchParams.get('address') || undefined;
      amount = url.searchParams.get('amount') || undefined;
    }

    if (!question) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: 'Missing required field: "question". Provide a natural language "How do I..." question.',
        })
      );
      return;
    }

    const agent = new DocGroundedBuilderAgent();
    const result = await agent.run(question, { address, amount });

    res.statusCode = 200;
    res.end(JSON.stringify(result, null, 2));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'DocGroundedBuilderAgent execution error',
        message: err.message,
      })
    );
  }
}
