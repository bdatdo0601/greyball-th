'use client';

import React, { useState } from 'react';
import { TrackedChange } from '@/lib/types';
import { getChangeTextBoundaries, convertTrackedChangesToPatchRequest } from '@/lib/changeTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChangeTrackerProps {
  changes: TrackedChange[];
  originalContent: string;
  originalTitle: string;
  onChangesUpdate: (updatedChanges: TrackedChange[]) => void;
  onCommitChanges: (selectedChanges: TrackedChange[]) => void;
  onDiscardChanges: () => void;
  isCommitting: boolean;
}

export const ChangeTracker: React.FC<ChangeTrackerProps> = ({
  changes,
  originalContent,
  originalTitle,
  onChangesUpdate,
  onCommitChanges,
  onDiscardChanges,
  isCommitting
}) => {
  const [commitDescription, setCommitDescription] = useState('');

  const handleChangeToggle = (changeId: string) => {
    const updatedChanges = changes.map(change => 
      change.id === changeId 
        ? { ...change, selected: !change.selected }
        : change
    );
    onChangesUpdate(updatedChanges);
  };

  const handleSelectAll = () => {
    const allSelected = changes.every(change => change.selected);
    const updatedChanges = changes.map(change => ({
      ...change,
      selected: !allSelected
    }));
    onChangesUpdate(updatedChanges);
  };

  const handleCommit = () => {
    const selectedChanges = changes.filter(change => change.selected);
    onCommitChanges(selectedChanges);
    setCommitDescription('');
  };

  const selectedCount = changes.filter(change => change.selected).length;
  const hasChanges = changes.length > 0;

  const getChangeIcon = (type: TrackedChange['type']) => {
    switch (type) {
      case 'insert':
        return <span className="text-green-600 font-bold text-lg">+</span>;
      case 'delete':
        return <span className="text-red-600 font-bold text-lg">−</span>;
      case 'replace':
        return <span className="text-blue-600 font-bold text-lg">≈</span>;
      default:
        return <span>?</span>;
    }
  };

  const getChangeColor = (type: TrackedChange['type'], selected: boolean) => {
    const baseClasses = selected ? 'ring-2' : '';
    switch (type) {
      case 'insert':
        return `bg-green-50 border-green-200 ${selected ? 'ring-green-300' : ''} ${baseClasses}`;
      case 'delete':
        return `bg-red-50 border-red-200 ${selected ? 'ring-red-300' : ''} ${baseClasses}`;
      case 'replace':
        return `bg-blue-50 border-blue-200 ${selected ? 'ring-blue-300' : ''} ${baseClasses}`;
      default:
        return `bg-gray-50 border-gray-200 ${baseClasses}`;
    }
  };

  // Helper function to extract clean text from HTML
  const extractCleanText = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div to parse HTML and extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get text content and clean up whitespace
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Normalize whitespace - replace multiple spaces/newlines with single space
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  };

  const renderChangePreview = (change: TrackedChange) => {
    const originalHTML = change.field === 'title' ? originalTitle : originalContent;
    const originalText = extractCleanText(originalHTML);
    
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
    
    const boundaries = getCleanTextBoundaries(originalText, change);
    const cleanChangeText = change.text ? extractCleanText(change.text) : '';
    
    return (
      <div className="font-sans text-sm border rounded p-2 bg-white max-w-full overflow-hidden">
        <div className="text-xs text-gray-500 mb-1">
          {change.field === 'title' ? 'Title' : 'Content'} • Position {change.position}
        </div>
        
        {/* Visual diff preview */}
        <div className="bg-gray-50 border rounded p-2 mb-2 font-mono text-xs leading-relaxed">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 text-gray-400 font-bold text-xs">
              {change.type === 'insert' ? '+' : change.type === 'delete' ? '-' : '~'}
            </div>
            <div className="flex-1 whitespace-pre-wrap break-words">
              {/* Context before */}
              <span className="text-gray-500">
                {boundaries.before.slice(-30)}
              </span>
              
              {/* The actual change */}
              {change.type === 'insert' && (
                <span className="bg-green-100 text-green-800 px-1 rounded font-medium border border-green-300">
                  {cleanChangeText}
                </span>
              )}
              {change.type === 'delete' && (
                <span className="bg-red-100 text-red-800 line-through px-1 rounded font-medium border border-red-300">
                  {boundaries.affected}
                </span>
              )}
              {change.type === 'replace' && (
                <>
                  <span className="bg-red-100 text-red-800 line-through px-1 rounded mr-1 font-medium border border-red-300">
                    {boundaries.affected}
                  </span>
                  <span className="bg-green-100 text-green-800 px-1 rounded font-medium border border-green-300">
                    {cleanChangeText}
                  </span>
                </>
              )}
              
              {/* Context after */}
              <span className="text-gray-500">
                {boundaries.after.slice(0, 30)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Change description */}
        <div className="text-xs text-gray-600">
          {change.type === 'insert' && (
            <>
              <strong>Adding:</strong> "{cleanChangeText}"
              {cleanChangeText.length !== (change.text?.length || 0) && (
                <span className="text-gray-500 ml-1">
                  (Text: {cleanChangeText.length} chars)
                </span>
              )}
            </>
          )}
          {change.type === 'delete' && (
            <>
              <strong>Removing:</strong> "{boundaries.affected}" 
              <span className="text-gray-500">
                ({change.length} characters)
              </span>
            </>
          )}
          {change.type === 'replace' && (
            <>
              <div><strong>From:</strong> "{boundaries.affected}"</div>
              <div><strong>To:</strong> "{cleanChangeText}"</div>
            </>
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
            📝 Change Tracker
            <span className="text-sm font-normal text-gray-500">
              (No changes detected)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Make changes to the document to see them tracked here. Each change will be shown with visual indicators and you can select which changes to commit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            📝 Change Tracker
            <span className="text-sm font-normal text-gray-500">
              ({changes.length} changes, {selectedCount} selected)
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isCommitting}
            >
              {changes.every(change => change.selected) ? 'Deselect All' : 'Select All'}
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
          Review your changes below. Green indicates insertions, red indicates deletions, and blue indicates replacements.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {changes.map((change, index) => (
            <div
              key={change.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${getChangeColor(change.type, change.selected)}`}
              onClick={() => handleChangeToggle(change.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={change.selected}
                    onChange={() => handleChangeToggle(change.id)}
                    className="rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {getChangeIcon(change.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">
                      {change.type.charAt(0).toUpperCase() + change.type.slice(1)} in {change.field}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {renderChangePreview(change)}
                  
                  {change.type === 'insert' && (
                    <div className="mt-2 text-xs text-gray-600">
                      Adding "{change.text}" at position {change.position}
                    </div>
                  )}
                  {change.type === 'delete' && (
                    <div className="mt-2 text-xs text-gray-600">
                      Removing {change.length} characters at position {change.position}
                    </div>
                  )}
                  {change.type === 'replace' && (
                    <div className="mt-2 text-xs text-gray-600">
                      Replacing {change.length} characters with "{change.text}" at position {change.position}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commit controls */}
        <div className="border-t pt-4">
          <div className="mb-3">
            <label htmlFor="commit-description" className="block text-sm font-medium text-gray-700 mb-1">
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
            >
              {isCommitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Committing...
                </>
              ) : (
                <>
                  💾 Commit Changes ({selectedCount})
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onDiscardChanges}
              disabled={isCommitting}
            >
              Discard All Changes
            </Button>
          </div>
          
          {selectedCount > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              {selectedCount} change{selectedCount !== 1 ? 's' : ''} will be applied and saved to the server.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChangeTracker;
