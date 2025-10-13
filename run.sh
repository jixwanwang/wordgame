#!/bin/bash

echo "Starting development servers..."
echo ""

# Trap CTRL+C and kill both processes
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start backend server
echo "Starting backend server..."
NODE_ENV=development npx tsx server/index.ts &

# Start frontend server
echo "Starting frontend server..."
npx vite &

# Wait for all background jobs
wait
