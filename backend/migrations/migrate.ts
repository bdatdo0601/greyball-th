import { Client } from 'pg';

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'document_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Create documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
      )
    `);

    // Create document_versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        title VARCHAR(500) NOT NULL,
        version_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        change_description TEXT,
        UNIQUE(document_id, version_number)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC)
    `);

    console.log('Database migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrate();
}

export { migrate };
