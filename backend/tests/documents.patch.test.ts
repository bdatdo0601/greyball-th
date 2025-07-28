import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build } from '../src/server';
import { migrate } from '../migrations/migrate';

describe('PATCH /api/documents/:id', () => {
  let app: any;
  let documentId: string;

  beforeEach(async () => {
    // Set test database environment
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/document_management_test';
    
    app = build({ logger: false });
    await app.ready();
    
    // Run migrations
    await migrate();
    
    // Create test document
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: {
        title: 'Test Document',
        content: 'Original content for testing patch operations.'
      }
    });
    
    expect(createResponse.statusCode).toBe(201);
    const created = JSON.parse(createResponse.payload);
    documentId = created.document.id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Delta patch format', () => {
    it('should apply single text insertion', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: 8,
            text: ' Modified',
            field: 'content'
          }],
          metadata: {
            changeDescription: 'Added modification text'
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.content).toBe('Original Modified content for testing patch operations.');
      expect(result.appliedChanges).toHaveLength(1);
      expect(result.changeCount).toBe(1);
    });

    it('should apply text deletion', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'delete',
            position: 0,
            length: 9, // Delete "Original "
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.content).toBe('content for testing patch operations.');
    });

    it('should apply text replacement', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'replace',
            position: 0,
            length: 8, // Replace "Original"
            text: 'Updated',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.content).toBe('Updated content for testing patch operations.');
    });

    it('should apply multiple changes in sequence', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [
            {
              type: 'replace',
              position: 0,
              length: 8,
              text: 'Updated',
              field: 'content'
            },
            {
              type: 'insert',
              position: 7, // After "Updated"
              text: ' and extended',
              field: 'content'
            }
          ]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.appliedChanges).toHaveLength(2);
      expect(result.document.content).toBe('Updated and extended content for testing patch operations.');
    });

    it('should modify title field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: 4,
            text: ' Modified',
            field: 'title'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.title).toBe('Test Modified Document');
    });

    it('should create version before applying patch', async () => {
      await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'replace',
            position: 0,
            length: 46,
            text: 'Completely new content',
            field: 'content'
          }]
        }
      });

      const versionsResponse = await app.inject({
        method: 'GET',
        url: `/api/documents/${documentId}/versions`
      });

      expect(versionsResponse.statusCode).toBe(200);
      const versions = JSON.parse(versionsResponse.payload);
      expect(versions.versions).toHaveLength(1);
      expect(versions.versions[0].content).toBe('Original content for testing patch operations.');
      expect(versions.versions[0].title).toBe('Test Document');
    });

    it('should validate change parameters', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: -1, // Invalid negative position
            text: 'test',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid changes');
      expect(result.details).toContain('Change 0: position cannot be negative');
    });

    it('should handle position beyond text length for insert operations (FIXED)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: 1000, // Way beyond current text length
            text: ' Appended at end',
            field: 'content'
          }],
          metadata: {
            changeDescription: 'Test append beyond text length'
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      // Text should be appended at the end of existing content
      expect(result.document.content).toBe('Original content for testing patch operations. Appended at end');
    });

    it('should handle delete operation that exceeds text length gracefully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'delete',
            position: 10,
            length: 1000, // Length exceeds remaining text
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      // Should delete from position 10 to end of text
      expect(result.document.content).toBe('Original c');
    });

    it('should handle replace operation that exceeds text length', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'replace',
            position: 30,
            length: 1000, // Length exceeds remaining text
            text: ' REPLACED',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      // Should replace from position 30 to end with new text
      expect(result.document.content).toBe('Original content for testing  REPLACED');
    });

    it('should handle appending content to empty field', async () => {
      // First, create a document with minimal content
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/documents',
        payload: {
          title: 'Empty Test',
          content: ''
        }
      });

      const emptyDocId = JSON.parse(createResponse.payload).document.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${emptyDocId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: 0,
            text: 'First content',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.content).toBe('First content');
    });

    it('should reject delete/replace operations with position beyond text length', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'delete',
            position: 1000, // Beyond text length
            length: 5,
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid changes');
      expect(result.details).toContain('position 1000 exceeds text length 46 for delete operation');
    });

    it('should handle inserting content at exact text length boundary', async () => {
      // Get current content length - should be 46 characters
      const exactLength = 'Original content for testing patch operations.'.length;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: exactLength, // Exactly at the end
            text: ' Exactly at end.',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.document.content).toBe('Original content for testing patch operations. Exactly at end.');
    });

    it('should handle multiple boundary operations', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [
            {
              type: 'insert',
              position: 0,
              text: 'PREFIX: ',
              field: 'content'
            },
            {
              type: 'insert', 
              position: 1000, // Beyond text length - should append at end
              text: ' SUFFIX',
              field: 'content'
            }
          ]
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      // Should have both prefix and suffix applied correctly
      expect(result.document.content).toContain('PREFIX: ');
      expect(result.document.content).toContain(' SUFFIX');
    });

    it('should handle position beyond text length', async () => {
      // This test should now PASS instead of failing
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/documents/${documentId}`,
        payload: {
          changes: [{
            type: 'insert',
            position: 1000, // Beyond text length - should be allowed for inserts
            text: ' appended',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(200); // Should succeed now
      const result = JSON.parse(response.payload);
      expect(result.document.content).toContain(' appended');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/documents/non-existent-id',
        payload: {
          changes: [{
            type: 'insert',
            position: 0,
            text: 'test',
            field: 'content'
          }]
        }
      });

      expect(response.statusCode).toBe(404);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Document not found');
    });
  });
});

describe('Document API Integration', () => {
  let app: any;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/document_management_test';
    app = build({ logger: false });
    await app.ready();
    await migrate();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create, patch, and retrieve document with versions', async () => {
    // Create document
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: {
        title: 'Integration Test Doc',
        content: 'Initial content'
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const { document } = JSON.parse(createResponse.payload);

    // Apply first patch
    const patch1Response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${document.id}`,
      payload: {
        changes: [{
          type: 'insert',
          position: 15,
          text: ' - updated',
          field: 'content'
        }],
        metadata: {
          changeDescription: 'First update'
        }
      }
    });

    expect(patch1Response.statusCode).toBe(200);

    // Apply second patch
    const patch2Response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${document.id}`,
      payload: {
        changes: [{
          type: 'insert',
          position: 0,
          text: 'Modified: ',
          field: 'title'
        }],
        metadata: {
          changeDescription: 'Second update'
        }
      }
    });

    expect(patch2Response.statusCode).toBe(200);

    // Get final document
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/documents/${document.id}`
    });

    expect(getResponse.statusCode).toBe(200);
    const finalDoc = JSON.parse(getResponse.payload);
    expect(finalDoc.document.title).toBe('Modified: Integration Test Doc');
    expect(finalDoc.document.content).toBe('Initial content - updated');

    // Check versions
    const versionsResponse = await app.inject({
      method: 'GET',
      url: `/api/documents/${document.id}/versions`
    });

    expect(versionsResponse.statusCode).toBe(200);
    const versions = JSON.parse(versionsResponse.payload);
    expect(versions.versions).toHaveLength(2);
    expect(versions.versions[0].change_description).toBe('Second update');
    expect(versions.versions[1].change_description).toBe('First update');
  });
});
