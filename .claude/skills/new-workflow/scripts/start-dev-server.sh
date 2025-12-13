#!/bin/bash
#
# Start Workscript Development Server
#
# Checks if the API server is already running, and starts it if not.
# Waits for the server to become ready before returning.
#
# Usage: ./start-dev-server.sh
#
# Exit codes:
#   0 - Server is running and ready
#   1 - Server failed to start
#

set -e

WORKSCRIPT_ROOT="${WORKSCRIPT_ROOT:-/Users/narcisbrindusescu/teste/workscript}"
API_URL="http://localhost:3013/health"
MAX_WAIT=30  # seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Workscript Dev Server Launcher${NC}"
echo ""

# Check if API is already running
if curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API server is already running at http://localhost:3013${NC}"
    exit 0
fi

echo -e "${YELLOW}API server is not running. Starting...${NC}"

# Verify workscript directory exists
if [ ! -d "$WORKSCRIPT_ROOT" ]; then
    echo -e "${RED}Error: Workscript directory not found: $WORKSCRIPT_ROOT${NC}"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: bun is not installed${NC}"
    echo "Install bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Start the dev server in the background
cd "$WORKSCRIPT_ROOT"

echo -e "${BLUE}Starting server with 'bun run dev'...${NC}"
echo ""

# Run in background, redirect output to a log file
nohup bun run dev > /tmp/workscript-dev.log 2>&1 &
DEV_PID=$!

echo "Server PID: $DEV_PID"
echo "Log file: /tmp/workscript-dev.log"
echo ""

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"

for i in $(seq 1 $MAX_WAIT); do
    if curl -s "$API_URL" > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Server is ready at http://localhost:3013${NC}"
        echo ""
        echo "To view logs:  tail -f /tmp/workscript-dev.log"
        echo "To stop:       kill $DEV_PID"
        exit 0
    fi

    # Show progress
    printf "."
    sleep 1
done

echo ""
echo -e "${RED}✗ Server failed to start within ${MAX_WAIT} seconds${NC}"
echo ""
echo "Check the log file for errors:"
echo "  tail -50 /tmp/workscript-dev.log"
echo ""
echo "Common issues:"
echo "  - Port 3013 already in use"
echo "  - Missing dependencies (run 'bun install')"
echo "  - Database not configured"

exit 1
