"use client";

import "@/styles/live-tracking.css";
import { Extension } from "@tiptap/core";
import { History } from "@tiptap/extension-history";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api";
import {
  applySelectedChanges,
  convertTrackedChangesToPatchRequest,
} from "@/lib/changeTracking";
import {
  createEnhancedChangeTracker,
  type EnhancedChangeTracker,
} from "@/lib/enhanced-diff-tracking";
import type { ChangeTrackingState, TrackedChange } from "@/lib/types";
import EnhancedLiveChangeTracker from "./enhanced-live-change-tracker";

// JSON Document structure for internal content management
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

// Custom extension to handle live change tracking in the editor
const LiveChangeTracking = Extension.create({
  name: "liveChangeTracking",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          "data-change-id": {
            default: null,
          },
          "data-change-type": {
            default: null,
          },
        },
      },
    ];
  },
});

interface TipTapEditorV3JsonProps {
  documentId: string;
  initialTitle: string;
  initialContent: string; // HTML from API
  onSave?: (saved: boolean) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

const TipTapEditorV3Json: React.FC<TipTapEditorV3JsonProps> = ({
  documentId,
  initialTitle,
  initialContent,
  onSave,
  onError,
  readOnly = false,
  className = "",
  placeholder = "Start typing your document content...",
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [_, setIsTrackingPaused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // @ts-ignore
        history: false, // We'll add History extension separately
      }),
      History.configure({
        depth: 100,
        newGroupDelay: 500,
      }),
      LiveChangeTracking,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none ${
          readOnly ? "bg-gray-50 cursor-default" : "bg-white"
        } ${className}`,
      },
      ...(readOnly && {
        transformPastedHTML: () => "",
        transformPastedText: () => "",
      }),
    },
    onUpdate: ({ editor }) => {
      if (readOnly || isUpdatingFromTracking.current) return;

      // Get current content from editor
      const currentHtml = editor.getHTML();

      // Only use the enhanced tracker - disable legacy tracker
      if (enhancedChangeTrackerRef.current) {
        enhancedChangeTrackerRef.current.processContentChange(
          currentHtml,
          "content",
        );
      }

      // Update lastContent to prevent legacy tracker from interfering
      lastContent.current = currentHtml;
    },
    onCreate: ({ editor }) => {
      // IMPORTANT: Update lastContent ref with editor's actual HTML to prevent false positives
      const editorHtml = editor.getHTML();
      lastContent.current = editorHtml;

      console.log("Editor onCreate:", {
        initialContentLength: initialContent.length,
        editorHtmlLength: editorHtml.length,
        areEqual: initialContent === editorHtml,
      });

      // Set readonly styles if needed
      if (readOnly) {
        const editorElement = editor.view.dom as HTMLElement;
        editorElement.style.cssText += `
          pointer-events: ${readOnly ? "none" : "auto"};
          user-select: ${readOnly ? "text" : "auto"};
          -webkit-user-select: ${readOnly ? "text" : "auto"};
          -moz-user-select: ${readOnly ? "text" : "auto"};
          -ms-user-select: ${readOnly ? "text" : "auto"};
          background-color: ${readOnly ? "#f9fafb" : "white"};
          cursor: ${readOnly ? "default" : "text"};
        `;
      }
    },
  });

  // Enhanced change tracking state
  const [trackedChanges, setTrackedChanges] = useState<TrackedChange[]>([]);
  const enhancedChangeTrackerRef = useRef<EnhancedChangeTracker | null>(null);

  // Legacy change tracking state for compatibility
  const [changeTracking, setChangeTracking] = useState<ChangeTrackingState>({
    enabled: !readOnly,
    changes: [],
    originalContent: initialContent,
    originalTitle: initialTitle,
    previewContent: initialContent,
    previewTitle: initialTitle,
  });

  // Refs for tracking state
  const lastContent = useRef(initialContent);
  const lastTitle = useRef(initialTitle);
  const isUpdatingFromTracking = useRef(false);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const changeDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalHtmlContentRef = useRef<string>(initialContent);

  // Helper function to get text content from TipTap editor
  const getEditorTextContent = useCallback((): string => {
    if (!editor) return "";

    // Use TipTap's text extraction which handles nodes properly
    return editor.getText();
  }, [editor]);

  // Helper function to extract clean text from HTML (for fallback)
  const extractCleanText = useCallback((html: string): string => {
    if (!html) return "";

    // Use the same algorithm as backend for consistency
    let cleanText = "";
    let inTag = false;

    for (let i = 0; i < html.length; i++) {
      const char = html[i];

      if (char === "<") {
        inTag = true;
      } else if (char === ">") {
        inTag = false;
        continue; // Don't include the '>' character
      }

      if (!inTag) {
        cleanText += char;
      }
    }

    return cleanText;
  }, []);

  // Helper function to calculate position in editor's text content
  const getTextPosition = useCallback(
    (node: any, offset: number): number => {
      if (!editor) return 0;

      try {
        // Create a position object from the node and offset
        const pos = editor.view.state.doc.resolve(offset);
        let textPosition = 0;

        // Walk through the document to calculate text position
        editor.view.state.doc.nodesBetween(0, pos.pos, (node, nodePos) => {
          if (node.isText) {
            if (nodePos + node.nodeSize <= pos.pos) {
              textPosition += node.text?.length || 0;
            } else if (nodePos < pos.pos) {
              const offsetInNode = pos.pos - nodePos;
              textPosition += Math.min(offsetInNode, node.text?.length || 0);
            }
          }
          return nodePos + node.nodeSize >= pos.pos;
        });

        return textPosition;
      } catch (error) {
        console.warn("Error calculating text position:", error);
        return 0;
      }
    },
    [editor],
  );

  // Get current editor state for change detection
  const getCurrentEditorState = useCallback(() => {
    if (!editor) return { html: "", text: "", json: null };

    return {
      html: editor.getHTML(),
      text: editor.getText(), // This gives us clean text directly from TipTap
      json: editor.getJSON(),
    };
  }, [editor]);

  // Content conversion utilities
  const htmlToJson = useCallback((html: string): JSONDocument | null => {
    try {
      // Use temporary elements to parse HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      // For now, return a simple structure - in a real app you'd use a proper HTML to JSON parser
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: tempDiv.textContent || html,
              },
            ],
          },
        ],
      };
    } catch (error) {
      console.error("Failed to convert HTML to JSON:", error);
      return null;
    }
  }, []);

  const jsonToHtml = useCallback((json: JSONDocument | null): string => {
    if (!json) return "";
    try {
      // Simple JSON to HTML conversion - in a real app you'd use proper serialization
      let html = "";
      if (json.content && json.content.length > 0) {
        json.content.forEach((block) => {
          if (block.type === "paragraph" && block.content) {
            html += "<p>";
            block.content.forEach((inline) => {
              if (inline.text) {
                html += inline.text;
              }
            });
            html += "</p>";
          } else if (block.type === "heading" && block.content) {
            const level = block.attrs?.level || 1;
            html += `<h${level}>`;
            block.content.forEach((inline) => {
              if (inline.text) {
                html += inline.text;
              }
            });
            html += `</h${level}>`;
          }
        });
      }
      return html || "<p></p>";
    } catch (error) {
      console.error("Failed to convert JSON to HTML:", error);
      return "";
    }
  }, []);

  // Initialize enhanced change tracker
  useEffect(() => {
    if (!readOnly) {
      // Initialize the enhanced change tracker
      enhancedChangeTrackerRef.current = createEnhancedChangeTracker(
        initialContent,
        initialTitle,
        {
          debounceDelay: 300,
          onChangesUpdated: (changes) => {
            console.log("Enhanced tracker updated:", changes.length, "changes");
            setTrackedChanges(changes);

            // Also update legacy state for compatibility
            setChangeTracking((prev) => ({
              ...prev,
              changes,
            }));
          },
        },
      );

      console.log("Enhanced change tracker initialized");
    }

    return () => {
      // Clean up enhanced tracker on unmount
      if (enhancedChangeTrackerRef.current) {
        enhancedChangeTrackerRef.current.dispose();
      }
    };
  }, [initialContent, initialTitle, readOnly, extractCleanText]);

  // Initialize legacy tracking for compatibility
  useEffect(() => {
    // Store the actual HTML as the baseline for restoration
    originalHtmlContentRef.current = initialContent;

    // Initialize change tracking with HTML content
    setChangeTracking((prev) => ({
      ...prev,
      originalContent: initialContent,
      originalTitle: initialTitle,
      previewContent: initialContent,
      previewTitle: initialTitle,
    }));

    // Initialize with the initial content
    lastContent.current = initialContent;
    lastTitle.current = initialTitle;
  }, [initialContent, initialTitle, htmlToJson]);

  // Legacy debounced change detection is now disabled
  // All change detection is handled by the enhanced tracker

  // Apply visual change markers to the editor - DISABLED to prevent interference
  const applyVisualChangeMarkers = (changes: TrackedChange[]) => {
    // Temporarily disabled - these visual markers interfere with TipTap's content management
    // and cause infinite loops. Changes will be shown in the LiveChangeTracker component only.
    return;
  };

  const applyContentChangeMarker = (
    editorElement: HTMLElement,
    change: TrackedChange,
  ) => {
    try {
      const textNodes = getTextNodes(editorElement);
      let currentPos = 0;
      let targetNode: Node | null = null;
      let targetOffset = 0;

      for (const node of textNodes) {
        const nodeLength = node.textContent?.length || 0;
        if (currentPos + nodeLength >= change.position) {
          targetNode = node;
          targetOffset = change.position - currentPos;
          break;
        }
        currentPos += nodeLength;
      }

      if (!targetNode || !targetNode.parentElement) return;

      const span = document.createElement("span");
      span.className = `change-marker change-${change.type}`;
      span.setAttribute("data-change-id", change.id);
      span.setAttribute("data-change-type", change.type);
      span.setAttribute("title", `${change.type}: ${change.text || ""}`);

      const styles = getChangeMarkerStyles(change.type);
      Object.assign(span.style, styles);

      if (change.type === "insert") {
        span.textContent = change.text || "";
        insertChangeMarker(targetNode, span, targetOffset);
      } else if (change.type === "delete" && change.length) {
        handleDeleteChangeMarker(targetNode, span, targetOffset, change.length);
      } else if (change.type === "replace" && change.length) {
        handleReplaceChangeMarker(
          targetNode,
          span,
          targetOffset,
          change.length,
          change.text || "",
        );
      }
    } catch (error) {
      console.warn("Failed to apply visual change marker:", error);
    }
  };

  const getChangeMarkerStyles = (type: string) => {
    switch (type) {
      case "insert":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          borderLeft: "3px solid #22c55e",
          paddingLeft: "2px",
          borderRadius: "2px",
        };
      case "delete":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          textDecoration: "line-through",
          borderLeft: "3px solid #ef4444",
          paddingLeft: "2px",
          borderRadius: "2px",
        };
      case "replace":
        return {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
          borderLeft: "3px solid #3b82f6",
          paddingLeft: "2px",
          borderRadius: "2px",
        };
      default:
        return {};
    }
  };

  const insertChangeMarker = (
    targetNode: Node,
    span: HTMLSpanElement,
    targetOffset: number,
  ) => {
    if (targetOffset === 0) {
      targetNode.parentElement!.insertBefore(span, targetNode);
    } else if (targetOffset >= (targetNode.textContent?.length || 0)) {
      targetNode.parentElement!.insertBefore(span, targetNode.nextSibling);
    } else {
      const beforeText = targetNode.textContent?.slice(0, targetOffset) || "";
      const afterText = targetNode.textContent?.slice(targetOffset) || "";
      targetNode.textContent = beforeText;
      const afterTextNode = document.createTextNode(afterText);
      targetNode.parentElement!.insertBefore(span, targetNode.nextSibling);
      targetNode.parentElement!.insertBefore(afterTextNode, span.nextSibling);
    }
  };

  const handleDeleteChangeMarker = (
    targetNode: Node,
    span: HTMLSpanElement,
    targetOffset: number,
    deleteLength: number,
  ) => {
    const actualDeleteLength = Math.min(
      deleteLength,
      (targetNode.textContent?.length || 0) - targetOffset,
    );
    const deletedText =
      targetNode.textContent?.slice(
        targetOffset,
        targetOffset + actualDeleteLength,
      ) || "";

    if (deletedText) {
      span.textContent = deletedText;
      const beforeText = targetNode.textContent?.slice(0, targetOffset) || "";
      const afterText =
        targetNode.textContent?.slice(targetOffset + actualDeleteLength) || "";

      targetNode.textContent = beforeText;
      const afterTextNode = document.createTextNode(afterText);
      targetNode.parentElement!.insertBefore(span, targetNode.nextSibling);
      targetNode.parentElement!.insertBefore(afterTextNode, span.nextSibling);
    }
  };

  const handleReplaceChangeMarker = (
    targetNode: Node,
    span: HTMLSpanElement,
    targetOffset: number,
    replaceLength: number,
    replacementText: string,
  ) => {
    const actualReplaceLength = Math.min(
      replaceLength,
      (targetNode.textContent?.length || 0) - targetOffset,
    );
    const replacedText =
      targetNode.textContent?.slice(
        targetOffset,
        targetOffset + actualReplaceLength,
      ) || "";

    if (replacedText) {
      const deletedSpan = document.createElement("span");
      deletedSpan.className = "change-marker change-delete";
      Object.assign(deletedSpan.style, {
        ...getChangeMarkerStyles("delete"),
        marginRight: "4px",
      });
      deletedSpan.textContent = replacedText;

      span.textContent = replacementText;

      const beforeText = targetNode.textContent?.slice(0, targetOffset) || "";
      const afterText =
        targetNode.textContent?.slice(targetOffset + actualReplaceLength) || "";

      targetNode.textContent = beforeText;
      const afterTextNode = document.createTextNode(afterText);
      targetNode.parentElement!.insertBefore(
        deletedSpan,
        targetNode.nextSibling,
      );
      targetNode.parentElement!.insertBefore(span, deletedSpan.nextSibling);
      targetNode.parentElement!.insertBefore(afterTextNode, span.nextSibling);
    }
  };

  const getTextNodes = (element: HTMLElement): Node[] => {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  };

  // Handle title changes with enhanced tracking
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (readOnly || isUpdatingFromTracking.current) return;

      setTitle(newTitle);

      // Process title change with enhanced tracker
      if (enhancedChangeTrackerRef.current) {
        enhancedChangeTrackerRef.current.processContentChange(
          newTitle,
          "title",
        );
      }
    },
    [readOnly],
  );

  // Update preview when changes selection changes
  useEffect(() => {
    if (changeTracking.enabled) {
      // Use the current editor content for preview calculations, not the stored original
      const currentEditorContent =
        editor?.getHTML() || changeTracking.originalContent;
      const currentTitle = title;

      const previewContent = applySelectedChanges(
        currentEditorContent, // Use current editor content instead of original
        changeTracking.changes,
        "content",
      );
      const previewTitle = applySelectedChanges(
        currentTitle, // Use current title instead of original
        changeTracking.changes,
        "title",
      );

      setChangeTracking((prev) => ({
        ...prev,
        previewContent,
        previewTitle,
      }));

      requestAnimationFrame(() => {
        updateChangeMarkersVisibility();
      });
    }
  }, [
    changeTracking.changes,
    changeTracking.enabled,
    editor,
    title,
    extractCleanText,
  ]);

  const updateChangeMarkersVisibility = () => {
    if (readOnly) return;

    // Since we're not using visual markers in the editor anymore,
    // just update the title input styling if needed
    const titleInput = document.querySelector(
      'input[data-title-input="true"]',
    ) as HTMLInputElement;
    if (titleInput) {
      const hasTitleChanges = changeTracking.changes.some(
        (c) => c.field === "title" && c.selected,
      );
      if (hasTitleChanges) {
        titleInput.classList.add("title-has-changes");
        titleInput.style.borderLeft = "3px solid #3b82f6";
        titleInput.style.paddingLeft = "8px";
        titleInput.style.backgroundColor = "#f8fafc";
      } else {
        titleInput.classList.remove("title-has-changes");
        titleInput.style.borderLeft = "";
        titleInput.style.paddingLeft = "";
        titleInput.style.backgroundColor = "";
      }
    }
  };

  // Save document using PUT operation (full document replacement)
  const handleSaveDocument = async () => {
    if (!editor) return;

    try {
      setIsCommitting(true);

      const currentTitle = title;
      const currentContent = editor.getHTML();

      console.log("Saving document via PUT:", {
        documentId,
        title: currentTitle,
        contentLength: currentContent.length,
      });

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
        console.log("PUT save successful:", {
          documentId: response.document.id,
          title: response.document.title,
          contentLength: response.document.content.length,
        });

        // Update all baselines with the saved content
        const savedHtml = response.document.content;
        const savedTitle = response.document.title;

        originalHtmlContentRef.current = savedHtml;
        lastContent.current = savedHtml;
        lastTitle.current = savedTitle;

        // Reset the enhanced change tracker with new baseline
        if (enhancedChangeTrackerRef.current) {
          enhancedChangeTrackerRef.current.resetBaseline(savedHtml, savedTitle);
        }

        // Clear any pending changes since we just saved the current state
        setChangeTracking((prev) => ({
          ...prev,
          changes: [], // Clear all tracked changes
          originalContent: savedHtml, // Update original to current state
          originalTitle: savedTitle,
          previewContent: savedHtml,
          previewTitle: savedTitle,
        }));

        setLastSaveTime(new Date());
        onSave?.(true);

        console.log(`✅ Successfully saved document using PUT operation`);
      }
    } catch (error) {
      console.error("Failed to save document via PUT:", error);
      onError?.(
        error instanceof Error ? error.message : "Failed to save document",
      );
      onSave?.(false);
    } finally {
      setIsCommitting(false);
    }
  };

  // Commit selected changes to server using PATCH operation
  const handleCommitChanges = async (allChanges: TrackedChange[]) => {
    if (allChanges.length === 0) return;

    try {
      setIsCommitting(true);
      setIsTrackingPaused(true);

      // Convert tracked changes to PATCH request format
      const patchChanges = convertTrackedChangesToPatchRequest(allChanges);

      console.log("Committing changes via PATCH:", {
        changesCount: allChanges.length,
        patchChanges,
      });

      // Use PATCH operation instead of PUT
      const response = await apiClient.patchDocument(documentId, {
        changes: patchChanges,
        metadata: {
          changeDescription: `Live tracking commit: ${allChanges.length} changes`,
          editorVersion: "tiptap-v3-json-management-patch",
          timestamp: new Date().toISOString(),
        },
      });

      if (response.document) {
        console.log("PATCH response:", {
          appliedChanges: response.appliedChanges?.length || 0,
          changeCount: response.changeCount || 0,
          optimizedChangeCount: response.optimizedChangeCount || 0,
        });

        // Clean up any visual markers
        allChanges.forEach((change) => {
          const markers = document.querySelectorAll(
            `[data-change-id="${change.id}"]`,
          );
          markers.forEach((marker) => marker.remove());
        });

        // Use the server response as the new baseline
        const updatedHtml = response.document.content;
        const updatedTitle = response.document.title;

        // Update all references and state with the server response
        isUpdatingFromTracking.current = true;

        // Update the editor content with the server's processed version
        // This ensures any server-side optimizations are reflected
        if (editor?.getHTML() !== updatedHtml) {
          console.log("Updating editor content with server response");
          editor?.commands.setContent(updatedHtml);
        }
        setTitle(updatedTitle);

        // Update all baselines with the committed content
        originalHtmlContentRef.current = updatedHtml;
        lastContent.current = updatedHtml;
        lastTitle.current = updatedTitle;
        // Reset the enhanced change tracker with committed content
        if (enhancedChangeTrackerRef.current) {
          const cleanCommittedText = extractCleanText(updatedHtml);
          enhancedChangeTrackerRef.current.resetBaseline(
            cleanCommittedText,
            updatedTitle,
          );
        }

        // Reset the tracking state - clear all changes since they're all committed
        setChangeTracking((prev) => ({
          ...prev,
          changes: [], // Clear all changes since we commit all at once
          originalContent: updatedHtml, // Use server HTML as new baseline
          originalTitle: updatedTitle,
          previewContent: updatedHtml,
          previewTitle: updatedTitle,
        }));

        setTimeout(() => {
          isUpdatingFromTracking.current = false;
        }, 100);

        setLastSaveTime(new Date());
        onSave?.(true);

        // Show success message with details
        console.log(
          `✅ Successfully committed ${allChanges.length} changes using PATCH operation`,
        );
        if (response.changeCount !== response.optimizedChangeCount) {
          console.log(
            `📊 Server optimized ${response.changeCount} changes to ${response.optimizedChangeCount} operations`,
          );
        }
      }
    } catch (error) {
      console.error("Failed to commit changes via PATCH:", error);
      onError?.(
        error instanceof Error ? error.message : "Failed to commit changes",
      );
      onSave?.(false);
    } finally {
      setIsCommitting(false);
      setIsTrackingPaused(false);
    }
  };

  // Discard all changes and restore to original state
  const handleDiscardChanges = () => {
    setIsTrackingPaused(true);

    const allMarkers = document.querySelectorAll(".change-marker");
    allMarkers.forEach((marker) => marker.remove());

    const titleInput = document.querySelector(
      'input[data-title-input="true"]',
    ) as HTMLInputElement;
    if (titleInput) {
      titleInput.classList.remove("title-has-changes");
      titleInput.style.borderLeft = "";
      titleInput.style.paddingLeft = "";
    }

    isUpdatingFromTracking.current = true;

    // Restore original HTML content (with styling) from the baseline
    editor?.commands.setContent(originalHtmlContentRef.current);
    setTitle(changeTracking.originalTitle);

    // Reset refs to original HTML for consistency
    lastContent.current = originalHtmlContentRef.current;
    lastTitle.current = changeTracking.originalTitle;

    // Reset the enhanced change tracker to original baseline
    if (enhancedChangeTrackerRef.current) {
      enhancedChangeTrackerRef.current.resetBaseline(
        originalHtmlContentRef.current,
        changeTracking.originalTitle,
      );
    }

    setTimeout(() => {
      isUpdatingFromTracking.current = false;
      setIsTrackingPaused(false);
    }, 100);

    setChangeTracking((prev) => ({
      ...prev,
      changes: [],
      previewContent: originalHtmlContentRef.current,
      previewTitle: prev.originalTitle,
    }));
  };

  // Status indicator
  const getStatusDisplay = () => {
    if (readOnly) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Read-only mode
        </div>
      );
    }

    if (isCommitting) {
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          Committing changes...
        </div>
      );
    }

    if (changeTracking.changes.length > 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-orange-600">
          <div className="w-4 h-4 rounded-full bg-orange-600 flex items-center justify-center text-xs text-white font-bold">
            {changeTracking.changes.length}
          </div>
          {changeTracking.changes.length} change
          {changeTracking.changes.length !== 1 ? "s" : ""} pending
        </div>
      );
    }

    if (lastSaveTime) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
            <svg
              className="w-2 h-2 text-white"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
            </svg>
          </div>
          Last saved at {lastSaveTime.toLocaleTimeString()}
        </div>
      );
    }

    return <div className="text-sm text-gray-500">Ready for changes</div>;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (changeDetectionTimeoutRef.current) {
        clearTimeout(changeDetectionTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div className="space-y-4">
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

  return (
    <div className="space-y-6">
      {/* Main Editor */}
      <div className="border rounded-md bg-white shadow-sm relative">
        {/* Header with controls */}
        <div className="border-b p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4"></div>
          <div className="flex items-center gap-4">
            State: {getStatusDisplay()}
          </div>
        </div>

        {/* Title Input */}
        <div className="border-b p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Document title..."
            disabled={readOnly}
            data-title-input="true"
            className={`w-full text-2xl font-bold border-none outline-none bg-transparent placeholder-gray-400 transition-all ${
              readOnly
                ? "text-gray-700 cursor-default"
                : "text-gray-900 focus:ring-0"
            }`}
          />
        </div>

        {/* Toolbar */}
        {!readOnly && (
          <div className="border-b p-2 flex gap-2 flex-wrap bg-gray-50">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive("bold")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              Bold
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive("italic")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              Italic
            </button>

            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive("heading", { level: 1 })
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              H1
            </button>

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                editor.isActive("bulletList")
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              Bullet List
            </button>

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
                  <>💾 Save Document</>
                )}
              </button>
            </div>
            {/* Discard Changes Button - always shown when not read-only */}
            {!readOnly && (
              <div className="border-l pl-2 ml-2">
                <button
                  onClick={handleDiscardChanges}
                  disabled={changeTracking.changes.length === 0 || isCommitting}
                  className="px-3 py-1 rounded text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Discard Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Information banner for change tracking */}
        {changeTracking.enabled && !readOnly && (
          <div className="border-b p-3 bg-blue-50 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-blue-600">
                Changes are being tracked and shown in the panel below. Make
                your edits normally - choose between incremental PATCH saves or
                full document saves.
              </span>
            </div>
            <div className="mt-2 text-blue-600 space-y-1">
              <div>
                <strong>💾 Save Document (PUT)</strong>: Saves entire document
                state immediately
              </div>
              <div>
                <strong>🚀 PATCH Commit</strong>: Saves only tracked changes via
                the tracker panel below
              </div>
            </div>
          </div>
        )}

        {/* Editor Content */}
        <div ref={editorContentRef} className="min-h-[400px]">
          <EditorContent editor={editor} className="p-4" />
        </div>

        {/* Content Format Debug Panel */}
        {!readOnly && (
          <div className="border-t p-2 bg-gray-50 text-xs font-mono">
            <details className="cursor-pointer">
              <summary className="text-gray-600 hover:text-gray-900">
                Debug: Content Formats (Click to expand)
              </summary>
              <div className="mt-2 space-y-2 max-h-32 overflow-auto">
                <div>
                  <strong>HTML:</strong>{" "}
                  <span className="text-blue-600">
                    {editor.getHTML().slice(0, 100)}...
                  </span>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Enhanced Live Change Tracker */}
      {changeTracking.enabled && !readOnly && (
        <EnhancedLiveChangeTracker
          changes={changeTracking.changes}
          originalContent={changeTracking.originalContent}
          originalTitle={changeTracking.originalTitle}
          onCommitChanges={handleCommitChanges}
          onDiscardChanges={handleDiscardChanges}
          onSelectionChange={(selectedChanges) => {
            // Handle selection changes if needed
            console.log(
              "Selection changed:",
              selectedChanges.length,
              "selected",
            );
          }}
          isCommitting={isCommitting}
          showPreview={true}
        />
      )}
    </div>
  );
};

export default TipTapEditorV3Json;
