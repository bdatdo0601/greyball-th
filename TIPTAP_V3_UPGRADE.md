# Tiptap Editor v3 Upgrade & Live Tracking Fixes

## Overview

This document outlines the upgrade to Tiptap Editor v3, fixes for live tracking issues, and the addition of a comprehensive readonly mode.

## Changes Made

### 1. Package Upgrades

Updated `package.json` to use Tiptap v3:

```json
{
  "dependencies": {
    "@tiptap/react": "^3.2.0",
    "@tiptap/starter-kit": "^3.2.0", 
    "@tiptap/extension-placeholder": "^3.2.0",
    "@tiptap/core": "^3.2.0",
    "@tiptap/pm": "^3.2.0"
  }
}
```

### 2. New Components Created

#### a) TipTapEditorV3 (`frontend/src/components/editor/tiptap-editor-v3.tsx`)

**Key Improvements:**
- **Tiptap v3 Compatibility**: Updated for the new API structure
- **Fixed Live Tracking Issues**: 
  - Debounced change detection (300ms delay)
  - Tracking pause during commits to prevent conflicts
  - Improved timeout management
  - Better update batching
- **Enhanced Readonly Support**: 
  - Configurable `readOnly` prop
  - Proper styling and interaction disabling
- **Performance Optimizations**:
  - Reduced excessive re-renders
  - Better memory management
  - Cleaner event handling

**Key Features:**
```typescript
interface TipTapEditorV3Props {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  onSave?: (saved: boolean) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  enableChangeTracking?: boolean;
}
```

#### b) ReadOnlyTiptapEditor (`frontend/src/components/editor/readonly-tiptap.tsx`)

**Dedicated Readonly Component:**
- Complete interaction prevention
- Keyboard shortcuts disabled (except copy)
- Clean, document-viewer styling
- Copy functionality preserved
- Footer with usage hints

**Usage:**
```typescript
<ReadOnlyTiptapEditor
  title="Document Title"
  content="<p>Document content...</p>"
  showTitle={false}
  className="custom-styles"
/>
```

### 3. Live Tracking Issue Fixes

#### Problem: Multiple Change Triggers
**Issue**: Every keystroke was triggering multiple change detection cycles, causing:
- Performance degradation
- Visual marker conflicts
- Excessive API calls

**Solution**: 
- Debounced change detection with 300ms delay
- Tracking pause mechanism during commits
- Improved change batching and merging

#### Problem: Timing Conflicts
**Issue**: Change tracking interfering with content updates during saves

**Solution**:
- `isTrackingPaused` state to prevent conflicts
- `isUpdatingFromTracking` ref to prevent circular updates
- Proper cleanup of timeouts

#### Code Example:
```typescript
const debouncedChangeDetection = useCallback(
  debounce((currentContent: string, field: 'content' | 'title' = 'content') => {
    if (isTrackingPaused || isUpdatingFromTracking.current || !changeTracking.enabled) {
      return;
    }
    // Change detection logic...
  }, 300), 
  [changeTracking.enabled, isTrackingPaused]
);
```

### 4. Updated Page Components

#### Live Edit Page (`frontend/src/app/documents/[id]/live-edit/page.tsx`)
- Uses `TipTapEditorV3` with `enableChangeTracking={true}`
- Enhanced live tracking features

#### Regular Edit Page (`frontend/src/app/documents/[id]/page.tsx`) 
- Uses `TipTapEditorV3` with `enableChangeTracking={false}`
- Standard editing without live tracking

#### View Page (`frontend/src/app/documents/[id]/view/page.tsx`)
- Uses dedicated `ReadOnlyTiptapEditor`
- Clean, document viewer experience

### 5. Readonly Mode Enhancement

#### Features:
- **Complete Interaction Prevention**: All editing disabled
- **Visual Styling**: Clear readonly indicators
- **Copy Support**: Text selection and copying still works
- **Keyboard Shortcuts**: Only copy shortcuts work
- **Footer Information**: Usage hints for users

#### Implementation:
```typescript
// In readonly mode
editorElement.style.cssText += `
  pointer-events: none !important;
  user-select: text !important;
  background-color: #f9fafb !important;
  cursor: default !important;
`;
```

## Migration Guide

### For Existing Projects

1. **Update Dependencies**:
   ```bash
   npm install @tiptap/react@^3.2.0 @tiptap/starter-kit@^3.2.0 @tiptap/extension-placeholder@^3.2.0 @tiptap/core@^3.2.0 @tiptap/pm@^3.2.0
   ```

2. **Replace Old Editor Imports**:
   ```typescript
   // Old
   import TipTapEditorWithLiveTracking from '@/components/editor/tiptap-editor-with-live-tracking'
   
   // New
   import TipTapEditorV3 from '@/components/editor/tiptap-editor-v3'
   ```

3. **Update Component Usage**:
   ```typescript
   // With live tracking
   <TipTapEditorV3
     documentId={document.id}
     initialTitle={document.title}
     initialContent={document.content}
     enableChangeTracking={true}
     onSave={handleSave}
     onError={handleError}
   />
   
   // Without live tracking (regular editing)
   <TipTapEditorV3
     documentId={document.id}
     initialTitle={document.title}
     initialContent={document.content}
     enableChangeTracking={false}
     onSave={handleSave}
     onError={handleError}
   />
   
   // Readonly mode
   <TipTapEditorV3
     documentId={document.id}
     initialTitle={document.title}
     initialContent={document.content}
     readOnly={true}
   />
   
   // Or use dedicated readonly component
   <ReadOnlyTiptapEditor
     title={document.title}
     content={document.content}
   />
   ```

## Benefits

### Performance Improvements
- **Reduced Re-renders**: Debounced change detection
- **Better Memory Usage**: Proper cleanup and timeout management
- **Faster Response**: Optimized update cycles

### User Experience
- **Stable Live Tracking**: No more multiple triggers or conflicts
- **Clear Readonly Mode**: Obvious when document is view-only
- **Better Visual Feedback**: Improved change markers and status indicators

### Developer Experience
- **Modern API**: Tiptap v3 features and improvements
- **Type Safety**: Better TypeScript support
- **Modular Components**: Separate readonly and editable components
- **Configurable**: Multiple modes (live tracking, regular, readonly)

## Testing Recommendations

1. **Live Tracking**: Test rapid typing and ensure changes are captured correctly
2. **Readonly Mode**: Verify all interactions are disabled except text selection
3. **Performance**: Monitor change detection frequency during heavy editing
4. **Memory**: Check for memory leaks during extended editing sessions

## Future Improvements

1. **Advanced Diff Algorithm**: Replace simple diff with more sophisticated algorithms
2. **Real-time Collaboration**: Add multi-user editing capabilities
3. **Version Comparison**: Visual diff between document versions
4. **Export Features**: PDF, Word, markdown export from readonly mode
5. **Accessibility**: Improve screen reader support and keyboard navigation
