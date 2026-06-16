#!/bin/bash

set -e

# Set the API URL for Vite using the configured domain
# This uses HTTPS on the standard port (443) via the domain name
# instead of directly accessing the VM IP address
export VITE_API_URL="https://api.crosses.io"
export VITE_POSTHOG_API_KEY="phc_xrpLJL2MA7MTsWYMXbksXSdJKvhxBfiKo9WtseSKhY7a"

echo "Building with VITE_API_URL=$VITE_API_URL"

npm run build:static