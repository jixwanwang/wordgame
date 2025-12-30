#!/bin/bash

# SSL Certificate Setup for api.crosses.io
# This script can be run standalone or called from setup-vm.sh
#
# Prerequisites:
# - Nginx must be installed and running
# - Ports 80 and 443 must be open in firewall
# - DNS for api.crosses.io must point to this server
#
# What this script does:
# 1. Verifies prerequisites (DNS, Nginx, ports)
# 2. Obtains SSL certificate from Let's Encrypt via Certbot
# 3. Configures Nginx for HTTPS on port 443
# 4. Sets up HTTP -> HTTPS redirect
# 5. Validates the configuration

set -e

DOMAIN="api.crosses.io"
EMAIL="jixuan.wang@gmail.com"

echo "========================================"
echo "SSL Certificate Setup"
echo "========================================"
echo "Domain: $DOMAIN"
echo ""

# ============================================
# Prerequisite Checks
# ============================================
echo "Step 1/4: Checking prerequisites..."

# Check if Nginx is installed
# Use systemctl to check if nginx service exists (works reliably after apt install)
if systemctl list-unit-files | grep -q nginx.service; then
    echo "  ✓ Nginx is installed"
else
    echo "  ✗ Nginx is not installed"
    echo "  Please install Nginx first:"
    echo "    sudo apt-get update"
    echo "    sudo apt-get install -y nginx"
    exit 1
fi

# Check if Nginx is running
if ! sudo systemctl is-active --quiet nginx; then
    echo "  ⚠ Nginx is not running, starting it..."
    sudo systemctl start nginx
fi
echo "  ✓ Nginx is running"

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "  Installing Certbot..."
    sudo apt-get update -y
    sudo apt-get install -y certbot python3-certbot-nginx
fi
echo "  ✓ Certbot is installed"

# Check if port 80 is accessible
echo "  Checking if port 80 is accessible..."
if sudo netstat -tlnp | grep -q ":80"; then
    echo "  ✓ Port 80 is listening"
else
    echo "  ✗ Port 80 is not listening"
    echo "  Nginx should be listening on port 80"
    exit 1
fi

# ============================================
# Check if certificate already exists
# ============================================
echo ""
echo "Step 2/4: Checking for existing certificate..."

CERT_EXISTS=false
if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    CERT_EXISTS=true
    echo "  ✓ SSL certificate for $DOMAIN already exists"
fi

# Check if Nginx is already configured for HTTPS
NGINX_HTTPS_CONFIGURED=false
if sudo grep -q "listen 443" /etc/nginx/sites-available/api 2>/dev/null; then
    NGINX_HTTPS_CONFIGURED=true
fi

# Decide what to do based on certificate and Nginx config state
if [ "$CERT_EXISTS" = true ] && [ "$NGINX_HTTPS_CONFIGURED" = true ]; then
    echo "  ✓ Nginx is already configured for HTTPS"
    echo ""
    echo "Step 3/4: SSL is already set up - skipping"
    echo ""
elif [ "$CERT_EXISTS" = true ] && [ "$NGINX_HTTPS_CONFIGURED" = false ]; then
    # Certificate exists but Nginx not configured - install to Nginx
    echo "  Certificate exists but Nginx is not configured for HTTPS"
    echo ""
    echo "Step 3/4: Configuring Nginx to use existing certificate..."

    if sudo certbot install --nginx --cert-name "$DOMAIN" --non-interactive --redirect; then
        echo "  ✓ Nginx configured successfully!"
    else
        echo "  ✗ Failed to configure Nginx"
        echo "  Deleting existing certificate and trying fresh setup..."
        sudo certbot delete --cert-name "$DOMAIN" --non-interactive
        CERT_EXISTS=false
    fi
fi

if [ "$CERT_EXISTS" = false ]; then
    # ============================================
    # Obtain SSL Certificate
    # ============================================
    echo "  No existing certificate found"
    echo ""
    echo "Step 3/4: Obtaining SSL certificate from Let's Encrypt..."
    echo "  This will:"
    echo "    - Verify domain ownership via HTTP challenge (port 80)"
    echo "    - Issue a free SSL certificate valid for 90 days"
    echo "    - Automatically configure Nginx for HTTPS on port 443"
    echo "    - Set up HTTP -> HTTPS redirect"
    echo ""

    # Determine email flag
    if [ -n "$EMAIL" ]; then
        EMAIL_FLAG="--email $EMAIL"
    else
        EMAIL_FLAG="--register-unsafely-without-email"
    fi

    # Run certbot
    if sudo certbot --nginx \
        -d "$DOMAIN" \
        $EMAIL_FLAG \
        --non-interactive \
        --agree-tos \
        --redirect; then
        echo "  ✓ SSL certificate obtained successfully!"
    else
        echo "  ✗ Certbot failed!"
        echo ""
        echo "  Common issues:"
        echo "    - DNS not propagated yet (wait and try again)"
        echo "    - Port 80 not accessible from internet (check firewall)"
        echo "    - Domain not pointing to this server"
        echo ""
        echo "  Check certbot logs: sudo journalctl -u certbot"
        exit 1
    fi
fi

# ============================================
# Validate Configuration
# ============================================
echo ""
echo "Step 4/4: Validating HTTPS configuration..."

# Check if HTTPS is configured in Nginx
if sudo grep -q "listen 443" /etc/nginx/sites-available/api; then
    echo "  ✓ Nginx configured for HTTPS (port 443)"
else
    echo "  ✗ HTTPS not configured in Nginx"
    echo "  Certbot may have failed to modify Nginx config"
    exit 1
fi

# Reload Nginx to ensure changes are applied
echo "  Reloading Nginx..."
sudo systemctl reload nginx

# Check if Nginx is listening on port 443
sleep 2  # Give Nginx a moment to bind to port
if sudo netstat -tlnp | grep -q ":443"; then
    echo "  ✓ Nginx listening on port 443"
else
    echo "  ✗ Nginx not listening on port 443"
    echo "  There may be an error in the Nginx configuration"
    sudo nginx -t
    exit 1
fi

# Test HTTPS locally
echo "  Testing HTTPS endpoint..."
if curl -k -s --max-time 5 https://localhost/health > /dev/null 2>&1; then
    echo "  ✓ HTTPS endpoint responding"
else
    echo "  ⚠ HTTPS endpoint not responding (this may be normal if /health doesn't exist)"
fi

# ============================================
# Success!
# ============================================
echo ""
echo "========================================"
echo "✓ SSL Setup Complete!"
echo "========================================"
echo ""
echo "Your API is now configured for HTTPS"
echo ""
echo "Certificate details:"
sudo certbot certificates | grep -A 5 "$DOMAIN" || echo "  Run: sudo certbot certificates"
echo ""
echo "Useful commands:"
echo "  sudo certbot certificates       # View certificate info"
echo "  sudo certbot renew             # Manually renew certificate"
echo "  sudo systemctl reload nginx    # Reload Nginx config"
echo ""
echo "Test your API:"
echo "  curl https://$DOMAIN/health"
echo ""
