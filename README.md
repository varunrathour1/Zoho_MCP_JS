# Zoho MCP Widget (JavaScript Phase)

This directory contains the JavaScript implementation of the Zoho MCP Client, designed to be packaged as a Zoho Widget.

## 📚 Zoho Widget Requirements

Based on [Zoho Documentation](https://www.zoho.com/creator/newhelp/app-settings/widgets/create-a-widget.html):

1. **Structure**: The widget must be a ZIP file containing an entry HTML file (default `widget.html`).
2. **Packaging**: Must use the Zoho CLI (`zet pack`) to create the valid ZIP.
3. **Limitations**:
   - Max 10MB total size.
   - Max 250 files.
   - No server-side code (Node.js) runs in the widget itself; it's client-side only.

## 🏗️ Architecture

The architecture mirrors the Python prototype but adapted for the browser:

```
User Interface (HTML/CSS)
    ↓
Agent (JS)
  - Calls Claude API (via Proxy/Direct*)
    ↓
MCP Client (JS)
  - Calls Zoho MCP Server (HTTP)
    ↓
Zoho MCP Server
```

**⚠️ Security Warning**: 
Client-side widgets expose API keys if stored directly in the code. 
- **Development**: We can use a local proxy or temporary keys.
- **Production**: You should use a Zoho Creator Function or a secure backend proxy to hold the Claude API key.

## 📂 Project Structure

```
Zoho_MCP_JS/
├── app/
│   ├── index.html        # Entry point
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       ├── app.js         # Main UI logic
│       ├── agent.js       # Claude AI Agent (claude-sonnet-4-6)
│       ├── mcp-client.js  # MCP Client
│       └── config.js      # Configuration
├── proxy_server.py        # CORS proxy for Claude API & Zoho MCP
├── package.json
├── plugin-manifest.json
└── README.md
```

## 🚀 How to Run Locally

You need **two terminals**: one for the CORS proxy and one for the web server.

1. **Start the CORS proxy** (required for Claude API and Zoho MCP calls from the browser):
   ```bash
   python proxy_server.py
   ```
   This runs on `http://localhost:8083` with two endpoints:
   - `/anthropic` — proxies requests to the Claude API
   - `/zoho` — proxies requests to the Zoho MCP server

2. **Start the web server**:
   ```bash
   npm start
   ```
   Opens at `http://localhost:8000`.

   > **Accessing from another device on the same network?** Use `http://192.168.x.x:8000`. Note: you'll need to re-enter Settings since localStorage is browser/origin specific.

3. **Configure credentials** in the browser:
   - Click **Settings** in the app.
   - Enter your **Claude API Key**.
   - Enter your **Zoho MCP URL** (e.g. `https://crm-data-metadata-mcp-server-906941038.zohomcp.com/mcp/<your-id>/message`).
   - Click Save.

4. Start chatting — try *"Get me the latest 5 leads"*.

## 📦 How to Package for Zoho

1. Install Zoho CLI: `npm install -g zoho-extension-toolkit`
2. Run `zet pack` inside the directory.
3. Upload the resulting ZIP to Zoho Creator/CRM.
