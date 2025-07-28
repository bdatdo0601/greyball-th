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
 * HTML-aware tokenizer that breaks content into meaningful units
 */
export class HTMLTokenizer {
  static tokenize(html: string): HTMLToken[] {
    const tokens: HTMLToken[] = [];
    let index = 0;

    while (index < html.length) {
      // Check for HTML tag
      if (html[index] === '<') {
        const tagMatch = html.slice(index).match(/^<[^>]*>/);
        if (tagMatch) {
          tokens.push({
            type: "tag",
            content: tagMatch[0],
            startIndex: index,
            endIndex: index + tagMatch[0].length
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
          endIndex: index + whitespaceMatch[0].length
        });
        index += whitespaceMatch[0].length;
        continue;
      }

      // Find next tag or whitespace to determine text content
      let textEnd = index + 1;
      while (textEnd < html.length && html[textEnd] !== '<' && !/\s/.test(html[textEnd])) {
        textEnd++;
      }

      if (textEnd > index) {
        tokens.push({
          type: "text",
          content: html.slice(index, textEnd),
          startIndex: index,
          endIndex: textEnd
        });
        index = textEnd;
      } else {
        // Single character that doesn't fit other categories
        tokens.push({
          type: "text",
          content: html[index],
          startIndex: index,
          endIndex: index + 1
        });
        index++;
      }
    }

    return tokens;
  }
}

/**
 * Simple but efficient diff algorithm optimized for consolidated changes
 * Enhanced with HTML-aware tokenization for better change granularity
 */
export class SimpleDiff {
  static diff(oldText: string, newText: string, useHtmlTokens: boolean = false): DiffOperation[] {
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
    if (useHtmlTokens && this.looksLikeHTML(oldText) && this.looksLikeHTML(newText)) {
      return this.htmlAwareDiff(oldText, newText);
    }

    // Fallback to character-based diff
    return this.characterBasedDiff(oldText, newText);
  }

  private static looksLikeHTML(text: string): boolean {
    // Simple heuristic to detect HTML content
    return /<[^>]+>/.test(text) || text.includes('&lt;') || text.includes('&gt;');
  }

  private static htmlAwareDiff(oldText: string, newText: string): DiffOperation[] {
    const oldTokens = HTMLTokenizer.tokenize(oldText);
    const newTokens = HTMLTokenizer.tokenize(newText);

    // Use token-based LCS (Longest Common Subsequence) algorithm
    const operations: DiffOperation[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    // Find matching token sequences
    const lcs = this.findLCS(oldTokens, newTokens);
    
    let lcsIndex = 0;
    let currentOldPos = 0;
    let currentNewPos = 0;

    while (lcsIndex < lcs.length || oldIndex < oldTokens.length || newIndex < newTokens.length) {
      const currentLCS = lcs[lcsIndex];

      // Add deletions before the current LCS match
      while (oldIndex < oldTokens.length && (!currentLCS || oldTokens[oldIndex] !== currentLCS.oldToken)) {
        const token = oldTokens[oldIndex];
        operations.push({
          operation: "delete",
          text: token.content,
          oldIndex: currentOldPos
        });
        currentOldPos += token.content.length;
        oldIndex++;
      }

      // Add insertions before the current LCS match
      while (newIndex < newTokens.length && (!currentLCS || newTokens[newIndex] !== currentLCS.newToken)) {
        const token = newTokens[newIndex];
        operations.push({
          operation: "insert",
          text: token.content,
          newIndex: currentNewPos
        });
        currentNewPos += token.content.length;
        newIndex++;
      }

      // Add the equal operation for LCS match
      if (currentLCS && oldIndex < oldTokens.length && newIndex < newTokens.length) {
        const token = oldTokens[oldIndex];
        operations.push({
          operation: "equal",
          text: token.content
        });
        currentOldPos += token.content.length;
        currentNewPos += token.content.length;
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else {
        break;
      }
    }

    return this.consolidateOperations(operations);
  }

  private static findLCS(oldTokens: HTMLToken[], newTokens: HTMLToken[]): Array<{oldToken: HTMLToken, newToken: HTMLToken}> {
    // Simple LCS implementation for tokens
    const lcs: Array<{oldToken: HTMLToken, newToken: HTMLToken}> = [];
    
    // O(n*m) dynamic programming approach for LCS
    const dp: number[][] = Array(oldTokens.length + 1).fill(null).map(() => Array(newTokens.length + 1).fill(0));
    
    for (let i = 1; i <= oldTokens.length; i++) {
      for (let j = 1; j <= newTokens.length; j++) {
        if (this.tokensEqual(oldTokens[i-1], newTokens[j-1])) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }

    // Reconstruct LCS
    let i = oldTokens.length;
    let j = newTokens.length;
    
    while (i > 0 && j > 0) {
      if (this.tokensEqual(oldTokens[i-1], newTokens[j-1])) {
        lcs.unshift({oldToken: oldTokens[i-1], newToken: newTokens[j-1]});
        i--;
        j--;
      } else if (dp[i-1][j] > dp[i][j-1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  private static tokensEqual(token1: HTMLToken, token2: HTMLToken): boolean {
    return token1.type === token2.type && token1.content === token2.content;
  }

  private static characterBasedDiff(oldText: string, newText: string): DiffOperation[] {
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

  private static consolidateOperations(operations: DiffOperation[]): DiffOperation[] {
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
          text: mergedText
        });
        i = j;
      } else if (op.operation === "delete") {
        // Merge consecutive delete operations
        let mergedText = op.text;
        let startIndex = op.oldIndex;
        let j = i + 1;
        
        while (j < operations.length && operations[j].operation === "delete") {
          mergedText += operations[j].text;
          j++;
        }
        
        consolidated.push({
          operation: "delete",
          text: mergedText,
          oldIndex: startIndex
        });
        i = j;
      } else if (op.operation === "insert") {
        // Merge consecutive insert operations
        let mergedText = op.text;
        let startIndex = op.newIndex;
        let j = i + 1;
        
        while (j < operations.length && operations[j].operation === "insert") {
          mergedText += operations[j].text;
          j++;
        }
        
        consolidated.push({
          operation: "insert",
          text: mergedText,
          newIndex: startIndex
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
      return;
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
      return;
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
   * This version consolidates operations to prevent hundreds of tiny changes
   */
  private convertDiffOpsToTrackedChanges(
    diffOps: DiffOperation[],
    field: "content" | "title",
  ): TrackedChange[] {
    const changes: TrackedChange[] = [];
    let currentPosition = 0;

    // Process operations and consolidate them properly
    for (const op of diffOps) {
      switch (op.operation) {
        case "equal":
          // Just advance the position, no change to track
          currentPosition += op.text.length;
          break;

        case "insert":
          changes.push({
            id: generateChangeId(),
            type: "insert",
            position: currentPosition,
            text: op.text,
            field,
            timestamp: Date.now(),
            applied: false,
            selected: true,
          });
          // Insert doesn't advance currentPosition since it's an insertion at this point
          break;

        case "delete":
          changes.push({
            id: generateChangeId(),
            type: "delete",
            position: currentPosition,
            length: op.text.length,
            field,
            timestamp: Date.now(),
            applied: false,
            selected: true,
          });
          // Deletion advances position since we're "past" the deleted content in the original
          currentPosition += op.text.length;
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
