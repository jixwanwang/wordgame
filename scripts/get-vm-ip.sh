#!/bin/bash

# Get the external IP of your GCP VM

set -e

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID}"
VM_NAME="${GCP_VM_NAME}"
ZONE="${GCP_ZONE:-us-west1-b}"

IP=$(gcloud compute instances describe $VM_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

if [ -z "$IP" ]; then
    echo "Error: Could not get IP address for VM $VM_NAME"
    exit 1
fi

echo "VM External IP: $IP"
echo ""
echo "API URL: http://$IP:3000"
