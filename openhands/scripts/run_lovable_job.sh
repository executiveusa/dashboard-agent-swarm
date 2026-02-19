#!/usr/bin/env bash
# =====================================================
# FILE: openhands/scripts/run_lovable_job.sh
# PURPOSE:
#   Infinite Ralph-style execution loop for Lovable autonomous upgrades.
#   Runs OpenHands with the gigaprompt until all gates pass.
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-/workspace}"
PROMPT_FILE="${PROMPT_FILE:-/agent_zero/prompts/lovable_gigaprompt.json}"
MAX_ITERATIONS="${MAX_ITERATIONS:-500}"
MAX_HOURS="${MAX_HOURS:-72}"

echo "🚀 Starting Lovable Autonomous Upgrade Loop"
echo "   Repo: $REPO_ROOT"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Max runtime: ${MAX_HOURS}h"
echo "   Prompt: $PROMPT_FILE"

iteration=0
start_time=$(date +%s)

while [ $iteration -lt $MAX_ITERATIONS ]; do
  iteration=$((iteration + 1))
  current_time=$(date +%s)
  elapsed_hours=$(( (current_time - start_time) / 3600 ))

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $iteration / $MAX_ITERATIONS"
  echo "⏱️  Elapsed: ${elapsed_hours}h / ${MAX_HOURS}h"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check time limit
  if [ $elapsed_hours -ge $MAX_HOURS ]; then
    echo "⏰ Max runtime reached (${MAX_HOURS}h), stopping..."
    echo "Creating BLOCKER.md due to timeout..."
    cat > "$REPO_ROOT/BLOCKER.md" <<EOF
# BLOCKER: Timeout Reached

The autonomous upgrade loop reached the maximum runtime of ${MAX_HOURS} hours
after ${iteration} iterations without all gates passing.

## Last Iteration
- Iteration: $iteration
- Elapsed time: ${elapsed_hours}h
- Status: TIMEOUT

## Next Steps
1. Review the logs to identify persistent gate failures
2. Manually address blocking issues
3. Consider increasing MAX_HOURS or MAX_ITERATIONS
4. Retry the job after fixes

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
    exit 1
  fi

  # Run OpenHands with the gigaprompt
  echo "🤖 Running OpenHands with gigaprompt..."
  if openhands run --prompt "$PROMPT_FILE" --workspace "$REPO_ROOT"; then
    echo "✅ OpenHands execution completed"
  else
    echo "⚠️  OpenHands execution failed, but continuing to gate checks..."
  fi

  # Run all gates
  echo "🚪 Running gate checks..."
  if "$SCRIPT_DIR/run_gates.sh"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ALL GATES PASSED! 🎉"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # All gates passed, open final PR
    echo "📤 Opening final PR..."
    "$SCRIPT_DIR/open_final_pr.sh"

    echo "✅ Job complete! PR opened successfully."
    exit 0
  else
    echo "❌ Gates failed, iterating again..."
    echo "   (Iteration $iteration / $MAX_ITERATIONS)"
  fi

  # Small delay between iterations
  sleep 2
done

# If we reach here, max iterations exceeded
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  MAX ITERATIONS REACHED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Creating BLOCKER.md..."

cat > "$REPO_ROOT/BLOCKER.md" <<EOF
# BLOCKER: Max Iterations Reached

The autonomous upgrade loop completed ${MAX_ITERATIONS} iterations without
all gates passing.

## Summary
- Total iterations: ${MAX_ITERATIONS}
- Elapsed time: ${elapsed_hours}h
- Status: MAX_ITERATIONS_EXCEEDED

## Next Steps
1. Review the gate failure logs
2. Identify persistent blockers
3. Manually address blocking issues
4. Consider increasing MAX_ITERATIONS if near success
5. Retry the job after fixes

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "📝 BLOCKER.md created at $REPO_ROOT/BLOCKER.md"
exit 1
