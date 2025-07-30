"use client";

import {
  BarChart3,
  Clock,
  Filter,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api";
import type { Document, SearchOptions, SearchStatsResponse } from "@/lib/types";
import { debounce } from "@/lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface AdvancedSearchProps {
  onResults: (results: Document[] | null) => void;
  onSearchStateChange: (isSearching: boolean) => void;
  onError: (error: string | null) => void;
  initialQuery?: string;
}

interface SearchState {
  query: string;
  suggestions: string[];
  showSuggestions: boolean;
  isSearching: boolean;
  isSuggestionsLoading: boolean;
  selectedSuggestionIndex: number;
  searchHistory: string[];
  showAdvancedOptions: boolean;
  searchOptions: SearchOptions;
  stats: SearchStatsResponse | null;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResults,
  onSearchStateChange,
  onError,
  initialQuery = "",
}) => {
  const [state, setState] = useState<SearchState>({
    query: initialQuery,
    suggestions: [],
    showSuggestions: false,
    isSearching: false,
    isSuggestionsLoading: false,
    selectedSuggestionIndex: -1,
    searchHistory: [],
    showAdvancedOptions: false,
    searchOptions: {
      limit: 10,
      field: undefined,
      suggest: true,
    },
    stats: null,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load search history and stats on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      try {
        setState((prev) => ({
          ...prev,
          searchHistory: JSON.parse(savedHistory).slice(0, 5),
        }));
      } catch (e) {
        console.warn("Failed to parse search history");
      }
    }
    loadSearchStats();
  }, []);

  // Load search statistics
  const loadSearchStats = async () => {
    try {
      const stats = await apiClient.getSearchStats();
      setState((prev) => ({ ...prev, stats }));
    } catch (error) {
      console.warn("Failed to load search stats:", error);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, options: SearchOptions) => {
      if (!query.trim()) {
        onResults(null);
        setState((prev) => ({ ...prev, isSearching: false }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isSearching: true }));
        onSearchStateChange(true);

        const response = await apiClient.searchDocuments(query, options);
        onResults(response.documents);

        // Add to search history
        const newHistory = [
          query,
          ...state.searchHistory.filter((h) => h !== query),
        ].slice(0, 5);
        setState((prev) => ({ ...prev, searchHistory: newHistory }));
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Search failed";
        onError(errorMessage);
        onResults(null);
      } finally {
        setState((prev) => ({ ...prev, isSearching: false }));
        onSearchStateChange(false);
      }
    }, 300),
    [onResults, onSearchStateChange, onError, state.searchHistory],
  );

  // Debounced suggestions function
  const debouncedSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setState((prev) => ({
          ...prev,
          suggestions: [],
          showSuggestions: false,
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isSuggestionsLoading: true }));
        const response = await apiClient.getSearchSuggestions(query, 5);
        setState((prev) => ({
          ...prev,
          suggestions: response.suggestions,
          showSuggestions: response.suggestions.length > 0,
          isSuggestionsLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          suggestions: [],
          showSuggestions: false,
          isSuggestionsLoading: false,
        }));
      }
    }, 150),
    [],
  );

  // Handle input change
  const handleInputChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      query: value,
      selectedSuggestionIndex: -1,
    }));

    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Trigger suggestions immediately
    if (state.searchOptions.suggest) {
      debouncedSuggestions(value);
    }

    // Trigger search after longer delay
    debouncedSearch(value, state.searchOptions);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setState((prev) => ({
      ...prev,
      query: suggestion,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
    }));
    debouncedSearch(suggestion, state.searchOptions);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedSuggestionIndex: Math.min(
            prev.selectedSuggestionIndex + 1,
            prev.suggestions.length - 1,
          ),
        }));
        break;
      case "ArrowUp":
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedSuggestionIndex: Math.max(
            prev.selectedSuggestionIndex - 1,
            -1,
          ),
        }));
        break;
      case "Enter":
        e.preventDefault();
        if (state.selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(
            state.suggestions[state.selectedSuggestionIndex],
          );
        } else {
          setState((prev) => ({ ...prev, showSuggestions: false }));
        }
        break;
      case "Escape":
        setState((prev) => ({ ...prev, showSuggestions: false }));
        break;
    }
  };

  // Clear search
  const clearSearch = () => {
    setState((prev) => ({
      ...prev,
      query: "",
      suggestions: [],
      showSuggestions: false,
      selectedSuggestionIndex: -1,
    }));
    onResults(null);
    onError(null);
    inputRef.current?.focus();
  };

  // Toggle advanced options
  const toggleAdvancedOptions = () => {
    setState((prev) => ({
      ...prev,
      showAdvancedOptions: !prev.showAdvancedOptions,
    }));
  };

  // Update search options
  const updateSearchOptions = (newOptions: Partial<SearchOptions>) => {
    const updatedOptions = { ...state.searchOptions, ...newOptions };
    setState((prev) => ({ ...prev, searchOptions: updatedOptions }));

    // Re-run search with new options if there's a query
    if (state.query.trim()) {
      debouncedSearch(state.query, updatedOptions);
    }
  };

  // Rebuild search index
  const rebuildIndex = async () => {
    try {
      setState((prev) => ({ ...prev, isSearching: true }));
      await apiClient.rebuildSearchIndex();
      await loadSearchStats();
      // Re-run current search if active
      if (state.query.trim()) {
        debouncedSearch(state.query, state.searchOptions);
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Failed to rebuild index",
      );
    } finally {
      setState((prev) => ({ ...prev, isSearching: false }));
    }
  };

  return (
    <div className="relative w-full">
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3 z-10">
            {state.isSearching ? (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={state.query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (state.suggestions.length > 0) {
                setState((prev) => ({ ...prev, showSuggestions: true }));
              }
            }}
            placeholder="Search documents with FlexSearch..."
            className={`w-full pl-10 pr-20 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              state.isSearching
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          />

          <div className="absolute right-2 flex items-center gap-1">
            {state.query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAdvancedOptions}
              className={`h-8 w-8 p-0 ${
                state.showAdvancedOptions ? "text-blue-600" : "text-gray-400"
              } hover:text-gray-600`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {state.showSuggestions && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <CardContent className="p-0">
              {state.isSuggestionsLoading ? (
                <div className="p-3 flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Getting suggestions...</span>
                </div>
              ) : (
                <div ref={suggestionsRef}>
                  {state.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                        index === state.selectedSuggestionIndex
                          ? "bg-blue-50 text-blue-700"
                          : ""
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search History */}
      {state.searchHistory.length > 0 && !state.query && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Recent:</span>
          {state.searchHistory.map((query, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => handleInputChange(query)}
            >
              {query}
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Options */}
      {state.showAdvancedOptions && (
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Advanced Search Options</h3>
              </div>

              {/* Search Fields */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search In:
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant={
                      !state.searchOptions.field ? "default" : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={() => updateSearchOptions({ field: undefined })}
                  >
                    All Fields
                  </Badge>
                  <Badge
                    variant={
                      state.searchOptions.field?.includes("title")
                        ? "default"
                        : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      updateSearchOptions({
                        field: state.searchOptions.field?.includes("title")
                          ? state.searchOptions.field.filter(
                              (f) => f !== "title",
                            )
                          : [...(state.searchOptions.field || []), "title"],
                      })
                    }
                  >
                    Title
                  </Badge>
                  <Badge
                    variant={
                      state.searchOptions.field?.includes("content")
                        ? "default"
                        : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      updateSearchOptions({
                        field: state.searchOptions.field?.includes("content")
                          ? state.searchOptions.field.filter(
                              (f) => f !== "content",
                            )
                          : [...(state.searchOptions.field || []), "content"],
                      })
                    }
                  >
                    Content
                  </Badge>
                  <Badge
                    variant={
                      state.searchOptions.field?.includes("metadata")
                        ? "default"
                        : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      updateSearchOptions({
                        field: state.searchOptions.field?.includes("metadata")
                          ? state.searchOptions.field.filter(
                              (f) => f !== "metadata",
                            )
                          : [...(state.searchOptions.field || []), "metadata"],
                      })
                    }
                  >
                    Metadata
                  </Badge>
                </div>
              </div>

              {/* Result Limit */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Max Results:
                </label>
                <select
                  value={state.searchOptions.limit}
                  onChange={(e) =>
                    updateSearchOptions({ limit: parseInt(e.target.value) })
                  }
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Suggestions Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="suggestions"
                  checked={state.searchOptions.suggest}
                  onChange={(e) =>
                    updateSearchOptions({ suggest: e.target.checked })
                  }
                  className="rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="suggestions" className="text-sm text-gray-700">
                  Enable search suggestions
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
