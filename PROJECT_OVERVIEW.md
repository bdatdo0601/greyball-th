# Project Structure Overview

```
greyball-takehome/
├── README.md                           # Comprehensive project documentation
├── PROJECT_OVERVIEW.md                 # Detailed architecture overview
├── DOCKER_GUIDE.md                     # Complete Docker setup guide
├── setup.sh                          # Automated setup script
├── docker-manage.sh                   # Docker management script
├── demo-patch-api.sh                  # Interactive PATCH API demonstration
├── test-docker.sh                     # Docker ecosystem testing
│
├── docker-compose.yml                 # Production Docker Compose
├── docker-compose.dev.yml             # Development Docker Compose
│
├── backend/                           # Fastify + PostgreSQL Backend
│   ├── package.json                   # Backend dependencies & scripts
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── vitest.config.ts              # Testing configuration
│   │
│   ├── migrations/
│   │   └── migrate.ts                 # Database schema setup
│   │
│   ├── src/
│   │   ├── server.ts                  # Main server entry point
│   │   ├── types/index.ts             # TypeScript type definitions
│   │   │
│   │   ├── routes/
│   │   │   └── documents.ts           # Document CRUD + PATCH endpoints
│   │   │
│   │   └── utils/
│   │       └── textUtils.ts           # Delta change processing utilities
│   │
│   └── tests/
│       └── documents.patch.test.ts    # Comprehensive PATCH API tests
│
└── frontend/                          # Next.js + TipTap Frontend
    ├── package.json                   # Frontend dependencies & scripts
    ├── tsconfig.json                  # TypeScript configuration
    ├── tailwind.config.js             # Tailwind CSS configuration
    ├── postcss.config.js              # PostCSS configuration
    │
    └── src/
        ├── app/                       # Next.js App Router pages
        │   ├── layout.tsx             # Root layout
        │   ├── page.tsx               # Document list page
        │   │
        │   └── documents/
        │       ├── new/page.tsx       # Document creation page
        │       │
        │       └── [id]/
        │           ├── page.tsx       # Document editor page
        │           └── view/page.tsx  # Read-only document view
        │
        ├── components/
        │   ├── editor/
        │   │   └── tiptap-editor.tsx  # Rich text editor with PATCH integration
        │   │
        │   └── ui/
        │       ├── button.tsx         # Reusable button component
        │       └── card.tsx           # Reusable card component
        │
        └── lib/
            ├── api.ts                 # API client with PATCH methods
            ├── types.ts               # TypeScript type definitions
            └── utils.ts               # Utility functions (diff, debounce, etc.)
```

## 🚀 Key Features Implemented

### Backend (Fastify + PostgreSQL)
✅ **Full CRUD API** - Complete document lifecycle management
✅ **PATCH API (Delta Format)** - Text-based incremental changes
✅ **PATCH API (JSON Patch)** - RFC 6902 structured operations
✅ **Automatic Versioning** - Every change creates version history
✅ **Full-text Search** - PostgreSQL tsvector-powered search
✅ **Transaction Safety** - Atomic operations with rollback support
✅ **Change Optimization** - Merges consecutive operations
✅ **Comprehensive Testing** - 15+ test scenarios for PATCH endpoints

### Frontend (Next.js + TipTap)
✅ **Rich Text Editor** - TipTap WYSIWYG editor with toolbar
✅ **Real-time Auto-save** - Debounced PATCH requests (1s)
✅ **Visual Save Status** - Loading, saved, and error indicators
✅ **Version History UI** - View document evolution timeline
✅ **Search Interface** - Full-text document search
✅ **Responsive Design** - Mobile-friendly interface
✅ **Error Handling** - Graceful error states and retry logic
✅ **Performance Optimized** - Dynamic imports, optimistic updates

## 🔧 PATCH API Implementation

### Delta Format (Text-Based Changes)
```typescript
PATCH /api/documents/:id
{
  "changes": [
    { "type": "insert", "position": 10, "text": " updated", "field": "content" },
    { "type": "delete", "position": 0, "length": 5, "field": "title" },
    { "type": "replace", "position": 15, "length": 3, "text": "new", "field": "content" }
  ],
  "metadata": { "changeDescription": "Enhanced introduction" }
}
```

### JSON Patch Format (RFC 6902)
```typescript
PATCH /api/documents/:id/json-patch
{
  "operations": [
    { "op": "replace", "path": "/title", "value": "New Title" },
    { "op": "add", "path": "/metadata/author", "value": "John Doe" }
  ],
  "metadata": { "changeDescription": "Updated metadata" }
}
```

## 🐳 Docker Deployment Options

### Quick Start Commands
```bash
# Production deployment
./docker-manage.sh start prod

# Development with hot reload
./docker-manage.sh start dev

# Run comprehensive tests
./test-docker.sh
```

### Container Architecture
- **Multi-stage builds** for optimized production images
- **Non-root users** for security
- **Health checks** for monitoring
- **Volume persistence** for data durability
- **Network isolation** between services

### Available Services
1. **PostgreSQL 15** - Primary database with automatic initialization
2. **Backend API** - Fastify server (production/development modes)
3. **Frontend Web** - Next.js application (production/development modes)
4. **pgAdmin** - Database management interface (development only)

### Container Features
- **Hot reload** in development mode
- **Automatic database migrations** on startup
- **Sample data initialization**
- **Resource monitoring** and limits
- **Comprehensive logging**

### Management Tools
- **docker-manage.sh** - Complete container lifecycle management
- **test-docker.sh** - Automated testing of entire stack
- **Health checks** - Built-in service monitoring
- **Volume backups** - Database persistence management

## 🧪 Testing Coverage

### Backend Tests (`npm test` in backend/)
- Delta format insertions, deletions, replacements
- Multiple changes in single request
- Validation edge cases (negative positions, invalid fields)
- Version creation verification
- JSON Patch operations
- Error handling scenarios

### Manual Testing
- Interactive demo script: `./demo-patch-api.sh`
- cURL examples for both PATCH formats
- Frontend integration testing via browser

## ⚡ Performance Optimizations

### Database
- GIN indexes on full-text search vectors
- Connection pooling via Fastify PostgreSQL plugin
- Optimized queries with proper indexing

### API
- Change optimization (merges consecutive operations)
- Debounced auto-save (reduces server load)
- Efficient diff algorithms for change detection

### Frontend
- Dynamic imports for editor (reduces initial bundle)
- Optimistic UI updates (immediate feedback)
- Intelligent change buffering

## 🔮 Production-Ready Considerations

### Implemented
- Comprehensive error handling and validation
- Transaction safety with rollbacks
- Full audit trail via version history
- TypeScript for type safety
- Automated testing suite

### Next Steps for Production
- Authentication & authorization system
- Rate limiting on PATCH endpoints
- WebSocket integration for real-time collaboration
- Operational transforms for conflict resolution
- Redis caching for frequently accessed documents
- Database read replicas for scaling

## 📊 Architecture Highlights

### Clean Separation of Concerns
- **API Layer**: Pure REST endpoints with clear responsibilities
- **Business Logic**: Centralized in utility functions
- **Data Layer**: PostgreSQL with proper schema design
- **UI Layer**: React components with single responsibilities

### Scalability Patterns
- Stateless API design
- Database connection pooling
- Debounced updates
- Optimistic UI patterns
- Version control system design

This implementation demonstrates enterprise-ready patterns for document management with incremental updates, suitable for scaling to handle millions of documents and concurrent users.
