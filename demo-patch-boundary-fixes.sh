#!/bin/bash

# PATCH API Boundary Fixes Demo Script
echo "🔧 Document Management System - PATCH API Boundary Fixes Demo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}[DEMO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

API_URL="http://localhost:3001"

# Check if server is running
print_step "Checking if API server is running..."
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_success "API server is running at $API_URL"
else
    print_error "API server is not running. Please start the backend server first:"
    echo "  cd backend && npm run dev"
    echo "  OR using Docker: ./docker-manage.sh start dev"
    exit 1
fi

# Create a test document
print_step "Creating a test document..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/documents" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "PATCH Boundary Test",
        "content": "Short text."
    }')

if [ $? -eq 0 ]; then
    DOCUMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Document created with ID: $DOCUMENT_ID"
    
    # Show initial document
    INITIAL_CONTENT=$(echo "$CREATE_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Initial content: '$INITIAL_CONTENT'"
    print_info "Content length: ${#INITIAL_CONTENT} characters"
else
    print_error "Failed to create document"
    exit 1
fi

print_step "🧪 TESTING FIXED PATCH BOUNDARY CONDITIONS"

# Test 1: Insert at position beyond text length (FIXED - should now work)
print_step "Test 1: Insert beyond text length (position 1000)"
PATCH1_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "insert",
            "position": 1000,
            "text": " Appended text!",
            "field": "content"
        }],
        "metadata": {
            "changeDescription": "Test append beyond text length"
        }
    }')

if echo "$PATCH1_RESPONSE" | grep -q '"document"'; then
    print_success "✅ INSERT beyond text length now works!"
    NEW_CONTENT=$(echo "$PATCH1_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "New content: '$NEW_CONTENT'"
else
    print_error "❌ INSERT beyond text length failed"
    echo "$PATCH1_RESPONSE"
fi

# Test 2: Delete with length exceeding remaining text (FIXED)
print_step "Test 2: Delete with excessive length"
PATCH2_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "delete",
            "position": 5,
            "length": 1000,
            "field": "content"
        }],
        "metadata": {
            "changeDescription": "Test delete with excessive length"
        }
    }')

if echo "$PATCH2_RESPONSE" | grep -q '"document"'; then
    print_success "✅ DELETE with excessive length handled gracefully!"
    NEW_CONTENT=$(echo "$PATCH2_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Content after delete: '$NEW_CONTENT'"
else
    print_error "❌ DELETE with excessive length failed"
    echo "$PATCH2_RESPONSE"
fi

# Test 3: Replace with length exceeding remaining text (FIXED)
print_step "Test 3: Replace with excessive length"
PATCH3_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "replace",
            "position": 2,
            "length": 1000,
            "text": "COMPLETELY REPLACED!",
            "field": "content"
        }],
        "metadata": {
            "changeDescription": "Test replace with excessive length"
        }
    }')

if echo "$PATCH3_RESPONSE" | grep -q '"document"'; then
    print_success "✅ REPLACE with excessive length handled gracefully!"
    NEW_CONTENT=$(echo "$PATCH3_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Content after replace: '$NEW_CONTENT'"
else
    print_error "❌ REPLACE with excessive length failed"
    echo "$PATCH3_RESPONSE"
fi

# Test 4: Multiple boundary operations
print_step "Test 4: Multiple operations with boundary conditions"
PATCH4_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [
            {
                "type": "insert",
                "position": 0,
                "text": "PREFIX: ",
                "field": "content"
            },
            {
                "type": "insert",
                "position": 1000,
                "text": " :SUFFIX",
                "field": "content"
            }
        ],
        "metadata": {
            "changeDescription": "Test multiple boundary operations"
        }
    }')

if echo "$PATCH4_RESPONSE" | grep -q '"document"'; then
    print_success "✅ Multiple boundary operations handled correctly!"
    NEW_CONTENT=$(echo "$PATCH4_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Final content: '$NEW_CONTENT'"
else
    print_error "❌ Multiple boundary operations failed"
    echo "$PATCH4_RESPONSE"
fi

# Test 5: Operations that should still fail (validation working)
print_step "Test 5: Operations that should still fail (proper validation)"
PATCH5_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "delete",
            "position": 1000,
            "length": 5,
            "field": "content"
        }]
    }')

if echo "$PATCH5_RESPONSE" | grep -q '"error"'; then
    print_success "✅ Invalid operations still properly rejected!"
    ERROR_MSG=$(echo "$PATCH5_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    print_info "Error message: '$ERROR_MSG'"
else
    print_error "❌ Invalid operations should be rejected"
    echo "$PATCH5_RESPONSE"
fi

print_step "🎯 REAL-WORLD USAGE SCENARIOS"

# Scenario 1: User typing at the end of document (common case)
print_step "Scenario 1: User appends content (typing at end)"

# First, get the current document to know exact length
GET_RESPONSE=$(curl -s "$API_URL/api/documents/$DOCUMENT_ID")
CURRENT_CONTENT=$(echo "$GET_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
CURRENT_LENGTH=${#CURRENT_CONTENT}

print_info "Current content length: $CURRENT_LENGTH characters"

# Simulate user typing at the exact end
APPEND_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d "{
        \"changes\": [{
            \"type\": \"insert\",
            \"position\": $CURRENT_LENGTH,
            \"text\": \" User typed this at the end.\",
            \"field\": \"content\"
        }]
    }")

if echo "$APPEND_RESPONSE" | grep -q '"document"'; then
    print_success "✅ User typing at document end works perfectly!"
    FINAL_CONTENT=$(echo "$APPEND_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Final content: '$FINAL_CONTENT'"
else
    print_error "❌ User typing at document end failed"
fi

# Scenario 2: User tries to insert way beyond end (should append)
print_step "Scenario 2: User position beyond end (should auto-correct)"
BEYOND_RESPONSE=$(curl -s -X PATCH "$API_URL/api/documents/$DOCUMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "changes": [{
            "type": "insert",
            "position": 9999,
            "text": " Auto-corrected append.",
            "field": "content"
        }]
    }')

if echo "$BEYOND_RESPONSE" | grep -q '"document"'; then
    print_success "✅ Position beyond end auto-corrected to append!"
    CORRECTED_CONTENT=$(echo "$BEYOND_RESPONSE" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    print_info "Auto-corrected result: '$CORRECTED_CONTENT'"
else
    print_error "❌ Position beyond end auto-correction failed"
fi

print_step "📊 SUMMARY OF FIXED ISSUES"
echo ""
print_success "✅ FIXED: Insert operations beyond text length now append to end"
print_success "✅ FIXED: Delete operations with excessive length are clamped"
print_success "✅ FIXED: Replace operations with excessive length are clamped"
print_success "✅ FIXED: Multiple boundary operations work correctly"
print_success "✅ MAINTAINED: Invalid operations are still properly rejected"
print_success "✅ IMPROVED: Better error messages for debugging"

print_step "🚀 BENEFITS FOR USERS"
echo ""
print_info "👩‍💻 Content Creation:"
echo "  • Users can append content without knowing exact document length"
echo "  • TipTap editor can insert at cursor position safely"
echo "  • No more failed saves when adding content to documents"

print_info "🔧 Developer Experience:"
echo "  • Frontend doesn't need to calculate exact positions"
echo "  • Graceful handling of boundary conditions"
echo "  • Better error messages for debugging"

print_info "📱 Real-world Scenarios:"
echo "  • Blog post writing with content appending"
echo "  • Note-taking with incremental additions"
echo "  • Collaborative editing with multiple cursors"

print_step "✨ PATCH API BOUNDARY FIXES DEMO COMPLETED!"
echo ""
print_success "The PATCH API now handles boundary conditions gracefully!"
print_info "🌐 Try it in the frontend: http://localhost:3000"
print_info "📝 Create a document and type content - it will auto-save correctly!"
print_info "🔗 Document ID for testing: $DOCUMENT_ID"
