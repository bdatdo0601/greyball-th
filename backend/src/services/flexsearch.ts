import { Document as FlexDocument } from "flexsearch";
import type { Document } from "../types/index.js";

interface FlexSearchConfig {
  user: string;
  pass: string;
  host: string;
  port: string;
  name: string;
}

export class FlexSearchService {
  private documentIndex: FlexDocument<any>;
  private isInitialized: boolean = false;

  constructor(private config: FlexSearchConfig) {
    // Create FlexSearch document index with optimized settings
    this.documentIndex = new FlexDocument({
      document: {
        id: "id",
        index: ["title", "content", "metadata", "created_at", "updated_at"],
        store: [
          "id",
          "title",
          "content",
          "metadata",
          "created_at",
          "updated_at",
        ],
      },
    });
  }

  async initialize(): Promise<void> {
    console.log("here");
    if (this.isInitialized) return;

    try {
      // Try to mount the PostgreSQL adapter to the index
      try {
        console.log("FlexSearch service initialized");
      } catch (dbError) {
        console.warn(
          "Failed to connect to PostgreSQL for FlexSearch, using in-memory storage:",
          dbError,
        );
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize FlexSearch service:", error);
      throw error;
    }
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      // Prepare document for indexing
      const indexDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        metadata: JSON.stringify(document.metadata || {}),
        created_at: document.created_at.toISOString(),
        updated_at: document.updated_at.toISOString(),
      };

      this.documentIndex.add(indexDocument);
      try {
        await this.documentIndex.commit();
      } catch (commitError) {
        // Commit may not be available if not using persistent storage
      }
    } catch (error) {
      console.error("Failed to add document to FlexSearch:", error);
      throw error;
    }
  }

  async updateDocument(document: Document): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Prepare document for indexing
      const indexDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        metadata: JSON.stringify(document.metadata || {}),
        created_at: document.created_at.toISOString(),
        updated_at: document.updated_at.toISOString(),
      };

      this.documentIndex.update(document.id, indexDocument);
      try {
        await this.documentIndex.commit();
      } catch (commitError) {
        // Commit may not be available if not using persistent storage
      }
    } catch (error) {
      console.error("Failed to update document in FlexSearch:", error);
      throw error;
    }
  }

  async removeDocument(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.documentIndex.remove(id);
      try {
        await this.documentIndex.commit();
      } catch (commitError) {
        // Commit may not be available if not using persistent storage
      }
    } catch (error) {
      console.error("Failed to remove document from FlexSearch:", error);
      throw error;
    }
  }

  async search(
    query: string,
    options: {
      limit?: number;
      field?: string[];
      suggest?: boolean;
    } = {},
  ): Promise<Document[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { limit = 10, field, suggest = false } = options;

      const searchOptions: any = {
        limit,
        suggest,
        enrich: true, // Get stored documents back
      };

      if (field) {
        searchOptions.field = field;
      }

      const results = this.documentIndex.search(query, searchOptions); // Transform results back to Document format
      const documents: Document[] = [];
      // FlexSearch v0.8 returns results in format: [{ field: 'title', result: [...] }, { field: 'content', result: [...] }]
      if (Array.isArray(results)) {
        const seenIds = new Set<string>();

        for (const fieldResult of results) {
          if (
            fieldResult &&
            fieldResult.result &&
            Array.isArray(fieldResult.result)
          ) {
            for (const docResult of fieldResult.result) {
              console.log(docResult);
              if (
                docResult &&
                typeof docResult === "object" &&
                (docResult as any).id &&
                !seenIds.has((docResult as any).id)
              ) {
                seenIds.add((docResult as any).id);
                documents.push({
                  id: (docResult as any).doc.id,
                  title: (docResult as any).doc.title || "",
                  content: (docResult as any).doc.content || "",
                  metadata: (docResult as any).doc.metadata
                    ? JSON.parse((docResult as any).doc.metadata)
                    : {},
                  created_at: new Date((docResult as any).doc.created_at),
                  updated_at: new Date((docResult as any).doc.updated_at),
                });
              }
            }
          }
        }
      }

      return documents.slice(0, limit);
    } catch (error) {
      console.error("Failed to search documents:", error);
      throw error;
    }
  }

  async suggest(query: string, limit: number = 5): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // FlexSearch suggestion functionality
      const suggestions = this.documentIndex.search(query, {
        limit,
        suggest: true,
        enrich: true,
      });

      // Extract suggestion strings from v0.8 format
      const suggestionStrings: string[] = [];

      if (Array.isArray(suggestions)) {
        for (const fieldResult of suggestions) {
          if (
            fieldResult &&
            fieldResult.result &&
            Array.isArray(fieldResult.result)
          ) {
            for (const item of fieldResult.result) {
              if (typeof item === "string") {
                suggestionStrings.push(item);
              } else if (item && (item as any).title) {
                suggestionStrings.push((item as any).title);
              }
            }
          }
        }
      }

      return suggestionStrings.slice(0, limit);
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      return [];
    }
  }

  async indexAllDocuments(documents: Document[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`Indexing ${documents.length} documents...`);

      for (const document of documents) {
        const indexDocument = {
          id: document.id,
          title: document.title,
          content: document.content,
          metadata: JSON.stringify(document.metadata || {}),
          created_at: document.created_at.toISOString(),
          updated_at: document.updated_at.toISOString(),
        };
        this.documentIndex.add(indexDocument);
      }

      try {
        await this.documentIndex.commit();
      } catch (commitError) {
        // Commit may not be available if not using persistent storage
      }
      console.log(`Successfully indexed ${documents.length} documents`);
    } catch (error) {
      console.error("Failed to index all documents:", error);
      throw error;
    }
  }

  async clearIndex(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.documentIndex.clear();
      try {
        await this.documentIndex.commit();
      } catch (commitError) {
        // Commit may not be available if not using persistent storage
      }
      console.log("FlexSearch index cleared");
    } catch (error) {
      console.error("Failed to clear FlexSearch index:", error);
      throw error;
    }
  }

  async getStats(): Promise<{ totalDocuments: number; indexSize: string }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // For FlexSearch v0.8, we'll estimate stats since info() method might not be available
      // Try a broad search to get approximate document count
      const allResults = this.documentIndex.search("", {
        limit: 1000,
        enrich: false,
      });

      let totalDocs = 0;
      if (Array.isArray(allResults)) {
        const seenIds = new Set();
        for (const fieldResult of allResults) {
          if (
            fieldResult &&
            fieldResult.result &&
            Array.isArray(fieldResult.result)
          ) {
            for (const id of fieldResult.result) {
              if (typeof id === "string" && !seenIds.has(id)) {
                seenIds.add(id);
                totalDocs++;
              }
            }
          }
        }
      }

      return {
        totalDocuments: totalDocs,
        indexSize: `${Math.round(totalDocs * 0.5)} KB`, // Rough estimate
      };
    } catch (error) {
      console.error("Failed to get FlexSearch stats:", error);
      return {
        totalDocuments: 0,
        indexSize: "0 KB",
      };
    }
  }
}

export default FlexSearchService;
