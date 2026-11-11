// src/core/docs-client.ts
var DEFAULT_DOCS_MCP_URL = "https://docs.pharos.xyz/~gitbook/mcp";
var USER_AGENT = "PharosDocGroundedBuilderAgent/1.0 (+https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)";
var DocsMCPClient = class {
  endpointUrl;
  requestId = 0;
  constructor(endpointUrl = DEFAULT_DOCS_MCP_URL) {
    this.endpointUrl = endpointUrl;
  }
  nextId() {
    this.requestId += 1;
    return this.requestId;
  }
  parseSSEResponse(text) {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        try {
          return JSON.parse(trimmed.slice(6));
        } catch {
        }
      }
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse Docs MCP response: ${e.message} (Payload: ${text.slice(0, 150)})`);
    }
  }
  async postRpc(method, params = {}) {
    const payload = {
      jsonrpc: "2.0",
      id: this.nextId(),
      method,
      params
    };
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify(payload)
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
  async initialize() {
    return this.postRpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "pharos-doc-grounded-builder-agent",
        version: "1.0.0"
      }
    });
  }
  async searchDocumentation(query) {
    const res = await this.postRpc("tools/call", {
      name: "searchDocumentation",
      arguments: { query }
    });
    const contentItems = res?.content || [];
    const citations = [];
    for (const item of contentItems) {
      const text = item.text || "";
      let title = "";
      let url = "";
      const bodyLines = [];
      let captureContent = false;
      for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("Title: ")) {
          title = line.slice(7).trim();
        } else if (line.startsWith("Link: ")) {
          url = line.slice(6).trim();
        } else if (line.startsWith("Content: ")) {
          captureContent = true;
          bodyLines.push(line.slice(9).trim());
        } else if (captureContent) {
          bodyLines.push(rawLine);
        } else {
          bodyLines.push(rawLine);
        }
      }
      if (!title) title = "Pharos Documentation";
      if (!url) url = "https://docs.pharos.xyz";
      citations.push({
        title,
        url,
        contentExcerpt: bodyLines.join("\n").trim().slice(0, 1e3)
      });
    }
    return citations;
  }
  async getPage(pageUrl) {
    const res = await this.postRpc("tools/call", {
      name: "getPage",
      arguments: { url: pageUrl }
    });
    const items = res?.content || [];
    return items.map((it) => it.text || "").join("\n\n");
  }
};

// src/api/docs.ts
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const query = (url.searchParams.get("q") || url.searchParams.get("query") || "canonical contracts").trim();
  try {
    const docsClient = new DocsMCPClient();
    const citations = await docsClient.searchDocumentation(query);
    res.statusCode = 200;
    res.end(
      JSON.stringify(
        {
          query,
          count: citations.length,
          citations
        },
        null,
        2
      )
    );
  } catch (err) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: "Docs MCP query error",
        message: err.message
      })
    );
  }
}
export {
  handler as default
};
