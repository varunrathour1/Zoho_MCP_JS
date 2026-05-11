# Zoho MCP AI Assistant — Project Guide

Ye guide `Zoho_MCP_JS` project ka complete reference hai — Zoho CRM ko Claude AI se connect karne wala widget.

---

## Folder Structure

```
Zoho_MCP_JS/
├── ZOHO_WIDGET_GUIDE.md        ← ye file
├── package.json                ← npm dependencies (http-server)
├── plugin-manifest.json        ← Zoho Creator CSP domains config
├── proxy_server.py             ← Local CORS proxy (port 8083)
└── app/
    ├── index.html              ← ⭐ Main widget UI
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js              ← UI logic, event handlers
        ├── agent.js            ← Claude AI agent (tool loop)
        ├── mcp-client.js       ← Zoho MCP server communication
        └── config.js           ← API keys (localStorage se)
```

---

## Project Kaise Kaam Karta Hai

```
User Input
    ↓
app.js  →  agent.js  →  Claude API (claude-sonnet-4-6)
                              ↓
                     Tool call decide karta hai
                              ↓
                       mcp-client.js
                              ↓
                    Zoho MCP Server (JSON-RPC)
                              ↓
                       Zoho CRM / Mail
```

**Local mein proxy_server.py CORS bypass karta hai:**
- `/anthropic` → `https://api.anthropic.com/v1/messages`
- `/zoho` → Zoho MCP Server URL (header `X-Target-URL` se)

---

## Local Development — Step by Step

### Step 1 — Dependencies Install Karo

```cmd
cd C:\Users\aa\Documents\Zoho_MCP_JS
npm install
```

### Step 2 — Proxy Server Start Karo

```cmd
python proxy_server.py
```

Output:
```
Proxy server running on port 8083
```

### Step 3 — Frontend Start Karo

Naye terminal mein:

```cmd
npm start
```

Output:
```
Starting up http-server, serving app on port 8000
```

### Step 4 — Browser mein Open Karo

```
http://localhost:8000
```

### Step 5 — Settings Configure Karo

Widget mein **Settings** button click karo aur fill karo:

| Field | Value |
|-------|-------|
| **Claude API Key** | `sk-ant-...` |
| **Zoho MCP URL** | Zoho MCP server ka URL |

> Keys localStorage mein save hoti hain — ek baar set karo, dobara nahi puchega.

---

## Zoho Creator mein Deploy Karna

### Step 1 — ZIP Banao

```cmd
cd C:\Users\aa\Documents\Zoho_MCP_JS
zet pack
```

ZIP ban jaati hai: `dist/zoho-mcp-widget.zip`

### Step 2 — Zoho Creator mein Upload Karo

1. **Zoho Creator** → apna app open karo
2. Top → **Settings** → left sidebar → **Widgets** → **Create**
3. Fill karo:

| Field | Value |
|-------|-------|
| **Name** | `zoho_mcp_assistant` |
| **Hosting** | `Internal` |
| **Widget File** | `dist/zoho-mcp-widget.zip` |
| **Index File** | `/index.html` |

4. **Create** click karo

### Step 3 — Page Pe Lagao

1. Zoho Creator → **Design** tab
2. Page open karo jahan widget chahiye
3. Left panel → **Widgets** → apna widget drag & drop karo
4. **Save**

---

## Key Files — Kya Edit Karna Hai

| Kaam | File |
|------|------|
| UI/layout change | `app/index.html`, `app/css/style.css` |
| Chat behavior, buttons | `app/js/app.js` |
| Claude model, token limits | `app/js/agent.js` |
| Tool schema / MCP calls | `app/js/mcp-client.js` |
| CSP domains add karna | `plugin-manifest.json` |

---

## Token Limit Settings (`agent.js`)

```js
const MAX_HISTORY_MESSAGES = 6;     // last N messages Claude ko jaate hain (~3 turns)
const MAX_TOOL_RESULT_CHARS = 8000; // tool response truncation limit
```

> Rate limit aa raha ho toh `MAX_HISTORY_MESSAGES` aur kam karo (e.g. `4`).

---

## Prerequisites

- **Node.js** installed hona chahiye
- **Python 3** installed hona chahiye
- **zet CLI** (sirf Zoho Creator deploy ke liye): `npm install -g zoho-extension-toolkit`
- **Conda env:** `base` ya koi bhi env kaam karega

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `rate limit exceeded` | Bahut zyada tokens | `MAX_HISTORY_MESSAGES` kam karo |
| `CORS error` | proxy_server.py nahi chal raha | `python proxy_server.py` run karo |
| `MCP Error` | Zoho MCP URL galat hai | Settings mein URL check karo |
| `API Error` | Claude key galat/expired | Settings mein key update karo |
