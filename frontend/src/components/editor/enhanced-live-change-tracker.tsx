"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { applyChangesToText } from "@/lib/enhanced-diff-tracking";
import { getFormatChangeDescription } from "@/lib/htmlChangeTracking";
import type { TrackedChange } from "@/lib/types";

interface EnhancedLiveChangeTrackerProps {
  changes: TrackedChange[];
  originalContent: string;
  originalTitle: string;
  onCommitChanges: (allChanges: TrackedChange[]) => void;
  onDiscardChanges: () => void;
  onSelectionChange?: (selectedChanges: TrackedChange[]) => void;
  isCommitting: boolean;
  showPreview?: boolean;
}

export const EnhancedLiveChangeTracker: React.FC<
  EnhancedLiveChangeTrackerProps
> = ({
  changes,
  originalContent,
  originalTitle,
  onCommitChanges,
  onDiscardChanges,
  onSelectionChange,
  isCommitting,
  showPreview = true,
}) => {
  console.log(changes);
  const [commitDescription, setCommitDescription] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [filterType, setFilterType] = useState<
    | "all"
    | "insert"
    | "delete"
    | "replace"
    | "format_add"
    | "format_remove"
    | "format_change"
  >("all");
  const [sortBy, setSortBy] = useState<"timestamp" | "position" | "type">(
    "timestamp",
  );

  // Enhanced filter and sort changes
  const filteredAndSortedChanges = useMemo(() => {
    let filtered = changes;

    if (filterType !== "all") {
      filtered = changes.filter((change) => change.type === filterType);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "timestamp":
          return b.timestamp - a.timestamp;
        case "position":
          return a.position - b.position;
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [changes, filterType, sortBy]);

  // Enhanced statistics
  const stats = useMemo(() => {
    const insertCount = changes.filter((c) => c.type === "insert").length;
    const deleteCount = changes.filter((c) => c.type === "delete").length;
    const replaceCount = changes.filter((c) => c.type === "replace").length;
    const formatAddCount = changes.filter(
      (c) => c.type === "format_add",
    ).length;
    const formatRemoveCount = changes.filter(
      (c) => c.type === "format_remove",
    ).length;
    const formatChangeCount = changes.filter(
      (c) => c.type === "format_change",
    ).length;

    const selectedCount = changes.filter((c) => c.selected).length;
    const totalCharChanges = changes.reduce((total, change) => {
      if (change.type === "insert" && change.text) {
        return total + change.text.length;
      } else if (change.type === "delete" && change.length) {
        return total + change.length;
      } else if (change.type === "replace" && change.text) {
        return total + change.text.length;
      }
      return total;
    }, 0);

    return {
      insertCount,
      deleteCount,
      replaceCount,
      formatAddCount,
      formatRemoveCount,
      formatChangeCount,
      totalFormatCount: formatAddCount + formatRemoveCount + formatChangeCount,
      selectedCount,
      totalCharChanges,
    };
  }, [changes]);

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!showPreview) return null;

    const contentChanges = changes.filter((c) => c.field === "content");
    const titleChanges = changes.filter((c) => c.field === "title");

    return {
      content: applyChangesToText(originalContent, contentChanges),
      title: applyChangesToText(originalTitle, titleChanges),
    };
  }, [changes, originalContent, originalTitle, showPreview]);

  const handleCommit = () => {
    const selectedChanges = changes.filter((change) => change.selected);
    onCommitChanges(selectedChanges);
    setCommitDescription("");
  };

  const handleSelectAll = () => {
    const allSelected = changes.every((change) => change.selected);
    const updatedChanges = changes.map((change) => ({
      ...change,
      selected: !allSelected,
    }));
    // This is a bit of a hack - we're directly modifying the changes
    // In a real implementation, you'd want to pass this back to the parent
    updatedChanges.forEach((updated, index) => {
      changes[index].selected = updated.selected;
    });
    onSelectionChange?.(updatedChanges.filter((c) => c.selected));
  };

  const handleChangeToggle = (changeId: string) => {
    const change = changes.find((c) => c.id === changeId);
    if (change) {
      change.selected = !change.selected;
      onSelectionChange?.(changes.filter((c) => c.selected));
    }
  };

  const hasChanges = changes.length > 0;
  const selectedCount = changes.filter((c) => c.selected).length;

  const getChangeIcon = (type: TrackedChange["type"]) => {
    switch (type) {
      case "insert":
        return <span className="text-green-600 font-bold text-lg">+</span>;
      case "delete":
        return <span className="text-red-600 font-bold text-lg">−</span>;
      case "replace":
        return <span className="text-blue-600 font-bold text-lg">≈</span>;
      case "format_add":
        return <span className="text-sky-600 font-bold text-lg">✨</span>;
      case "format_remove":
        return <span className="text-red-600 font-bold text-lg">🚫</span>;
      case "format_change":
        return <span className="text-amber-600 font-bold text-lg">🔄</span>;
      default:
        return <span>?</span>;
    }
  };

  const getChangeColor = (type: TrackedChange["type"], selected: boolean) => {
    const baseClasses = selected ? "ring-2 ring-opacity-50" : "opacity-75";
    switch (type) {
      case "insert":
        return `bg-green-50 border-green-200 hover:shadow-md ${selected ? "ring-green-300" : ""} ${baseClasses}`;
      case "delete":
        return `bg-red-50 border-red-200 hover:shadow-md ${selected ? "ring-red-300" : ""} ${baseClasses}`;
      case "replace":
        return `bg-blue-50 border-blue-200 hover:shadow-md ${selected ? "ring-blue-300" : ""} ${baseClasses}`;
      case "format_add":
        return `bg-sky-50 border-sky-200 hover:shadow-md ${selected ? "ring-sky-300" : ""} ${baseClasses}`;
      case "format_remove":
        return `bg-red-50 border-red-200 hover:shadow-md ${selected ? "ring-red-300" : ""} ${baseClasses}`;
      case "format_change":
        return `bg-amber-50 border-amber-200 hover:shadow-md ${selected ? "ring-amber-300" : ""} ${baseClasses}`;
      default:
        return `bg-gray-50 border-gray-200 hover:shadow-md ${baseClasses}`;
    }
  };

  // Helper function to extract clean text from HTML
  const extractCleanText = (html: string): string => {
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
  };

  const renderChangePreview = (change: TrackedChange) => {
    const originalHTML =
      change.field === "title" ? originalTitle : originalContent;

    // Get text boundaries based on clean text, not HTML
    const getCleanTextBoundaries = (text: string, change: TrackedChange) => {
      const start = Math.min(change.position, text.length);
      const length = change.length || 0;
      const end = Math.min(start + length, text.length);

      const before = text.slice(0, start);
      const affected = text.slice(start, end);
      const after = text.slice(end);

      return { before, affected, after };
    };

    const boundaries = getCleanTextBoundaries(originalHTML, change);
    const cleanChangeText = change.text ? extractCleanText(change.text) : "";

    return (
      <div className="font-sans text-sm border rounded p-3 bg-white max-w-full overflow-hidden hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            {change.field === "title" ? "Title" : "Content"} • Position{" "}
            {change.position}
          </span>
          <span>{new Date(change.timestamp).toLocaleTimeString()}</span>
        </div>

        {/* Change type badge */}
        <div className="mb-3">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              change.type === "insert"
                ? "bg-green-100 text-green-800"
                : change.type === "delete"
                  ? "bg-red-100 text-red-800"
                  : change.type === "replace"
                    ? "bg-blue-100 text-blue-800"
                    : change.type === "format_add"
                      ? "bg-sky-100 text-sky-800"
                      : change.type === "format_remove"
                        ? "bg-red-100 text-red-800"
                        : change.type === "format_change"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
            }`}
          >
            {change.type === "insert"
              ? "+ Addition"
              : change.type === "delete"
                ? "− Deletion"
                : change.type === "replace"
                  ? "~ Replacement"
                  : change.type === "format_add"
                    ? "✨ Format Added"
                    : change.type === "format_remove"
                      ? "🚫 Format Removed"
                      : change.type === "format_change"
                        ? "🔄 Format Changed"
                        : "❓ Unknown"}
          </span>
        </div>

        {/* Enhanced change description with better context */}
        <div className="space-y-2">
          {/* Handle format changes */}
          {(change.type === "format_add" ||
            change.type === "format_remove" ||
            change.type === "format_change") && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                {getFormatChangeDescription(change)}
              </div>
              <div
                className={`border-l-4 p-2 rounded ${
                  change.type === "format_add"
                    ? "bg-sky-50 border-sky-500"
                    : change.type === "format_remove"
                      ? "bg-red-50 border-red-500"
                      : "bg-amber-50 border-amber-500"
                }`}
              >
                <span
                  className={`font-mono font-semibold ${
                    change.type === "format_add"
                      ? "text-sky-800"
                      : change.type === "format_remove"
                        ? "text-red-800"
                        : "text-amber-800"
                  }`}
                >
                  "{change.affectedText || boundaries.affected}"
                </span>
                {change.formatType && (
                  <div className="text-xs mt-1 opacity-75">
                    Format: <strong>{change.formatType}</strong>
                    {change.formatValue && (
                      <span> = {String(change.formatValue)}</span>
                    )}
                    {change.previousFormatValue &&
                      change.type === "format_change" && (
                        <span>
                          {" "}
                          (was: {String(change.previousFormatValue)})
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Handle text changes with improved visualization */}
          {change.type === "insert" && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                Adding text:
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded">
                <span className="font-mono text-green-800 font-semibold">
                  "{cleanChangeText}"
                </span>
                <div className="text-xs text-green-600 mt-1">
                  Length: {cleanChangeText.length} characters
                </div>
              </div>
              {boundaries.before && (
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Context:</strong> After "...
                  {boundaries.before.slice(-20)}"
                  {boundaries.after && (
                    <span>
                      {" "}
                      and before "{boundaries.after.slice(0, 20)}..."
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {change.type === "delete" && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                Removing text:
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded">
                <span className="font-mono text-red-800 line-through font-semibold">
                  "{boundaries.affected}"
                </span>
                <div className="text-xs text-red-600 mt-1">
                  Length: {change.length} characters
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {boundaries.before && (
                  <span>
                    <strong>Context:</strong> After "...
                    {boundaries.before.slice(-20)}"
                  </span>
                )}
              </div>
            </div>
          )}

          {change.type === "replace" && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">
                Changing text:
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded">
                <div className="text-xs text-red-700 font-medium mb-1">
                  From:
                </div>
                <span className="font-mono text-red-800 line-through font-semibold">
                  "{boundaries.affected}"
                </span>
                <div className="text-xs text-red-600 mt-1">
                  Length: {change.length} characters
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded">
                <div className="text-xs text-green-700 font-medium mb-1">
                  To:
                </div>
                <span className="font-mono text-green-800 font-semibold">
                  "{cleanChangeText}"
                </span>
                <div className="text-xs text-green-600 mt-1">
                  Length: {cleanChangeText.length} characters
                </div>
              </div>

              {boundaries.before && (
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Context:</strong> After "...
                  {boundaries.before.slice(-20)}"
                  {boundaries.after && (
                    <span>
                      {" "}
                      and before "{boundaries.after.slice(0, 20)}..."
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced technical details */}
        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Position: {change.position}</span>
            {change.length && <span>Length: {change.length}</span>}
            <span
              className={`px-2 py-1 rounded ${change.selected ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}
            >
              {change.selected ? "Selected" : "Unselected"}
            </span>
          </div>
          {cleanChangeText &&
            cleanChangeText.length !== (change.text?.length || 0) && (
              <div className="mt-1 text-amber-600">
                Note: HTML stripped - Text: {cleanChangeText.length} chars,
                HTML: {change.text?.length || 0} chars
              </div>
            )}
        </div>
      </div>
    );
  };

  if (!hasChanges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🔴 Enhanced Live Change Tracker
            <span className="text-sm font-normal text-gray-500">
              (No changes detected)
            </span>
          </CardTitle>
          <CardDescription>
            Make changes to the document to see them tracked here in real-time.
            Changes are calculated using an enhanced Myers diff algorithm with
            proper debouncing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-2 border-green-500 rounded-sm"></div>
              <span>Green: Insertions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-l-2 border-red-500 rounded-sm"></div>
              <span>Red: Deletions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-l-2 border-blue-500 rounded-sm"></div>
              <span>Blue: Replacements</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            🔴 Enhanced Live Change Tracker
            <span className="text-sm font-normal text-gray-500">
              ({changes.length} changes, {selectedCount} selected)
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              disabled={isCommitting}
            >
              {showStats ? "Hide Stats" : "Show Stats"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isCommitting}
            >
              {changes.every((change) => change.selected)
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscardChanges}
              disabled={isCommitting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Discard All
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Enhanced change tracking with Myers diff algorithm, proper debouncing,
          and patch-compatible operations. All changes are calculated against
          the original baseline.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Enhanced Statistics Panel */}
        {showStats && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">
              Enhanced Change Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded-sm"></div>
                <span className="text-gray-600">Insert:</span>
                <span className="font-semibold text-green-600">
                  {stats.insertCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded-sm"></div>
                <span className="text-gray-600">Delete:</span>
                <span className="font-semibold text-red-600">
                  {stats.deleteCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500 rounded-sm"></div>
                <span className="text-gray-600">Replace:</span>
                <span className="font-semibold text-blue-600">
                  {stats.replaceCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-sky-100 border-l-2 border-sky-500 rounded-sm"></div>
                <span className="text-gray-600">Format+:</span>
                <span className="font-semibold text-sky-600">
                  {stats.formatAddCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded-sm"></div>
                <span className="text-gray-600">Format-:</span>
                <span className="font-semibold text-red-600">
                  {stats.formatRemoveCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-100 border-l-2 border-amber-500 rounded-sm"></div>
                <span className="text-gray-600">Format~:</span>
                <span className="font-semibold text-amber-600">
                  {stats.formatChangeCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500 rounded-sm"></div>
                <span className="text-gray-600">Selected:</span>
                <span className="font-semibold text-blue-600">
                  {stats.selectedCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-100 border-l-2 border-purple-500 rounded-sm"></div>
                <span className="text-gray-600">Chars:</span>
                <span className="font-semibold text-purple-600">
                  {stats.totalCharChanges}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Preview Panel */}
        {showPreview && previewContent && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">
              Preview (with selected changes applied)
            </h4>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">
                  Title:
                </div>
                <div className="text-sm font-mono bg-white p-2 rounded border">
                  {previewContent.title || "(empty)"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">
                  Content Preview:
                </div>
                <div className="text-sm font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {previewContent.content
                    ? previewContent.content.slice(0, 200) +
                      (previewContent.content.length > 200 ? "..." : "")
                    : "(empty)"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Filters and Sorting */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs border rounded px-2 py-1 bg-white"
            >
              <option value="all">All Types ({changes.length})</option>
              <option value="insert">Insertions ({stats.insertCount})</option>
              <option value="delete">Deletions ({stats.deleteCount})</option>
              <option value="replace">
                Replacements ({stats.replaceCount})
              </option>
              <option value="format_add">
                Format Added ({stats.formatAddCount})
              </option>
              <option value="format_remove">
                Format Removed ({stats.formatRemoveCount})
              </option>
              <option value="format_change">
                Format Changed ({stats.formatChangeCount})
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs border rounded px-2 py-1 bg-white"
            >
              <option value="timestamp">Time (newest first)</option>
              <option value="position">Position (document order)</option>
              <option value="type">Type (alphabetical)</option>
            </select>
          </div>
        </div>

        {/* Enhanced Changes List */}
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {filteredAndSortedChanges.map((change, index) => (
            <div
              key={change.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${getChangeColor(change.type, change.selected)}`}
              onClick={() => handleChangeToggle(change.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={change.selected}
                    onChange={() => handleChangeToggle(change.id)}
                    className={`rounded ${change.selected ? "text-blue-600" : "text-gray-400"}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {getChangeIcon(change.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-sm">
                      {change.type.charAt(0).toUpperCase() +
                        change.type.slice(1)}{" "}
                      in {change.field}
                    </span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {renderChangePreview(change)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Commit controls */}
        <div className="border-t pt-6">
          <div className="mb-4">
            <label
              htmlFor="commit-description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Commit Description (optional)
            </label>
            <input
              id="commit-description"
              type="text"
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              placeholder="Describe your changes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCommitting}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCommit}
              disabled={selectedCount === 0 || isCommitting}
              className="flex items-center gap-2"
              size="lg"
            >
              {isCommitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Committing...
                </>
              ) : (
                <>🚀 PATCH Commit {selectedCount} Selected Changes</>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onDiscardChanges}
              disabled={isCommitting}
              size="lg"
            >
              🗑️ Discard All Changes
            </Button>
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="font-medium">Ready to commit:</span>
              <span>
                {selectedCount} selected change{selectedCount !== 1 ? "s" : ""}
              </span>
              <span className="text-blue-600">
                ({changes.length - selectedCount} unselected will remain)
              </span>
            </div>
            <div className="text-blue-600 text-xs mt-1">
              Enhanced Myers diff algorithm ensures accurate patch operations.
              Changes are debounced and calculated against the original
              baseline.
            </div>
            {stats.totalCharChanges > 0 && (
              <div className="text-blue-600 text-xs mt-1">
                Total character changes: {stats.totalCharChanges}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedLiveChangeTracker;
