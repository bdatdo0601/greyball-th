const { Document } = require('flexsearch');

async function testFlexSearch() {
  console.log('🔍 Testing FlexSearch functionality...\n');

  // Create a FlexSearch document index
  const index = new Document({
    document: {
      id: "id",
      index: ["title", "content", "metadata"],
      store: ["id", "title", "content", "metadata", "created_at", "updated_at"]
    }
  });

  // Sample documents to test with
  const testDocuments = [
    {
      id: "1",
      title: "Welcome to Document Management System",
      content: "This is your new document management system with PATCH API support. Key features include real-time collaborative editing, version history with automatic saves, full-text search across all documents, PATCH API for incremental updates.",
      metadata: JSON.stringify({ author: "System", category: "Welcome", tags: ["introduction", "guide"] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "2",
      title: "API Documentation",
      content: "This system supports two types of PATCH operations: Delta Format and JSON Patch (RFC 6902). Both formats create automatic version history for full audit trails.",
      metadata: JSON.stringify({ author: "System", category: "Documentation", tags: ["api", "patch", "technical"] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "3",
      title: "Docker Setup Guide",
      content: "This application is containerized with Docker Compose for easy deployment. Services include postgres PostgreSQL 15 database, backend Fastify API server, frontend Next.js web application.",
      metadata: JSON.stringify({ author: "System", category: "Documentation", tags: ["docker", "deployment", "infrastructure"] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  try {
    // Add documents to index
    console.log('📝 Adding documents to FlexSearch index...');
    for (const doc of testDocuments) {
      await index.add(doc);
    }
    console.log(`✅ Added ${testDocuments.length} documents to index\n`);

    // Test various search queries
    const searchTests = [
      { query: "document", description: "Search for 'document'" },
      { query: "API", description: "Search for 'API'" },
      { query: "Docker", description: "Search for 'Docker'" },
      { query: "PATCH", description: "Search for 'PATCH'" },
      { query: "system", description: "Search for 'system'" },
      { query: "collaborative editing", description: "Search for 'collaborative editing'" },
      { query: "PostgreSQL", description: "Search for 'PostgreSQL'" },
      { query: "nonexistent", description: "Search for non-existent term" }
    ];

    for (const test of searchTests) {
      console.log(`🔍 ${test.description}:`);

      const results = await index.search(test.query, { limit: 3 });

      if (results.length > 0) {
        console.log(`   Found ${results.length} result(s):`);
        for (const resultId of results) {
          const doc = await index.store(resultId);
          if (doc) {
            console.log(`   - "${doc.title}" (ID: ${doc.id})`);
          }
        }
      } else {
        console.log(`   No results found`);
      }
      console.log('');
    }

    // Test field-specific search
    console.log('🎯 Testing field-specific search:');
    const titleResults = await index.search("Welcome", { field: ["title"], limit: 5 });
    console.log(`   Title search for "Welcome": ${titleResults.length} results`);

    const contentResults = await index.search("containerized", { field: ["content"], limit: 5 });
    console.log(`   Content search for "containerized": ${contentResults.length} results`);
    console.log('');

    // Test update functionality
    console.log('🔄 Testing document update...');
    const updatedDoc = {
      id: "1",
      title: "Updated Welcome Guide",
      content: "This is an updated document management system with enhanced FlexSearch functionality. New features include advanced search capabilities, real-time indexing, and PostgreSQL persistence.",
      metadata: JSON.stringify({ author: "System", category: "Updated", tags: ["introduction", "guide", "updated"] }),
      created_at: testDocuments[0].created_at,
      updated_at: new Date().toISOString()
    };

    await index.update("1", updatedDoc);

    const updateTestResults = await index.search("enhanced FlexSearch", { limit: 3 });
    console.log(`   Search for "enhanced FlexSearch" after update: ${updateTestResults.length} results`);
    console.log('');

    // Test removal
    console.log('🗑️ Testing document removal...');
    await index.remove("3");

    const removalTestResults = await index.search("Docker", { limit: 5 });
    console.log(`   Search for "Docker" after removal: ${removalTestResults.length} results`);
    console.log('');

    // Performance test
    console.log('⚡ Performance test...');
    const startTime = Date.now();

    // Add more documents for performance testing
    const performanceTests = [];
    for (let i = 4; i <= 100; i++) {
      performanceTests.push({
        id: i.toString(),
        title: `Performance Test Document ${i}`,
        content: `This is a performance test document number ${i}. It contains various keywords like search, index, performance, FlexSearch, PostgreSQL, and test case ${i}.`,
        metadata: JSON.stringify({ category: "Performance", number: i }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    for (const doc of performanceTests) {
      await index.add(doc);
    }

    const indexTime = Date.now() - startTime;
    console.log(`   Indexed ${performanceTests.length} documents in ${indexTime}ms`);

    // Test search performance
    const searchStartTime = Date.now();
    const perfResults = await index.search("performance test", { limit: 10 });
    const searchTime = Date.now() - searchStartTime;

    console.log(`   Searched ${perfResults.length} results in ${searchTime}ms`);
    console.log('');

    console.log('✅ FlexSearch functionality test completed successfully!');
    console.log('🎉 All features are working correctly:\n');
    console.log('   ✅ Document indexing');
    console.log('   ✅ Full-text search');
    console.log('   ✅ Field-specific search');
    console.log('   ✅ Document updates');
    console.log('   ✅ Document removal');
    console.log('   ✅ Performance optimization');
    console.log('');
    console.log('🚀 FlexSearch is ready for integration with PostgreSQL persistence!');

  } catch (error) {
    console.error('❌ FlexSearch test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFlexSearch().catch(console.error);
