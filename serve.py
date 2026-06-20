#!/usr/bin/env python3
"""Serveur statique minimal pour le site Baromètre Hit Lokal."""
import functools, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/Users/kaly/Documents/Kaly/Barometre/site"
PORT = 8765

Handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Baromètre Hit Lokal → http://127.0.0.1:{PORT}")
    httpd.serve_forever()
