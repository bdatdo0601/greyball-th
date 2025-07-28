# Document Management System - PATCH API POC

A proof-of-concept document management system featuring PATCH API endpoints for incremental document updates with version history.

## Features

### Backend (Fastify + PostgreSQL)
- **CRUD Operations**: Full document lifecycle management
- **PATCH API Support**: Two implementation approaches
  - Custom delta format for text-based changes
- **Version Management**: Automatic versioning with change descriptions
- **Full-text Search**: PostgreSQL tsvector-based search
- **Auto-save Integration**: Optimized for real-time editor updates

### Frontend (Next.js + TipTap)
- **Rich Text Editor**: TipTap-based WYSIWYG editor
- **Real-time Auto-save**: Debounced PATCH requests with visual feedback
- **Version History**: View document evolution over time
- **Automatic Search**: Real-time debounced search with highlighting
- **Responsive Design**: Mobile-friendly interface

## Architecture

```
┌─────────────────┐    HTTP/PATCH     ┌─────────────────┐    SQL    ┌──────────────┐
│   Next.js App  │ ◄──────────────── │  Fastify API    │ ◄────────► │ PostgreSQL   │
│                 │                   │                 │            │              │
│ • TipTap Editor │                   │ • Document CRUD │            │ • documents  │
│ • Auto-save     │                   │ • PATCH Endpoints│            │ • versions   │
│ • Search UI     │                   │ • Version Mgmt  │            │ • FTS Index  │
│ • Version View  │                   │ • Search API    │            │              │
└─────────────────┘                   └─────────────────┘            └──────────────┘
```

## API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Replace entire document (creates version)
- **`PATCH /api/documents/:id`** - Apply delta changes (creates version)
- **`PATCH /api/documents/:id/json-patch`** - Apply JSON Patch operations
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/versions` - Get document version history

### Search
- `GET /api/search?q=term` - Full-text search

### Health
- `GET /health` - System health check

## PATCH Implementation Details

### Option 1: Delta Format (Recommended for Text Editors)
```typescript
// Simple text-based change operations
PATCH /api/documents/:id
{
  "changes": [
    {
      "type": "insert",
      "position": 10,
      "text": " updated text",
      "field": "content"
    },
    {
      "type": "delete",
      "position": 0,
      "length": 5,
      "field": "title"
    },
    {
      "type": "replace",
      "position": 15,
      "length": 8,
      "text": "new content",
      "field": "content"
    }
  ],
  "metadata": {
    "changeDescription": "Added introduction",
    "editorVersion": "tiptap-2.0"
  }
}
```

### Option 2: JSON Patch (RFC 6902)
```typescript
// Standards-compliant JSON operations
PATCH /api/documents/:id/json-patch
{
  "operations": [
    { "op": "replace", "path": "/title", "value": "New Title" },
    { "op": "add", "path": "/metadata/author", "value": "John Doe" }
  ],
  "metadata": {
    "changeDescription": "Updated metadata"
  }
}
```

## Quick Start

### Option 1: Docker (Recommended)
```bash
# Production deployment
./docker-manage.sh start prod

# Development with hot reload
./docker-manage.sh start dev

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# pgAdmin (dev): http://localhost:5050

# View logs
./docker-manage.sh logs

# Stop services
./docker-manage.sh stop
```

**See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for complete Docker documentation.**

### Option 2: Automated Setup
```bash
# Clone or navigate to the project directory
git clone <repository-url>  # or extract the provided files
cd greyball-takehome

# Run the automated setup script
./setup.sh
```

### Manual Setup (Alternative)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables (create .env file)
echo "DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_management
DB_USER=postgres
DB_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5432/document_management
PORT=3001
HOST=0.0.0.0" > .env

# Create database
createdb document_management

# Run migrations
npm run migrate

# (Optional) Add sample data
npm run sample-data

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit if API URL differs from http://localhost:3001

# Start development server
npm run dev
```

Environment variables (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001 (root endpoint)

## 📝 Legal Document Ingestion

The project includes a comprehensive script for ingesting sample legal documents:

### Quick Start
```bash
# Validate document templates (optional)
./validate-legal-documents.js

# Ingest 5 legal documents into the API
./ingest-legal-documents.js
```

### What Gets Ingested
- **Software License Agreement** - ProLegal Suite v2.1 (~3k chars)
- **Employment Agreement** - Senior Software Engineer (~4k chars)
- **Service Agreement** - Cloud Infrastructure Management (~5k chars)
- **Privacy Policy** - Digital Marketing Platform (~8k chars)
- **Master Services Agreement** - Enterprise Software Implementation (~10k chars)

Each document includes realistic legal content, proper markdown formatting, and comprehensive metadata (document type, jurisdiction, tags, etc.).

**Features:**
- ✅ **Health Check**: Tests API connectivity before ingestion
- 📊 **Progress Tracking**: Detailed progress indicators
- 🏷️ **Rich Metadata**: Document classification and tagging
- 📄 **Professional Content**: Realistic legal documents for testing
- ⚡ **Error Resilience**: Continues processing even if individual documents fail

See [LEGAL_DOCUMENT_INGESTION.md](LEGAL_DOCUMENT_INGESTION.md) for detailed documentation.

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Specific test for PATCH functionality
npm test -- documents.patch.test.ts
```

### Testing PATCH Endpoints Manually

**Automated Demo**:
```bash
# Run the interactive PATCH API demo
./demo-patch-api.sh

# Test automatic search functionality
./demo-automatic-search.sh

# Test PATCH boundary condition fixes
./demo-patch-boundary-fixes.sh
```

**Delta format example**:
```bash
curl -X PATCH http://localhost:3001/api/documents/YOUR_DOC_ID \
  -H "Content-Type: application/json" \
  -d '{
    "changes": [{
      "type": "insert",
      "position": 0,
      "text": "Updated: ",
      "field": "title"
    }]
  }'
```

**JSON Patch example**:
```bash
curl -X PATCH http://localhost:3001/api/documents/YOUR_DOC_ID/json-patch \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [{
      "op": "replace",
      "path": "/title",
      "value": "New Title"
    }]
  }'
```

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
);
```

### Document Versions Table
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_description TEXT,
  UNIQUE(document_id, version_number)
);
```

## Performance Considerations

### Backend Optimizations
- **Connection Pooling**: PostgreSQL connection pooling via Fastify plugin
- **Indexed Search**: GIN index on tsvector for fast full-text search
- **Change Optimization**: Consecutive similar operations are merged
- **Transaction Safety**: All version creation wrapped in transactions

### Frontend Optimizations
- **Debounced Auto-save**: 1-second debounce prevents excessive API calls
- **Incremental Updates**: Only changed content generates PATCH requests
- **Optimistic UI**: Immediate visual feedback while saving
- **Dynamic Imports**: TipTap editor loaded only when needed

### Scaling Recommendations
- **Database**: Use read replicas for version history queries
- **Caching**: Add Redis for frequently accessed documents
- **CDN**: Serve static frontend assets via CDN
- **Rate Limiting**: Implement per-user rate limits on PATCH endpoints

## Future Enhancements

### Collaboration Features
- **Operational Transforms**: Enable real-time multi-user editing
- **User Presence**: Show active editors
- **Conflict Resolution**: Handle concurrent edit conflicts

### Advanced Versioning
- **Branch/Merge**: Git-like branching for document versions
- **Visual Diff**: Show changes between versions
- **Rollback**: Restore to previous versions

### Security & Permissions
- **Authentication**: Add user authentication
- **Authorization**: Document-level permissions
- **Audit Logging**: Track all document access and changes

## Development Notes

### PATCH Implementation Decisions
1. **Delta Format**: Chosen for simplicity with text editors - easier to generate diffs from content changes
2. **JSON Patch**: Included for standards compliance and structured data updates
3. **Version Creation**: Every PATCH operation creates a version for complete audit trail
4. **Change Optimization**: Backend merges consecutive operations to reduce storage

### Editor Integration
- **Change Detection**: Simple diff algorithm (production would use Myers algorithm)
- **Debouncing**: Balances responsiveness with API efficiency
- **Error Handling**: Visual feedback for save states and failures
- **Offline Support**: Could be extended with local storage queue

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **Port Conflicts**: Make sure ports 3000 and 3001 are available
3. **CORS Issues**: Backend allows all origins in development
4. **Migration Errors**: Check database permissions and existence

### Debug Mode
```bash
# Backend with detailed logs
DEBUG=fastify:* npm run dev

# View database queries (add to .env)
DEBUG=true
```

This POC demonstrates production-ready patterns for incremental document updates with full version control, suitable for scaling to enterprise document management systems.
