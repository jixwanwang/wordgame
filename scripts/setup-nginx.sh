#!/bin/bash

# Setup Nginx reverse proxy on the VM.
# Run this ON THE VM after the server is running.
#
# Idempotent: safe to re-run any time the Nginx config changes (e.g. rate
# limit tweaks). Writes a single HTTP server block; certbot/setup-ssl.sh owns
# the HTTPS block and HTTP->HTTPS redirect. If a cert for $DOMAIN already
# exists, this script chains to setup-ssl.sh at the end so SSL is restored
# without manual steps.

set -e

DOMAIN="api.crosses.io"
SITE_FILE="/etc/nginx/sites-available/api"

echo "=== Nginx Setup ==="
echo "Domain: $DOMAIN"
echo ""

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "✓ Nginx already installed"
fi

echo ""
echo "=== Writing rate-limit zones ==="

# Per-IP rate limit zones (shared across server blocks on this host).
# Global: 10 req/s for any /api/*. Auth: 5 req/min for login/register.
# 444 closes the connection with no response — silent drop from the client's
# view, matching the per-user limiter in server/rate-limit.ts.
sudo tee /etc/nginx/conf.d/wordgame-ratelimit.conf > /dev/null << 'EOF'
limit_req_zone $binary_remote_addr zone=wg_api_global:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=wg_api_auth:10m rate=5r/m;
limit_req_status 444;
EOF

echo "✓ /etc/nginx/conf.d/wordgame-ratelimit.conf written"

echo ""
echo "=== Writing $SITE_FILE ==="

# HTTP server block. certbot --nginx will add the matching HTTPS block and an
# HTTP->HTTPS redirect; do not hand-write a 443 block here or certbot's edits
# get clobbered on the next re-run.
sudo tee "$SITE_FILE" > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.crosses.io;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/wordgame-access.log;
    error_log /var/log/nginx/wordgame-error.log;

    # Strict per-IP limit for credential endpoints: 5 req/min, burst 3.
    location = /api/login {
        limit_req zone=wg_api_auth burst=3 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location = /api/register {
        limit_req zone=wg_api_auth burst=3 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # /health is exempt from rate limiting so uptime monitors don't get dropped.
    location = /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Global per-IP limit for everything else under /api/.
    location /api/ {
        limit_req zone=wg_api_global burst=20 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets and everything else (no rate limit).
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "✓ $SITE_FILE written"

# Enable the site (idempotent: -f overwrites stale symlink, -s creates it).
sudo ln -sf "$SITE_FILE" /etc/nginx/sites-enabled/api
sudo rm -f /etc/nginx/sites-enabled/default

# Also remove the legacy `wordgame` symlink left behind by older versions of
# this script, to avoid serving two conflicting server blocks.
sudo rm -f /etc/nginx/sites-enabled/wordgame
sudo rm -f /etc/nginx/sites-available/wordgame

echo ""
echo "=== Testing and reloading Nginx ==="
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx > /dev/null 2>&1 || true
echo "✓ Nginx reloaded"

# If a cert already exists for $DOMAIN, the HTTPS block we just overwrote
# needs to be re-added. setup-ssl.sh handles this idempotently. We skip on
# fresh VMs (no cert yet) so first-time setup-vm.sh runs aren't disrupted —
# setup-vm.sh runs setup-ssl.sh explicitly in that case.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v certbot &> /dev/null \
    && sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN" \
    && [ -f "$SCRIPT_DIR/setup-ssl.sh" ]; then
    echo ""
    echo "=== Existing cert for $DOMAIN detected — re-applying SSL config ==="
    bash "$SCRIPT_DIR/setup-ssl.sh"
fi

echo ""
echo "=== Nginx Setup Complete ==="
echo ""
echo "Useful commands:"
echo "  sudo nginx -t                                     # Test config"
echo "  sudo systemctl reload nginx                       # Reload after edits"
echo "  sudo tail -f /var/log/nginx/wordgame-access.log   # Access log"
echo "  sudo tail -f /var/log/nginx/wordgame-error.log    # Error log (rate-limit hits land here)"
