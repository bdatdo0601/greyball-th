#!/bin/bash

# Document Management System Setup Script
echo "🚀 Setting up Document Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

# Check PostgreSQL
if command -v psql >/dev/null 2>&1; then
    print_status "PostgreSQL found"
else
    print_warning "PostgreSQL not found in PATH. Make sure it's installed and running."
fi

print_status "Prerequisites check completed."

# Setup Backend
print_status "Setting up backend..."
cd backend

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating backend .env file..."
    cat > .env << EOL
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_management
DB_USER=postgres
DB_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5432/document_management

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
EOL
    print_status "Created .env file with default values"
    print_warning "Please edit backend/.env with your actual database credentials"
else
    print_status "Backend .env file already exists"
fi

# Install backend dependencies
if [ ! -d node_modules ]; then
    print_status "Installing backend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Backend dependencies installed successfully"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
else
    print_status "Backend dependencies already installed"
fi

# Build TypeScript
print_status "Building backend TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Backend built successfully"
else
    print_error "Failed to build backend"
    exit 1
fi

cd ..

# Setup Frontend
print_status "Setting up frontend..."
cd frontend

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    print_status "Creating frontend .env.local file..."
    cat > .env.local << EOL
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
EOL
    print_status "Created .env.local file with default values"
else
    print_status "Frontend .env.local file already exists"
fi

# Install frontend dependencies
if [ ! -d node_modules ]; then
    print_status "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Frontend dependencies installed successfully"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
else
    print_status "Frontend dependencies already installed"
fi

cd ..

# Database setup instructions
print_status "Database setup instructions:"
echo ""
print_warning "Before running the application, make sure to:"
echo "1. Start PostgreSQL service"
echo "2. Create the database:"
echo "   createdb document_management"
echo ""
echo "3. Run database migrations:"
echo "   cd backend && npm run migrate"
echo ""

# Final instructions
print_status "Setup completed! 🎉"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm run migrate  # (run once to set up database)"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
print_status "Happy coding! 🚀"
