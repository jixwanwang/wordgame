#!/bin/bash

# VM Setup Script
# Run this script ON THE VM after deploying your code
#
# This script sets up the production environment in the following order:
# 1. Updates system packages
# 2. Installs Node.js and PM2 (app runtime)
# 3. Installs Nginx (reverse proxy for HTTPS)
# 4. Obtains SSL certificates from Let's Encrypt
# 5. Installs app dependencies and builds the application
# 6. Starts the application with PM2 and configures auto-start
#
# PM2 Process Flow:
#   pm2 start npm --name wordgame-api -- start
#   └─> runs: npm start
#       └─> executes: NODE_ENV=production node dist/start.js
#           └─> runs: the built Express server from dist/start.js

set -e

DOMAIN="api.crosses.io"
EMAIL="jixuan.wang@gmail.com"

echo "=== Wordgame Server Setup ==="
echo ""

# Check if running on the VM
if [ ! -d ~/wordgame ]; then
    echo "Error: ~/wordgame directory not found"
    echo "Please deploy your code first using: ./scripts/deploy.sh"
    exit 1
fi

# ============================================
# Step 1: Update System Packages
# ============================================
echo "Step 1/6: Updating system packages..."
sudo apt-get update -y

# ============================================
# Step 2: Install Node.js and PM2
# ============================================
echo ""
echo "Step 2/6: Installing Node.js and PM2..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "  Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "  ✓ Node.js already installed: $(node --version)"
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "  Installing PM2..."
    sudo npm install -g pm2
else
    echo "  ✓ PM2 already installed: $(pm2 --version)"
fi

# ============================================
# Step 3: Install and Configure Nginx
# ============================================
echo ""
echo "Step 3/6: Installing and configuring Nginx..."

# Install Nginx if not present
# Nginx acts as a reverse proxy: Client <--HTTPS--> Nginx <--HTTP--> Node.js (port 3000)
# This allows us to terminate SSL at Nginx and keep the Node.js app simple
if ! command -v nginx &> /dev/null; then
    echo "  Installing Nginx..."
    sudo apt-get install -y nginx
else
    echo "  ✓ Nginx already installed"
fi

# Install Certbot if not present
# Certbot automates obtaining and renewing SSL certificates from Let's Encrypt
if ! command -v certbot &> /dev/null; then
    echo "  Installing Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
else
    echo "  ✓ Certbot already installed"
fi

# Configure Nginx reverse proxy
echo "  Configuring Nginx reverse proxy for $DOMAIN..."

# Create Nginx configuration that proxies requests to Node.js on port 3000
# The proxy_set_header directives ensure your app receives the original client info
sudo tee /etc/nginx/sites-available/api > /dev/null <<'NGINX_CONFIG'
server {
    # Initial HTTP configuration - Certbot will add HTTPS block automatically
    listen 80;
    listen [::]:80;

    server_name api.crosses.io;

    # Proxy all requests to the Node.js API on localhost:3000
    location / {
        proxy_pass http://localhost:3000;

        # WebSocket support (if needed in future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward real client IP to the application
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Reasonable timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_CONFIG

# Enable the site by symlinking to sites-enabled
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/

# Remove default Nginx site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration for syntax errors before reloading
echo "  Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx

# ============================================
# Step 4: Obtain SSL Certificate
# ============================================
echo ""
echo "Step 4/6: Setting up SSL certificate..."

# Run the separate SSL setup script
# This script handles all SSL/HTTPS configuration including:
# - Prerequisite checks (DNS, firewall, Nginx)
# - Obtaining certificate from Let's Encrypt
# - Configuring Nginx for HTTPS
# - Validation and testing
if [ -f ~/wordgame/scripts/setup-ssl.sh ]; then
    if bash ~/wordgame/scripts/setup-ssl.sh; then
        echo "  ✓ SSL setup completed successfully"
    else
        echo ""
        echo "  ⚠ SSL setup failed!"
        echo "  This is often due to:"
        echo "    - DNS not fully propagated yet"
        echo "    - Firewall ports 80/443 not open (run ./scripts/setup-gcp.sh locally)"
        echo "    - Domain not pointing to this server"
        echo ""
        echo "  You can retry SSL setup later by running:"
        echo "    cd ~/wordgame/scripts && ./setup-ssl.sh"
        echo ""
        echo "  The app will still work over HTTP, but browsers may block it from HTTPS sites."
        echo "  Continuing with rest of setup..."
        echo ""
    fi
else
    echo "  ⚠ setup-ssl.sh not found in ~/wordgame/scripts/"
    echo "  Skipping SSL certificate setup"
    echo "  HTTPS will not be configured - app will only work over HTTP"
    echo ""
fi

# ============================================
# Step 5: Deploy and Start Application
# ============================================
echo ""
echo "Step 5/6: Deploying and starting application..."
echo ""

# Run the deploy-on-vm script
if [ -f ~/wordgame/scripts/deploy-on-vm.sh ]; then
    bash ~/wordgame/scripts/deploy-on-vm.sh
else
    echo "  ⚠ deploy-on-vm.sh not found"
    echo "  Please deploy with: ./scripts/deploy.sh"
    exit 1
fi

# Setup PM2 to start on boot (only needed during initial setup)
echo ""
echo "Step 6/6: Configuring PM2 auto-start on boot..."
STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1
    echo "  ✓ PM2 will auto-start on system boot"
else
    echo "  ⚠ PM2 startup script generation failed - you may need to run this manually"
fi

# ============================================
# Setup Complete!
# ============================================
echo ""
echo "========================================"
echo "✓ Setup Complete!"
echo "========================================"
echo ""
echo "Your API is now running at: https://$DOMAIN"
echo ""
echo "Architecture:"
echo "  Internet → Nginx (port 443, HTTPS)"
echo "           → Node.js (port 3000, HTTP)"
echo "           → Express API (dist/start.js)"
echo "           → Supabase PostgreSQL (remote)"
echo ""
echo "What was configured:"
echo "  ✓ Node.js 20 and PM2 process manager"
echo "  ✓ Nginx reverse proxy (HTTPS termination)"
echo "  ✓ SSL certificate from Let's Encrypt (auto-renews)"
echo "  ✓ Application built and running as PM2 process"
echo "  ✓ PM2 auto-starts on system boot"
echo ""
echo "Note: Database migrations not run. Run 'npm run db:push' from your local machine."
echo ""
echo "Useful commands:"
echo ""
echo "  Deploying app updates:"
echo "    # On local machine:"
echo "    ./scripts/deploy.sh            # Build and deploy to VM"
echo ""
echo "    # On VM:"
echo "    cd ~/wordgame/scripts"
echo "    ./deploy-on-vm.sh              # Install deps and restart app"
echo ""
echo "  Application management:"
echo "    pm2 status                     # Check process status"
echo "    pm2 logs wordgame-api          # View live logs"
echo "    pm2 restart wordgame-api       # Restart server"
echo "    pm2 stop wordgame-api          # Stop server"
echo ""
echo "  Nginx management:"
echo "    sudo systemctl status nginx    # Check Nginx status"
echo "    sudo nginx -t                  # Test Nginx config"
echo "    sudo systemctl reload nginx    # Reload Nginx config"
echo "    sudo tail -f /var/log/nginx/access.log  # View access logs"
echo ""
echo "  SSL certificate management:"
echo "    sudo certbot certificates      # View certificate info"
echo "    sudo certbot renew            # Manually renew certificates"
echo ""
echo "  Quick test:"
echo "    curl https://$DOMAIN/health"
echo "    curl https://$DOMAIN/api/puzzle?difficulty=normal"
echo ""
