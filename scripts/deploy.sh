#!/bin/bash

# Deployment script for GCP Compute Engine VM
# This script copies your repo to the VM and sets up the server
#
# Usage:
#   ./deploy.sh              # Deploy everything (default)
#   ./deploy.sh -s           # Deploy only scripts directory (devops tooling)
#   ./deploy.sh -a           # Deploy only app code (server, lib, configs)

set -e  # Exit on any error

# Parse command line arguments
DEPLOY_MODE="all"  # Default: deploy everything

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--scripts|--scripts-only)
            DEPLOY_MODE="scripts"
            shift
            ;;
        -a|--app|--app-only)
            DEPLOY_MODE="app"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  (no args)          Deploy everything (default)"
            echo "  -s, --scripts      Deploy only scripts directory"
            echo "  -a, --app          Deploy only app code (server, lib, configs)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

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
echo "Deploy mode: $DEPLOY_MODE"
echo ""

# Determine what to deploy based on mode
DIRS_TO_COPY=()
FILES_TO_COPY=()

case $DEPLOY_MODE in
    all)
        # Build locally before deploying
        echo -e "${YELLOW}Building application locally...${NC}"
        (cd server && npm run build)
        echo -e "${GREEN}✓ Build complete${NC}"
        echo ""

        # Deploy only what's needed: built code, package files, env, and scripts
        DIRS_TO_COPY=("server/dist" "scripts")
        FILES_TO_COPY=("server/package.json" "server/package-lock.json" "server/.env")
        ;;
    scripts)
        # Deploy only scripts directory (devops tooling)
        DIRS_TO_COPY=("scripts")
        FILES_TO_COPY=()
        echo -e "${YELLOW}Deploying scripts only (devops tooling)${NC}"
        ;;
    app)
        # Build locally before deploying
        echo -e "${YELLOW}Building application locally...${NC}"
        (cd server && npm run build)
        echo -e "${GREEN}✓ Build complete${NC}"
        echo ""

        # Deploy only app essentials: built code, package files, env
        DIRS_TO_COPY=("server/dist")
        FILES_TO_COPY=("server/package.json" "server/package-lock.json" "server/.env")
        echo -e "${YELLOW}Deploying app code only${NC}"
        ;;
esac

echo ""

echo -e "${YELLOW}Creating remote directories...${NC}"
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

        # All files go to ~/wordgame/ root (flat structure)
        # server/dist -> ~/wordgame/dist
        # scripts -> ~/wordgame/scripts
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
        echo -e "${YELLOW}Copying $(basename $file)...${NC}"

        # All files go to ~/wordgame/ root
        # server/package.json -> ~/wordgame/package.json
        gcloud compute scp \
            "$file" \
            "$VM_NAME:~/$REMOTE_DIR/" \
            --project=$PROJECT_ID \
            --zone=$ZONE \
            || echo -e "${RED}Warning: Failed to copy $(basename $file)${NC}"
    else
        echo -e "${YELLOW}Skipping $(basename $file) (not found)${NC}"
    fi
done

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Files copied to VM at: ~/$REMOTE_DIR"
echo ""

# Show appropriate next steps based on what was deployed
case $DEPLOY_MODE in
    scripts)
        echo "Scripts deployed successfully!"
        echo ""
        echo "To run the updated scripts on the VM:"
        echo -e "${YELLOW}  ./scripts/ssh.sh${NC}"
        echo ""
        echo "Then on the VM, you can run any updated script, e.g.:"
        echo -e "${YELLOW}  cd $REMOTE_DIR/scripts${NC}"
        echo -e "${YELLOW}  ./setup-vm.sh${NC}"
        ;;
    app)
        echo "App code deployed successfully!"
        echo ""
        echo "To install dependencies and restart the app on the VM:"
        echo -e "${YELLOW}  ./scripts/ssh.sh${NC}"
        echo ""
        echo "Then on the VM:"
        echo -e "${YELLOW}  cd $REMOTE_DIR/scripts${NC}"
        echo -e "${YELLOW}  ./deploy-on-vm.sh${NC}"
        ;;
    all)
        echo "To complete setup, SSH into your VM and run the setup script:"
        echo -e "${YELLOW}  ./scripts/ssh.sh${NC}"
        echo ""
        echo "Then on the VM, run:"
        echo -e "${YELLOW}  cd $REMOTE_DIR/scripts${NC}"
        echo -e "${YELLOW}  ./setup-vm.sh${NC}"
        ;;
esac

echo ""
