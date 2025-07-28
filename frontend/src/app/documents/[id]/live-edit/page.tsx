"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Document, DocumentVersion } from "@/lib/types";
import apiClient from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamically import TipTap v3 JSON editor to avoid SSR issues
const TipTapEditorV3Json = dynamic(
  () => import("@/components/editor/tiptap-editor-v3-json"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="border rounded-md bg-gray-50 animate-pulse">
          <div className="border-b p-4 bg-gray-100">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="border-b p-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
        <div className="border rounded-md bg-gray-50 animate-pulse p-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
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

export default function LiveTrackingEditPage({ params }: Props) {
  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const router = useRouter();

  useEffect(() => {
    loadDocument();
    loadVersions();
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

  const loadVersions = async () => {
    try {
      const response = await apiClient.getDocumentVersions(params.id);
      setVersions(response.versions);
    } catch (err) {
      console.error("Failed to load versions:", err);
      // Don't set error for versions as it's not critical
    }
  };

  const handleSave = (saved: boolean) => {
    setSaveStatus(saved ? "saved" : "error");
    if (saved) {
      // Reload the document to get fresh data
      loadDocument();
      loadVersions();
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSaveStatus("error");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-4">
            <div className="border rounded-md bg-gray-50 animate-pulse">
              <div className="border-b p-4 bg-gray-100">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="border-b p-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
            <div className="border rounded-md bg-gray-50 animate-pulse p-4">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4 space-y-3 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
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
    <div className="max-w-6xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Live Tracking Editor
              <span className="text-sm font-normal text-gray-500 bg-green-100 px-2 py-1 rounded-full">
                🔴 LIVE
              </span>
            </h1>
            <p className="text-sm text-gray-600">
              Real-time change tracking • Last updated{" "}
              {formatDate(document.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          <div className="text-sm">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                All changes committed
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                Commit failed
              </span>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setShowVersions(!showVersions)}
          >
            {showVersions ? "Hide" : "Show"} Versions ({versions.length})
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L8.586 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`grid gap-6 ${showVersions ? "lg:grid-cols-4" : "lg:grid-cols-1"}`}
      >
        {/* Editor */}
        <div className={showVersions ? "lg:col-span-3" : "lg:col-span-1"}>
          <TipTapEditorV3Json
            documentId={document.id}
            initialTitle={document.title}
            initialContent={document.content}
            onSave={handleSave}
            onError={handleError}
          />
        </div>

        {/* Version History Sidebar */}
        {showVersions && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Version History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {versions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-400 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <p className="text-sm">No versions yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Versions are created when you commit changes
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {versions.map((version, index) => (
                      <div
                        key={version.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Version {version.version_number}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(version.created_at)}
                            </p>
                            {version.change_description && (
                              <p className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">
                                {version.change_description}
                              </p>
                            )}
                          </div>
                          {index === 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Latest
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
