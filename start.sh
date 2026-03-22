#!/bin/bash
set -e

# Write Schwab tokens from environment variable to file
if [ -n "$SCHWAB_TOKENS" ]; then
  echo "$SCHWAB_TOKENS" > backend/tokens.json
  echo "Tokens written from env var."
fi

# Start the server
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
