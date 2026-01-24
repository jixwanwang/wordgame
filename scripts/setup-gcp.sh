#!/bin/bash

# GCP Infrastructure Setup Script
# Run this script LOCALLY (on your machine, not on the VM)
#
# This script configures GCP resources needed for the application:
# 1. Firewall rules for HTTP/HTTPS traffic (ports 80, 443)
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - .env file with GCP_PROJECT_ID

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    echo "Please create a .env file with:"
    echo "  GCP_PROJECT_ID=your-project-id"
    exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID}"

# Validate required variables
if [ -z "$PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID not found in .env"
    exit 1
fi

echo "========================================"
echo "GCP Infrastructure Setup"
echo "========================================"
echo "Project: $PROJECT_ID"
echo ""

# ============================================
# Configure Firewall Rules
# ============================================
echo "Step 1/1: Configuring firewall rules..."
echo ""

# Check if HTTP rule exists
HTTP_RULE_EXISTS=$(gcloud compute firewall-rules list \
    --project=$PROJECT_ID \
    --filter="name:allow-http" \
    --format="value(name)" 2>/dev/null || echo "")

if [ -n "$HTTP_RULE_EXISTS" ]; then
    echo "  ℹ HTTP firewall rule already exists"
else
    echo "  Creating HTTP firewall rule (port 80)..."
    gcloud compute firewall-rules create allow-http \
        --project=$PROJECT_ID \
        --allow=tcp:80 \
        --target-tags=http-server \
        --description="Allow HTTP traffic" \
        --quiet 2>&1 \
        | grep -v "Created" \
        | sed 's/^/    /'
    echo "  ✓ HTTP firewall rule created"
fi

# Check if HTTPS rule exists
HTTPS_RULE_EXISTS=$(gcloud compute firewall-rules list \
    --project=$PROJECT_ID \
    --filter="name:allow-https" \
    --format="value(name)" 2>/dev/null || echo "")

if [ -n "$HTTPS_RULE_EXISTS" ]; then
    echo "  ℹ HTTPS firewall rule already exists"
else
    echo "  Creating HTTPS firewall rule (port 443)..."
    gcloud compute firewall-rules create allow-https \
        --project=$PROJECT_ID \
        --allow=tcp:443 \
        --target-tags=http-server \
        --description="Allow HTTPS traffic" \
        --quiet 2>&1 \
        | grep -v "Created" \
        | sed 's/^/    /'
    echo "  ✓ HTTPS firewall rule created"
fi

echo ""
echo "✓ Firewall rules configured"

# ============================================
# Summary
# ============================================
echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "What was configured:"
echo "  ✓ Firewall rules for HTTP (80) and HTTPS (443)"
echo ""
echo "Next steps:"
echo "  1. Deploy your application: ./scripts/deploy.sh"
echo "  2. SSH to VM: ./scripts/ssh.sh"
echo "  3. Setup VM: cd wordgame && ./scripts/setup-vm.sh"
echo ""
echo "Note: Database (Supabase PostgreSQL) is managed separately"
echo "      Configure DATABASE_URL in your .env file"
echo ""
