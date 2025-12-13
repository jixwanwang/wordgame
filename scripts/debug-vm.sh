#!/bin/bash

# Debug script for VM issues
# Run this ON THE VM to diagnose problems

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== PM2 Logs (last 50 lines) ==="
pm2 logs wordgame-api --lines 50 --nostream

echo ""
echo "=== Checking built files ==="
ls -lh ~/wordgame/dist/

echo ""
echo "=== Checking if port 3000 is in use ==="
sudo netstat -tlnp | grep :3000 || echo "Port 3000 not in use"

echo ""
echo "=== Testing server directly (not via PM2) ==="
cd ~/wordgame
echo "Running: node dist/index.js"
echo "Press Ctrl+C after a few seconds to stop"
echo ""
timeout 5 node dist/index.js || echo ""

echo ""
echo "=== Environment check ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'Yes' || echo 'No')"

echo ""
echo "=== Package.json type ==="
grep '"type"' ~/wordgame/package.json || echo "No type field in package.json"
