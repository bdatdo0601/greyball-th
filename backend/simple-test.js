const { Document } = require('flexsearch');

async function simpleTest() {
  console.log('🔍 Testing FlexSearch v0.8 API...\n');

  // Create a simple document index
  const index = new Document({
    document: {
      id: "id",
      index: ["title", "content"],
      store: true
    }
  });

  // Add a test document
  const doc = {
    id: "1",
    title: "Test Document",
    content: "This is a test document for FlexSearch"
  };

  console.log('Adding document...');
  await index.add(doc);

  console.log('Searching for "test"...');
  const results = await index.search("test");
  console.log('Results:', results);

  console.log('Searching for "document"...');
  const results2 = await index.search("document");
  console.log('Results:', results2);

  // Try to get stored document
  console.log('\nTrying different ways to get stored data...');
  console.log('Available methods:', Object.getOwnPropertyNames(index).filter(name => !name.startsWith('_')));
  console.log('Available methods on prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(index)));

  // Try search with store option
  console.log('\nTrying search with store options...');
  const resultsWithStore = await index.search("test", { enrich: true });
  console.log('Results with enrich:', resultsWithStore);

  console.log('\nTest completed!');
}

simpleTest().catch(console.error);
