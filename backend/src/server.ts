import Fastify from 'fastify';
import cors from '@fastify/cors';
import postgres from '@fastify/postgres';
import documentRoutes from './routes/documents';

// Build server function for dependency injection and testing
export function build(opts = {}) {
  const fastify = Fastify({
    logger: true,
    ...opts
  });

  // Register CORS
  fastify.register(cors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // Register PostgreSQL
  fastify.register(postgres, {
    connectionString: process.env.DATABASE_URL || 
      'postgresql://postgres:password@localhost:5432/document_management'
  });

  // Register routes
  fastify.register(documentRoutes);

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      const client = await fastify.pg.connect();
      await client.query('SELECT 1');
      client.release();
      
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      reply.code(503);
      return { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Root endpoint with API information
  fastify.get('/', async (request, reply) => {
    return {
      name: 'Document Management API',
      version: '1.0.0',
      description: 'POC Document Management System with PATCH API support',
      endpoints: {
        documents: {
          'GET /api/documents': 'List all documents',
          'POST /api/documents': 'Create new document',
          'GET /api/documents/:id': 'Get specific document',
          'PUT /api/documents/:id': 'Replace document (creates version)',
          'PATCH /api/documents/:id': 'Apply delta changes (creates version)',
          'PATCH /api/documents/:id/json-patch': 'Apply JSON Patch operations (creates version)',
          'DELETE /api/documents/:id': 'Delete document',
          'GET /api/documents/:id/versions': 'Get document versions'
        },
        search: {
          'GET /api/search?q=term': 'Search documents'
        },
        health: {
          'GET /health': 'Health check endpoint'
        }
      },
      patch_formats: {
        delta: {
          description: 'Custom delta format for text changes',
          example: {
            changes: [{
              type: 'insert',
              position: 10,
              text: ' updated',
              field: 'content'
            }],
            metadata: {
              changeDescription: 'Added update marker'
            }
          }
        },
        jsonPatch: {
          description: 'RFC 6902 JSON Patch format',
          example: {
            operations: [{
              op: 'replace',
              path: '/title',
              value: 'New Title'
            }],
            metadata: {
              changeDescription: 'Updated title'
            }
          }
        }
      }
    };
  });

  return fastify;
}

// Start server if this file is run directly
if (require.main === module) {
  const server = build();
  
  const start = async () => {
    try {
      const port = parseInt(process.env.PORT || '3001');
      const host = process.env.HOST || '0.0.0.0';
      
      await server.listen({ port, host });
      console.log(`🚀 Document Management API running at http://${host}:${port}`);
      console.log(`📖 API Documentation available at http://${host}:${port}`);
      console.log(`🏥 Health check available at http://${host}:${port}/health`);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  start();
}
