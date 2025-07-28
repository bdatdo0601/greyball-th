'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Document } from '@/lib/types';
import apiClient from '@/lib/api';
import { formatDate, truncateText, debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SearchHighlight from '@/components/ui/search-highlight';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await apiClient.searchDocuments(query);
        setSearchResults(response.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 500), // 500ms debounce delay
    []
  );

  // Effect to trigger search when query changes
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear search results immediately
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    // Set searching state and trigger debounced search
    setIsSearching(true);
    debouncedSearch(searchQuery);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    // Manual search button click - trigger immediate search
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiClient.searchDocuments(searchQuery);
      setSearchResults(response.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setIsSearching(false);
    setError(null);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiClient.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
      if (searchResults) {
        setSearchResults(searchResults.filter(doc => doc.id !== documentId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const documentsToShow = searchResults !== null ? searchResults : documents;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Documents
          {searchResults !== null && (
            <span className="text-lg font-normal text-gray-600 ml-2">
              ({searchResults.length} search results)
            </span>
          )}
        </h1>
        <Link href="/documents/new">
          <Button>
            Create Document
          </Button>
        </Link>
      </div>

      {/* Enhanced Search */}
      <div className="relative">
        <div className="relative flex gap-2">
          <div className="flex-1 relative">
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className={`h-5 w-5 transition-colors ${
                  isSearching ? 'text-blue-500' : 'text-gray-400'
                }`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Type to search documents automatically..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                isSearching 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
              disabled={loading}
            />
            
            {/* Searching Indicator */}
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
          
          {/* Manual Search Button (optional - search is automatic) */}
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !searchQuery.trim()}
            variant="outline"
            className="shrink-0"
          >
            Search
          </Button>
          
          {/* Clear Button */}
          {(searchQuery || searchResults !== null) && (
            <Button 
              variant="outline" 
              onClick={clearSearch}
              className="shrink-0 text-gray-600 hover:text-gray-800"
            >
              Clear
            </Button>
          )}
        </div>
        
        {/* Search Status */}
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <div>
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                  Searching for "{searchQuery}"...
                </span>
              ) : searchResults !== null ? (
                <span>
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </span>
              ) : searchQuery.length > 0 && (
                <span className="text-gray-400">
                  Type at least 1 character to search
                </span>
              )}
            </div>
            
            {searchQuery && !isSearching && (
              <div className="text-xs text-gray-400">
                Search updates automatically as you type
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {documentsToShow.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchResults !== null ? 'No documents found' : 'No documents'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchResults !== null 
              ? 'Try adjusting your search terms'
              : 'Get started by creating a new document.'
            }
          </p>
          {searchResults === null && (
            <div className="mt-6">
              <Link href="/documents/new">
                <Button>
                  Create your first document
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documentsToShow.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  <SearchHighlight 
                    text={truncateText(document.title, 50)}
                    searchTerm={searchQuery}
                  />
                </CardTitle>
                <CardDescription className="text-xs">
                  Updated {formatDate(document.updated_at)}
                  {searchResults !== null && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • Search Result
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  <SearchHighlight 
                    text={truncateText(document.content.replace(/<[^>]*>/g, ''), 150)}
                    searchTerm={searchQuery}
                  />
                </p>
                
                <div className="flex gap-2">
                  <Link href={`/documents/${document.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  
                  <Link href={`/documents/${document.id}/view`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Delete document"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
