#!/bin/bash
# Run CRM API Integration Tests
#
# This script starts the web server with a test database and runs the API tests.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TEST_DB_PATH="$PROJECT_ROOT/test-db-api"

echo "=== CRM API Integration Tests ==="
echo ""
echo "Test database: $TEST_DB_PATH"
echo ""

# Clean up any existing test database
if [ -d "$TEST_DB_PATH" ]; then
  echo "Cleaning up existing test database..."
  rm -rf "$TEST_DB_PATH"
fi

# Create fresh test database directory
mkdir -p "$TEST_DB_PATH"

# Start the web server in the background
echo "Starting CRM web server..."
cd "$PROJECT_ROOT"
CRM_DB_PATH="$TEST_DB_PATH" bun run src/web/index.ts &
SERVER_PID=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "ERROR: Server failed to start"
  exit 1
fi

echo "Server started (PID: $SERVER_PID)"
echo ""

# Run the tests
echo "Running API tests..."
bun test tests/integration/api.test.ts
TEST_EXIT_CODE=$?

# Stop the server
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true

# Clean up test database
echo "Cleaning up test database..."
rm -rf "$TEST_DB_PATH"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "=== All tests passed! ==="
else
  echo ""
  echo "=== Some tests failed ==="
fi

exit $TEST_EXIT_CODE
