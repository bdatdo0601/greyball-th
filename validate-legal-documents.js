#!/usr/bin/env node

/**
 * Validate Legal Documents Script
 * 
 * Validates the structure and content of the legal document templates
 * without actually ingesting them into the API.
 */

const { legalDocuments } = require('./ingest-legal-documents.js');

function validateDocument(doc, index) {
  const errors = [];
  const warnings = [];
  
  // Required fields validation
  if (!doc.title || doc.title.length < 10) {
    errors.push('Title is missing or too short');
  }
  
  if (!doc.content || doc.content.length < 500) {
    errors.push('Content is missing or too short');
  }
  
  if (!doc.metadata || typeof doc.metadata !== 'object') {
    errors.push('Metadata is missing or invalid');
  }
  
  // Metadata validation
  if (doc.metadata) {
    const required = ['documentType', 'category', 'jurisdiction', 'author'];
    required.forEach(field => {
      if (!doc.metadata[field]) {
        errors.push(`Metadata missing required field: ${field}`);
      }
    });
    
    // Content quality checks
    if (doc.content) {
      const wordCount = doc.content.split(/\s+/).length;
      if (wordCount < 100) {
        errors.push('Content has insufficient word count');
      }
      
      // Check for markdown formatting
      if (!doc.content.includes('#') || !doc.content.includes('**')) {
        warnings.push('Content may lack proper markdown formatting');
      }
      
      // Check for legal-specific terms
      const legalTerms = ['agreement', 'party', 'shall', 'hereby', 'whereas', 'liability'];
      const hasLegalTerms = legalTerms.some(term => 
        doc.content.toLowerCase().includes(term.toLowerCase())
      );
      
      if (!hasLegalTerms) {
        warnings.push('Content may not contain sufficient legal terminology');
      }
    }
  }
  
  return { errors, warnings };
}

function validateAllDocuments() {
  console.log('🔍 Validating Legal Document Templates...\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  legalDocuments.forEach((doc, index) => {
    console.log(`📄 [${index + 1}/5] Validating: "${doc.title}"`);
    
    const { errors, warnings } = validateDocument(doc, index);
    
    console.log(`   📊 Content: ${doc.content.length.toLocaleString()} chars, ${doc.content.split(/\s+/).length} words`);
    console.log(`   📋 Type: ${doc.metadata?.documentType || 'MISSING'}`);
    console.log(`   🏛️  Jurisdiction: ${doc.metadata?.jurisdiction || 'MISSING'}`);
    console.log(`   🏷️  Tags: ${doc.metadata?.tags?.length || 0} tags`);
    
    if (errors.length > 0) {
      console.log(`   ❌ Errors (${errors.length}):`);
      errors.forEach(error => console.log(`      • ${error}`));
      totalErrors += errors.length;
    }
    
    if (warnings.length > 0) {
      console.log(`   ⚠️  Warnings (${warnings.length}):`);
      warnings.forEach(warning => console.log(`      • ${warning}`));
      totalWarnings += warnings.length;
    }
    
    if (errors.length === 0) {
      console.log(`   ✅ Validation passed`);
    }
    
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📄 Total Documents: ${legalDocuments.length}`);
  console.log(`❌ Total Errors: ${totalErrors}`);
  console.log(`⚠️  Total Warnings: ${totalWarnings}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 All documents are valid and ready for ingestion!');
    console.log('💡 Run ./ingest-legal-documents.js to ingest them into the API');
  } else {
    console.log('\n❌ Some documents have validation errors that should be fixed');
  }
  
  return totalErrors === 0;
}

// Run validation if script is executed directly
if (require.main === module) {
  const isValid = validateAllDocuments();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateAllDocuments };
