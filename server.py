#!/usr/bin/env python3
"""
HADRION — static server + /api/chat proxy for development.

Serves files from public/ and proxies POST /api/chat to a local OpenAI-
compatible backend. Doing this in the same origin avoids CORS entirely.

Usage:
    CORE_HOST=127.0.0.1 CORE_PORT=30098 python3 server.py
    # or just:  python3 server.py  (uses 127.0.0.1:30098 by default)
"""

import http.client
import http.server
import os
import socketserver
import sys

CORE_HOST = os.environ.get("CORE_HOST", "127.0.0.1")
CORE_PORT = int(os.environ.get("CORE_PORT", "30098"))
PORT      = int(os.environ.get("PORT", "8080"))
ROOT      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

MAPA = {
    "/api/chat":    "/v1/chat/completions",
    "/api/modelos": "/v1/models",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        sys.stdout.write("[server] " + fmt % args + "\n")
        sys.stdout.flush()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        target = MAPA.get(self.path.split("?")[0])
        if not target:
            self.send_error(404, "unknown route")
            return
        self._proxy(target)

    def _proxy(self, upstream_path):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""

        try:
            conn = http.client.HTTPConnection(CORE_HOST, CORE_PORT, timeout=300)
            conn.request("POST", upstream_path, body=body,
                         headers={"Content-Type": "application/json",
                                  "Accept": "text/event-stream"})
            resp = conn.getresponse()

            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() in ("content-type", "cache-control",
                                 "transfer-encoding"):
                    self.send_header(k, v)
            self.send_header("Cache-Control", "no-cache")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            while True:
                chunk = resp.read1(1024)
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    return
        except Exception as e:
            try:
                self.send_error(502, "proxy error: " + str(e))
            except Exception:
                pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print(f"[server] listening on 0.0.0.0:{PORT}")
        print(f"[server] proxy: /api/* -> http://{CORE_HOST}:{CORE_PORT}")
        httpd.serve_forever()
