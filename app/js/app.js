import { Config } from './config.js';
import { MCPClient } from './mcp-client.js';
import { Agent } from './agent.js';

export class App {
    constructor() {
        this.config = new Config();
        this.mcpClient = null;
        this.agent = null;

        this.initElements();
        this.attachListeners();
        this.checkConfig();
    }

    initElements() {
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.chatHistory = document.getElementById('chat-history');
        this.statusEl = document.getElementById('status');
        this.settingsModal = document.getElementById('settings-modal');

        // Settings inputs
        this.apiKeyInput = document.getElementById('api-key');
        this.mcpUrlInput = document.getElementById('mcp-url');
        this.proxyUrlInput = document.getElementById('proxy-url');
    }

    attachListeners() {
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        document.getElementById('clear-btn').addEventListener('click', () => {
            if (this.agent) this.agent.clearHistory();
            this.chatHistory.innerHTML = '<div class="message system">Chat cleared.</div>';
        });

        document.getElementById('tools-btn').addEventListener('click', async () => {
            if (!this.mcpClient) return;
            try {
                const tools = await this.mcpClient.listTools();
                const toolList = tools.map(t => `• ${t.name}: ${t.description.substring(0, 50)}...`).join('\n');
                this.addMessage(`Available Tools:\n${toolList}`, 'system');
            } catch (e) {
                this.addMessage(`Error fetching tools: ${e.message}`, 'error');
            }
        });
    }

    checkConfig() {
        if (this.config.isValid()) {
            this.initServices();
        } else {
            this.openSettings();
        }
    }

    initServices() {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
        const mcpUrl = this.config.ZOHO_MCP_URL;

        // Warn if not local and no proxy URL configured
        if (!isLocal && !this.config.PROXY_URL) {
            this.addMessage('⚠️ Warning: No Proxy URL set. Direct calls to Zoho MCP will be blocked by CORS. Please deploy proxy_server.py and enter its URL in Settings → Proxy URL.', 'error');
        }

        this.mcpClient = new MCPClient(mcpUrl, this.config.PROXY_URL);
        this.agent = new Agent(this.config, this.mcpClient);
        this.statusEl.textContent = 'Connected';
        this.statusEl.className = 'status connected';
        this.addMessage('System ready. API keys loaded.', 'system');

        // Keep Render free instance alive — ping every 4 minutes
        if (this.config.PROXY_URL) {
            if (this._keepAliveInterval) clearInterval(this._keepAliveInterval);
            this._keepAliveInterval = setInterval(() => {
                fetch(`${this.config.PROXY_URL}/healthz`).catch(() => {});
            }, 4 * 60 * 1000);
        }
    }

    openSettings() {
        this.apiKeyInput.value = this.config.CLAUDE_API_KEY;
        this.mcpUrlInput.value = this.config.ZOHO_MCP_URL;
        this.proxyUrlInput.value = this.config.PROXY_URL || '';
        this.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.settingsModal.classList.add('hidden');
    }

    saveSettings() {
        const key = this.apiKeyInput.value.trim();
        const url = this.mcpUrlInput.value.trim();
        const proxyUrl = this.proxyUrlInput.value.trim();

        if (key && url) {
            this.config.save(key, url, proxyUrl);
            this.initServices();
            this.closeSettings();
        } else {
            alert('Please fill in both fields');
        }
    }

    async handleSend() {
        const text = this.userInput.value.trim();
        if (!text) return;

        if (!this.agent) {
            this.addMessage('Please configure settings first.', 'error');
            this.openSettings();
            return;
        }

        this.addMessage(text, 'user');
        this.userInput.value = '';
        this.sendBtn.disabled = true;

        try {
            const response = await this.agent.chat(text, (toolName, args) => {
                this.addMessage(`🔧 Calling tool: ${toolName}...`, 'system');
            });
            this.addMessage(response, 'assistant');
        } catch (error) {
            this.addMessage(`Error: ${error.message}`, 'error');
        } finally {
            this.sendBtn.disabled = false;
        }
    }

    addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        this.chatHistory.appendChild(div);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
}
