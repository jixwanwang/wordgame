#!/bin/bash

# Deploy Application on VM
# Run this script ON THE VM after deploying code from local machine
#
# This script:
# 1. Installs production dependencies
# 2. Restarts the PM2 application
#
# Use this for quick app updates without running full setup

set -e

echo "========================================"
echo "App Deployment (VM-side)"
echo "========================================"
echo ""

# Check if running on the VM
if [ ! -d ~/wordgame ]; then
    echo "Error: ~/wordgame directory not found"
    echo "Please deploy your code first using: ./scripts/deploy.sh"
    exit 1
fi

cd ~/wordgame

# Check if application is already built (deployed from local machine)
if [ ! -f dist/start.js ]; then
    echo "✗ Built application not found at dist/start.js"
    echo ""
    echo "Please build and deploy from your local machine:"
    echo "  ./scripts/deploy.sh"
    exit 1
fi

echo "✓ Built application found"
echo ""

# Install only production dependencies (no devDependencies needed on VM)
echo "Installing production dependencies..."
npm install --production

echo "✓ Dependencies installed"
echo ""

# Restart the PM2 application
echo "Restarting application with PM2..."

# Check if PM2 process exists
if pm2 list | grep -q "wordgame-api"; then
    pm2 restart wordgame-api
    echo "✓ Application restarted"
else
    # Process doesn't exist - start it
    echo "Starting application with PM2..."
    pm2 start npm --name wordgame-api --cwd ~/wordgame -- start
    pm2 save
    echo "✓ Application started"
fi

echo ""
echo "========================================"
echo "✓ Deployment Complete"
echo "========================================"
echo ""
echo "Application status:"
pm2 status

echo ""
echo "View logs:"
echo "  pm2 logs wordgame-api"
echo ""
echo "Test API:"
echo "  curl http://localhost:3000/health"
echo "  curl https://api.crosses.io/health"
echo ""
