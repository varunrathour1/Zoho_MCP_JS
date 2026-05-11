/**
 * Configuration management for the JS Client
 */
export class Config {
    constructor() {
        this.CLAUDE_API_KEY = localStorage.getItem('claude_api_key') || '';
        this.ZOHO_MCP_URL = localStorage.getItem('zoho_mcp_url') || '';
        this.PROXY_URL = localStorage.getItem('proxy_url') || '';
        this.CLAUDE_MODEL = "claude-sonnet-4-6";
    }

    save(apiKey, mcpUrl, proxyUrl) {
        this.CLAUDE_API_KEY = apiKey;
        this.ZOHO_MCP_URL = mcpUrl;
        this.PROXY_URL = proxyUrl || '';
        localStorage.setItem('claude_api_key', apiKey);
        localStorage.setItem('zoho_mcp_url', mcpUrl);
        localStorage.setItem('proxy_url', this.PROXY_URL);
    }

    isValid() {
        return this.CLAUDE_API_KEY && this.ZOHO_MCP_URL;
    }
}
