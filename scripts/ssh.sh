#!/bin/bash

# SSH into your GCP VM instance

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    echo "Please create a .env file with GCP_PROJECT_ID, GCP_VM_NAME, and GCP_ZONE"
    exit 1
fi

# Configuration from .env (with defaults)
PROJECT_ID="${GCP_PROJECT_ID:whatever}"
VM_NAME="${GCP_VM_NAME}"
ZONE="${GCP_ZONE:-us-west1-b}"

# Check if VM_NAME is set
if [ -z "$VM_NAME" ]; then
    echo "Error: GCP_VM_NAME not set in .env file"
    echo "Available VMs:"
    gcloud compute instances list --project=$PROJECT_ID 2>/dev/null
    exit 1
fi

echo "Connecting to $VM_NAME..."
echo ""

gcloud compute ssh $VM_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE
