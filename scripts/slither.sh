#!/usr/bin/env bash
set -euo pipefail

REPORTS_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
JSON_REPORT="${REPORTS_DIR}/slither-report-${TIMESTAMP}.json"
MD_REPORT="${REPORTS_DIR}/slither-report-${TIMESTAMP}.md"

mkdir -p "$REPORTS_DIR"

# Compile first so Slither can skip its own compile step
echo "Compiling contracts..."
npx hardhat compile

echo "Running Slither analysis..."

# Run Slither with JSON output
slither . --json "$JSON_REPORT" --checklist --markdown-root "$(pwd)/" > "$MD_REPORT" 2>&1 || true

echo ""
echo "Reports generated:"
echo "  JSON: $JSON_REPORT"
echo "  Markdown: $MD_REPORT"
