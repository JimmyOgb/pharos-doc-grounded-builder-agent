// src/core/chain-client.ts
var DEFAULT_CHAIN_MCP_URL = "https://mcp.pharos.xyz/mcp";
var USER_AGENT = "PharosDocGroundedBuilderAgent/1.0 (+https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)";
var ChainMCPClient = class {
  endpointUrl;
  sessionId = null;
  cookie = null;
  requestId = 0;
  constructor(endpointUrl = DEFAULT_CHAIN_MCP_URL) {
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
      throw new Error(`Failed to parse Chain MCP response: ${e.message} (Payload: ${text.slice(0, 150)})`);
    }
  }
  async initialize() {
    const initPayload = {
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "pharos-doc-grounded-builder-agent",
          version: "1.0.0"
        }
      }
    };
    let response = null;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(this.endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "User-Agent": USER_AGENT
          },
          body: JSON.stringify(initPayload)
        });
        if (response.ok) break;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 1e3));
      }
    }
    if (!response || !response.ok) {
      throw new Error(`Chain MCP initialize HTTP error: ${response?.status || lastError?.message}`);
    }
    this.sessionId = response.headers.get("mcp-session-id");
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookie = setCookie.split(";")[0];
    }
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "User-Agent": USER_AGENT
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    if (this.cookie) headers["Cookie"] = this.cookie;
    try {
      await fetch(this.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized"
        })
      });
    } catch {
    }
  }
  async callTool(name, args = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!this.sessionId) {
        await this.initialize();
      }
      const payload = {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "tools/call",
        params: {
          name,
          arguments: args
        }
      };
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": USER_AGENT
      };
      if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
      if (this.cookie) headers["Cookie"] = this.cookie;
      try {
        const response = await fetch(this.endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          if (response.status === 400 || response.status === 404 || response.status === 502) {
            this.sessionId = null;
            await new Promise((r) => setTimeout(r, 800));
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
      } catch (err) {
        if (attempt < 2) {
          this.sessionId = null;
          await new Promise((r) => setTimeout(r, 1e3));
          continue;
        }
        throw err;
      }
    }
  }
  async getChainInfo() {
    return this.callTool("get_chain_info");
  }
  async getBlockNumber() {
    return this.callTool("get_block_number");
  }
  async getBalance(address) {
    return this.callTool("get_balance", { address });
  }
  async getTransactionCount(address) {
    return this.callTool("get_transaction_count", { address });
  }
  async getGasPrice() {
    return this.callTool("get_gas_price");
  }
  async ethCall(to, data, from) {
    const tx = { to, data };
    if (from) tx.from = from;
    return this.callTool("eth_call", { transaction: tx });
  }
  async estimateGas(transaction) {
    return this.callTool("estimate_gas", { transaction });
  }
  async getCode(address) {
    return this.callTool("get_code", { address });
  }
  async getTransactionReceipt(hash) {
    return this.callTool("get_transaction_receipt", { hash });
  }
};

// src/core/docs-client.ts
var DEFAULT_DOCS_MCP_URL = "https://docs.pharos.xyz/~gitbook/mcp";
var USER_AGENT2 = "PharosDocGroundedBuilderAgent/1.0 (+https://github.com/JimmyOgb/pharos-doc-grounded-builder-agent)";
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
        "User-Agent": USER_AGENT2
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

// src/api/health.ts
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
  const startTime = Date.now();
  let chainStatus = "UNKNOWN";
  let docsStatus = "UNKNOWN";
  let chainInfo = null;
  let docsInfo = null;
  try {
    const chainClient = new ChainMCPClient();
    chainInfo = await chainClient.getChainInfo();
    chainStatus = chainInfo?.chainId === 1672 ? "ONLINE" : "DEGRADED";
  } catch (err) {
    chainStatus = "OFFLINE";
    chainInfo = { error: err.message };
  }
  try {
    const docsClient = new DocsMCPClient();
    docsInfo = await docsClient.initialize();
    docsStatus = docsInfo?.serverInfo ? "ONLINE" : "DEGRADED";
  } catch (err) {
    docsStatus = "OFFLINE";
    docsInfo = { error: err.message };
  }
  const isHealthy = chainStatus === "ONLINE" && docsStatus === "ONLINE";
  res.statusCode = isHealthy ? 200 : 503;
  res.end(
    JSON.stringify({
      service: "Pharos Doc-Grounded Builder Agent",
      status: isHealthy ? "HEALTHY" : "DEGRADED",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      latencyMs: Date.now() - startTime,
      mcpEndpoints: {
        chainMcp: {
          url: "https://mcp.pharos.xyz/mcp",
          status: chainStatus,
          chainInfo
        },
        docsMcp: {
          url: "https://docs.pharos.xyz/~gitbook/mcp",
          status: docsStatus,
          serverInfo: docsInfo?.serverInfo
        }
      }
    })
  );
}
export {
  handler as default
};
