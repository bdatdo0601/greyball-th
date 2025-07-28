#!/bin/bash

# Docker Ecosystem Test Script
echo "🧪 Testing Document Management System Docker Setup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if Docker is running
print_step "Checking Docker environment..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi
print_success "Docker is running"

# Check if services are running
print_step "Checking if services are running..."
if ! docker-compose ps | grep -q "Up"; then
    print_info "Services not running. Starting them..."
    ./docker-manage.sh start prod
    sleep 30
fi

# Test database connectivity
print_step "Testing database connectivity..."
if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    print_success "Database is ready"
else
    print_error "Database connection failed"
fi

# Test backend health
print_step "Testing backend API health..."
for i in {1..10}; do
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        print_success "Backend API is healthy"
        break
    elif [ $i -eq 10 ]; then
        print_error "Backend API health check failed after 10 attempts"
    else
        print_info "Attempt $i: Backend not ready, waiting..."
        sleep 3
    fi
done

# Test frontend availability
print_step "Testing frontend availability..."
for i in {1..5}; do
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend is accessible"
        break
    elif [ $i -eq 5 ]; then
        print_error "Frontend accessibility check failed after 5 attempts"
    else
        print_info "Attempt $i: Frontend not ready, waiting..."
        sleep 5
    fi
done

# Test document creation via API
print_step "Testing document creation..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/documents \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Docker Test Document",
        "content": "This document was created by the Docker test script."
    }')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    DOCUMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "Document created successfully (ID: $DOCUMENT_ID)"
    
    # Test PATCH API
    print_step "Testing PATCH API..."
    PATCH_RESPONSE=$(curl -s -X PATCH "http://localhost:3001/api/documents/$DOCUMENT_ID" \
        -H "Content-Type: application/json" \
        -d '{
            "changes": [{
                "type": "insert",
                "position": 0,
                "text": "[TESTED] ",
                "field": "title"
            }]
        }')
    
    if echo "$PATCH_RESPONSE" | grep -q '"appliedChanges"'; then
        print_success "PATCH API working correctly"
    else
        print_error "PATCH API test failed"
    fi
    
    # Test search
    print_step "Testing search functionality..."
    SEARCH_RESPONSE=$(curl -s "http://localhost:3001/api/search?q=Docker")
    
    if echo "$SEARCH_RESPONSE" | grep -q '"documents"'; then
        print_success "Search functionality working"
    else
        print_error "Search test failed"
    fi
    
else
    print_error "Document creation failed"
fi

# Test resource usage
print_step "Checking resource usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(document-management|CONTAINER)"

print_step "Docker ecosystem test completed! 🎉"
echo ""
print_info "🌐 Frontend: http://localhost:3000"
print_info "🔗 Backend API: http://localhost:3001"
print_info "🗄️  PostgreSQL: localhost:5432"
echo ""
print_info "To stop the services: ./docker-manage.sh stop"
