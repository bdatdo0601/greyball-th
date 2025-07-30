export interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: string;
  title: string;
  version_number: number;
  created_at: Date;
  change_description?: string;
}

export interface DocumentChange {
  type: "insert" | "delete" | "replace";
  position?: number;
  length?: number;
  text?: string;
  field: "title" | "content";
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
