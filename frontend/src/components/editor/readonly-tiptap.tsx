"use client";

import { Extension } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect } from "react";

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

// Readonly extension that disables all interactions
const ReadOnlyExtension = Extension.create({
  name: "readOnly",
  
  addKeyboardShortcuts() {
    return {
      // Disable all keyboard shortcuts except copy
      'Mod-z': () => true,
      'Mod-y': () => true,
      'Mod-a': () => false, // Allow select all
      'Mod-x': () => true,
      'Mod-c': () => false, // Allow copy
      'Mod-v': () => true,
      'Delete': () => true,
      'Backspace': () => true,
    };
  },

  addProseMirrorPlugins() {
    return [];
  },
});

interface ReadOnlyTiptapV3Props {
  title: string;
  content: string; // HTML content from API
  className?: string;
  showTitle?: boolean;
  titleClassName?: string;
  contentClassName?: string;
  showJsonDebug?: boolean;
}

const ReadOnlyTiptapV3: React.FC<ReadOnlyTiptapV3Props> = ({
  title,
  content,
  className = "",
  showTitle = true,
  titleClassName = "",
  contentClassName = "",
  showJsonDebug = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ReadOnlyExtension,
    ],
    content: content,
    editable: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none bg-gray-50 cursor-default ${contentClassName}`,
        spellcheck: "false",
      },
      // Prevent all interactions except selection
      transformPastedHTML: () => "",
      transformPastedText: () => "",
    },
    onCreate: ({ editor }) => {
      // Ensure readonly state
      const editorElement = editor.view.dom as HTMLElement;
      editorElement.style.cssText += `
        pointer-events: none !important;
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        background-color: #f9fafb !important;
        cursor: default !important;
      `;
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Get JSON content for debugging
  const getJsonContent = (): JSONDocument | null => {
    if (!editor) return null;
    try {
      return editor.getJSON() as JSONDocument;
    } catch (error) {
      console.error("Failed to get JSON content:", error);
      return null;
    }
  };

  if (!editor) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="border rounded-md bg-gray-50 animate-pulse">
          {showTitle && (
            <div className="border-b p-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          )}
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-md bg-gray-50 shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b p-4 bg-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-600">Document Viewer (Tiptap v3)</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Read-only mode
          </div>
        </div>
        {showJsonDebug && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log('JSON Content:', getJsonContent())}
              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 hover:bg-purple-200"
            >
              Debug JSON
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      {showTitle && (
        <div className="border-b p-4 bg-white">
          <h1 className={`text-2xl font-bold text-gray-800 ${titleClassName}`}>
            {title}
          </h1>
        </div>
      )}

      {/* Content */}
      <div className="p-4 bg-white min-h-[300px]">
        <EditorContent
          editor={editor}
          className="readonly-editor-content"
        />
      </div>

      {/* JSON Debug Panel */}
      {showJsonDebug && (
        <div className="border-t p-2 bg-gray-50 text-xs font-mono">
          <details className="cursor-pointer">
            <summary className="text-gray-600 hover:text-gray-900">
              Debug: Content in JSON Format (Click to expand)
            </summary>
            <div className="mt-2 max-h-32 overflow-auto bg-white p-2 rounded border">
              <pre className="text-purple-600">
                {JSON.stringify(getJsonContent(), null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Footer with readonly info */}
      <div className="border-t p-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            This document is in read-only mode. Text can be selected and copied.
            {showJsonDebug && (
              <span className="ml-2 text-purple-600">
                • JSON content managed internally
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+A</kbd>
            <span>Select All</span>
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-2">Ctrl+C</kbd>
            <span>Copy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyTiptapV3;
