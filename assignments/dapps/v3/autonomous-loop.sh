#!/bin/bash
# Autonomous coder loop for dapps/v3
TASKS=(
  "WRITE TESTS - Write unit tests for hooks: useYieldData, useTokenPrices, useMarketData, useContractVerification"
  "FIX BUGS - Run typecheck, fix any type errors or lint issues"
  "ADD FEATURES - Review components, add missing functionality"
  "IMPROVE CODE - Refactor for better patterns, extract reusable logic"
  "DOCUMENT - Create logic.yaml using @ebowwa/logic-spec standard"
)

while true; do
  TASK=${TASKS[$((RANDOM % ${#TASKS[@]}))]}
  echo "=== $(date) ==="
  echo "Task: $TASK"
  
  coder -q "$TASK. Execute task, run tests with 'bun run test', commit changes. Summarize what you did."
  
  echo "=== LOOP COMPLETE ==="
  sleep 3
done
