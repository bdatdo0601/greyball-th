#!/usr/bin/env node

/**
 * Test script to verify patch operation fix
 * This script tests the HTML position mapping functionality
 */

// Simulate the backend position mapping logic
function createPositionMapping(html) {
  if (!html) {
    return {
      cleanText: '',
      mapping: {
        cleanToHtml: new Map(),
        htmlToClean: new Map()
      }
    };
  }

  const cleanToHtml = new Map();
  const htmlToClean = new Map();
  
  let cleanPos = 0;
  let htmlPos = 0;
  let cleanText = '';
  let inTag = false;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
      htmlPos++;
      continue;
    }
    
    if (!inTag) {
      // This character contributes to clean text
      cleanText += char;
      
      // Map clean position to HTML position
      cleanToHtml.set(cleanPos, htmlPos);
      htmlToClean.set(htmlPos, cleanPos);
      
      cleanPos++;
    }
    
    htmlPos++;
  }
  
  // Add mapping for the end positions
  cleanToHtml.set(cleanPos, htmlPos);
  htmlToClean.set(htmlPos, cleanPos);
  
  return {
    cleanText,
    mapping: { cleanToHtml, htmlToClean }
  };
}

function cleanToHtmlPosition(cleanPos, mapping, htmlLength) {
  // Direct mapping exists
  if (mapping.cleanToHtml.has(cleanPos)) {
    return mapping.cleanToHtml.get(cleanPos);
  }
  
  // Find the closest mapped position
  let closestCleanPos = 0;
  let closestHtmlPos = 0;
  
  for (const [clean, html] of mapping.cleanToHtml.entries()) {
    if (clean <= cleanPos && clean > closestCleanPos) {
      closestCleanPos = clean;
      closestHtmlPos = html;
    }
  }
  
  // Calculate offset and apply to HTML position
  const offset = cleanPos - closestCleanPos;
  const mappedPos = closestHtmlPos + offset;
  
  // Clamp to valid HTML range
  return Math.min(mappedPos, htmlLength);
}

function applyInsertChange(html, cleanPosition, insertText) {
  const { mapping } = createPositionMapping(html);
  const htmlPos = cleanToHtmlPosition(cleanPosition, mapping, html.length);
  
  console.log(`Insert mapping: clean pos ${cleanPosition} -> html pos ${htmlPos}`);
  
  const insertPos = Math.min(htmlPos, html.length);
  return html.slice(0, insertPos) + insertText + html.slice(insertPos);
}

// Test cases
console.log('=== HTML Position Mapping Test ===\n');

// Test 1: Simple HTML with paragraph
const html1 = '<p>Hello world</p>';
const { cleanText: clean1, mapping: mapping1 } = createPositionMapping(html1);

console.log('Test 1: Simple paragraph');
console.log('HTML:', html1);
console.log('Clean text:', clean1);
console.log('Clean length:', clean1.length);
console.log('HTML length:', html1.length);

// Show some position mappings
console.log('Position mappings:');
for (let i = 0; i <= clean1.length; i++) {
  const htmlPos = cleanToHtmlPosition(i, mapping1, html1.length);
  console.log(`  clean ${i} -> html ${htmlPos} (char: "${clean1[i] || 'END'}")`);
}

console.log('\nTest: Insert " there" at clean position 5 (after "Hello")');
const result1 = applyInsertChange(html1, 5, ' there');
console.log('Result:', result1);
console.log('Expected: <p>Hello there world</p>');
console.log('Correct:', result1 === '<p>Hello there world</p>');

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: More complex HTML
const html2 = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
const { cleanText: clean2, mapping: mapping2 } = createPositionMapping(html2);

console.log('Test 2: Complex HTML with formatting');
console.log('HTML:', html2);
console.log('Clean text:', clean2);
console.log('Clean length:', clean2.length);

console.log('\nTest: Insert " very" at clean position 4 (after "Bold")');
const result2 = applyInsertChange(html2, 4, ' very');
console.log('Result:', result2);
console.log('Expected: <p><strong>Bold very</strong> and <em>italic</em> text</p>');

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Edge case - insert at beginning
console.log('Test 3: Insert at beginning');
const result3 = applyInsertChange(html1, 0, 'Hi! ');
console.log('Result:', result3);
console.log('Expected: <p>Hi! Hello world</p>');
console.log('Correct:', result3 === '<p>Hi! Hello world</p>');

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Edge case - insert at end
console.log('Test 4: Insert at end');
const result4 = applyInsertChange(html1, clean1.length, '!');
console.log('Result:', result4);
console.log('Expected: <p>Hello world!</p>');
console.log('Correct:', result4 === '<p>Hello world!</p>');

console.log('\n=== Test Summary ===');
const tests = [
  result1 === '<p>Hello there world</p>',
  result3 === '<p>Hi! Hello world</p>',
  result4 === '<p>Hello world!</p>'
];

const passed = tests.filter(Boolean).length;
console.log(`Passed: ${passed}/${tests.length} tests`);

if (passed === tests.length) {
  console.log('✅ All tests passed! HTML position mapping is working correctly.');
} else {
  console.log('❌ Some tests failed. Check the implementation.');
}
