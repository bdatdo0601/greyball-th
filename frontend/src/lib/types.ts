export interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: string;
  title: string;
  version_number: number;
  created_at: string;
  change_description?: string;
}

export interface DocumentChange {
  type:
    | "insert"
    | "delete"
    | "replace"
    | "format_add"
    | "format_remove"
    | "format_change";
  position?: number;
  length?: number;
  text?: string;
  field: "title" | "content";
  formatType?: string;
  formatValue?: any;
}

export interface TrackedChange {
  id: string;
  type:
    | "insert"
    | "delete"
    | "replace"
    | "format_add"
    | "format_remove"
    | "format_change";
  position: number;
  length?: number;
  text?: string;
  oldText?: string;
  field: "title" | "content";
  timestamp: number;
  applied: boolean;
  selected: boolean;
  preview?: string;
  // New properties for styling changes
  formatType?:
    | "bold"
    | "italic"
    | "heading"
    | "bulletList"
    | "orderedList"
    | "blockquote"
    | "codeBlock"
    | "link"
    | "underline"
    | "strike"
    | "highlight"
    | "code"
    | "color"
    | "fontSize";
  formatValue?: string | number | boolean; // For attributes like heading level, color value, font size, etc.
  previousFormatValue?: string | number | boolean; // Previous value for format changes
  htmlBefore?: string; // HTML snippet before the change
  htmlAfter?: string; // HTML snippet after the change
  affectedText?: string; // The actual text that was formatted
}

export interface ChangeTrackingState {
  enabled: boolean;
  changes: TrackedChange[];
  originalContent: string;
  originalTitle: string;
  previewContent: string;
  previewTitle: string;
}

export interface PatchRequest {
  changes: DocumentChange[];
  metadata?: {
    changeDescription?: string;
    editorVersion?: string;
    timestamp?: string;
  };
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Search-related types for FlexSearch integration
export interface SearchOptions {
  limit?: number;
  field?: string[];
  suggest?: boolean;
}

export interface SearchResponse {
  documents: Document[];
  query: string;
  count: number;
  searchEngine: string;
}

export interface SuggestResponse {
  suggestions: string[];
  query: string;
  count: number;
}

export interface SearchStatsResponse {
  totalDocuments: number;
  indexSize: string;
  searchEngine: string;
}
