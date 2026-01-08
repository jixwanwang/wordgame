#!/bin/bash

# Run frontend and backend locally with in-memory database
# This script runs both services with environment variables that override .env

set -e

echo "Starting local development environment with in-memory database..."
echo ""

# Function to cleanup background processes on exit
cleanup() {
  echo ""
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit
}

trap cleanup EXIT INT TERM

# Start backend with in-memory database
echo "Starting backend on port 3000 (in-memory database)..."
NODE_ENV=development \
  PORT=3000 \
  JWT_SECRET=local-dev-secret-key-12345 \
  npx tsx server/start.ts &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Error: Backend failed to start"
    exit 1
  fi
  sleep 1
done

echo ""

# Start frontend
echo "Starting frontend on port 5173..."
VITE_API_URL=http://localhost:3000 \
  npm run dev:client &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Local development environment running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo "  Database: In-memory (no persistence)"
echo ""
echo "Press Ctrl+C to stop all services"
echo "================================"
echo ""

# Wait for both processes
wait
