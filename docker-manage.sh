#!/bin/bash

# Docker Management Script for Document Management System
echo "🐳 Document Management System - Docker Management"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

show_usage() {
    echo "Usage: $0 [COMMAND] [MODE]"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - View logs from all services"
    echo "  status    - Show status of all services"
    echo "  clean     - Stop services and remove containers/volumes"
    echo "  build     - Build all Docker images"
    echo ""
    echo "Modes:"
    echo "  prod      - Production mode (default)"
    echo "  dev       - Development mode with hot reload"
    echo ""
    echo "Examples:"
    echo "  $0 start prod    # Start in production mode"
    echo "  $0 start dev     # Start in development mode"
    echo "  $0 logs          # View logs from all services"
    echo "  $0 clean dev     # Clean up development environment"
}

# Default mode is production
MODE="prod"
COMPOSE_FILE="docker-compose.yml"

# Parse command line arguments
COMMAND=$1
if [ "$2" = "dev" ]; then
    MODE="dev"
    COMPOSE_FILE="docker-compose.dev.yml"
elif [ "$2" = "prod" ]; then
    MODE="prod"
    COMPOSE_FILE="docker-compose.yml"
fi

case $COMMAND in
    "start")
        print_step "Starting Document Management System in $MODE mode..."
        print_info "Using compose file: $COMPOSE_FILE"
        
        if [ "$MODE" = "dev" ]; then
            print_info "🔥 Development mode: Hot reload enabled"
            print_info "📊 pgAdmin available at: http://localhost:5050 (admin@example.com / admin)"
        fi
        
        docker-compose -f $COMPOSE_FILE up -d
        
        if [ $? -eq 0 ]; then
            print_success "All services started successfully!"
            print_info "🌐 Frontend: http://localhost:3000"
            print_info "🔗 Backend API: http://localhost:3001"
            print_info "🗄️  PostgreSQL: localhost:5432"
            
            echo ""
            print_step "Checking service health..."
            sleep 10
            docker-compose -f $COMPOSE_FILE ps
        else
            print_error "Failed to start services"
        fi
        ;;
        
    "stop")
        print_step "Stopping Document Management System ($MODE mode)..."
        docker-compose -f $COMPOSE_FILE down
        print_success "All services stopped"
        ;;
        
    "restart")
        print_step "Restarting Document Management System ($MODE mode)..."
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
        print_success "All services restarted"
        ;;
        
    "logs")
        print_step "Viewing logs from all services..."
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
        
    "status")
        print_step "Service Status:"
        docker-compose -f $COMPOSE_FILE ps
        echo ""
        print_step "Health Checks:"
        docker-compose -f $COMPOSE_FILE exec backend curl -f http://localhost:3001/health 2>/dev/null && print_success "Backend: Healthy" || print_error "Backend: Unhealthy"
        curl -f http://localhost:3000 >/dev/null 2>&1 && print_success "Frontend: Healthy" || print_error "Frontend: Unhealthy"
        ;;
        
    "clean")
        print_step "Cleaning up Document Management System ($MODE mode)..."
        print_info "This will remove all containers and volumes (data will be lost!)"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f $COMPOSE_FILE down -v --remove-orphans
            docker system prune -f
            print_success "Cleanup completed"
        else
            print_info "Cleanup cancelled"
        fi
        ;;
        
    "build")
        print_step "Building Docker images..."
        docker-compose -f $COMPOSE_FILE build --no-cache
        print_success "Build completed"
        ;;
        
    *)
        show_usage
        ;;
esac
