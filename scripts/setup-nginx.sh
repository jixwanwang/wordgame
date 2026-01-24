#!/bin/bash

# Setup Nginx reverse proxy on the VM
# Run this ON THE VM after the server is running

set -e

echo "=== Nginx Setup Script ==="
echo ""

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "✓ Nginx already installed"
fi

# Get the external IP of this VM (or use localhost)
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "your-domain.com")

echo ""
echo "=== Creating Nginx configuration ==="

# Create Nginx site configuration
sudo tee /etc/nginx/sites-available/wordgame > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/wordgame-access.log;
    error_log /var/log/nginx/wordgame-error.log;

    # Proxy to Node.js app on port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS configuration (uncomment after setting up SSL)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name _;
#
#     # SSL certificate paths (update these after running certbot)
#     # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
#     # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
#
#     # SSL configuration
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     # Security headers
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#     add_header Strict-Transport-Security "max-age=31536000" always;
#
#     # Logging
#     access_log /var/log/nginx/wordgame-access.log;
#     error_log /var/log/nginx/wordgame-error.log;
#
#     # Proxy to Node.js app on port 3000
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#
#         # WebSocket support
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#
#         # Headers
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#
#         # Timeouts
#         proxy_connect_timeout 60s;
#         proxy_send_timeout 60s;
#         proxy_read_timeout 60s;
#
#         # Cache bypass
#         proxy_cache_bypass $http_upgrade;
#     }
# }
EOF

echo "✓ Nginx configuration created"

# Enable the site
echo ""
echo "=== Enabling site ==="

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable our site
sudo ln -sf /etc/nginx/sites-available/wordgame /etc/nginx/sites-enabled/

echo "✓ Site enabled"

# Test Nginx configuration
echo ""
echo "=== Testing Nginx configuration ==="
sudo nginx -t

# Restart Nginx
echo ""
echo "=== Restarting Nginx ==="
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "=== Nginx Setup Complete! ==="
echo ""
echo "Your API is now accessible at:"
echo "  http://$EXTERNAL_IP"
echo ""
echo "Next steps for HTTPS (optional):"
echo "1. Set up a domain name pointing to $EXTERNAL_IP"
echo "2. Install certbot: sudo apt-get install -y certbot python3-certbot-nginx"
echo "3. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "4. Certbot will automatically update the Nginx config for HTTPS"
echo ""
echo "Useful commands:"
echo "  sudo nginx -t                    # Test config"
echo "  sudo systemctl restart nginx     # Restart nginx"
echo "  sudo systemctl status nginx      # Check status"
echo "  sudo tail -f /var/log/nginx/wordgame-access.log  # View logs"
