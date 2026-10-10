#!/usr/bin/env python3
"""METEORFALL static server with no-store caching (prevents stale builds in previews)."""
import http.server
import socketserver
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PORT = int(os.environ.get("PORT", 8000))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f"METEORFALL serving on http://0.0.0.0:{PORT} (no-store)")
        httpd.serve_forever()
