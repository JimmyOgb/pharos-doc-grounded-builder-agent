import type { DocCitation } from '../types/index.ts';

export const DEFAULT_DOCS_MCP_URL = 'https://docs.pharos.xyz/~gitbook/mcp';
export const USER_AGENT = 'PharosDocGroundedBuilderAgent/1.0 (+https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)';

export class DocsMCPClient {
  private endpointUrl: string;
  private requestId = 0;

  constructor(endpointUrl: string = DEFAULT_DOCS_MCP_URL) {
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
      throw new Error(`Failed to parse Docs MCP response: ${e.message} (Payload: ${text.slice(0, 150)})`);
    }
  }

  async postRpc(method: string, params: Record<string, any> = {}): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method,
      params,
    };

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Docs MCP HTTP error: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    const parsed = this.parseSSEResponse(rawText);
    if (parsed.error) {
      throw new Error(`Docs MCP RPC error (${parsed.error.code}): ${parsed.error.message}`);
    }
    return parsed.result;
  }

  async initialize(): Promise<any> {
    return this.postRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'pharos-doc-grounded-builder-agent',
        version: '1.0.0',
      },
    });
  }

  async searchDocumentation(query: string): Promise<DocCitation[]> {
    const res = await this.postRpc('tools/call', {
      name: 'searchDocumentation',
      arguments: { query },
    });

    const contentItems = res?.content || [];
    const citations: DocCitation[] = [];

    for (const item of contentItems) {
      const text = item.text || '';
      let title = '';
      let url = '';
      const bodyLines: string[] = [];
      let captureContent = false;

      for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (line.startsWith('Title: ')) {
          title = line.slice(7).trim();
        } else if (line.startsWith('Link: ')) {
          url = line.slice(6).trim();
        } else if (line.startsWith('Content: ')) {
          captureContent = true;
          bodyLines.push(line.slice(9).trim());
        } else if (captureContent) {
          bodyLines.push(rawLine);
        } else {
          bodyLines.push(rawLine);
        }
      }

      if (!title) title = 'Pharos Documentation';
      if (!url) url = 'https://docs.pharos.xyz';

      citations.push({
        title,
        url,
        contentExcerpt: bodyLines.join('\n').trim().slice(0, 1000),
      });
    }

    return citations;
  }

  async getPage(pageUrl: string): Promise<string> {
    const res = await this.postRpc('tools/call', {
      name: 'getPage',
      arguments: { url: pageUrl },
    });
    const items = res?.content || [];
    return items.map((it: any) => it.text || '').join('\n\n');
  }
}
