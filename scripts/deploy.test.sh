#!/bin/bash
# Tests for deploy.sh - validates argument and environment variable checks
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy.sh"
PASS=0
FAIL=0

assert_exit_code() {
  local description="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" -eq "$expected" ]; then
    echo "  PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_output_contains() {
  local description="$1"
  local expected="$2"
  local actual="$3"

  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description (expected output to contain '$expected')"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== deploy.sh Tests ==="
echo ""

# Test 1: No arguments -> exit 1
echo "Test 1: Missing host argument"
output=$(bash "$DEPLOY_SCRIPT" 2>&1 || true)
exit_code=$?
# Script should fail (exit 1) when no host argument given
# Since set -e doesn't propagate through $(), we capture the exit code differently
bash "$DEPLOY_SCRIPT" > /dev/null 2>&1 && exit_code=0 || exit_code=$?
assert_exit_code "exits with non-zero code when no host provided" 1 "$exit_code"
output=$(bash "$DEPLOY_SCRIPT" 2>&1 || true)
assert_output_contains "shows usage message" "Usage:" "$output"

echo ""

# Test 2: Missing required BOT_TOKEN
echo "Test 2: Missing BOT_TOKEN"
(
  unset BOT_TOKEN
  export APPLICATION_ID="test-app-id"
  export SUPABASE_URL="https://test.supabase.co"
  export SUPABASE_SERVICE_KEY="test-service-key"
  bash "$DEPLOY_SCRIPT" "1.2.3.4" > /dev/null 2>&1
) && exit_code=0 || exit_code=$?
assert_exit_code "exits with non-zero code when BOT_TOKEN missing" 1 "$exit_code"
output=$(
  unset BOT_TOKEN
  export APPLICATION_ID="test-app-id"
  export SUPABASE_URL="https://test.supabase.co"
  export SUPABASE_SERVICE_KEY="test-service-key"
  bash "$DEPLOY_SCRIPT" "1.2.3.4" 2>&1 || true
)
assert_output_contains "mentions BOT_TOKEN in error" "BOT_TOKEN" "$output"

echo ""

# Test 3: Missing required APPLICATION_ID
echo "Test 3: Missing APPLICATION_ID"
(
  export BOT_TOKEN="test-bot-token"
  unset APPLICATION_ID
  export SUPABASE_URL="https://test.supabase.co"
  export SUPABASE_SERVICE_KEY="test-service-key"
  bash "$DEPLOY_SCRIPT" "1.2.3.4" > /dev/null 2>&1
) && exit_code=0 || exit_code=$?
assert_exit_code "exits with non-zero code when APPLICATION_ID missing" 1 "$exit_code"

echo ""

# Test 4: Missing required SUPABASE_URL
echo "Test 4: Missing SUPABASE_URL"
(
  export BOT_TOKEN="test-bot-token"
  export APPLICATION_ID="test-app-id"
  unset SUPABASE_URL
  export SUPABASE_SERVICE_KEY="test-service-key"
  bash "$DEPLOY_SCRIPT" "1.2.3.4" > /dev/null 2>&1
) && exit_code=0 || exit_code=$?
assert_exit_code "exits with non-zero code when SUPABASE_URL missing" 1 "$exit_code"

echo ""

# Test 5: Missing required SUPABASE_SERVICE_KEY
echo "Test 5: Missing SUPABASE_SERVICE_KEY"
(
  export BOT_TOKEN="test-bot-token"
  export APPLICATION_ID="test-app-id"
  export SUPABASE_URL="https://test.supabase.co"
  unset SUPABASE_SERVICE_KEY
  bash "$DEPLOY_SCRIPT" "1.2.3.4" > /dev/null 2>&1
) && exit_code=0 || exit_code=$?
assert_exit_code "exits with non-zero code when SUPABASE_SERVICE_KEY missing" 1 "$exit_code"

echo ""

# Test 6: All required env vars missing -> lists all missing vars
echo "Test 6: All required env vars missing"
output=$(
  unset BOT_TOKEN APPLICATION_ID SUPABASE_URL SUPABASE_SERVICE_KEY
  bash "$DEPLOY_SCRIPT" "1.2.3.4" 2>&1 || true
)
assert_output_contains "mentions BOT_TOKEN" "BOT_TOKEN" "$output"
assert_output_contains "mentions APPLICATION_ID" "APPLICATION_ID" "$output"
assert_output_contains "mentions SUPABASE_URL" "SUPABASE_URL" "$output"
assert_output_contains "mentions SUPABASE_SERVICE_KEY" "SUPABASE_SERVICE_KEY" "$output"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
