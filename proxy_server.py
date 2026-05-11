import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
from http import HTTPStatus

PORT = 8083

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, X-Target-URL')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Determine target URL based on the path
        if self.path == '/anthropic':
            target_url = 'https://api.anthropic.com/v1/messages'
            headers = {
                'x-api-key': self.headers.get('x-api-key'),
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        elif self.path == '/zoho':
            # Get the actual Zoho URL from the request body or header if possible, 
            # but for this simple proxy we might need to hardcode or pass it differently.
            # A better way for the widget: pass the full URL in a custom header.
            target_url = self.headers.get('X-Target-URL')
            headers = {'Content-Type': 'application/json'}
        else:
            self.send_error(404, "Unknown path")
            return

        try:
            print(f"Proxying request to: {target_url}")
            req = urllib.request.Request(target_url, data=post_data, headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                response_body = response.read()
                print(f"Response received: {response.status}")
                self.send_response(response.status)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_body)
        except urllib.error.HTTPError as e:
            print(f"HTTP Error: {e.code} - {e.reason}")
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            print(f"General Error: {str(e)}")
            self.send_error(500, str(e))

print(f"Proxy server running on port {PORT}")
print(f"Use http://localhost:{PORT}/anthropic for Claude")
print(f"Use http://localhost:{PORT}/zoho for Zoho MCP")

with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
    httpd.serve_forever()
