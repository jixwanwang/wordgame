#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: ./scripts/gen-puzzle.sh [count]"
  echo ""
  echo "Defaults to 90 puzzles when count is omitted."
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "${2:-}" != "" ]; then
  echo "Error: too many arguments."
  usage
  exit 1
fi

count="${1:-90}"

if [[ ! "$count" =~ ^[0-9]+$ ]]; then
  echo "Error: count must be a non-negative integer."
  usage
  exit 1
fi

npx tsx gen_puzzle.ts "$count"
