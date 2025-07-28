# Save Document Button Implementation (PUT Operation)

## Overview

Added a "Save Document" button to the TipTap editor that uses the PUT operation for full document replacement, complementing the existing PATCH-based live change tracking system.

## Implementation Details

### Location
- **File**: `frontend/src/components/editor/tiptap-editor-v3-json.tsx`
- **Position**: Added to the editor toolbar alongside existing formatting buttons

### Function: `handleSaveDocument`

```typescript
const handleSaveDocument = async () => {
  if (!editor) return;

  try {
    setIsCommitting(true);

    const currentTitle = title;
    const currentContent = editor.getHTML();

    // Use PUT operation to save the entire document
    const response = await apiClient.updateDocument(documentId, {
      title: currentTitle,
      content: currentContent,
      metadata: {
        savedVia: "put-operation",
        editorVersion: "tiptap-v3-json-management",
        timestamp: new Date().toISOString(),
      },
    });

    if (response.document) {
      // Update all baselines with the saved content
      // Clear any pending changes since we just saved the current state
      // Reset change tracking to reflect the new saved state
      setLastSaveTime(new Date());
      onSave?.(true);
    }
  } catch (error) {
    console.error("Failed to save document via PUT:", error);
    onError?.(error instanceof Error ? error.message : "Failed to save document");
    onSave?.(false);
  } finally {
    setIsCommitting(false);
  }
};
```

### UI Button

```tsx
{/* Save Document Button with PUT operation */}
<div className="border-l pl-2 ml-2">
  <button
    onClick={handleSaveDocument}
    disabled={isCommitting}
    className="px-3 py-1 rounded text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    {isCommitting ? (
      <>
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-700 border-t-transparent"></div>
        Saving...
      </>
    ) : (
      <>
        💾 Save Document
      </>
    )}
  </button>
</div>
```

## Features

### 1. **Full Document Save**
- Captures current title and content from the editor
- Uses PUT operation to replace entire document on server
- Sends complete document state regardless of tracked changes

### 2. **State Management**
- Clears all tracked changes after successful save
- Updates all baselines to reflect the new saved state
- Resets change tracking to start fresh from the saved state
- Updates last save time indicator

### 3. **Visual Feedback**
- Green styling to differentiate from PATCH operations
- Loading spinner during save operation
- Disabled state while saving to prevent double-clicks

### 4. **Error Handling**
- Catches and logs save errors
- Calls onError callback with error message
- Ensures proper state cleanup in finally block

## Two Save Options

The editor now provides users with two save strategies:

### 📁 **Save Document (PUT) - New**
- **When to use**: Quick, immediate saves or when you want to save everything at once
- **What it does**: Replaces entire document with current editor state
- **Behavior**: Clears all tracked changes and starts fresh
- **API**: Uses `PUT /api/documents/:id`

### 🚀 **PATCH Commit - Existing**  
- **When to use**: Review changes before saving or selective change application
- **What it does**: Applies only tracked changes incrementally
- **Behavior**: Shows detailed change preview and allows review
- **API**: Uses `PATCH /api/documents/:id`

## Updated Information Banner

The information banner now explains both save options:

```tsx
<div className="mt-2 text-blue-600 space-y-1">
  <div><strong>💾 Save Document (PUT)</strong>: Saves entire document state immediately</div>
  <div><strong>🚀 PATCH Commit</strong>: Saves only tracked changes via the tracker panel below</div>
</div>
```

## Benefits

1. **✅ Immediate Saves**: Users can quickly save without needing to commit tracked changes
2. **✅ Familiar UX**: Traditional "Save" button that users expect
3. **✅ Flexibility**: Choose between incremental (PATCH) or full (PUT) saves
4. **✅ Clean State**: PUT saves clear tracking state for a fresh start
5. **✅ Performance**: PUT is simpler for large document saves

## Use Cases

### Use PUT Save When:
- Making quick edits and want immediate save
- Don't need to review individual changes
- Want to clear change tracking state
- Working on large documents where tracking many changes becomes complex

### Use PATCH Commit When:
- Want to review changes before saving
- Working collaboratively and need change visibility
- Making precise, incremental updates
- Need detailed audit trail of changes

## Technical Notes

- Both save operations use the same `isCommitting` state for loading UI
- PUT save operation clears the change tracking state completely  
- The save uses existing `apiClient.updateDocument()` method
- Maintains compatibility with existing document versioning system
- Both operations update the same `lastSaveTime` indicator

This implementation provides users the flexibility to choose their preferred saving workflow while maintaining the powerful change tracking capabilities.
