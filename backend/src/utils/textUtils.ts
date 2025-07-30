import type { DocumentChange } from "../types";

/**
 * Apply delta changes to text content
 */
export function applyDeltaChanges(
  originalText: string,
  changes: DocumentChange[],
): string {
  let result = originalText;

  // Sort changes by position in ascending order and track position adjustments
  const sortedChanges = [...changes].sort(
    (a, b) => (a.position || 0) - (b.position || 0),
  );

  let positionOffset = 0;

  for (const change of sortedChanges) {
    switch (change.type) {
      case "insert": {
        const insertPos = (change.position || 0) + positionOffset;
        const insertText = change.text || "";
        result =
          result.slice(0, insertPos) + insertText + result.slice(insertPos);
        positionOffset += insertText.length;
        break;
      }

      case "delete": {
        const deleteStart = (change.position || 0) + positionOffset;
        const deleteLength = change.length || 0;
        const deleteEnd = deleteStart + deleteLength;
        result = result.slice(0, deleteStart) + result.slice(deleteEnd);
        positionOffset -= deleteLength;
        break;
      }

      case "replace": {
        const replaceStart = (change.position || 0) + positionOffset;
        const replaceLength = change.length || 0;
        const replaceEnd = replaceStart + replaceLength;
        const replaceText = change.text || "";
        result =
          result.slice(0, replaceStart) +
          replaceText +
          result.slice(replaceEnd);
        positionOffset += replaceText.length - replaceLength;
        break;
      }
    }
  }

  return result;
}

/**
 * Validate delta changes
 */
export function validateDeltaChanges(
  originalText: string,
  changes: DocumentChange[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];

    // Validate position
    if (change.position !== undefined && change.position < 0) {
      errors.push(`Change ${i}: position cannot be negative`);
    }

    if (
      change.position !== undefined &&
      change.position > originalText.length
    ) {
      errors.push(`Change ${i}: position exceeds text length`);
    }

    // Validate length for delete/replace operations
    if (
      (change.type === "delete" || change.type === "replace") &&
      change.length !== undefined &&
      change.length < 0
    ) {
      errors.push(`Change ${i}: length cannot be negative`);
    }

    // Validate text for insert/replace operations
    if (
      (change.type === "insert" || change.type === "replace") &&
      change.text === undefined
    ) {
      errors.push(
        `Change ${i}: text is required for ${change.type} operations`,
      );
    }

    // Validate field
    if (!["title", "content"].includes(change.field)) {
      errors.push(`Change ${i}: field must be 'title' or 'content'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate simple diff between two texts (basic implementation for POC)
 */
export function calculateSimpleDiff(
  oldText: string,
  newText: string,
  field: "title" | "content" = "content",
): DocumentChange[] {
  const changes: DocumentChange[] = [];

  if (oldText === newText) {
    return changes;
  }

  // Very basic diff - in production, use a proper diff algorithm like Myers
  if (newText.length > oldText.length) {
    // Find common prefix
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < oldText.length &&
      commonPrefixLength < newText.length &&
      oldText[commonPrefixLength] === newText[commonPrefixLength]
    ) {
      commonPrefixLength++;
    }

    // Simple insertion at the end of common prefix
    changes.push({
      type: "insert",
      position: commonPrefixLength,
      text: newText.slice(
        commonPrefixLength,
        newText.length - (oldText.length - commonPrefixLength),
      ),
      field,
    });
  } else if (newText.length < oldText.length) {
    // Find common prefix
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < oldText.length &&
      commonPrefixLength < newText.length &&
      oldText[commonPrefixLength] === newText[commonPrefixLength]
    ) {
      commonPrefixLength++;
    }

    // Simple deletion from the end of common prefix
    changes.push({
      type: "delete",
      position: commonPrefixLength,
      length: oldText.length - newText.length,
      field,
    });
  } else {
    // Same length, assume replacement
    changes.push({
      type: "replace",
      position: 0,
      length: oldText.length,
      text: newText,
      field,
    });
  }

  return changes;
}

/**
 * Merge consecutive similar operations
 */
export function optimizeChanges(changes: DocumentChange[]): DocumentChange[] {
  if (changes.length <= 1) return changes;

  const optimized: DocumentChange[] = [];
  let current = changes[0];

  for (let i = 1; i < changes.length; i++) {
    const next = changes[i];

    // Check if we can merge consecutive insertions
    if (
      current.type === "insert" &&
      next.type === "insert" &&
      current.field === next.field &&
      current.position !== undefined &&
      next.position !== undefined &&
      current.position + (current.text?.length || 0) === next.position
    ) {
      current = {
        ...current,
        text: (current.text || "") + (next.text || ""),
      };
    } else {
      optimized.push(current);
      current = next;
    }
  }

  optimized.push(current);
  return optimized;
}
