#!/bin/bash

# Script to push database schema changes to the PostgreSQL database
# This script reads DATABASE_URL from .env and runs drizzle-kit push

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Database Schema Push ===${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with DATABASE_URL set"
  exit 1
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' .env | grep DATABASE_URL | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
  exit 1
fi

# Extract host from DATABASE_URL for display (hide password)
DB_HOST=$(echo $DATABASE_URL | sed -E 's/.*@([^:\/]+).*/\1/')
echo -e "${YELLOW}Pushing schema changes to: ${DB_HOST}${NC}"

# Confirm before pushing
read -p "Are you sure you want to push schema changes? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Aborted${NC}"
  exit 0
fi

# Run drizzle-kit push
echo -e "${GREEN}Running drizzle-kit push...${NC}"
npx drizzle-kit push

echo -e "${GREEN}✓ Schema push completed successfully${NC}"
