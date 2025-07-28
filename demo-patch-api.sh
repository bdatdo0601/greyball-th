#!/bin/bash

# PATCH API Demo Script
echo "🧪 Document Management System - PATCH API Demo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001"

# Function to print colored output
print_step() {
    echo -e "\n${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if server is running
print_step "Checking if API server is running..."
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_success "API server is running at $API_URL"
else
    print_error "API server is not running. Please start the backend server first:"
    echo "  cd backend && npm run dev"
    exit 1
fi

# Create a test document
print_step "Creating a test document..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/documents" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "PATCH API Demo Document",
        "content": "This is the original content of our demo document."
    }')

if [ $? -eq 0 ]; then
    DOCUMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Document created with ID: $DOCUMENT_ID"
else
    print_error "Failed to create document"
    exit 1
fi

# Demo 1: Delta format - Insert text
print_step "Demo 1: Using Delta format to insert text..."
PATCH_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "insert",
            "position": 12,
            "text": " updated",
            "field": "content"
        }],
        "metadata": {
            "changeDescription": "Added updated marker",
            "editorVersion": "demo-script-1.0"
        }
    }')

if [ $? -eq 0 ]; then
    print_success "Inserted text successfully"
    print_info "Content now: $(echo "$PATCH_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)"
else
    print_error "Failed to insert text"
fi

# Demo 2: Delta format - Replace title
print_step "Demo 2: Using Delta format to replace part of title..."
curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "replace",
            "position": 0,
            "length": 9,
            "text": "Enhanced PATCH",
            "field": "title"
        }],
        "metadata": {
            "changeDescription": "Updated title prefix"
        }
    }' > /dev/null

if [ $? -eq 0 ]; then
    print_success "Title updated successfully"
else
    print_error "Failed to update title"
fi

# Demo 3: JSON Patch format
print_step "Demo 3: Using JSON Patch format to add metadata..."
curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID/json-patch" \
    -H "Content-Type: application/json" \
    -d '{
        "operations": [
            {
                "op": "add",
                "path": "/metadata/demo_completed",
                "value": true
            },
            {
                "op": "add", 
                "path": "/metadata/demo_timestamp",
                "value": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
            }
        ],
        "metadata": {
            "changeDescription": "Added demo completion metadata"
        }
    }' > /dev/null

if [ $? -eq 0 ]; then
    print_success "Metadata added successfully"
else
    print_error "Failed to add metadata"
fi

# Show final document state
print_step "Final document state:"
FINAL_DOC=$(curl -s "$API_URL/api/documents/$DOCUMENT_ID")
echo "$FINAL_DOC" | jq '.'

# Show version history
print_step "Version history:"
VERSIONS=$(curl -s "$API_URL/api/documents/$DOCUMENT_ID/versions")
echo "$VERSIONS" | jq '.versions[] | {version_number, created_at, change_description}'

print_step "Demo completed! 🎉"
echo ""
print_info "Key takeaways from this demo:"
echo "  ✅ Delta format is great for text-based changes"
echo "  ✅ JSON Patch format works well for structured updates"
echo "  ✅ All changes create automatic version history"
echo "  ✅ Both formats support metadata for change tracking"
echo ""
print_info "Document ID for further testing: $DOCUMENT_ID"
print_info "Try opening the frontend at http://localhost:3000 to edit this document!"
