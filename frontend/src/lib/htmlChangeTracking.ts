import { TrackedChange } from './types';
import { generateChangeId } from './changeTracking';

/**
 * HTML and Styling Change Detection Utilities
 * 
 * This module provides functions to detect and track HTML formatting changes
 * in addition to text content changes.
 */

// Define format types and their corresponding HTML patterns
export const FORMAT_PATTERNS = {
  bold: { tag: 'strong', attr: null, mark: 'bold' },
  italic: { tag: 'em', attr: null, mark: 'italic' },
  underline: { tag: 'u', attr: null, mark: 'underline' },
  strike: { tag: 's', attr: null, mark: 'strike' },
  code: { tag: 'code', attr: null, mark: 'code' },
  link: { tag: 'a', attr: 'href', mark: 'link' },
  highlight: { tag: 'mark', attr: null, mark: 'highlight' },
  heading: { tag: /h[1-6]/, attr: 'level', mark: 'heading' },
  bulletList: { tag: 'ul', attr: null, mark: 'bulletList' },
  orderedList: { tag: 'ol', attr: null, mark: 'orderedList' },
  blockquote: { tag: 'blockquote', attr: null, mark: 'blockquote' },
  codeBlock: { tag: 'pre', attr: null, mark: 'codeBlock' },
} as const;

export type FormatType = keyof typeof FORMAT_PATTERNS;

/**
 * Parse HTML and extract text with format information
 */
export interface FormattedTextSegment {
  text: string;
  position: number;
  length: number;
  formats: Array<{
    type: FormatType;
    value?: string | number | boolean;
    htmlTag: string;
  }>;
  htmlSnippet: string;
}

/**
 * Parse HTML content and extract formatted text segments
 */
export function parseHTMLFormatting(html: string): FormattedTextSegment[] {
  const segments: FormattedTextSegment[] = [];
  
  if (!html) return segments;

  try {
    // Create a temporary DOM element to parse HTML safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.querySelector('div');
    
    if (!container) return segments;

    let textPosition = 0;
    
    // Recursively walk through the DOM tree
    const walkNode = (node: Node, inheritedFormats: FormattedTextSegment['formats'] = []): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.length > 0) {
          segments.push({
            text,
            position: textPosition,
            length: text.length,
            formats: [...inheritedFormats],
            htmlSnippet: node.parentElement?.outerHTML || text,
          });
          textPosition += text.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // Detect format type from element
        const formatInfo = detectFormatFromElement(element);
        const currentFormats = formatInfo ? [...inheritedFormats, formatInfo] : inheritedFormats;
        
        // Process child nodes
        for (const child of Array.from(element.childNodes)) {
          walkNode(child, currentFormats);
        }
      }
    };

    walkNode(container);
    
  } catch (error) {
    console.error('Failed to parse HTML formatting:', error);
  }

  return segments;
}

/**
 * Detect format information from a DOM element
 */
function detectFormatFromElement(element: Element): FormattedTextSegment['formats'][0] | null {
  const tagName = element.tagName.toLowerCase();
  
  for (const [formatType, pattern] of Object.entries(FORMAT_PATTERNS)) {
    if (pattern.tag instanceof RegExp) {
      if (pattern.tag.test(tagName)) {
        let value: string | number | boolean = true;
        
        // Extract specific values for certain formats
        if (formatType === 'heading') {
          value = parseInt(tagName.replace('h', ''), 10);
        } else if (formatType === 'link') {
          value = element.getAttribute('href') || '';
        }
        
        return {
          type: formatType as FormatType,
          value,
          htmlTag: tagName,
        };
      }
    } else if (tagName === pattern.tag) {
      let value: string | number | boolean = true;
      
      // Extract attribute values if specified
      if (pattern.attr && formatType === 'link') {
        value = element.getAttribute(pattern.attr) || '';
      }
      
      return {
        type: formatType as FormatType,
        value,
        htmlTag: tagName,
      };
    }
  }
  
  return null;
}

/**
 * Compare two sets of formatted text segments and detect changes
 */
export function detectHTMLFormattingChanges(
  oldSegments: FormattedTextSegment[],
  newSegments: FormattedTextSegment[],
  field: 'title' | 'content' = 'content'
): TrackedChange[] {
  const changes: TrackedChange[] = [];
  
  // Group segments by position to compare formatting
  const oldFormatMap = new Map<string, FormattedTextSegment>();
  const newFormatMap = new Map<string, FormattedTextSegment>();
  
  oldSegments.forEach(segment => {
    const key = `${segment.position}-${segment.length}`;
    oldFormatMap.set(key, segment);
  });
  
  newSegments.forEach(segment => {
    const key = `${segment.position}-${segment.length}`;
    newFormatMap.set(key, segment);
  });
  
  // Compare formatings for each text position
  newFormatMap.forEach((newSegment, key) => {
    const oldSegment = oldFormatMap.get(key);
    
    if (!oldSegment) {
      // New text segment with formatting
      if (newSegment.formats.length > 0) {
        newSegment.formats.forEach(format => {
          changes.push(createFormatChange(
            'format_add',
            newSegment,
            format,
            field
          ));
        });
      }
      return;
    }
    
    // Compare formats between old and new segments
    const formatChanges = compareSegmentFormats(oldSegment, newSegment, field);
    changes.push(...formatChanges);
  });
  
  // Check for removed segments
  oldFormatMap.forEach((oldSegment, key) => {
    if (!newFormatMap.has(key) && oldSegment.formats.length > 0) {
      oldSegment.formats.forEach(format => {
        changes.push(createFormatChange(
          'format_remove',
          oldSegment,
          format,
          field
        ));
      });
    }
  });
  
  return changes;
}

/**
 * Compare formats between two text segments
 */
function compareSegmentFormats(
  oldSegment: FormattedTextSegment,
  newSegment: FormattedTextSegment,
  field: 'title' | 'content'
): TrackedChange[] {
  const changes: TrackedChange[] = [];
  
  const oldFormats = new Map(oldSegment.formats.map(f => [f.type, f]));
  const newFormats = new Map(newSegment.formats.map(f => [f.type, f]));
  
  // Check for added formats
  newFormats.forEach((format, formatType) => {
    if (!oldFormats.has(formatType)) {
      changes.push(createFormatChange('format_add', newSegment, format, field));
    } else {
      // Check for changed format values
      const oldFormat = oldFormats.get(formatType)!;
      if (oldFormat.value !== format.value) {
        changes.push(createFormatChange('format_change', newSegment, format, field, oldFormat.value));
      }
    }
  });
  
  // Check for removed formats
  oldFormats.forEach((format, formatType) => {
    if (!newFormats.has(formatType)) {
      changes.push(createFormatChange('format_remove', newSegment, format, field));
    }
  });
  
  return changes;
}

/**
 * Create a format change tracked change
 */
function createFormatChange(
  type: 'format_add' | 'format_remove' | 'format_change',
  segment: FormattedTextSegment,
  format: FormattedTextSegment['formats'][0],
  field: 'title' | 'content',
  previousValue?: string | number | boolean
): TrackedChange {
  return {
    id: generateChangeId(),
    type,
    position: segment.position,
    length: segment.length,
    text: segment.text,
    field,
    timestamp: Date.now(),
    applied: false,
    selected: true,
    formatType: format.type,
    formatValue: format.value,
    previousFormatValue: previousValue,
    htmlBefore: type === 'format_remove' ? segment.htmlSnippet : undefined,
    htmlAfter: type === 'format_add' || type === 'format_change' ? segment.htmlSnippet : undefined,
    affectedText: segment.text,
  };
}

/**
 * Generate a human-readable description for a format change
 */
export function getFormatChangeDescription(change: TrackedChange): string {
  if (!change.formatType) return 'Unknown format change';
  
  const formatName = change.formatType;
  const affectedText = change.affectedText ? `"${change.affectedText}"` : 'text';
  
  switch (change.type) {
    case 'format_add':
      if (formatName === 'heading' && change.formatValue) {
        return `Applied heading level ${change.formatValue} to ${affectedText}`;
      } else if (formatName === 'link' && change.formatValue) {
        return `Added link "${change.formatValue}" to ${affectedText}`;
      } else {
        return `Applied ${formatName} formatting to ${affectedText}`;
      }
      
    case 'format_remove':
      if (formatName === 'heading') {
        return `Removed heading formatting from ${affectedText}`;
      } else if (formatName === 'link') {
        return `Removed link from ${affectedText}`;
      } else {
        return `Removed ${formatName} formatting from ${affectedText}`;
      }
      
    case 'format_change':
      if (formatName === 'heading') {
        return `Changed heading from level ${change.previousFormatValue} to ${change.formatValue} for ${affectedText}`;
      } else if (formatName === 'link') {
        return `Changed link from "${change.previousFormatValue}" to "${change.formatValue}" for ${affectedText}`;
      } else {
        return `Changed ${formatName} formatting for ${affectedText}`;
      }
      
    default:
      return `Modified ${formatName} formatting for ${affectedText}`;
  }
}

/**
 * Extract clean text from HTML while preserving position information
 */
export function extractCleanTextWithPositions(html: string): string {
  const segments = parseHTMLFormatting(html);
  return segments.map(segment => segment.text).join('');
}

/**
 * Apply format changes to HTML content
 */
export function applyFormatChangesToHTML(
  originalHtml: string, 
  changes: TrackedChange[]
): string {
  // This is a simplified implementation
  // In a real application, you'd want to use a proper HTML parser/manipulator
  let result = originalHtml;
  
  const sortedChanges = changes
    .filter(change => change.selected && change.type.startsWith('format_'))
    .sort((a, b) => b.position - a.position); // Apply in reverse order
  
  for (const change of sortedChanges) {
    // This would require complex HTML manipulation
    // For now, we'll rely on the editor's internal state management
    console.log('Would apply format change:', change);
  }
  
  return result;
}
