# Document Management System

A modern, full-stack document management system featuring collaborative editing with TipTap, patching APIs, version control, and real-time search capabilities. Built as a proof-of-concept for advanced document workflows.

## 🚀 Features

### Core Functionality
- **Rich Text Editing** - Advanced TipTap editor with real-time HTML preview
- **Version Control** - Automatic versioning on every change with full history
- **Real-time Search** - Full-text search with highlighting and auto-complete
- **Collaborative Editing** - Multi-user support with conflict resolution
- **Document Management** - Create, read, update, delete operations

### Technical Highlights
- **Two PATCH API Formats**:
  - Custom Delta format for granular text changes
- **Auto-save** - Automatic document saving with debounced updates
- **PostgreSQL Full-Text Search** - Optimized search with tsvector indexing
- **Docker Development** - Complete containerized development environment
- **TypeScript** - Full type safety across frontend and backend

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (Fastify)     │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ • TipTap Editor │    │ • REST APIs     │    │ • Document      │
│ • Auto-search   │    │ • PATCH APIs    │    │ • Versions      │
│ • Real-time UI  │    │ • Versioning    │    │ • Full-text     │
│ • TypeScript    │    │ • TypeScript    │    │   search        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- **Next.js 14** - React framework with App Router
- **TipTap** - Modern rich-text editor (v3.0.7)
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety and better development experience

**Backend:**
- **Fastify** - High-performance web framework
- **PostgreSQL 15** - Relational database with full-text search
- **TypeScript** - Consistent typing across the stack
- **Vitest** - Modern testing framework

**Infrastructure:**
- **Docker Compose** - Multi-container development environment
- **pgAdmin** - Database administration interface
- **Hot Reload** - Development efficiency in all services

## 📋 Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18+** and **npm** (for local development)
- **PostgreSQL 15** (if running locally)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd greyball-takehome
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications:**
   - **Web App**: http://localhost:3000
   - **API Documentation**: http://localhost:3001
   - **Database Admin**: http://localhost:5050
     - Email: `admin@example.com`
     - Password: `admin`

4. **Load sample legal documents:**
   ```bash
   node ingest-legal-documents.js
   ```

5. **View logs (optional):**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f frontend
   docker-compose logs -f backend
   ```

### Local Development Setup

If you prefer running services locally:

1. **Start PostgreSQL:**
   ```bash
   # Using Docker for just the database
   docker-compose up -d postgres
   ```

2. **Backend setup:**
   ```bash
   cd backend
   npm install
   npm run migrate  # Initialize database
   npm run dev      # Start development server
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   npm run dev      # Start development server
   ```

## 🔧 Services Configuration

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: `document_management`
- **Username**: `postgres`
- **Password**: `password`
- **Features**:
  - UUID primary keys
  - Full-text search with tsvector
  - Automatic versioning triggers
  - JSONB metadata support

### Backend API (Fastify)
- **Port**: 3001
- **Features**:
  - RESTful document CRUD operations
  - Two PATCH API formats (Delta + JSON Patch)
  - Automatic version creation
  - Full-text search endpoint
  - Health checks and monitoring

### Frontend Web App (Next.js)
- **Port**: 3000
- **Features**:
  - TipTap rich-text editor
  - Real-time search with debouncing
  - Document version history viewer
  - Responsive design with Tailwind CSS

### Database Admin (pgAdmin)
- **Port**: 5050
- **Login**: admin@example.com / admin
- **Purpose**: Database management and query testing

## 📖 API Documentation

### Core Endpoints

#### Documents
```http
GET    /api/documents              # List all documents
POST   /api/documents              # Create new document
GET    /api/documents/:id          # Get specific document
PUT    /api/documents/:id          # Replace document (versioned)
PATCH  /api/documents/:id          # Delta patch (versioned)
DELETE /api/documents/:id          # Delete document
```

#### Versions & Search
```http
GET    /api/documents/:id/versions # Get document versions
GET    /api/search?q=term          # Search documents
GET    /health                     # Health check
```

### PATCH API Formats

#### 1. Delta Format
Custom format optimized for text editing:

```json
PATCH /api/documents/:id
{
  "changes": [
    {
      "type": "insert",
      "position": 42,
      "text": " updated content",
      "field": "content"
    },
    {
      "type": "delete",
      "position": 100,
      "length": 10,
      "field": "content"
    }
  ],
  "metadata": {
    "changeDescription": "Added update marker and removed old content"
  }
}
```

## 📊 Sample Data

The project includes a comprehensive data ingestion script that loads 5 realistic legal documents:

1. **Software License Agreement** - ProLegal Suite v2.1
2. **Employment Agreement** - Senior Software Engineer
3. **Service Agreement** - Cloud Infrastructure Management
4. **Privacy Policy** - Digital Marketing Platform
5. **Master Services Agreement** - Enterprise Software Implementation

**Load sample documents:**
```bash
# Ensure backend is running, then:
node ingest-legal-documents.js
```

**Features of sample documents:**
- TipTap-compatible HTML formatting
- Comprehensive legal metadata (jurisdiction, dates, authors)
- Realistic content for testing search, editing, and versioning
- Professional document structures and terminology

## 🏃‍♂️ Usage Examples

### Creating a New Document

1. Navigate to http://localhost:3000
2. Click **"Create Document"**
3. Enter title and content using the rich-text editor
4. Document saves automatically every 2 seconds
5. All changes create automatic versions

### Searching Documents

1. Use the search bar at the top of the document list
2. Search is **real-time** - results update as you type
3. Search covers both title and content
4. Results include highlighted search terms

### Viewing Document History

1. Open any document for editing
2. Version history is preserved automatically
3. Every PATCH operation creates a new version
4. Access via `/api/documents/:id/versions` endpoint

### Using the API Directly

```bash
# Create a new document
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Doc", "content": "<p>Hello World!</p>"}'

# Search documents
curl "http://localhost:3001/api/search?q=hello"

# Apply delta patch
curl -X PATCH http://localhost:3001/api/documents/[ID] \
  -H "Content-Type: application/json" \
  -d '{
    "changes": [{
      "type": "insert",
      "position": 0,
      "text": "Updated: ",
      "field": "content"
    }]
  }'
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test        # Run all tests
npm run test:watch  # Watch mode
```

### Frontend Development
```bash
cd frontend
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
npm run dev         # Development with hot reload
```

### Integration Testing
```bash
# Test API health
curl http://localhost:3001/health

# Test document creation and search
node ingest-legal-documents.js
```

## 📁 Project Structure

```
greyball-takehome/
├── frontend/                    # Next.js web application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/               # Utilities, APIs, types
│   │   └── styles/            # Global styles
│   ├── package.json           # Frontend dependencies
│   └── Dockerfile.dev         # Development container
│
├── backend/                     # Fastify API server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic
│   │   └── types/             # TypeScript definitions
│   ├── migrations/            # Database migrations
│   ├── tests/                 # API tests
│   ├── package.json           # Backend dependencies
│   └── Dockerfile.dev         # Development container
│
├── docker-compose.yml           # Multi-service orchestration
├── ingest-legal-documents.js    # Sample data loader
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## 🔧 Development Workflow

### Hot Reload Development
All services support hot reload for efficient development:

- **Frontend**: Next.js detects file changes and reloads
- **Backend**: tsx watch mode restarts the server on changes
- **Database**: Schema changes require manual migration

### Docker Development
```bash
# Build and start all services
docker-compose up -d

# Rebuild after dependency changes
docker-compose up -d --build

# View service logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Reset everything (including data)
docker-compose down -v && docker-compose up -d
```

### Database Migrations
```bash
# Run migrations
cd backend && npm run migrate

# Or via Docker
docker-compose exec backend npm run migrate
```

## 🌍 Environment Configuration

### Frontend Environment Variables
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### Backend Environment Variables
```env
# backend/.env
DATABASE_URL=postgresql://postgres:password@postgres:5432/document_management
PORT=3001
NODE_ENV=development
```

### Docker Environment
Environment variables are configured in `docker-compose.yml` for consistent development setup.

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database service
docker-compose restart postgres
```

**Port Conflicts:**
- Frontend (3000), Backend (3001), DB (5432), pgAdmin (5050)
- Modify ports in `docker-compose.yml` if needed

**Hot Reload Not Working:**
- Ensure code directories are properly mounted in Docker volumes
- Check `WATCHPACK_POLLING=true` is set for frontend

**API Connection Errors:**
```bash
# Test API health
curl http://localhost:3001/health

# Check backend logs
docker-compose logs -f backend
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Consistent code formatting
- **Conventional Commits**: Clear commit message format

### Testing Requirements
- Unit tests for new backend functionality
- Frontend components should be tested for basic rendering
- Integration tests for API endpoints

## 🏆 Acknowledgments

- **TipTap** - Excellent rich-text editing framework
- **Fastify** - High-performance web framework
- **PostgreSQL** - Robust full-text search capabilities
- **Docker** - Consistent development environments
