#!/bin/bash

# Deployment script for GCP Compute Engine VM
# This script copies your repo to the VM and sets up the server

set -e  # Exit on any error

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    echo "Please create a .env file with GCP_PROJECT_ID, GCP_VM_NAME, and GCP_ZONE"
    exit 1
fi

# Configuration from .env (with defaults)
PROJECT_ID="${GCP_PROJECT_ID:-project-ce31194e-b92f-4b22-9e0}"
VM_NAME="${GCP_VM_NAME}"
ZONE="${GCP_ZONE:-us-west1-b}"
REMOTE_DIR="wordgame"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Wordgame Deployment Script ===${NC}"
echo ""

# Check if VM_NAME is set
if [ -z "$VM_NAME" ]; then
    echo -e "${RED}Error: GCP_VM_NAME not set in .env file${NC}"
    echo "Available VMs:"
    gcloud compute instances list --project=$PROJECT_ID 2>/dev/null || echo "  (gcloud not installed or not authenticated)"
    exit 1
fi

echo "Project: $PROJECT_ID"
echo "VM: $VM_NAME"
echo "Zone: $ZONE"
echo ""

# Directories and files to copy
DIRS_TO_COPY=(
    "server"
    "lib"
    "scripts"
)

FILES_TO_COPY=(
    "tsconfig.json"
    "drizzle.config.ts"
)

echo -e "${YELLOW}Creating remote directory...${NC}"
gcloud compute ssh $VM_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --command="mkdir -p $REMOTE_DIR" \
    || {
        echo -e "${RED}Failed to create remote directory${NC}"
        exit 1
    }

echo -e "${GREEN}✓ Remote directory ready${NC}"
echo ""

# Copy directories
for dir in "${DIRS_TO_COPY[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}Copying $dir/...${NC}"
        gcloud compute scp --recurse \
            "$dir" \
            "$VM_NAME:~/$REMOTE_DIR/" \
            --project=$PROJECT_ID \
            --zone=$ZONE \
            || echo -e "${RED}Warning: Failed to copy $dir${NC}"
    else
        echo -e "${YELLOW}Skipping $dir (not found)${NC}"
    fi
done

echo ""

# Copy files
for file in "${FILES_TO_COPY[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Copying $file...${NC}"
        gcloud compute scp \
            "$file" \
            "$VM_NAME:~/$REMOTE_DIR/" \
            --project=$PROJECT_ID \
            --zone=$ZONE \
            || echo -e "${RED}Warning: Failed to copy $file${NC}"
    else
        echo -e "${YELLOW}Skipping $file (not found)${NC}"
    fi
done

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Files copied to VM at: ~/$REMOTE_DIR"
echo ""
echo "To complete setup, SSH into your VM and run the setup script:"
echo -e "${YELLOW}  ./scripts/ssh.sh${NC}"
echo ""
echo "Then on the VM, run:"
echo -e "${YELLOW}  cd $REMOTE_DIR/scripts${NC}"
echo -e "${YELLOW}  ./setup-vm.sh${NC}"
