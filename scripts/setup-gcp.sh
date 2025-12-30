#!/bin/bash

# GCP Infrastructure Setup Script
# Run this script LOCALLY (on your machine, not on the VM)
#
# This script configures GCP resources needed for the application:
# 1. Firewall rules for HTTPS traffic (ports 80, 443)
# 2. IAM permissions for Cloud SQL access
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - .env file with GCP_PROJECT_ID, GCP_VM_NAME, and GCP_SQL_INSTANCE_CONNECTION_NAME

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    echo "Please create a .env file with:"
    echo "  GCP_PROJECT_ID=your-project-id"
    echo "  GCP_VM_NAME=your-vm-name"
    echo "  GCP_ZONE=us-west1-b"
    echo "  GCP_SQL_INSTANCE_CONNECTION_NAME=project:region:instance"
    exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID}"
VM_NAME="${GCP_VM_NAME}"
ZONE="${GCP_ZONE:-us-west1-b}"
SQL_INSTANCE_CONNECTION_NAME="${GCP_SQL_INSTANCE_CONNECTION_NAME}"

# Validate required variables
if [ -z "$PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID not found in .env"
    exit 1
fi

echo "========================================"
echo "GCP Infrastructure Setup"
echo "========================================"
echo "Project: $PROJECT_ID"
echo "VM: ${VM_NAME:-not specified}"
echo "Zone: $ZONE"
echo "Cloud SQL: ${SQL_INSTANCE_CONNECTION_NAME:-not specified}"
echo ""





# ============================================
# Step 1: Configure Firewall Rules
# ============================================
echo "Step 1/2: Configuring firewall rules..."
echo ""

# Create firewall rule for HTTP (port 80)
# Required for Let's Encrypt domain validation
echo "  Creating firewall rule for HTTP (port 80)..."
gcloud compute firewall-rules create allow-http \
    --project=$PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --description="Allow HTTP traffic for Let's Encrypt validation" \
    2>/dev/null && echo "  ✓ HTTP rule created" || echo "  ℹ Rule 'allow-http' already exists"

# Create firewall rule for HTTPS (port 443)
# Required to serve API over HTTPS
echo "  Creating firewall rule for HTTPS (port 443)..."
gcloud compute firewall-rules create allow-https \
    --project=$PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --description="Allow HTTPS traffic for API" \
    2>/dev/null && echo "  ✓ HTTPS rule created" || echo "  ℹ Rule 'allow-https' already exists"

echo ""
echo "  Active firewall rules:"
gcloud compute firewall-rules list \
    --project=$PROJECT_ID \
    --filter="name:(allow-http OR allow-https)" \
    --format="table(name,direction,sourceRanges.list():label=SOURCE,allowed[].map().firewall_rule().list():label=ALLOW)" \
    | sed 's/^/    /'

# ============================================
# Step 2: Configure Cloud SQL Permissions
# ============================================
echo ""
echo "Step 2/2: Configuring Cloud SQL permissions..."
echo ""

echo "Step 2.1/2: Enabling SQL Admin..."
gcloud services enable sqladmin.googleapis.com --project=$GCP_PROJECT_ID

if [ -z "$VM_NAME" ]; then
    echo "  ⚠ GCP_VM_NAME not set - skipping Cloud SQL permissions"
    echo "  To configure later, add GCP_VM_NAME to .env and re-run this script"
elif [ -z "$SQL_INSTANCE_CONNECTION_NAME" ]; then
    echo "  ⚠ GCP_SQL_INSTANCE_CONNECTION_NAME not set - skipping Cloud SQL permissions"
    echo "  To configure later, add GCP_SQL_INSTANCE_CONNECTION_NAME to .env and re-run this script"
else
    # Get the VM's service account
    echo "  Getting VM service account..."
    VM_SERVICE_ACCOUNT=$(gcloud compute instances describe $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT_ID \
        --format="get(serviceAccounts[0].email)" 2>/dev/null)

    if [ -z "$VM_SERVICE_ACCOUNT" ]; then
        echo "  ✗ Could not get service account for VM '$VM_NAME'"
        echo "  Make sure the VM exists and you have permissions to view it"
        exit 1
    fi

    echo "  VM service account: $VM_SERVICE_ACCOUNT"

    # Grant Cloud SQL Client role to the VM's service account
    echo "  Granting Cloud SQL Client role..."

    # Check if permission already exists
    EXISTING_BINDING=$(gcloud projects get-iam-policy $PROJECT_ID \
        --flatten="bindings[].members" \
        --filter="bindings.role:roles/cloudsql.client AND bindings.members:serviceAccount:$VM_SERVICE_ACCOUNT" \
        --format="value(bindings.role)" 2>/dev/null || echo "")

    if [ -n "$EXISTING_BINDING" ]; then
        echo "  ℹ Cloud SQL Client role already granted"
    else
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:$VM_SERVICE_ACCOUNT" \
            --role="roles/cloudsql.client" \
            --condition=None \
            > /dev/null 2>&1

        echo "  ✓ Cloud SQL Client role granted"
    fi

    echo "  ✓ Cloud SQL permissions configured"
fi

# ============================================
# Setup Complete
# ============================================
echo ""
echo "========================================"
echo "✓ GCP Infrastructure Setup Complete"
echo "========================================"
echo ""
echo "What was configured:"
echo "  ✓ Firewall rules for HTTP (80) and HTTPS (443)"
if [ -n "$VM_SERVICE_ACCOUNT" ]; then
    echo "  ✓ Cloud SQL Client permissions for VM"
fi
echo ""
echo "Next steps:"
echo "  1. Deploy your code to the VM:"
echo "     ./scripts/deploy.sh"
echo ""
echo "  2. SSH to VM and run setup:"
echo "     ./scripts/ssh.sh"
echo "     cd wordgame/scripts"
echo "     ./setup-vm.sh"
echo ""
echo "  3. Your API will be accessible at:"
echo "     https://api.crosses.io"
echo ""
