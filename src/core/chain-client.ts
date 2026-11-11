export const DEFAULT_CHAIN_MCP_URL = 'https://mcp.pharos.xyz/mcp';
export const USER_AGENT = 'PharosDocGroundedBuilderAgent/1.0 (+https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)';

export class ChainMCPClient {
  private endpointUrl: string;
  private sessionId: string | null = null;
  private cookie: string | null = null;
  private requestId = 0;

  constructor(endpointUrl: string = DEFAULT_CHAIN_MCP_URL) {
    this.endpointUrl = endpointUrl;
  }

  private nextId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  private parseSSEResponse(text: string): any {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          return JSON.parse(trimmed.slice(6));
        } catch {
          // Continue searching
        }
      }
    }
    try {
      return JSON.parse(text);
    } catch (e: any) {
      throw new Error(`Failed to parse Chain MCP response: ${e.message} (Payload: ${text.slice(0, 150)})`);
    }
  }

  async initialize(): Promise<void> {
    const initPayload = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'pharos-doc-grounded-builder-agent',
          version: '1.0.0',
        },
      },
    };

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(this.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'User-Agent': USER_AGENT,
          },
          body: JSON.stringify(initPayload),
        });
        if (response.ok) break;
      } catch (e: any) {
        lastError = e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Chain MCP initialize HTTP error: ${response?.status || lastError?.message}`);
    }

    this.sessionId = response.headers.get('mcp-session-id');
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookie = setCookie.split(';')[0];
    }

    // Handshake notification
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': USER_AGENT,
    };
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId;
    if (this.cookie) headers['Cookie'] = this.cookie;

    try {
      await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });
    } catch {
      // Notification is fire-and-forget
    }
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!this.sessionId) {
        await this.initialize();
      }

      const payload = {
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'User-Agent': USER_AGENT,
      };
      if (this.sessionId) headers['mcp-session-id'] = this.sessionId;
      if (this.cookie) headers['Cookie'] = this.cookie;

      try {
        const response = await fetch(this.endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 400 || response.status === 404 || response.status === 502) {
            // Session may be stale, reset and retry
            this.sessionId = null;
            await new Promise(r => setTimeout(r, 800));
            continue;
          }
          throw new Error(`Chain MCP callTool(${name}) HTTP error: ${response.status}`);
        }

        const rawText = await response.text();
        const parsed = this.parseSSEResponse(rawText);

        if (parsed.error) {
          throw new Error(`Chain MCP tool error (${parsed.error.code}): ${parsed.error.message}`);
        }

        const contentItem = parsed.result?.content?.[0];
        if (contentItem?.text) {
          try {
            return JSON.parse(contentItem.text);
          } catch {
            return contentItem.text;
          }
        }
        return parsed.result;
      } catch (err: any) {
        if (attempt < 2) {
          this.sessionId = null;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw err;
      }
    }
  }

  async getChainInfo(): Promise<any> {
    return this.callTool('get_chain_info');
  }

  async getBlockNumber(): Promise<any> {
    return this.callTool('get_block_number');
  }

  async getBalance(address: string): Promise<any> {
    return this.callTool('get_balance', { address });
  }

  async getTransactionCount(address: string): Promise<any> {
    return this.callTool('get_transaction_count', { address });
  }

  async getGasPrice(): Promise<any> {
    return this.callTool('get_gas_price');
  }

  async ethCall(to: string, data: string, from?: string): Promise<any> {
    const tx: Record<string, string> = { to, data };
    if (from) tx.from = from;
    return this.callTool('eth_call', { transaction: tx });
  }

  async estimateGas(transaction: Record<string, any>): Promise<any> {
    return this.callTool('estimate_gas', { transaction });
  }

  async getCode(address: string): Promise<any> {
    return this.callTool('get_code', { address });
  }

  async getTransactionReceipt(hash: string): Promise<any> {
    return this.callTool('get_transaction_receipt', { hash });
  }
}
