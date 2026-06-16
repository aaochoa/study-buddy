#!/bin/bash

# Skip installation in CI/sandbox environments to avoid timeouts
if [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ] || [ "$CODESANDBOX_SSE" = "true" ]; then
    echo "Skipping agent installation in CI/sandbox environment."
    exit 0
fi

# Navigate to the agent directory
cd "$(dirname "$0")/../agent" || exit 1

pnpm install
