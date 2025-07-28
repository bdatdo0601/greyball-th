"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Document } from "@/lib/types";
import apiClient from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Dynamically import TipTap v3 readonly editor
const ReadOnlyTiptapV3 = dynamic(
  () => import("@/components/editor/readonly-tiptap"),
  {
    ssr: false,
    loading: () => (
      <div className="border rounded-md bg-gray-50 animate-pulse">
        <div className="border-b p-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    ),
  },
);

interface Props {
  params: {
    id: string;
  };
}

export default function ViewDocumentPage({ params }: Props) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadDocument();
  }, [params.id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDocument(params.id);
      setDocument(response.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>

        <div className="border rounded-md bg-gray-50 animate-pulse">
          <div className="border-b p-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <svg
            className="mx-auto h-12 w-12 text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Failed to Load Document
          </h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-6 flex gap-4 justify-center">
            <Button onClick={loadDocument}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Documents
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="p-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {document.title}
            </h1>
            <p className="text-sm text-gray-600">
              Created {formatDate(document.created_at)} • Last updated{" "}
              {formatDate(document.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/documents/${document.id}`}>
            <Button>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Read-only Editor */}
      <ReadOnlyTiptapV3
        title={document.title}
        content={document.content}
        showTitle={false}
        showJsonDebug={true}
      />

      {/* Document Info */}
      <div className="bg-gray-50 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Document Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Created:</span>
            <span className="block font-medium text-gray-900">
              {new Date(document.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Last Modified:</span>
            <span className="block font-medium text-gray-900">
              {new Date(document.updated_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Document ID:</span>
            <span className="block font-mono text-xs text-gray-700">
              {document.id}
            </span>
          </div>
        </div>

        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="mt-4">
            <span className="text-gray-600">Metadata:</span>
            <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
              {JSON.stringify(document.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
