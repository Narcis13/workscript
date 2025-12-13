#!/bin/bash
#
# Fetch Node Manifest from Workscript Reflection API
#
# Usage: ./fetch-manifest.sh [full|compact|custom]
#
# Modes:
#   full    - Complete manifest with all documentation
#   compact - Token-optimized manifest (~5000 tokens)
#   custom  - Filtered manifest for specific categories
#
# Examples:
#   ./fetch-manifest.sh              # Default: compact
#   ./fetch-manifest.sh full         # Full manifest
#   ./fetch-manifest.sh custom       # Custom filtered manifest
#

set -e

MODE=${1:-compact}
API_URL="http://localhost:3013/workscript/reflection/manifest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if API is running
check_api() {
    if ! curl -s "http://localhost:3013/health" > /dev/null 2>&1; then
        echo -e "${RED}Error: API server is not running${NC}"
        echo ""
        echo "Start the dev server with:"
        echo "  cd /Users/narcisbrindusescu/teste/workscript && bun run dev"
        echo ""
        echo "Or run:"
        echo "  ./start-dev-server.sh"
        exit 1
    fi
}

# Check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found, output will not be formatted${NC}"
        return 1
    fi
    return 0
}

# Fetch and format output
fetch_and_format() {
    local url=$1
    local method=${2:-GET}
    local body=$3

    if check_jq; then
        if [ "$method" = "POST" ]; then
            curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$body" | jq .
        else
            curl -s "$url" | jq .
        fi
    else
        if [ "$method" = "POST" ]; then
            curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$body"
        else
            curl -s "$url"
        fi
    fi
}

# Main logic
check_api

case $MODE in
    full)
        echo -e "${GREEN}Fetching full manifest...${NC}"
        fetch_and_format "$API_URL"
        ;;
    compact)
        echo -e "${GREEN}Fetching compact manifest...${NC}"
        fetch_and_format "$API_URL/compact"
        ;;
    custom)
        echo -e "${GREEN}Fetching custom manifest (core + data-manipulation)...${NC}"
        fetch_and_format "$API_URL/custom" "POST" '{
            "categories": ["core", "data-manipulation"],
            "includeExamples": true
        }'
        ;;
    categories)
        echo -e "${GREEN}Fetching manifest by categories...${NC}"
        fetch_and_format "$API_URL/categories"
        ;;
    syntax)
        echo -e "${GREEN}Fetching syntax reference...${NC}"
        fetch_and_format "$API_URL/syntax"
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo ""
        echo "Usage: ./fetch-manifest.sh [full|compact|custom|categories|syntax]"
        echo ""
        echo "Modes:"
        echo "  full       - Complete manifest with all documentation"
        echo "  compact    - Token-optimized manifest (~5000 tokens)"
        echo "  custom     - Filtered manifest for specific categories"
        echo "  categories - List available categories"
        echo "  syntax     - Syntax reference only"
        exit 1
        ;;
esac
