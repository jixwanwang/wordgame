#!/bin/bash

# Run frontend locally, pointing to the VM backend
# This script fetches the VM IP and configures the frontend to connect to it

set -e

echo "Starting frontend with VM backend..."
echo ""

# Get VM IP
echo "Fetching VM IP address..."
VM_IP=$(bash scripts/get-vm-ip.sh | grep "VM External IP:" | awk '{print $4}')

if [ -z "$VM_IP" ]; then
    echo "Error: Could not get VM IP address"
    exit 1
fi

echo "VM IP: $VM_IP"
echo "API URL: http://$VM_IP:3000"
echo ""

# Start frontend
echo "Starting frontend on port 5173..."
VITE_API_URL=http://$VM_IP:3000 \
  npm run dev:client

echo ""
echo "================================"
echo "Frontend running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://$VM_IP:3000 (VM)"
echo ""
echo "Press Ctrl+C to stop"
echo "================================"
