# Tiptap v3 + JSON Content Management Upgrade

## Overview

This upgrade implements Tiptap v3 with JSON-based content management while maintaining HTML storage for the API. The system now handles content in JSON format internally for better performance and flexibility, while converting to HTML for API storage.

## Architecture

```
┌─────────────────────────────────────────┐
│                UI Layer                 │
├─────────────────────────────────────────┤
│           Tiptap v3 Editor              │
│     (JSON for internal management)      │
├─────────────────────────────────────────┤
│         Content Conversion             │
│    JSON ↔ HTML (API compatibility)     │
├─────────────────────────────────────────┤
│              API Layer                  │
│         (HTML storage only)            │
└─────────────────────────────────────────┘
```

## Key Components

### 1. TipTapEditorV3Json
**Path**: `frontend/src/components/editor/tiptap-editor-v3-json.tsx`

**Features**:
- **Tiptap v3 Compatibility**: Latest Tiptap v3.0.7 with improved performance
- **JSON Content Management**: Internal JSON structure for better content manipulation
- **HTML API Compatibility**: Converts JSON to HTML for API storage
- **Live Change Tracking**: Enhanced debounced change detection
- **Debug Tools**: JSON content inspection and debugging

**Key Improvements**:
```typescript
// JSON Document structure
interface JSONDocument {
  type: "doc";
  content: Array<{
    type: string;
    attrs?: Record<string, any>;
    content?: Array<{
      type: string;
      attrs?: Record<string, any>;
      text?: string;
      marks?: Array<{
        type: string;
        attrs?: Record<string, any>;
      }>;
    }>;
  }>;
}
```

### 2. ReadOnlyTiptapV3
**Path**: `frontend/src/components/editor/readonly-tiptap.tsx`

**Features**:
- **Complete Readonly Mode**: All editing interactions disabled
- **JSON Debug Support**: View internal JSON structure
- **Copy Support**: Text selection and copying preserved
- **Tiptap v3 Compatibility**: Uses latest Tiptap APIs

### 3. Content Conversion System

**HTML to JSON Conversion**:
```typescript
const htmlToJson = useCallback((html: string): JSONDocument | null => {
  try {
    const tempEditor = new Editor({
      extensions: [StarterKit],
      content: html,
    });
    const json = tempEditor.getJSON() as JSONDocument;
    tempEditor.destroy();
    return json;
  } catch (error) {
    console.error("Failed to convert HTML to JSON:", error);
    return null;
  }
}, []);
```

**JSON to HTML Conversion**:
```typescript
const jsonToHtml = useCallback((json: JSONDocument | null, editor: Editor | null): string => {
  if (!json || !editor) return "";
  try {
    const tempEditor = new Editor({
      extensions: [StarterKit],
      content: json,
    });
    const html = tempEditor.getHTML();
    tempEditor.destroy();
    return html;
  } catch (error) {
    console.error("Failed to convert JSON to HTML:", error);
    return "";
  }
}, []);
```

## Content Flow

### 1. Content Loading (API → Editor)
```
API (HTML) → htmlToJson() → JSON Document → Editor
```

### 2. Content Editing (Real-time)
```
User Input → JSON Update → Internal State → Change Tracking
```

### 3. Content Saving (Editor → API)
```
JSON Document → jsonToHtml() → HTML → API Storage
```

## Live Change Tracking Improvements

### Fixed Issues:
1. **Multiple Trigger Problem**: Debounced change detection (300ms)
2. **Content Conflicts**: Tracking pause during commits
3. **Performance Issues**: Better timeout management
4. **State Synchronization**: Improved JSON/HTML sync

### Implementation:
```typescript
const debouncedChangeDetection = useCallback(
  debounce((currentJson: JSONDocument | null, field: 'content' | 'title' = 'content') => {
    if (isTrackingPaused || isUpdatingFromTracking.current || !changeTracking.enabled) {
      return;
    }
    // Change detection logic with proper JSON handling
  }, 300),
  [changeTracking.enabled, isTrackingPaused, title, editor, jsonToHtml]
);
```

## Package Updates

Updated to Tiptap v3.0.7:
```json
{
  "@tiptap/react": "^3.0.7",
  "@tiptap/starter-kit": "^3.0.7", 
  "@tiptap/extension-placeholder": "^3.0.7",
  "@tiptap/core": "^3.0.7",
  "@tiptap/pm": "^3.0.7"
}
```

## Page Component Updates

### 1. Live Edit Page
- Uses `TipTapEditorV3Json` with change tracking enabled
- Real-time JSON management with HTML API storage

### 2. Regular Edit Page  
- Uses `TipTapEditorV3Json` with change tracking disabled
- Standard JSON editing with HTML API storage

### 3. View Page
- Uses `ReadOnlyTiptapV3` for document viewing
- JSON debug mode enabled for content inspection

## Debug Features

### JSON Content Inspection
- **Debug JSON Button**: Inspect internal JSON structure
- **Content Format Panel**: Compare JSON vs HTML formats
- **Development Tools**: Console logging for debugging

### Usage:
```tsx
// Enable JSON debugging in readonly mode
<ReadOnlyTiptapV3
  title={document.title}
  content={document.content}
  showJsonDebug={true}
/>

// Debug JSON content in editor
<TipTapEditorV3Json
  documentId={document.id}
  initialTitle={document.title}
  initialContent={document.content}
  enableChangeTracking={true}
/>
```

## Benefits

### Performance Improvements
- **JSON Operations**: Faster content manipulation
- **Debounced Updates**: Reduced API calls
- **Memory Management**: Better cleanup of temporary editors
- **Change Detection**: Optimized diff calculations

### Developer Experience
- **Type Safety**: Strong TypeScript interfaces
- **Debug Tools**: JSON content inspection
- **Modern APIs**: Latest Tiptap v3 features
- **Cleaner Code**: Separation of concerns

### User Experience
- **Stable Live Tracking**: No more duplicate/conflicting changes
- **Better Performance**: Smoother editing experience
- **Enhanced Readonly**: Clear visual indicators
- **Consistent Content**: Reliable JSON ↔ HTML conversion

## API Compatibility

The system maintains full backward compatibility with existing HTML-based APIs:

1. **API Still Receives HTML**: No backend changes required
2. **Database Storage**: HTML format preserved
3. **Legacy Support**: Existing documents work without migration
4. **Gradual Transition**: Can be deployed incrementally

## Testing Scenarios

### 1. Content Conversion Testing
```javascript
// Test HTML → JSON → HTML roundtrip
const originalHtml = '<p>Hello <strong>world</strong>!</p>';
const json = htmlToJson(originalHtml);
const convertedHtml = jsonToHtml(json, editor);
console.assert(originalHtml === convertedHtml);
```

### 2. Live Tracking Testing
```javascript
// Test change detection with rapid typing
// Should be debounced to prevent excessive updates
typeText("Hello world", { rapidTyping: true });
expect(changeDetectionCalls).toBeLessThan(5);
```

### 3. JSON Structure Testing
```javascript
// Test JSON document structure validity
const json = editor.getJSON();
expect(json.type).toBe("doc");
expect(json.content).toBeArray();
```

## Migration Guide

### For New Projects
Use `TipTapEditorV3Json` directly:

```tsx
import TipTapEditorV3Json from '@/components/editor/tiptap-editor-v3-json';

<TipTapEditorV3Json
  documentId={document.id}
  initialTitle={document.title}
  initialContent={document.content}
  enableChangeTracking={true}
/>
```

### For Existing Projects
1. Install Tiptap v3 packages
2. Replace component imports
3. Test content conversion
4. Deploy gradually

### API Considerations
No backend changes required - the system handles JSON internally but sends HTML to existing APIs.

## Future Enhancements

### Planned Features
1. **Advanced JSON Operations**: Direct JSON manipulation APIs
2. **Content Validation**: JSON schema validation
3. **Performance Monitoring**: Content conversion metrics
4. **Export Features**: JSON export/import functionality
5. **Collaborative Editing**: Real-time JSON synchronization

### Potential Optimizations
1. **Content Caching**: Cache JSON/HTML conversions
2. **Differential Updates**: Send only JSON changes
3. **Background Processing**: Async content conversion
4. **Memory Optimization**: Reduce temporary editor instances

## Troubleshooting

### Common Issues
1. **Content Conversion Errors**: Check JSON structure validity
2. **Performance Issues**: Monitor debounce timing
3. **Memory Leaks**: Ensure temporary editors are destroyed
4. **Type Errors**: Verify JSONDocument interface compliance

### Debug Commands
```javascript
// Inspect current JSON content
console.log('JSON Content:', editor.getJSON());

// Compare HTML and JSON
console.log('HTML:', editor.getHTML());
console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

// Check conversion integrity
const html = editor.getHTML();
const json = htmlToJson(html);
const backToHtml = jsonToHtml(json, editor);
console.log('Conversion integrity:', html === backToHtml);
```
