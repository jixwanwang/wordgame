#!/bin/bash

# Script to clean up port 3000 on the VM
# Run this ON THE VM

PORT=3000

echo "=== Checking what's using port $PORT ==="
sudo ss -tlnp | grep :$PORT || echo "Nothing found using port $PORT"

echo ""
echo "=== Checking all PM2 processes ==="
pm2 list

echo ""
echo "=== Stopping all PM2 processes ==="
pm2 stop all

echo ""
echo "=== Deleting all PM2 processes ==="
pm2 delete all

echo ""
echo "=== Finding any remaining Node processes ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== Killing any Node processes ==="
pkill -9 node || echo "No node processes to kill"

echo ""
echo "=== Verifying port is free ==="
sudo ss -tlnp | grep :$PORT || echo "✓ Port $PORT is now free"

echo ""
echo "=== Cleanup complete! ==="
echo "You can now restart your application with:"
echo "  pm2 start npm --name wordgame-api -- start"
