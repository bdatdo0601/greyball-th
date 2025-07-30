import type { FastifyReply, FastifyRequest } from "fastify";
import type FlexSearchService from "../services/flexsearch.js";
import type { Document } from "../types/index.js";

interface SearchQuery {
  q?: string;
  limit?: string;
  field?: string;
  suggest?: string;
}

interface SuggestQuery {
  q?: string;
  limit?: string;
}

export class SearchController {
  private flexSearchService: FlexSearchService;

  constructor(flexSearchService: FlexSearchService) {
    this.flexSearchService = flexSearchService;
  }

  async search(request: FastifyRequest, reply: FastifyReply) {
    const { q, limit, field, suggest } = request.query as SearchQuery;
    console.log("Search query:", q);
    if (!q || q.trim() === "") {
      reply.code(400);
      return { error: "Search query is required" };
    }

    try {
      const searchLimit = limit ? parseInt(limit, 10) : 10;
      const searchFields = field ? field.split(",") : undefined;
      const enableSuggest = suggest === "true";
      const documents = await this.flexSearchService.search(q.trim(), {
        limit: searchLimit,
        field: searchFields,
        suggest: enableSuggest,
      });

      return {
        documents,
        query: q,
        count: documents.length,
        searchEngine: "FlexSearch with PostgreSQL",
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: "Search failed" };
    }
  }

  async suggest(request: FastifyRequest, reply: FastifyReply) {
    const { q, limit } = request.query as SuggestQuery;

    if (!q || q.trim() === "") {
      reply.code(400);
      return { error: "Query is required for suggestions" };
    }

    try {
      const suggestLimit = limit ? parseInt(limit, 10) : 5;
      const suggestions = await this.flexSearchService.suggest(
        q.trim(),
        suggestLimit,
      );

      return {
        suggestions,
        query: q,
        count: suggestions.length,
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: "Suggestion failed" };
    }
  }

  async reindex(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get all documents from database
      const client = await request.server.pg.connect();

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

        // Clear existing index and reindex all documents
        await this.flexSearchService.clearIndex();
        await this.flexSearchService.indexAllDocuments(documents);

        return {
          message: "Index rebuilt successfully",
          documentsIndexed: documents.length,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: "Reindex failed" };
    }
  }

  async stats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.flexSearchService.getStats();

      return {
        ...stats,
        searchEngine: "FlexSearch with PostgreSQL",
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: "Failed to get search stats" };
    }
  }

  // Document event handlers for real-time index updates
  async onDocumentAdded(document: Document) {
    try {
      await this.flexSearchService.addDocument(document);
    } catch (error) {
      console.error("Failed to add document to search index:", error);
    }
  }

  async onDocumentUpdated(document: Document) {
    try {
      await this.flexSearchService.updateDocument(document);
    } catch (error) {
      console.error("Failed to update document in search index:", error);
    }
  }

  async onDocumentDeleted(documentId: string) {
    try {
      await this.flexSearchService.removeDocument(documentId);
    } catch (error) {
      console.error("Failed to remove document from search index:", error);
    }
  }
}

export default SearchController;
