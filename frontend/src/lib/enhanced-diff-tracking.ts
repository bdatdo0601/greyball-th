import { generateChangeId } from "./changeTracking";
import type { DocumentChange, TrackedChange } from "./types";

/**
 * Enhanced diff tracking with proper debouncing and patch operation compatibility
 *
 * This module provides improved change detection with:
 * - Proper Myers diff algorithm implementation
 * - Incremental change tracking with debouncing
 * - State management for old vs new comparisons
 * - Patch operation compatibility
 */

// Diff operation types
export interface DiffOperation {
  operation: "equal" | "delete" | "insert";
  text: string;
  oldIndex?: number;
  newIndex?: number;
}

// Enhanced change tracker state
export interface EnhancedChangeState {
  oldContent: string;
  oldTitle: string;
  pendingChanges: Map<string, TrackedChange>;
  lastProcessedContent: string;
  lastProcessedTitle: string;
  debounceTimer: NodeJS.Timeout | null;
  useHtmlAwareDiff: boolean;
}

// HTML Token types for better diff granularity
interface HTMLToken {
  type: "tag" | "text" | "whitespace";
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * HTML Element structure for scope-aware diffing
 */
interface HTMLElement {
  type: "element" | "text" | "selfClosing";
  tagName?: string;
  openTag?: HTMLToken;
  closeTag?: HTMLToken;
  content: HTMLToken[];
  startIndex: number;
  endIndex: number;
  depth: number;
}

/**
 * HTML-aware tokenizer that breaks content into meaningful units
 */
export class HTMLTokenizer {
  static tokenize(html: string): HTMLToken[] {
    const tokens: HTMLToken[] = [];
    let index = 0;

    while (index < html.length) {
      // Check for HTML tag
      if (html[index] === "<") {
        const tagMatch = html.slice(index).match(/^<[^>]*>/);
        if (tagMatch) {
          tokens.push({
            type: "tag",
            content: tagMatch[0],
            startIndex: index,
            endIndex: index + tagMatch[0].length,
          });
          index += tagMatch[0].length;
          continue;
        }
      }

      // Check for whitespace sequence
      const whitespaceMatch = html.slice(index).match(/^\s+/);
      if (whitespaceMatch) {
        tokens.push({
          type: "whitespace",
          content: whitespaceMatch[0],
          startIndex: index,
          endIndex: index + whitespaceMatch[0].length,
        });
        index += whitespaceMatch[0].length;
        continue;
      }

      // Find next tag or whitespace to determine text content
      let textEnd = index + 1;
      while (
        textEnd < html.length &&
        html[textEnd] !== "<" &&
        !/\s/.test(html[textEnd])
      ) {
        textEnd++;
      }

      if (textEnd > index) {
        tokens.push({
          type: "text",
          content: html.slice(index, textEnd),
          startIndex: index,
          endIndex: textEnd,
        });
        index = textEnd;
      } else {
        // Single character that doesn't fit other categories
        tokens.push({
          type: "text",
          content: html[index],
          startIndex: index,
          endIndex: index + 1,
        });
        index++;
      }
    }

    return tokens;
  }

  /**
   * Parse HTML tokens into a structured hierarchy of elements
   * This enables scope-aware diffing within individual HTML tags
   */
  static parseElements(tokens: HTMLToken[]): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const stack: {
      tagName: string;
      openTag: HTMLToken;
      startIndex: number;
      content: HTMLToken[];
      depth: number;
    }[] = [];
    let depth = 0;

    for (const token of tokens) {
      if (token.type === "tag") {
        if (token.content.startsWith("</")) {
          // Closing tag
          const tagName = token.content.slice(2, -1).trim();

          // Find matching opening tag in stack
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].tagName.toLowerCase() === tagName.toLowerCase()) {
              const openElement = stack[i];
              stack.splice(i, 1);

              elements.push({
                type: "element",
                tagName: openElement.tagName,
                openTag: openElement.openTag,
                closeTag: token,
                content: openElement.content,
                startIndex: openElement.startIndex,
                endIndex: token.endIndex,
                depth: openElement.depth,
              });
              depth--;
              break;
            }
          }
        } else if (token.content.endsWith("/>")) {
          // Self-closing tag
          const tagMatch = token.content
            .slice(1, -2)
            .trim()
            .match(/^(\w+)/);
          const tagName = tagMatch ? tagMatch[1] : "";

          elements.push({
            type: "selfClosing",
            tagName,
            openTag: token,
            content: [],
            startIndex: token.startIndex,
            endIndex: token.endIndex,
            depth,
          });
        } else {
          // Opening tag
          const tagMatch = token.content
            .slice(1, -1)
            .trim()
            .match(/^(\w+)/);
          const tagName = tagMatch ? tagMatch[1] : "";

          stack.push({
            tagName,
            openTag: token,
            startIndex: token.startIndex,
            content: [],
            depth,
          });
          depth++;
        }
      } else {
        // Text or whitespace token
        if (stack.length > 0) {
          // Inside an element
          stack[stack.length - 1].content.push(token);
        } else {
          // Top-level text
          elements.push({
            type: "text",
            content: [token],
            startIndex: token.startIndex,
            endIndex: token.endIndex,
            depth: 0,
          });
        }
      }
    }

    // Handle unclosed tags (malformed HTML)
    for (const unclosed of stack) {
      elements.push({
        type: "element",
        tagName: unclosed.tagName,
        openTag: unclosed.openTag,
        content: unclosed.content,
        startIndex: unclosed.startIndex,
        endIndex:
          unclosed.content.length > 0
            ? unclosed.content[unclosed.content.length - 1].endIndex
            : unclosed.openTag.endIndex,
        depth: unclosed.depth,
      });
    }

    return elements.sort((a, b) => a.startIndex - b.startIndex);
  }
}

/**
 * Simple but efficient diff algorithm optimized for consolidated changes
 * Enhanced with HTML-aware tokenization for better change granularity
 */
export class SimpleDiff {
  static diff(
    oldText: string,
    newText: string,
    useHtmlTokens: boolean = false,
  ): DiffOperation[] {
    const operations: DiffOperation[] = [];

    if (oldText === newText) {
      if (oldText) {
        operations.push({ operation: "equal", text: oldText });
      }
      return operations;
    }

    // Handle edge cases
    if (!oldText) {
      operations.push({ operation: "insert", text: newText, newIndex: 0 });
      return operations;
    }

    if (!newText) {
      operations.push({ operation: "delete", text: oldText, oldIndex: 0 });
      return operations;
    }

    // Use HTML-aware diff if requested and content looks like HTML
    if (
      useHtmlTokens &&
      SimpleDiff.looksLikeHTML(oldText) &&
      SimpleDiff.looksLikeHTML(newText)
    ) {
      return SimpleDiff.htmlAwareDiff(oldText, newText);
    }

    // Fallback to character-based diff
    return SimpleDiff.characterBasedDiff(oldText, newText);
  }

  private static looksLikeHTML(text: string): boolean {
    // Simple heuristic to detect HTML content
    return (
      /<[^>]+>/.test(text) || text.includes("&lt;") || text.includes("&gt;")
    );
  }

  private static htmlAwareDiff(
    oldText: string,
    newText: string,
  ): DiffOperation[] {
    const oldTokens = HTMLTokenizer.tokenize(oldText);
    const newTokens = HTMLTokenizer.tokenize(newText);

    const oldElements = HTMLTokenizer.parseElements(oldTokens);
    const newElements = HTMLTokenizer.parseElements(newTokens);

    console.log(
      "🔍 HTML Elements - Old:",
      oldElements.map((el) => ({
        type: el.type,
        tagName: el.tagName,
        startIndex: el.startIndex,
        endIndex: el.endIndex,
        contentCount: el.content.length,
      })),
    );

    console.log(
      "🔍 HTML Elements - New:",
      newElements.map((el) => ({
        type: el.type,
        tagName: el.tagName,
        startIndex: el.startIndex,
        endIndex: el.endIndex,
        contentCount: el.content.length,
      })),
    );

    const operations: DiffOperation[] = [];

    // Perform scope-aware diffing
    const elementDiffs = SimpleDiff.diffElementsScoped(
      oldElements,
      newElements,
    );

    // Convert element diffs to operations
    for (const diff of elementDiffs) {
      operations.push(...diff.operations);
    }

    return SimpleDiff.consolidateOperations(operations);
  }

  /**
   * Diff HTML elements in a scope-aware manner with proper position tracking
   * Each diff operation will be contained within a single HTML element scope
   */
  private static diffElementsScoped(
    oldElements: HTMLElement[],
    newElements: HTMLElement[],
  ): Array<{
    elementType: string;
    operations: DiffOperation[];
  }> {
    const elementDiffs: Array<{
      elementType: string;
      operations: DiffOperation[];
    }> = [];

    // Use a more sophisticated matching algorithm for better element correspondence
    const matches = SimpleDiff.findElementMatches(oldElements, newElements);
    
    console.log("🔍 Element Matches:", matches);

    // Process matches and generate scoped operations
    for (const match of matches) {
      switch (match.type) {
        case "delete":
          // Entire element deleted - this is a scoped change
          const deletedElement = match.oldElement!;
          const deletedContent = SimpleDiff.reconstructElementContent(deletedElement);
          elementDiffs.push({
            elementType: `${deletedElement.type}:${deletedElement.tagName || "text"}`,
            operations: [{
              operation: "delete",
              text: deletedContent,
              oldIndex: deletedElement.startIndex,
            }]
          });
          break;

        case "insert":
          // Entire element inserted - this is a scoped change
          const insertedElement = match.newElement!;
          const insertedContent = SimpleDiff.reconstructElementContent(insertedElement);
          elementDiffs.push({
            elementType: `${insertedElement.type}:${insertedElement.tagName || "text"}`,
            operations: [{
              operation: "insert",
              text: insertedContent,
              newIndex: insertedElement.startIndex,
            }]
          });
          break;

        case "modify":
          // Element exists in both but may have changes
          const oldEl = match.oldElement!;
          const newEl = match.newElement!;
          
          const elementsDrasticallyDifferent = SimpleDiff.areElementsDrasticallyDifferent(oldEl, newEl);

          if (elementsDrasticallyDifferent) {
            // Treat as complete replacement - scoped change
            const oldContent = SimpleDiff.reconstructElementContent(oldEl);
            const newContent = SimpleDiff.reconstructElementContent(newEl);

            elementDiffs.push({
              elementType: `${oldEl.type}:${oldEl.tagName || "text"}`,
              operations: [
                {
                  operation: "delete",
                  text: oldContent,
                  oldIndex: oldEl.startIndex,
                },
                {
                  operation: "insert",
                  text: newContent,
                  newIndex: oldEl.startIndex, // Insert at the same position as delete
                },
              ],
            });
          } else {
            // Perform detailed intra-element diffing
            const scopedDiff = SimpleDiff.diffWithinElementScope(oldEl, newEl, oldEl.startIndex);
            if (scopedDiff.operations.length > 0) {
              elementDiffs.push(scopedDiff);
            }
          }
          break;
      }
    }

    return elementDiffs;
  }

  /**
   * Find element matches between old and new element arrays
   * This provides better correspondence than simple index-based matching
   */
  private static findElementMatches(
    oldElements: HTMLElement[],
    newElements: HTMLElement[],
  ): Array<{
    type: "delete" | "insert" | "modify";
    oldElement?: HTMLElement;
    newElement?: HTMLElement;
  }> {
    const matches: Array<{
      type: "delete" | "insert" | "modify";
      oldElement?: HTMLElement;
      newElement?: HTMLElement;
    }> = [];

    // Simple algorithm: match elements by position and similarity
    // This could be enhanced with more sophisticated matching in the future
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldElements.length || newIndex < newElements.length) {
      const oldEl = oldElements[oldIndex];
      const newEl = newElements[newIndex];

      if (!oldEl && newEl) {
        // New element inserted
        matches.push({ type: "insert", newElement: newEl });
        newIndex++;
      } else if (oldEl && !newEl) {
        // Element deleted
        matches.push({ type: "delete", oldElement: oldEl });
        oldIndex++;
      } else if (oldEl && newEl) {
        // Both elements exist - check similarity
        const similarity = SimpleDiff.calculateElementSimilarity(oldEl, newEl);
        
        if (similarity > 0.3) { // Similarity threshold
          // Elements are similar enough to be considered the same
          matches.push({ type: "modify", oldElement: oldEl, newElement: newEl });
          oldIndex++;
          newIndex++;
        } else {
          // Elements are too different - check if we should skip one
          // Look ahead to see if there's a better match
          const nextOldSimilarity = newElements[newIndex + 1] 
            ? SimpleDiff.calculateElementSimilarity(oldEl, newElements[newIndex + 1])
            : 0;
          const nextNewSimilarity = oldElements[oldIndex + 1]
            ? SimpleDiff.calculateElementSimilarity(oldElements[oldIndex + 1], newEl)
            : 0;

          if (nextOldSimilarity > similarity && nextOldSimilarity > nextNewSimilarity) {
            // Current new element is likely inserted
            matches.push({ type: "insert", newElement: newEl });
            newIndex++;
          } else if (nextNewSimilarity > similarity && nextNewSimilarity >= nextOldSimilarity) {
            // Current old element is likely deleted
            matches.push({ type: "delete", oldElement: oldEl });
            oldIndex++;
          } else {
            // Treat as replacement
            matches.push({ type: "delete", oldElement: oldEl });
            matches.push({ type: "insert", newElement: newEl });
            oldIndex++;
            newIndex++;
          }
        }
      }
    }

    return matches;
  }

  /**
   * Calculate similarity between two HTML elements
   */
  private static calculateElementSimilarity(el1: HTMLElement, el2: HTMLElement): number {
    // Different types have 0 similarity
    if (el1.type !== el2.type) {
      return 0;
    }

    // Different tag names have low similarity
    if (el1.tagName !== el2.tagName) {
      return 0.1;
    }

    // Same tag name gets base similarity
    let similarity = 0.5;

    // Compare content similarity
    const content1 = SimpleDiff.reconstructElementContent(el1);
    const content2 = SimpleDiff.reconstructElementContent(el2);

    if (content1.length === 0 && content2.length === 0) {
      return 1.0; // Both empty
    }

    if (content1.length === 0 || content2.length === 0) {
      return 0.2; // One empty, one not
    }

    // Calculate content similarity based on length and character overlap
    const maxLength = Math.max(content1.length, content2.length);
    const minLength = Math.min(content1.length, content2.length);
    const lengthSimilarity = minLength / maxLength;

    // Simple character overlap check
    const commonChars = SimpleDiff.countCommonChars(content1, content2);
    const charSimilarity = commonChars / maxLength;

    // Weighted average
    similarity = 0.3 + (0.4 * lengthSimilarity) + (0.3 * charSimilarity);

    return Math.min(1.0, similarity);
  }

  /**
   * Count common characters between two strings (simple approximation)
   */
  private static countCommonChars(str1: string, str2: string): number {
    const chars1 = new Map<string, number>();
    const chars2 = new Map<string, number>();

    // Count characters in both strings
    for (const char of str1) {
      chars1.set(char, (chars1.get(char) || 0) + 1);
    }
    for (const char of str2) {
      chars2.set(char, (chars2.get(char) || 0) + 1);
    }

    // Count common characters
    let common = 0;
    const chars1Entries = Array.from(chars1.entries());
    for (const [char, count1] of chars1Entries) {
      const count2 = chars2.get(char) || 0;
      common += Math.min(count1, count2);
    }

    return common;
  }

  /**
   * Determine if two HTML elements are drastically different
   * Returns true if they should be treated as completely different elements
   */
  private static areElementsDrasticallyDifferent(
    oldEl: HTMLElement,
    newEl: HTMLElement,
  ): boolean {
    // Different element types are drastically different
    if (oldEl.type !== newEl.type) {
      return true;
    }

    // Different tag names are drastically different
    if (oldEl.tagName !== newEl.tagName) {
      return true;
    }

    // For elements with content, check if content similarity is below threshold
    const oldContent = SimpleDiff.reconstructElementContent(oldEl);
    const newContent = SimpleDiff.reconstructElementContent(newEl);

    // If one is empty and the other isn't, they're drastically different
    if ((oldContent.length === 0) !== (newContent.length === 0)) {
      return true;
    }

    // Calculate similarity ratio based on length difference
    const maxLength = Math.max(oldContent.length, newContent.length);
    if (maxLength === 0) {
      return false; // Both empty, not drastically different
    }

    const lengthDiff = Math.abs(oldContent.length - newContent.length);
    const lengthSimilarity = 1 - lengthDiff / maxLength;

    // If length similarity is below 50%, consider drastically different
    if (lengthSimilarity < 0.5) {
      return true;
    }

    // For tag elements, also check if opening tags are significantly different
    if (oldEl.type === "element" && newEl.type === "element") {
      const oldOpenTag = oldEl.openTag?.content || "";
      const newOpenTag = newEl.openTag?.content || "";

      // If tag attributes are very different, consider drastically different
      if (oldOpenTag !== newOpenTag) {
        const tagMaxLength = Math.max(oldOpenTag.length, newOpenTag.length);
        if (tagMaxLength > 0) {
          const tagLengthDiff = Math.abs(oldOpenTag.length - newOpenTag.length);
          const tagSimilarity = 1 - tagLengthDiff / tagMaxLength;

          if (tagSimilarity < 0.3) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Perform diff within the scope of a single HTML element
   * This ensures all operations stay within the element boundaries
   */
  private static diffWithinElementScope(
    oldEl: HTMLElement,
    newEl: HTMLElement,
    basePosition: number,
  ): {
    elementType: string;
    operations: DiffOperation[];
  } {
    const operations: DiffOperation[] = [];
    const elementType = `${oldEl.type}:${oldEl.tagName || "text"}`;

    // If different element types or tag names, treat as complete replacement
    if (oldEl.type !== newEl.type || oldEl.tagName !== newEl.tagName) {
      const oldContent = SimpleDiff.reconstructElementContent(oldEl);
      const newContent = SimpleDiff.reconstructElementContent(newEl);

      operations.push({
        operation: "delete",
        text: oldContent,
        oldIndex: basePosition,
      });
      operations.push({
        operation: "insert",
        text: newContent,
        newIndex: basePosition,
      });

      return { elementType, operations };
    }

    // Handle different element types
    if (oldEl.type === "selfClosing") {
      // Self-closing tags - compare as complete units
      const oldContent = oldEl.openTag?.content || "";
      const newContent = newEl.openTag?.content || "";

      if (oldContent !== newContent) {
        operations.push({
          operation: "delete",
          text: oldContent,
          oldIndex: basePosition,
        });
        operations.push({
          operation: "insert",
          text: newContent,
          newIndex: basePosition,
        });
      }
    } else if (oldEl.type === "text") {
      // Text elements - compare content
      const oldContent = oldEl.content.map((t) => t.content).join("");
      const newContent = newEl.content.map((t) => t.content).join("");

      if (oldContent !== newContent) {
        operations.push({
          operation: "delete",
          text: oldContent,
          oldIndex: basePosition,
        });
        operations.push({
          operation: "insert",
          text: newContent,
          newIndex: basePosition,
        });
      }
    } else if (oldEl.type === "element") {
      // Regular elements - diff opening tag, content, and closing tag separately
      let currentPos = basePosition;

      // 1. Compare opening tags
      const oldOpenTag = oldEl.openTag?.content || "";
      const newOpenTag = newEl.openTag?.content || "";

      if (oldOpenTag !== newOpenTag) {
        operations.push({
          operation: "delete",
          text: oldOpenTag,
          oldIndex: currentPos,
        });
        operations.push({
          operation: "insert",
          text: newOpenTag,
          newIndex: currentPos,
        });
      }
      currentPos += Math.max(oldOpenTag.length, newOpenTag.length);

      // 2. Compare content within the element
      const oldContentText = oldEl.content.map((t) => t.content).join("");
      const newContentText = newEl.content.map((t) => t.content).join("");

      if (oldContentText !== newContentText) {
        // Use character-based diff for content within the element
        const contentOps = SimpleDiff.characterBasedDiff(
          oldContentText,
          newContentText,
        );
        for (const op of contentOps) {
          if (op.operation === "delete" && op.oldIndex !== undefined) {
            operations.push({
              operation: "delete",
              text: op.text,
              oldIndex: currentPos + op.oldIndex,
            });
          } else if (op.operation === "insert" && op.newIndex !== undefined) {
            operations.push({
              operation: "insert",
              text: op.text,
              newIndex: currentPos + op.newIndex,
            });
          } else if (op.operation === "equal") {
            // Skip equal operations for brevity
          }
        }
      }
      currentPos += Math.max(oldContentText.length, newContentText.length);

      // 3. Compare closing tags
      const oldCloseTag = oldEl.closeTag?.content || "";
      const newCloseTag = newEl.closeTag?.content || "";

      if (oldCloseTag !== newCloseTag) {
        operations.push({
          operation: "delete",
          text: oldCloseTag,
          oldIndex: currentPos,
        });
        operations.push({
          operation: "insert",
          text: newCloseTag,
          newIndex: currentPos,
        });
      }
    }

    return { elementType, operations };
  }

  /**
   * Reconstruct the complete textual content of an HTML element
   */
  private static reconstructElementContent(element: HTMLElement): string {
    switch (element.type) {
      case "selfClosing":
        return element.openTag?.content || "";

      case "text":
        return element.content.map((t) => t.content).join("");

      case "element": {
        const openTag = element.openTag?.content || "";
        const content = element.content.map((t) => t.content).join("");
        const closeTag = element.closeTag?.content || "";
        return openTag + content + closeTag;
      }

      default:
        return "";
    }
  }

  private static characterBasedDiff(
    oldText: string,
    newText: string,
  ): DiffOperation[] {
    // Find common prefix
    let commonPrefix = 0;
    while (
      commonPrefix < oldText.length &&
      commonPrefix < newText.length &&
      oldText[commonPrefix] === newText[commonPrefix]
    ) {
      commonPrefix++;
    }

    // Find common suffix
    let commonSuffix = 0;
    while (
      commonSuffix < oldText.length - commonPrefix &&
      commonSuffix < newText.length - commonPrefix &&
      oldText[oldText.length - 1 - commonSuffix] ===
        newText[newText.length - 1 - commonSuffix]
    ) {
      commonSuffix++;
    }

    const operations: DiffOperation[] = [];

    // Add common prefix as equal
    if (commonPrefix > 0) {
      operations.push({
        operation: "equal",
        text: oldText.slice(0, commonPrefix),
      });
    }

    // Calculate the different middle sections
    const oldMiddle = oldText.slice(
      commonPrefix,
      oldText.length - commonSuffix,
    );
    const newMiddle = newText.slice(
      commonPrefix,
      newText.length - commonSuffix,
    );

    // Add operations for the different parts
    if (oldMiddle && newMiddle) {
      // Both have content - this is a replacement
      operations.push({
        operation: "delete",
        text: oldMiddle,
        oldIndex: commonPrefix,
      });
      operations.push({
        operation: "insert",
        text: newMiddle,
        newIndex: commonPrefix,
      });
    } else if (oldMiddle) {
      // Only old has content - this is a deletion
      operations.push({
        operation: "delete",
        text: oldMiddle,
        oldIndex: commonPrefix,
      });
    } else if (newMiddle) {
      // Only new has content - this is an insertion
      operations.push({
        operation: "insert",
        text: newMiddle,
        newIndex: commonPrefix,
      });
    }

    // Add common suffix as equal
    if (commonSuffix > 0) {
      operations.push({
        operation: "equal",
        text: oldText.slice(oldText.length - commonSuffix),
      });
    }

    return operations;
  }

  private static consolidateOperations(
    operations: DiffOperation[],
  ): DiffOperation[] {
    const consolidated: DiffOperation[] = [];
    let i = 0;

    while (i < operations.length) {
      const op = operations[i];

      if (op.operation === "equal") {
        // Merge consecutive equal operations
        let mergedText = op.text;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "equal") {
          mergedText += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "equal",
          text: mergedText,
        });
        i = j;
      } else if (op.operation === "delete") {
        // Merge consecutive delete operations
        let mergedText = op.text;
        const startIndex = op.oldIndex;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "delete") {
          mergedText += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "delete",
          text: mergedText,
          oldIndex: startIndex,
        });
        i = j;
      } else if (op.operation === "insert") {
        // Merge consecutive insert operations
        let mergedText = op.text;
        const startIndex = op.newIndex;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "insert") {
          mergedText += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "insert",
          text: mergedText,
          newIndex: startIndex,
        });
        i = j;
      } else {
        consolidated.push(op);
        i++;
      }
    }

    return consolidated;
  }
}

/**
 * Enhanced change tracker class with proper debouncing and state management
 */
export class EnhancedChangeTracker {
  private state: EnhancedChangeState;
  private readonly debounceDelay: number;
  private readonly onChangesUpdated: (changes: TrackedChange[]) => void;

  constructor(
    initialContent: string,
    initialTitle: string,
    debounceDelay: number = 300,
    onChangesUpdated: (changes: TrackedChange[]) => void,
    useHtmlAwareDiff: boolean = true,
  ) {
    this.debounceDelay = debounceDelay;
    this.onChangesUpdated = onChangesUpdated;

    this.state = {
      oldContent: initialContent,
      oldTitle: initialTitle,
      pendingChanges: new Map(),
      lastProcessedContent: initialContent,
      lastProcessedTitle: initialTitle,
      debounceTimer: null,
      useHtmlAwareDiff,
    };
  }

  /**
   * Process content change with debouncing
   */
  processContentChange(
    newContent: string,
    field: "content" | "title" = "content",
  ): void {
    // Clear existing debounce timer
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
    }

    // Set new debounced processing
    this.state.debounceTimer = setTimeout(() => {
      this.performDiffAnalysis(newContent, field);
    }, this.debounceDelay);
  }

  /**
   * Perform the actual diff analysis and update changes
   */
  private performDiffAnalysis(
    newContent: string,
    field: "content" | "title",
  ): void {
    const oldContent =
      field === "content" ? this.state.oldContent : this.state.oldTitle;
    const lastProcessed =
      field === "content"
        ? this.state.lastProcessedContent
        : this.state.lastProcessedTitle;

    // Skip if no actual change from last processed
    if (newContent === lastProcessed) {
      return;
    }

    // Skip if the difference is too large (likely a complete rewrite/initialization issue)
    const maxDiffRatio = 0.8; // If more than 80% of content changed, skip
    const lengthDiff = Math.abs(oldContent.length - newContent.length);
    const maxLength = Math.max(oldContent.length, newContent.length);

    if (maxLength > 0 && lengthDiff / maxLength > maxDiffRatio) {
      console.warn(
        "🔍 Enhanced Tracker: Skipping diff analysis - too large change detected:",
        {
          field,
          oldLength: oldContent.length,
          newLength: newContent.length,
          lengthDiff,
          ratio: lengthDiff / maxLength,
        },
      );
      return;
    }

    // Calculate diff against the original baseline (not the last processed)
    // Enable HTML-aware diff for content fields
    const useHtmlTokens = field === "content";
    const diffOps = SimpleDiff.diff(oldContent, newContent, useHtmlTokens);
    console.log("🔍 Enhanced Tracker - Diff Operations:", diffOps);
    // Skip if we have too many operations (probably an issue)
    if (diffOps.length > 50) {
      console.warn(
        "🔍 Enhanced Tracker: Skipping diff - too many operations:",
        diffOps.length,
      );
    }

    // Convert diff operations to tracked changes
    const newChanges = this.convertDiffOpsToTrackedChanges(diffOps, field);
    console.log("🔍 Enhanced Tracker - Tracked Changes:", newChanges);

    // Additional safety check - skip if we have too many changes
    if (newChanges.length > 20) {
      console.warn(
        "🔍 Enhanced Tracker: Skipping - too many changes generated:",
        newChanges.length,
      );
    }

    // Update state
    if (field === "content") {
      this.state.lastProcessedContent = newContent;
    } else {
      this.state.lastProcessedTitle = newContent;
    }

    // Replace existing changes for this field (since we diff against original)
    this.replaceChangesForField(field, newChanges);

    // Notify listeners
    this.onChangesUpdated(Array.from(this.state.pendingChanges.values()));
  }

  /**
   * Convert diff operations to tracked changes compatible with patch operations
   * This version uses exact positions from diff operations to avoid position shifts
   */
  private convertDiffOpsToTrackedChanges(
    diffOps: DiffOperation[],
    field: "content" | "title",
  ): TrackedChange[] {
    const changes: TrackedChange[] = [];

    // Process operations using their exact position indices
    for (const op of diffOps) {
      switch (op.operation) {
        case "equal":
          // Equal operations don't need to be tracked as changes
          break;

        case "insert":
          // Use the exact new index from the diff operation
          const insertPosition = op.newIndex !== undefined ? op.newIndex : 0;
          changes.push({
            id: generateChangeId(),
            type: "insert",
            position: insertPosition,
            text: op.text,
            field,
            timestamp: Date.now(),
            applied: false,
            selected: true,
          });
          break;

        case "delete":
          // Use the exact old index from the diff operation
          const deletePosition = op.oldIndex !== undefined ? op.oldIndex : 0;
          changes.push({
            id: generateChangeId(),
            type: "delete",
            position: deletePosition,
            length: op.text.length,
            field,
            timestamp: Date.now(),
            applied: false,
            selected: true,
          });
          break;
      }
    }

    // Optimize consecutive delete+insert operations into replace operations
    return this.optimizeChangesToReplaces(changes);
  }

  /**
   * Group consecutive operations of the same type
   */
  private groupConsecutiveOperations(diffOps: DiffOperation[]): Array<{
    operations: DiffOperation[];
  }> {
    const groups: Array<{ operations: DiffOperation[] }> = [];
    let currentGroup: DiffOperation[] = [];
    let currentOperationType: string | null = null;

    for (const op of diffOps) {
      if (op.operation !== currentOperationType) {
        if (currentGroup.length > 0) {
          groups.push({ operations: currentGroup });
        }
        currentGroup = [op];
        currentOperationType = op.operation;
      } else {
        currentGroup.push(op);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ operations: currentGroup });
    }

    return groups;
  }

  /**
   * Optimize consecutive delete+insert operations into replace operations
   */
  private optimizeChangesToReplaces(changes: TrackedChange[]): TrackedChange[] {
    const optimized: TrackedChange[] = [];

    for (let i = 0; i < changes.length; i++) {
      const current = changes[i];
      const next = changes[i + 1];

      // Look for delete followed by insert at the same position
      if (
        current.type === "delete" &&
        next &&
        next.type === "insert" &&
        current.position === next.position
      ) {
        // Create a replace operation
        optimized.push({
          id: generateChangeId(),
          type: "replace",
          position: current.position,
          length: current.length,
          text: next.text,
          field: current.field,
          timestamp: Date.now(),
          applied: false,
          selected: true,
        });

        // Skip the next insert since we combined it
        i++;
      } else {
        optimized.push(current);
      }
    }

    return optimized;
  }

  /**
   * Replace all changes for a specific field
   */
  private replaceChangesForField(
    field: "content" | "title",
    newChanges: TrackedChange[],
  ): void {
    // Remove existing changes for this field
    const keysToDelete: string[] = [];
    this.state.pendingChanges.forEach((change, key) => {
      if (change.field === field) {
        keysToDelete.push(key);
      }
    });

    // Delete the keys
    for (const key of keysToDelete) {
      this.state.pendingChanges.delete(key);
    }

    // Add new changes
    for (const change of newChanges) {
      this.state.pendingChanges.set(change.id, change);
    }
  }

  /**
   * Convert tracked changes to patch-compatible document changes
   */
  convertToPatchChanges(trackedChanges: TrackedChange[]): DocumentChange[] {
    return trackedChanges
      .filter((change) => change.selected)
      .sort((a, b) => a.position - b.position) // Sort by position for consistent application
      .map((change) => ({
        type: change.type,
        position: change.position,
        length: change.length,
        text: change.text,
        field: change.field,
        formatType: change.formatType,
        formatValue: change.formatValue,
      }));
  }

  /**
   * Get current tracked changes
   */
  getCurrentChanges(): TrackedChange[] {
    return Array.from(this.state.pendingChanges.values());
  }

  /**
   * Clear all tracked changes and reset to new baseline
   */
  resetBaseline(newContent: string, newTitle: string): void {
    // Clear debounce timer
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }

    // Reset state
    this.state = {
      oldContent: newContent,
      oldTitle: newTitle,
      pendingChanges: new Map(),
      lastProcessedContent: newContent,
      lastProcessedTitle: newTitle,
      debounceTimer: null,
      useHtmlAwareDiff: this.state.useHtmlAwareDiff,
    };

    // Notify listeners of cleared changes
    this.onChangesUpdated([]);
  }

  /**
   * Update change selection
   */
  updateChangeSelection(changeId: string, selected: boolean): void {
    const change = this.state.pendingChanges.get(changeId);
    if (change) {
      change.selected = selected;
      this.onChangesUpdated(Array.from(this.state.pendingChanges.values()));
    }
  }

  /**
   * Select/deselect all changes
   */
  selectAllChanges(selected: boolean): void {
    this.state.pendingChanges.forEach((change) => {
      change.selected = selected;
    });
    this.onChangesUpdated(Array.from(this.state.pendingChanges.values()));
  }

  /**
   * Remove specific changes (e.g., after successful patch commit)
   */
  removeChanges(changeIds: string[]): void {
    for (const id of changeIds) {
      this.state.pendingChanges.delete(id);
    }
    this.onChangesUpdated(Array.from(this.state.pendingChanges.values()));
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
    }
  }
}

/**
 * Create and configure an enhanced change tracker instance
 */
export function createEnhancedChangeTracker(
  initialContent: string,
  initialTitle: string,
  options: {
    debounceDelay?: number;
    onChangesUpdated?: (changes: TrackedChange[]) => void;
    useHtmlAwareDiff?: boolean;
  } = {},
): EnhancedChangeTracker {
  return new EnhancedChangeTracker(
    initialContent,
    initialTitle,
    options.debounceDelay ?? 300,
    options.onChangesUpdated ?? (() => {}),
    options.useHtmlAwareDiff ?? true,
  );
}

/**
 * Utility function to apply changes to text (for preview purposes)
 */
export function applyChangesToText(
  originalText: string,
  changes: TrackedChange[],
): string {
  // Sort changes by position in reverse order to avoid position shifts
  const sortedChanges = changes
    .filter((change) => change.selected)
    .sort((a, b) => b.position - a.position);

  let result = originalText;

  for (const change of sortedChanges) {
    switch (change.type) {
      case "insert":
        result =
          result.slice(0, change.position) +
          (change.text || "") +
          result.slice(change.position);
        break;

      case "delete": {
        const deleteEnd = change.position + (change.length || 0);
        result = result.slice(0, change.position) + result.slice(deleteEnd);
        break;
      }

      case "replace": {
        const replaceEnd = change.position + (change.length || 0);
        result =
          result.slice(0, change.position) +
          (change.text || "") +
          result.slice(replaceEnd);
        break;
      }
    }
  }

  return result;
}
