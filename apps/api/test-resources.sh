#!/bin/bash

# API Testing Script for Resources Feature
# Sets up authentication and tests all resource endpoints

BASE_URL="http://localhost:3013"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NzdiOTM1ZS1mMDc5LTQzNDQtYWQyNS02OWVhNmY1MDMyYmMiLCJlbWFpbCI6InRlc3QtcmVzb3VyY2VzQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJwZXJtaXNzaW9ucyI6WyJ3b3JrZmxvdzpjcmVhdGUiLCJ3b3JrZmxvdzpyZWFkIiwid29ya2Zsb3c6dXBkYXRlIiwid29ya2Zsb3c6ZGVsZXRlIiwid29ya2Zsb3c6ZXhlY3V0ZSIsImF1dG9tYXRpb246Y3JlYXRlIiwiYXV0b21hdGlvbjpyZWFkIiwiYXV0b21hdGlvbjp1cGRhdGUiLCJhdXRvbWF0aW9uOmRlbGV0ZSIsImF1dG9tYXRpb246ZXhlY3V0ZSIsImV4ZWN1dGlvbjpyZWFkIiwiZXhlY3V0aW9uOmV4cG9ydCIsImV4ZWN1dGlvbjpyZXJ1biIsInJlc291cmNlOmNyZWF0ZSIsInJlc291cmNlOnJlYWQiLCJyZXNvdXJjZTp1cGRhdGUiLCJyZXNvdXJjZTpkZWxldGUiLCJ1c2VyOnJlYWQiLCJ1c2VyOnVwZGF0ZSIsImFwaWtleTpjcmVhdGUiLCJhcGlrZXk6cmVhZCIsImFwaWtleTpkZWxldGUiXSwiaWF0IjoxNzY0Nzk1MTE4LCJleHAiOjE3NjQ3OTYwMTh9.HNzFmpPkZIwpmfqyvqgvle2pV36TbpZvlVEx8CFtA98"

echo "=========================================="
echo "Resources API Testing Suite"
echo "=========================================="
echo ""

# Test 1: Create Resource
echo "=== Test 1: Create Resource ==="
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/workscript/resources/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "greeting-prompt",
    "content": "Hello name_placeholder, welcome to the platform!",
    "path": "prompts/greeting.md",
    "type": "prompt",
    "description": "A greeting template",
    "tags": ["greeting", "welcome"]
  }')
echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

# Extract resource ID
RESOURCE_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('resource', {}).get('id', ''))" 2>/dev/null)
echo "Created Resource ID: $RESOURCE_ID"
echo ""

# Test 2: Get Resource Metadata
echo "=== Test 2: Get Resource Metadata ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X GET "$BASE_URL/workscript/resources/$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Failed to get resource"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 3: Get Resource Content
echo "=== Test 3: Get Resource Content ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X GET "$BASE_URL/workscript/resources/$RESOURCE_ID/content" \
    -H "Authorization: Bearer $TOKEN"
  echo ""
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 4: List Resources
echo "=== Test 4: List Resources ==="
curl -s -X GET "$BASE_URL/workscript/resources" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Failed to list"
echo ""

# Test 5: Update Resource Metadata
echo "=== Test 5: Update Resource Metadata ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X PUT "$BASE_URL/workscript/resources/$RESOURCE_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "name": "greeting-prompt-updated",
      "description": "Updated greeting template",
      "tags": ["greeting", "welcome", "updated"]
    }' | python3 -m json.tool 2>/dev/null || echo "Failed to update"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 6: Update Resource Content
echo "=== Test 6: Update Resource Content ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X PUT "$BASE_URL/workscript/resources/$RESOURCE_ID/content" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "content": "Hello name_placeholder, welcome to our updated platform! Version 2.0"
    }' | python3 -m json.tool 2>/dev/null || echo "Failed to update content"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 7: Create template for interpolation test
echo "=== Test 7: Create Template for Interpolation ==="
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/workscript/resources/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "interpolation-template",
    "content": "Hello {{$.name}}, you have {{$.count}} messages!",
    "path": "prompts/interpolation-test.md",
    "type": "prompt",
    "description": "Template for interpolation testing"
  }')
echo "$TEMPLATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TEMPLATE_RESPONSE"

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('resource', {}).get('id', ''))" 2>/dev/null)
echo "Template Resource ID: $TEMPLATE_ID"
echo ""

# Test 8: Interpolate Template
echo "=== Test 8: Interpolate Template ==="
if [ -n "$TEMPLATE_ID" ]; then
  curl -s -X POST "$BASE_URL/workscript/resources/$TEMPLATE_ID/interpolate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "state": {
        "name": "Alice",
        "count": 5
      }
    }' | python3 -m json.tool 2>/dev/null || echo "Failed to interpolate"
else
  echo "Skipping - no template ID"
fi
echo ""

# Test 9: Copy Resource
echo "=== Test 9: Copy Resource ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X POST "$BASE_URL/workscript/resources/$RESOURCE_ID/copy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "name": "greeting-prompt-copy",
      "path": "prompts/greeting-copy.md"
    }' | python3 -m json.tool 2>/dev/null || echo "Failed to copy"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 10: Delete Resource
echo "=== Test 10: Delete Resource ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X DELETE "$BASE_URL/workscript/resources/$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Failed to delete"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 11: Verify Deleted Resource Not Found
echo "=== Test 11: Verify Deleted Resource Not Found ==="
if [ -n "$RESOURCE_ID" ]; then
  curl -s -X GET "$BASE_URL/workscript/resources/$RESOURCE_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Failed to get deleted resource"
else
  echo "Skipping - no resource ID"
fi
echo ""

# Test 12: List Resources with Filters
echo "=== Test 12: List Resources with Filters ==="
curl -s -X GET "$BASE_URL/workscript/resources?type=prompt&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "Failed to list with filters"
echo ""

echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
