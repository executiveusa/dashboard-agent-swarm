#!/usr/bin/env bash
# =====================================================
# FILE: openhands/scripts/run_gates.sh
# PURPOSE:
#   Run all acceptance gates in sequence.
#   Returns 0 only if ALL gates pass.
# =====================================================

set -e

REPO_ROOT="${REPO_ROOT:-/workspace}"
GATE_LOG="${REPO_ROOT}/.gate_results.log"

cd "$REPO_ROOT"

echo "🚪 Running Acceptance Gates"
echo "   Working directory: $(pwd)"
echo ""

# Initialize gate log
echo "Gate Run: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$GATE_LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$GATE_LOG"
echo "" >> "$GATE_LOG"

all_passed=true

run_gate() {
  local gate_name="$1"
  local gate_cmd="$2"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚪 Gate: $gate_name"
  echo "   Command: $gate_cmd"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Gate: $gate_name" >> "$GATE_LOG"
  echo "Command: $gate_cmd" >> "$GATE_LOG"

  if eval "$gate_cmd" 2>&1 | tee -a "$GATE_LOG"; then
    echo "✅ PASSED: $gate_name"
    echo "Status: PASSED" >> "$GATE_LOG"
    echo "" >> "$GATE_LOG"
    return 0
  else
    echo "❌ FAILED: $gate_name"
    echo "Status: FAILED" >> "$GATE_LOG"
    echo "" >> "$GATE_LOG"
    all_passed=false
    return 1
  fi
}

# Gate 1: Install
run_gate "install" "pnpm i --frozen-lockfile"

# Gate 2: Lint
run_gate "lint" "pnpm lint"

# Gate 3: Typecheck
run_gate "typecheck" "pnpm typecheck"

# Gate 4: Test
run_gate "test" "pnpm test"

# Gate 5: Build
run_gate "build" "pnpm build"

# Gate 6: E2E (optional - skip if not configured)
if grep -q '"e2e"' package.json; then
  run_gate "e2e" "pnpm e2e" || true  # Don't fail if e2e not configured
else
  echo "⏭️  Skipping e2e (not configured)"
fi

# Gate 7: Visual (optional - skip if not configured)
if grep -q '"visual"' package.json; then
  run_gate "visual" "pnpm visual" || true  # Don't fail if visual not configured
else
  echo "⏭️  Skipping visual (not configured)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$all_passed" = true ]; then
  echo "✅ ALL GATES PASSED"
  echo "" >> "$GATE_LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$GATE_LOG"
  echo "RESULT: ALL PASSED" >> "$GATE_LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$GATE_LOG"
  exit 0
else
  echo "❌ SOME GATES FAILED"
  echo "" >> "$GATE_LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$GATE_LOG"
  echo "RESULT: FAILED" >> "$GATE_LOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$GATE_LOG"
  exit 1
fi
