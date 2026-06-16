#!/usr/bin/env bash
# Chaos test: kill the orchestrator container/app mid-pipeline and verify recovery.
# This script is a placeholder for the production Container Apps / KEDA scenario.
# Usage: ./test/chaos/kill-orchestrator.sh
set -euo pipefail

echo "=== Orchestrator kill/resilience chaos test ==="
echo "This test is intended to run against a deployed Container Apps environment."
echo "Local execution is a no-op because there is no orchestrator replica to kill."
echo ""
echo "Manual steps for a staging environment:"
echo "1. Start a long-running recipe, e.g. 'Fix INC00421 and create a PR'."
echo "2. Identify the active orchestrator replica:"
echo "   az containerapp revision list --name ca-goosefw-orchestrator --resource-group rg-goosefw-staging"
echo "3. Restart the revision:"
echo "   az containerapp revision restart --name ca-goosefw-orchestrator --resource-group rg-goosefw-staging --revision <rev>"
echo "4. Verify in the dashboard that the correlation resumes and completes."
echo "5. Confirm Service Bus active message count returns to zero."
echo ""
echo "PASS (placeholder)"
