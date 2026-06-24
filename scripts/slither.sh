#!/usr/bin/env bash
set -euo pipefail

REPORT_PATH="doc/audits/tools/slither-report.md"

# Run Slither with JSON output (non-zero exit is normal when findings exist)
slither . --checklist > $REPORT_PATH || true

echo ""
echo "Reports generated:"
echo "Markdown: $REPORT_PATH"
exit 0