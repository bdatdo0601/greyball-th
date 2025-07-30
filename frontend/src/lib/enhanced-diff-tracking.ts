import { generateChangeId } from "./changeTracking";
import { type DiffOperation, MyersDiff } from "./myers-diff-algo";
import type { DocumentChange, TrackedChange } from "./types";

// Enhanced change tracker state
export interface EnhancedChangeState {
  oldContent: string;
  oldTitle: string;
  pendingChanges: Map<string, TrackedChange>;
  lastProcessedContent: string;
  lastProcessedTitle: string;
  debounceTimer: NodeJS.Timeout | null;
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

    // Calculate diff against the original baseline using Myers algorithm
    // Use word-level granularity for content fields, character-level for titles
    const diffOps =
      field === "content"
        ? MyersDiff.diffWords(oldContent, newContent)
        : MyersDiff.diffStrings(oldContent, newContent);

    console.log("🔍 Enhanced Tracker - Myers Diff Operations:", diffOps);

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

        case "insert": {
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
        }

        case "delete": {
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
  } = {},
): EnhancedChangeTracker {
  return new EnhancedChangeTracker(
    initialContent,
    initialTitle,
    options.debounceDelay ?? 300,
    options.onChangesUpdated ?? (() => {}),
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
