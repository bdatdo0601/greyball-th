-- Initialize the document management database
-- This script ensures the database is properly set up when the container starts

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_description TEXT,
  UNIQUE(document_id, version_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC);

-- Insert sample data (only if tables are empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM documents) THEN
        INSERT INTO documents (title, content, metadata) VALUES
        (
            'Welcome to Document Management System',
            '<h1>Welcome!</h1><p>This is your new document management system with PATCH API support.</p><p>Key features include:</p><ul><li>Real-time collaborative editing</li><li>Version history with automatic saves</li><li>Full-text search across all documents</li><li>PATCH API for incremental updates</li></ul><p>Try editing this document to see the auto-save in action!</p>',
            '{"author": "System", "category": "Welcome", "tags": ["introduction", "guide"]}'
        ),
        (
            'API Documentation',
            '<h2>PATCH API Usage</h2><p>This system supports two types of PATCH operations:</p><h3>1. Delta Format</h3><pre><code>PATCH /api/documents/:id\n{\n  "changes": [{\n    "type": "insert",\n    "position": 10,\n    "text": " updated",\n    "field": "content"\n  }]\n}</code></pre><h3>2. JSON Patch (RFC 6902)</h3><pre><code>PATCH /api/documents/:id/json-patch\n{\n  "operations": [{\n    "op": "replace",\n    "path": "/title",\n    "value": "New Title"\n  }]\n}</code></pre><p>Both formats create automatic version history for full audit trails.</p>',
            '{"author": "System", "category": "Documentation", "tags": ["api", "patch", "technical"]}'
        ),
        (
            'Docker Setup Guide',
            '<h1>Running with Docker</h1><p>This application is containerized with Docker Compose for easy deployment:</p><h2>Services</h2><ul><li><strong>postgres</strong>: PostgreSQL 15 database</li><li><strong>backend</strong>: Fastify API server</li><li><strong>frontend</strong>: Next.js web application</li></ul><h2>Quick Start</h2><pre><code># Build and start all services\ndocker-compose up -d\n\n# View logs\ndocker-compose logs -f\n\n# Stop all services\ndocker-compose down</code></pre><p>All data is persisted in Docker volumes, so your documents will survive container restarts!</p>',
            '{"author": "System", "category": "Documentation", "tags": ["docker", "deployment", "infrastructure"]}'
        );

        RAISE NOTICE 'Sample data inserted successfully';
    ELSE
        RAISE NOTICE 'Documents table already contains data, skipping sample data insertion';
    END IF;
END $$;
