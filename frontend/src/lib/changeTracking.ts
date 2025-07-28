import { TrackedChange, DocumentChange } from './types';

/**
 * Position mapping utilities for frontend consistency with backend
 * This ensures the frontend's clean text extraction matches the backend's HTML position mapping
 */

/**
 * Extract clean text from HTML using the same algorithm as backend
 * This MUST match the createPositionMapping function in backend/src/utils/htmlPositionMapping.ts
 */
export function extractCleanTextConsistent(html: string): string {
  if (!html) return '';

  let cleanText = '';
  let inTag = false;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
      continue; // Don't include the '>' character
    }
    
    if (!inTag) {
      cleanText += char;
    }
  }
  
  return cleanText;
}

/**
 * Generate a unique ID for a change
 */
export function generateChangeId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply a tracked change to text and return the result
 */
export function applyTrackedChangeToText(text: string, change: TrackedChange): string {
  switch (change.type) {
    case 'insert':
      const insertPos = Math.min(change.position, text.length);
      return text.slice(0, insertPos) + (change.text || '') + text.slice(insertPos);
    
    case 'delete':
      const deleteStart = Math.min(change.position, text.length);
      const deleteLength = Math.min(change.length || 0, text.length - deleteStart);
      const deleteEnd = deleteStart + deleteLength;
      return text.slice(0, deleteStart) + text.slice(deleteEnd);
    
    case 'replace':
      const replaceStart = Math.min(change.position, text.length);
      const replaceLength = Math.min(change.length || 0, text.length - replaceStart);
      const replaceEnd = replaceStart + replaceLength;
      return text.slice(0, replaceStart) + (change.text || '') + text.slice(replaceEnd);
    
    // Format changes don't modify the text content, only the styling
    case 'format_add':
    case 'format_remove':
    case 'format_change':
      return text; // Text remains the same, only formatting changes
    
    default:
      return text;
  }
}

/**
 * Apply multiple selected changes to text
 * Updated to use consistent clean text extraction
 */
export function applySelectedChanges(
  originalContent: string, 
  changes: TrackedChange[], 
  field: 'title' | 'content'
): string {
  // For content field, extract clean text first if it contains HTML
  const isContent = field === 'content';
  const containsHtml = isContent && /<[^>]+>/.test(originalContent);
  
  let workingText = originalContent;
  if (containsHtml) {
    // Use consistent clean text extraction for position calculations
    workingText = extractCleanTextConsistent(originalContent);
  }

  const textChanges = changes
    .filter(change => 
      change.selected && 
      change.field === field && 
      ['insert', 'delete', 'replace'].includes(change.type)
    )
    .sort((a, b) => b.position - a.position); // Apply in reverse order to maintain positions

  let result = workingText;
  for (const change of textChanges) {
    result = applyTrackedChangeToText(result, change);
  }
  
  // If we were working with clean text but need to return HTML,
  // we would need to reconstruct the HTML. For now, return the clean text
  // as the backend will handle the HTML position mapping.
  
  return containsHtml ? result : result;
}

/**
 * Convert tracked changes to PatchRequest format
 */
export function convertTrackedChangesToPatchRequest(changes: TrackedChange[]): DocumentChange[] {
  return changes
    .filter(change => change.selected)
    .map(change => ({
      type: change.type,
      position: change.position,
      length: change.length,
      text: change.text,
      field: change.field,
      formatType: change.formatType,
      formatValue: change.formatValue
    }));
}

/**
 * Create a preview of text with changes applied
 */
export function createChangePreview(
  originalText: string,
  change: TrackedChange
): string {
  switch (change.type) {
    case 'insert':
      const insertPos = Math.min(change.position, originalText.length);
      return originalText.slice(0, insertPos) + 
             `<span class="change-insert">${change.text || ''}</span>` + 
             originalText.slice(insertPos);
    
    case 'delete':
      const deleteStart = Math.min(change.position, originalText.length);
      const deleteLength = Math.min(change.length || 0, originalText.length - deleteStart);
      const deleteEnd = deleteStart + deleteLength;
      const deletedText = originalText.slice(deleteStart, deleteEnd);
      return originalText.slice(0, deleteStart) + 
             `<span class="change-delete">${deletedText}</span>` + 
             originalText.slice(deleteEnd);
    
    case 'replace':
      const replaceStart = Math.min(change.position, originalText.length);
      const replaceLength = Math.min(change.length || 0, originalText.length - replaceStart);
      const replaceEnd = replaceStart + replaceLength;
      const replacedText = originalText.slice(replaceStart, replaceEnd);
      return originalText.slice(0, replaceStart) + 
             `<span class="change-delete">${replacedText}</span>` +
             `<span class="change-insert">${change.text || ''}</span>` + 
             originalText.slice(replaceEnd);

    case 'format_add':
      const addStart = Math.min(change.position, originalText.length);
      const addLength = Math.min(change.length || 0, originalText.length - addStart);
      const addEnd = addStart + addLength;
      const formattedText = originalText.slice(addStart, addEnd);
      return originalText.slice(0, addStart) + 
             `<span class="change-format-add" title="Added ${change.formatType} formatting">${formattedText}</span>` + 
             originalText.slice(addEnd);

    case 'format_remove':
      const removeStart = Math.min(change.position, originalText.length);
      const removeLength = Math.min(change.length || 0, originalText.length - removeStart);
      const removeEnd = removeStart + removeLength;
      const unformattedText = originalText.slice(removeStart, removeEnd);
      return originalText.slice(0, removeStart) + 
             `<span class="change-format-remove" title="Removed ${change.formatType} formatting">${unformattedText}</span>` + 
             originalText.slice(removeEnd);

    case 'format_change':
      const changeStart = Math.min(change.position, originalText.length);
      const changeLength = Math.min(change.length || 0, originalText.length - changeStart);
      const changeEnd = changeStart + changeLength;
      const changedText = originalText.slice(changeStart, changeEnd);
      return originalText.slice(0, changeStart) + 
             `<span class="change-format-change" title="Changed ${change.formatType} from ${change.previousFormatValue} to ${change.formatValue}">${changedText}</span>` + 
             originalText.slice(changeEnd);
    
    default:
      return originalText;
  }
}

/**
 * Merge overlapping or adjacent changes
 */
export function mergeCompatibleChanges(changes: TrackedChange[]): TrackedChange[] {
  if (changes.length <= 1) return changes;
  
  const sorted = [...changes].sort((a, b) => a.position - b.position);
  const merged: TrackedChange[] = [];
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // Only merge text changes, not format changes
    if (current.type === 'insert' && next.type === 'insert' && 
        current.field === next.field &&
        !current.formatType && !next.formatType &&
        current.position + (current.text?.length || 0) === next.position) {
      
      // Merge insertions
      current = {
        ...current,
        text: (current.text || '') + (next.text || ''),
        id: generateChangeId(), // New ID for merged change
        timestamp: Math.max(current.timestamp, next.timestamp)
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Calculate text boundaries for change visualization
 */
export function getChangeTextBoundaries(text: string, change: TrackedChange): {
  before: string;
  affected: string;
  after: string;
  preview: string;
} {
  const start = Math.min(change.position, text.length);
  const length = change.length || 0;
  const end = Math.min(start + length, text.length);
  
  const before = text.slice(0, start);
  const affected = text.slice(start, end);
  const after = text.slice(end);
  
  let preview = '';
  switch (change.type) {
    case 'insert':
      preview = before + (change.text || '') + affected + after;
      break;
    case 'delete':
      preview = before + after;
      break;
    case 'replace':
      preview = before + (change.text || '') + after;
      break;
    case 'format_add':
    case 'format_remove':
    case 'format_change':
      preview = text; // Format changes don't alter text content
      break;
  }
  
  return { before, affected, after, preview };
}

/**
 * Debug utility to compare clean text extraction between methods
 */
export function debugCleanTextExtraction(html: string): {
  html: string;
  consistentCleanText: string;
  domBasedCleanText: string;
  match: boolean;
  htmlLength: number;
  consistentLength: number;
  domBasedLength: number;
} {
  const consistentCleanText = extractCleanTextConsistent(html);
  
  // DOM-based extraction (original method)
  let domBasedCleanText = '';
  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    domBasedCleanText = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim();
  } catch (error) {
    domBasedCleanText = html;
  }
  
  return {
    html,
    consistentCleanText,
    domBasedCleanText,
    match: consistentCleanText === domBasedCleanText,
    htmlLength: html.length,
    consistentLength: consistentCleanText.length,
    domBasedLength: domBasedCleanText.length
  };
}
