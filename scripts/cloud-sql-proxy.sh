#!/bin/bash

# Cloud SQL Proxy script for local development
# This allows you to connect to Cloud SQL from your local machine

INSTANCE_CONNECTION_NAME="project-ce31194e-b92f-4b22-9e0:us-west1:wordgame"
LOCAL_PORT=5432

echo "Starting Cloud SQL Proxy..."
echo "Instance: $INSTANCE_CONNECTION_NAME"
echo "Local port: $LOCAL_PORT"
echo ""
echo "Make sure you have:"
echo "1. Installed Cloud SQL Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy"
echo "2. Authenticated with gcloud: gcloud auth application-default login"
echo ""

# Download Cloud SQL Proxy if not exists
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "Cloud SQL Proxy not found. Installing..."

    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    if [ "$OS" = "darwin" ]; then
        if [ "$ARCH" = "arm64" ]; then
            URL="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64"
        else
            URL="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
        fi
    elif [ "$OS" = "linux" ]; then
        URL="https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64"
    fi

    curl -o cloud-sql-proxy "$URL"
    chmod +x cloud-sql-proxy
    sudo mv cloud-sql-proxy /usr/local/bin/
fi

# Start proxy
cloud-sql-proxy --port=$LOCAL_PORT $INSTANCE_CONNECTION_NAME
