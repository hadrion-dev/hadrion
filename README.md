# HADRION

Sovereign local AI stack — chat interface for self-hosted LLMs.

A self-contained, modular HTML/CSS/JS chat client designed to talk to a
local OpenAI-compatible API (llama.cpp, vLLM, Ollama, LM Studio, or any
backend that exposes /v1/chat/completions). No frameworks, no build step,
no external dependencies.

The UI is a carcass: it gives you the structure (sidebar, chat, composer,
model selector, TTS, image attachment, persistence) and lets you plug in
your own AI orchestrator behind it.

## Status

Early skeleton working end-to-end:

- [x] Modular architecture (each concern is its own file)
- [x] Streaming responses (SSE)
- [x] Persistent chat list (localStorage)
- [x] Image attachment (multimodal)
- [ ] Model selector dropdown (skeleton in place)
- [ ] TTS (skeleton in place)
- [ ] Pin / Download / Delete per chat (menu in place)

## Why

Most local-AI chat UIs are either feature-bloated (LibreChat, Open WebUI)
or locked into a framework (React/Next/Vue). HADRION is a third option:
HTML/CSS/JS files you can edit with any text editor, deploy behind any
static server, and extend with plain ES modules.

## Structure

    public/
      index.html          shell: DOM structure only, no logic
      css/
        base.css          reset, variables, layout
        sidebar.css       sidebar
        topbar.css        top bar (model badge, TTS)
        chat.css          message area
        composer.css      input area
      js/
        main.js           entry point, imports and inits each module
        sidebar.js        chat list, toggle, per-chat menu
        topbar.js         TTS toggle, model badge placeholder
        composer.js       text input, image attach, send button state
        chat.js           message send/stream/cancel, history

Each module:

- is a plain ES module (export function initX())
- fails safely if its DOM elements are missing (logs a warning, does not throw)
- never touches another module's DOM

## Running

Any static server works. A tiny Python helper is included because it also
proxies /api/chat to the backend (avoiding CORS entirely):

    python3 server.py
    # open http://localhost:8080

server.py expects a backend at 192.168.1.123:30098 — edit the CORE_HOST
constant at the top of the file to point to yours.

Without the proxy, any static host works (npx serve public/,
python3 -m http.server -d public/, nginx, Caddy, etc.). Just make sure
your backend sends CORS headers.

## Backend requirements

HADRION expects an OpenAI-compatible endpoint:

- POST /v1/chat/completions — supports stream: true, JSON body
- GET  /v1/models — optional, used by the model selector (coming soon)

Message content can be plain text or an array of parts for multimodal:

    {
      "model": "your-model",
      "messages": [
        { "role": "user", "content": "Hello" },
        { "role": "user", "content": [
            { "type": "text", "text": "Describe this." },
            { "type": "image_url", "image_url": {
                "url": "data:image/png;base64,..." } }
        ]}
      ],
      "stream": true
    }

Works with: llama.cpp server, vLLM, Ollama (via /v1), LM Studio,
text-generation-webui, any OpenAI-compatible API.

## Philosophy

- No frameworks. Zero npm install. Open index.html, done.
- No build step. Editing a file and reloading shows changes immediately.
- No lock-in. Each concern is a file you can replace or fork independently.
- No telemetry. Nothing phones home.

Fork it, gut it, re-theme it, strip it to 100 lines — it is meant to be
a starting point, not a product.

## License

MIT — see LICENSE.

## Note

The name HADRION is a personal project of the original author. You are
welcome to fork this and rename it to whatever you want — that is what
MIT is for.
