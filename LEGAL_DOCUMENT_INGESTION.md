# Legal Document Ingestion Script

This script ingests 5 comprehensive legal document templates into the Document Management API for demonstration and testing purposes.

## Overview

The script creates realistic legal documents with proper markdown formatting, comprehensive content, and detailed metadata. These documents serve as placeholder content for testing and demonstrating the document management system's capabilities.

## Document Types Included

1. **Software License Agreement** - ProLegal Suite v2.1
   - Type: `software_license`
   - Category: `intellectual_property`
   - Jurisdiction: Delaware
   - ~3,800 characters

2. **Employment Agreement** - Senior Software Engineer
   - Type: `employment_agreement`
   - Category: `employment_law`
   - Jurisdiction: California
   - ~6,200 characters

3. **Service Agreement** - Cloud Infrastructure Management
   - Type: `service_agreement`
   - Category: `commercial_contract`
   - Jurisdiction: Washington
   - ~8,500 characters

4. **Privacy Policy** - Digital Marketing Platform
   - Type: `privacy_policy`
   - Category: `data_protection`
   - Jurisdiction: Texas
   - ~12,000 characters

5. **Master Services Agreement** - Enterprise Software Implementation
   - Type: `master_services_agreement`
   - Category: `commercial_contract`
   - Jurisdiction: New York
   - ~15,500 characters

## Prerequisites

1. **Backend API Running**: Ensure the backend server is running on port 3001
   ```bash
   cd backend
   npm run dev
   ```

2. **Database Setup**: Ensure PostgreSQL is running and migrations have been applied
   ```bash
   cd backend
   npm run migrate
   ```

3. **Node.js**: The script requires Node.js to run (uses fetch API)

## Usage

### Method 1: Direct Execution

```bash
# Make the script executable (if not already)
chmod +x ingest-legal-documents.js

# Run the script
./ingest-legal-documents.js
```

### Method 2: Using Node

```bash
node ingest-legal-documents.js
```

### Method 3: Custom API URL

If your API is running on a different port or host:

```bash
API_BASE_URL=http://localhost:8080 node ingest-legal-documents.js
```

## Expected Output

```
🚀 Starting Legal Document Ingestion...
📡 API Endpoint: http://localhost:3001/api/documents
📝 Documents to ingest: 5 legal templates

🔍 Testing API connection...
✅ API is healthy: healthy

📄 [1/5] Creating: "Software License Agreement - ProLegal Suite v2.1"
   📋 Type: software_license
   🏛️  Category: intellectual_property
   📍 Jurisdiction: Delaware
   📊 Content Length: 3,847 characters
   ✅ Created successfully
   🆔 Document ID: 123e4567-e89b-12d3-a456-426614174000
   ⏰ Created at: 7/28/2024, 2:00:24 AM

[... similar output for other documents ...]

============================================================
📊 INGESTION SUMMARY
============================================================
✅ Successful: 5/5
❌ Failed: 0/5

✅ Successfully created documents:
   1. Software License Agreement - ProLegal Suite v2.1
      ID: 123e4567-e89b-12d3-a456-426614174000
   2. Employment Agreement - Senior Software Engineer
      ID: 123e4567-e89b-12d3-a456-426614174001
   [...]

🎉 Ingestion process completed!
💡 You can now view these documents in your application at: http://localhost:3000
```

## Document Structure

Each document includes:

### Content
- **Professionally formatted markdown** with proper legal structure
- **Realistic legal language** and clauses
- **Comprehensive sections** covering typical legal topics
- **Proper formatting** with headers, lists, and emphasis

### Metadata
- `documentType`: Category of legal document
- `category`: Broader classification
- `jurisdiction`: Applicable legal jurisdiction
- `effectiveDate`: When the document becomes effective
- `lastReviewed`: Date of last review
- `author`: Document author/creator
- `tags`: Array of relevant keywords
- `confidentiality`: Public or confidential designation
- `language`: Document language code

### Example Metadata
```json
{
  "documentType": "software_license",
  "category": "intellectual_property",
  "jurisdiction": "Delaware",
  "version": "2.1",
  "effectiveDate": "2024-01-15",
  "lastReviewed": "2024-07-15",
  "author": "Sarah Mitchell, CLO",
  "tags": ["software", "license", "intellectual-property", "commercial"],
  "confidentiality": "public",
  "language": "en-US"
}
```

## Error Handling

The script includes comprehensive error handling:

- **Connection Testing**: Verifies API connectivity before attempting ingestion
- **Individual Document Errors**: Each document creation is wrapped in try/catch
- **Detailed Error Messages**: Specific error information for debugging
- **Partial Success Handling**: Continues processing even if some documents fail
- **Exit Codes**: Returns appropriate exit codes for scripting integration

## API Integration

The script uses the Document Management API:

- **Endpoint**: `POST /api/documents`
- **Headers**: `Content-Type: application/json`
- **Payload**: `{ title, content, metadata }`
- **Response**: Document object with generated ID and timestamps

## Features

- **Health Check**: Tests API connectivity before starting
- **Progress Indicators**: Shows detailed progress for each document
- **Rich Metadata**: Comprehensive document classification and tagging
- **Professional Content**: Realistic legal documents for testing
- **Error Resilience**: Continues processing even if individual documents fail
- **Detailed Reporting**: Comprehensive summary of ingestion results

## Testing and Development

The ingested documents are perfect for testing:

- **Search Functionality**: Rich content with varied legal terminology
- **Filtering and Categories**: Multiple document types and jurisdictions
- **Large Content**: Various document sizes for performance testing
- **Metadata Queries**: Complex metadata for advanced filtering
- **Change Tracking**: Professional content for testing edit capabilities

## Cleanup

To remove the ingested documents, you can use the API or application interface to delete them individually, or truncate the documents table in the database for a complete reset.

## Module Usage

The script can also be imported as a Node.js module:

```javascript
const { ingestDocuments, legalDocuments } = require('./ingest-legal-documents.js');

// Use programmatically
const results = await ingestDocuments();
console.log('Ingestion results:', results);

// Access document templates
console.log('Available templates:', legalDocuments.length);
```

This makes it easy to integrate document ingestion into automated testing suites or deployment processes.
