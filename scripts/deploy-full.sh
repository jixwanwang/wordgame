#!/bin/bash

# Full end-to-end deployment script
#
# Runs deploy.sh -a locally to build and upload code, then executes
# deploy-on-vm.sh on the remote VM via SSH — no manual SSH required.
#
# Usage:
#   ./scripts/deploy-full.sh          # Deploy app code and restart on VM
#   ./scripts/deploy-full.sh --dry    # Run deploy.sh -a only (skip VM-side)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DRY_RUN=false
if [[ "$1" == "--dry" ]]; then
    DRY_RUN=true
fi

# Load environment variables from .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-project-ce31194e-b92f-4b22-9e0}"
VM_NAME="${GCP_VM_NAME}"
ZONE="${GCP_ZONE:-us-west1-b}"

if [ -z "$VM_NAME" ]; then
    echo -e "${RED}Error: GCP_VM_NAME not set in .env file${NC}"
    exit 1
fi

# Step 1: Build and upload code
echo -e "${GREEN}=== Step 1: Build and upload ===${NC}"
echo ""
cd "$PROJECT_DIR"
bash scripts/deploy.sh -a

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}Dry run — skipping VM-side deployment${NC}"
    exit 0
fi

# Step 2: Run deploy-on-vm.sh remotely
echo ""
echo -e "${GREEN}=== Step 2: Running deploy-on-vm.sh on VM ===${NC}"
echo ""

gcloud compute ssh "$VM_NAME" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --command="cd ~/wordgame && bash scripts/deploy-on-vm.sh" \
    2>&1

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}=== Deployment failed (exit code $EXIT_CODE) ===${NC}"
    echo ""
    echo "To debug, SSH into the VM:"
    echo -e "${YELLOW}  ./scripts/ssh.sh${NC}"
    echo ""
    echo "Check PM2 logs:"
    echo -e "${YELLOW}  pm2 logs wordgame-api --lines 50${NC}"
    exit $EXIT_CODE
fi

# Step 3: Health check
echo -e "${GREEN}=== Step 3: Health check ===${NC}"
echo ""

echo "Waiting 3 seconds for server to start..."
sleep 3

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://api.crosses.io/health" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}Health check passed (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}Health check failed (HTTP $HTTP_STATUS)${NC}"
    echo ""
    echo "Fetching recent PM2 logs from VM..."
    echo ""
    gcloud compute ssh "$VM_NAME" \
        --project="$PROJECT_ID" \
        --zone="$ZONE" \
        --command="pm2 logs wordgame-api --lines 20 --nostream" \
        2>&1 || true
    echo ""
    echo -e "${RED}Deployment completed but the app may not be healthy.${NC}"
    echo "SSH in to investigate: ./scripts/ssh.sh"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Deployment successful ===${NC}"
