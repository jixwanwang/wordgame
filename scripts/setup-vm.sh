#!/bin/bash

# VM Setup Script
# Run this script ON THE VM after deploying your code

set -e

echo "=== Wordgame Server Setup ==="
echo ""

# Check if running on the VM
if [ ! -d ~/wordgame ]; then
    echo "Error: ~/wordgame directory not found"
    echo "Please deploy your code first using: ./scripts/deploy.sh"
    exit 1
fi

cd ~/wordgame

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo ""
echo "=== Installing dependencies ==="
npm install

# Build application
echo ""
echo "=== Building application ==="
npm run build

# Stop existing PM2 process if running
pm2 stop wordgame-api 2>/dev/null || true
pm2 delete wordgame-api 2>/dev/null || true

# Start application with PM2
echo ""
echo "=== Starting application ==="
pm2 start npm --name wordgame-api -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
echo ""
echo "=== Configuring auto-start on boot ==="
# Generate and run the startup script
STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD
else
    echo "⚠ PM2 startup script generation failed - you may need to run this manually"
fi

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Server is running at: http://136.118.23.174:3000"
echo ""
echo "Note: Database migrations not run. Run 'npm run db:push' from your local machine."
echo ""
echo "Useful commands:"
echo "  pm2 logs wordgame-api    # View logs"
echo "  pm2 status               # Check status"
echo "  pm2 restart wordgame-api # Restart server"
echo "  pm2 stop wordgame-api    # Stop server"
