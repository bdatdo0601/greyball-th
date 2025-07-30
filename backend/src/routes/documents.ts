import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import SearchController from "../controllers/searchController.js";
import FlexSearchService from "../services/flexsearch.js";
import {
  type CreateDocumentRequest,
  type Document,
  DocumentVersion,
  type PatchRequest,
  type UpdateDocumentRequest,
} from "../types";
import {
  applyDeltaChanges,
  optimizeChanges,
  validateDeltaChanges,
} from "../utils/textUtils";

// JSON Schema definitions
const documentSchema = {
  type: "object",
  required: ["title", "content"],
  properties: {
    title: { type: "string", maxLength: 500 },
    content: { type: "string" },
    metadata: { type: "object" },
  },
};

const patchDeltaSchema = {
  body: {
    type: "object",
    required: ["changes"],
    properties: {
      changes: {
        type: "array",
        items: {
          type: "object",
          required: ["type", "field"],
          properties: {
            type: { type: "string", enum: ["insert", "delete", "replace"] },
            position: { type: "number", minimum: 0 },
            length: { type: "number", minimum: 0 },
            text: { type: "string" },
            field: { type: "string", enum: ["title", "content"] },
          },
        },
      },
      metadata: {
        type: "object",
        properties: {
          changeDescription: { type: "string" },
          editorVersion: { type: "string" },
          timestamp: { type: "string" },
        },
      },
    },
  },
};

export async function documentRoutes(fastify: FastifyInstance) {
  // Initialize FlexSearch service with PostgreSQL config
  const flexSearchConfig = {
    user: "postgres",
    pass: "password",
    host: "localhost",
    port: "5432",
    name: "postgres",
  };

  const flexSearchService = new FlexSearchService(flexSearchConfig);
  const searchController = new SearchController(flexSearchService);

  // Initialize FlexSearch on startup
  await flexSearchService.initialize();

  // Index existing documents on startup
  try {
    const client = await fastify.pg.connect();
    try {
      const result = await client.query(
        "SELECT id, title, content, metadata, created_at, updated_at FROM documents ORDER BY updated_at DESC",
      );

      const documents: Document[] = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        metadata: row.metadata || {},
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));

      if (documents.length > 0) {
        await flexSearchService.indexAllDocuments(documents);
        console.log(
          `Indexed ${documents.length} existing documents on startup`,
        );
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to index existing documents on startup:", error);
  }

  // GET /api/documents - List all documents
  fastify.get("/api/documents", async (request, reply) => {
    const client = await fastify.pg.connect();

    try {
      const result = await client.query(
        "SELECT id, title, content, metadata, created_at, updated_at FROM documents ORDER BY updated_at DESC",
      );

      return { documents: result.rows };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: "Failed to fetch documents" };
    } finally {
      client.release();
    }
  });

  // POST /api/documents - Create new document
  fastify.post(
    "/api/documents",
    {
      schema: { body: documentSchema },
    },
    async (request, reply) => {
      const {
        title,
        content,
        metadata = {},
      } = request.body as CreateDocumentRequest;
      const client = await fastify.pg.connect();

      try {
        const result = await client.query(
          `INSERT INTO documents (title, content, metadata)
         VALUES ($1, $2, $3)
         RETURNING *`,
          [title, content, JSON.stringify(metadata)],
        );

        const newDocument = result.rows[0];

        // Add to FlexSearch index
        try {
          await searchController.onDocumentAdded({
            id: newDocument.id,
            title: newDocument.title,
            content: newDocument.content,
            metadata: newDocument.metadata || {},
            created_at: new Date(newDocument.created_at),
            updated_at: new Date(newDocument.updated_at),
          });
        } catch (searchError) {
          fastify.log.warn(
            "Failed to add document to search index:",
            searchError,
          );
        }

        reply.code(201);
        return { document: newDocument };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: "Failed to create document" };
      } finally {
        client.release();
      }
    },
  );

  // GET /api/documents/:id - Get specific document
  fastify.get("/api/documents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();

    try {
      const result = await client.query(
        "SELECT * FROM documents WHERE id = $1",
        [id],
      );

      if (result.rows.length === 0) {
        reply.code(404);
        return { error: "Document not found" };
      }

      return { document: result.rows[0] };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: "Failed to fetch document" };
    } finally {
      client.release();
    }
  });

  // PUT /api/documents/:id - Full document replacement
  fastify.put(
    "/api/documents/:id",
    {
      schema: { body: documentSchema },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const {
        title,
        content,
        metadata = {},
      } = request.body as UpdateDocumentRequest;
      const client = await fastify.pg.connect();

      try {
        await client.query("BEGIN");

        // Get current document for versioning
        const currentDoc = await client.query(
          "SELECT * FROM documents WHERE id = $1",
          [id],
        );

        if (currentDoc.rows.length === 0) {
          reply.code(404);
          return { error: "Document not found" };
        }

        const document = currentDoc.rows[0];

        // Create version snapshot
        await client.query(
          `INSERT INTO document_versions (document_id, content, title, version_number, created_at, change_description)
         VALUES ($1, $2, $3,
                 COALESCE((SELECT MAX(version_number) FROM document_versions WHERE document_id = $1), 0) + 1,
                 NOW(), $4)`,
          [id, document.content, document.title, "Full document replacement"],
        );

        // Update document
        const updatedDoc = await client.query(
          `UPDATE documents
         SET title = $2, content = $3, metadata = $4, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
          [id, title, content, JSON.stringify(metadata)],
        );

        await client.query("COMMIT");

        const updatedDocument = updatedDoc.rows[0];

        // Update FlexSearch index
        try {
          await searchController.onDocumentUpdated({
            id: updatedDocument.id,
            title: updatedDocument.title,
            content: updatedDocument.content,
            metadata: updatedDocument.metadata || {},
            created_at: new Date(updatedDocument.created_at),
            updated_at: new Date(updatedDocument.updated_at),
          });
        } catch (searchError) {
          fastify.log.warn(
            "Failed to update document in search index:",
            searchError,
          );
        }

        return { document: updatedDocument };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error(error);
        reply.code(500);
        return { error: "Failed to update document" };
      } finally {
        client.release();
      }
    },
  );

  // PATCH /api/documents/:id - Apply delta changes
  fastify.patch(
    "/api/documents/:id",
    {
      schema: patchDeltaSchema,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { changes, metadata } = request.body as PatchRequest;
      const client = await fastify.pg.connect();

      try {
        await client.query("BEGIN");

        // Get current document
        const currentDoc = await client.query(
          "SELECT * FROM documents WHERE id = $1",
          [id],
        );

        if (currentDoc.rows.length === 0) {
          reply.code(404);
          return { error: "Document not found" };
        }

        const document = currentDoc.rows[0];
        let { title, content } = document;

        // Validate changes
        const titleChanges = changes.filter((c) => c.field === "title");
        const contentChanges = changes.filter((c) => c.field === "content");

        const titleValidation = validateDeltaChanges(title, titleChanges);
        const contentValidation = validateDeltaChanges(content, contentChanges);

        if (!titleValidation.valid || !contentValidation.valid) {
          reply.code(400);
          return {
            error: "Invalid changes",
            details: [...titleValidation.errors, ...contentValidation.errors],
          };
        }

        // Create version snapshot before changes
        await client.query(
          `INSERT INTO document_versions (document_id, content, title, version_number, created_at, change_description)
         VALUES ($1, $2, $3,
                 COALESCE((SELECT MAX(version_number) FROM document_versions WHERE document_id = $1), 0) + 1,
                 NOW(), $4)`,
          [
            id,
            content,
            title,
            metadata?.changeDescription || "Delta patch update",
          ],
        );

        // Apply optimized changes
        const optimizedChanges = optimizeChanges(changes);

        // Apply changes by field
        if (titleChanges.length > 0) {
          title = applyDeltaChanges(title, titleChanges);
        }

        if (contentChanges.length > 0) {
          // For content changes, we'll apply them directly to the stored HTML
          // The frontend is responsible for ensuring the position calculations match the HTML structure
          content = applyDeltaChanges(content, contentChanges);
        }

        // Update document
        const updatedDoc = await client.query(
          `UPDATE documents
         SET title = $2, content = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
          [id, title, content],
        );

        await client.query("COMMIT");

        const updatedDocument = updatedDoc.rows[0];

        // Update FlexSearch index
        try {
          await searchController.onDocumentUpdated({
            id: updatedDocument.id,
            title: updatedDocument.title,
            content: updatedDocument.content,
            metadata: updatedDocument.metadata || {},
            created_at: new Date(updatedDocument.created_at),
            updated_at: new Date(updatedDocument.updated_at),
          });
        } catch (searchError) {
          fastify.log.warn(
            "Failed to update document in search index:",
            searchError,
          );
        }

        return {
          document: updatedDocument,
          appliedChanges: optimizedChanges,
          changeCount: changes.length,
          optimizedChangeCount: optimizedChanges.length,
          metadata: metadata,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error(error);
        reply.code(500);
        return {
          error: "Failed to apply patch",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        client.release();
      }
    },
  );

  // GET /api/documents/:id/versions - Get document versions
  fastify.get("/api/documents/:id/versions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();

    try {
      const result = await client.query(
        `SELECT id, document_id, content, title, version_number, created_at, change_description
         FROM document_versions
         WHERE document_id = $1
         ORDER BY version_number DESC`,
        [id],
      );

      return { versions: result.rows };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: "Failed to fetch document versions" };
    } finally {
      client.release();
    }
  });

  // GET /api/search - Search documents using FlexSearch
  fastify.get("/api/search", async (request, reply) => {
    return searchController.search(request, reply);
  });

  // GET /api/search/suggest - Get search suggestions
  fastify.get("/api/search/suggest", async (request, reply) => {
    return searchController.suggest(request, reply);
  });

  // POST /api/search/reindex - Rebuild search index
  fastify.post("/api/search/reindex", async (request, reply) => {
    return searchController.reindex(request, reply);
  });

  // GET /api/search/stats - Get search engine statistics
  fastify.get("/api/search/stats", async (request, reply) => {
    return searchController.stats(request, reply);
  });

  // DELETE /api/documents/:id - Delete document
  fastify.delete("/api/documents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();

    try {
      const result = await client.query(
        "DELETE FROM documents WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rowCount === 0) {
        reply.code(404);
        return { error: "Document not found" };
      }

      // Remove from FlexSearch index
      await searchController.onDocumentDeleted(id);

      return { message: "Document deleted successfully" };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { error: "Failed to delete document" };
    } finally {
      client.release();
    }
  });
}
