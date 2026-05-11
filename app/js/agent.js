/**
 * AI Agent powered by Claude API
 */
const MAX_HISTORY_MESSAGES = 6;    // keep last 6 messages (~3 turns) to stay within token limits
const MAX_TOOL_RESULT_CHARS = 8000; // truncate large API responses

export class Agent {
    constructor(config, mcpClient) {
        this.config = config;
        this.mcpClient = mcpClient;
        this.history = [];
    }

    async chat(userMessage, onToolCall) {
        // Add user message to history
        this.history.push({
            role: "user",
            content: userMessage
        });

        try {
            // Get tools
            const tools = await this.mcpClient.getToolsForClaude();

            // Loop for multiple tool turns
            let response = await this._callClaudeAPI(this.history, tools);

            while (response.stop_reason === "tool_use") {
                const toolResults = [];

                // Add assistant's tool use request to history
                this.history.push({
                    role: "assistant",
                    content: response.content
                });

                // Execute tools
                for (const block of response.content) {
                    if (block.type === "tool_use") {
                        if (onToolCall) onToolCall(block.name, block.input);

                        try {
                            const result = await this.mcpClient.callTool(block.name, block.input);
                            let resultStr = JSON.stringify(result);
                            if (resultStr.length > MAX_TOOL_RESULT_CHARS) {
                                resultStr = resultStr.slice(0, MAX_TOOL_RESULT_CHARS) + '... [truncated]';
                            }
                            toolResults.push({
                                type: "tool_result",
                                tool_use_id: block.id,
                                content: resultStr
                            });
                        } catch (e) {
                            toolResults.push({
                                type: "tool_result",
                                tool_use_id: block.id,
                                content: `Error: ${e.message}`,
                                is_error: true
                            });
                        }
                    }
                }

                // Add tool results to history
                this.history.push({
                    role: "user",
                    content: toolResults
                });

                // Call Claude again with results
                response = await this._callClaudeAPI(this.history, tools);
            }

            // No more tool use, just text
            this.history.push({
                role: "assistant",
                content: response.content
            });

            return this._extractText(response.content);

        } catch (error) {
            console.error("Agent Error:", error);

            // If the last message was from assistant and had tool use, remove it to prevent history corruption
            const lastMsg = this.history[this.history.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.some(c => c.type === "tool_use")) {
                this.history.pop();
            }

            throw error;
        }
    }

    _trimHistory(messages) {
        // Always keep an even number of messages (user/assistant pairs)
        // and never exceed MAX_HISTORY_MESSAGES
        if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
        const trimmed = messages.slice(messages.length - MAX_HISTORY_MESSAGES);
        // Ensure first message is from user
        const firstUser = trimmed.findIndex(m => m.role === 'user');
        return firstUser > 0 ? trimmed.slice(firstUser) : trimmed;
    }

    async _callClaudeAPI(messages, tools) {
        const systemPrompt = `You are a Zoho CRM assistant. Use tools to help. Time: ${new Date().toISOString()}`;
        messages = this._trimHistory(messages);

        // Use local proxy if running locally to avoid CORS
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');

        let apiUrl;
        if (isLocal) {
            apiUrl = `http://${host}:8083/anthropic`;
        } else if (this.config.PROXY_URL) {
            apiUrl = `${this.config.PROXY_URL}/anthropic`;
        } else {
            apiUrl = 'https://api.anthropic.com/v1/messages';
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "x-api-key": this.config.CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
                "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
                model: this.config.CLAUDE_MODEL,
                max_tokens: 2048,
                system: systemPrompt,
                messages: messages,
                tools: tools
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "API Error");
        }

        return await response.json();
    }

    _extractText(content) {
        return content
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("\n");
    }

    clearHistory() {
        this.history = [];
    }
}
