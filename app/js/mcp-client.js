/**
 * MCP Client for communicating with Zoho MCP Server
 */
export class MCPClient {
    constructor(serverUrl, proxyUrl) {
        this.serverUrl = serverUrl;
        this.proxyUrl = proxyUrl || '';
        this.requestId = 0;
        this.toolsCache = null;
    }

    _getNextId() {
        return ++this.requestId;
    }

    async _makeRequest(method, params = {}) {
        const payload = {
            jsonrpc: "2.0",
            id: this._getNextId(),
            method: method,
            params: params
        };

        try {
            const host = window.location.hostname;
            const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');

            let url;
            const headers = { 'Content-Type': 'application/json' };

            if (isLocal) {
                // Use local proxy
                url = `http://${host}:8083/zoho`;
                headers['X-Target-URL'] = this.serverUrl;
            } else if (this.proxyUrl) {
                // Use deployed proxy
                url = `${this.proxyUrl}/zoho`;
                headers['X-Target-URL'] = this.serverUrl;
            } else {
                // Direct call (will fail if CORS not allowed by server)
                url = this.serverUrl;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(`MCP Error: ${JSON.stringify(result.error)}`);
            }

            return result;
        } catch (error) {
            console.error("MCP Request Failed:", error);
            throw error;
        }
    }

    async listTools(useCache = true) {
        if (useCache && this.toolsCache) {
            return this.toolsCache;
        }

        const response = await this._makeRequest("tools/list");

        if (response.result && response.result.tools) {
            this.toolsCache = response.result.tools;
            return this.toolsCache;
        }

        throw new Error("Invalid response format from tools/list");
    }

    async callTool(toolName, args) {
        const params = {
            name: toolName,
            arguments: args
        };

        const response = await this._makeRequest("tools/call", params);

        if (response.result) {
            return response.result;
        }

        throw new Error("Invalid response format from tools/call");
    }

    async getToolsForClaude() {
        const tools = await this.listTools();
        return tools.map(tool => {
            // Truncate description to reduce token usage
            const fullDesc = tool.description || "No description available";
            const desc = fullDesc.length > 80 ? fullDesc.slice(0, 80) + '...' : fullDesc;

            // Strip property descriptions from schema to save tokens (major reduction)
            const schema = tool.inputSchema || { type: "object", properties: {}, required: [] };
            const strippedProps = {};
            for (const [key, val] of Object.entries(schema.properties || {})) {
                strippedProps[key] = { type: val.type || "string" };
                if (val.enum) strippedProps[key].enum = val.enum;
            }
            const trimmedSchema = {
                type: schema.type || "object",
                properties: strippedProps,
                ...(schema.required && schema.required.length > 0 ? { required: schema.required } : {})
            };

            return { name: tool.name, description: desc, input_schema: trimmedSchema };
        });
    }
}
