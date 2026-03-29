#!/bin/bash

set -e

echo "Building..."
./scripts/build.sh

echo "Checking Cloudflare authentication..."
npx wrangler whoami > /dev/null 2>&1 || npx wrangler login

echo "Deploying dist/public to Cloudflare Pages (project: crosses)..."
npx wrangler pages deploy dist/public --project-name=crosses
