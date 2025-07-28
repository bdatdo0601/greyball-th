import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { DocumentChange } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate simple diff between two texts for PATCH operations
 */
export function calculateSimpleDiff(
  oldText: string, 
  newText: string,
  field: 'title' | 'content' = 'content'
): DocumentChange[] {
  const changes: DocumentChange[] = [];
  
  if (oldText === newText) {
    return changes;
  }
  
  // Handle the common case of appending content to the end
  if (newText.startsWith(oldText)) {
    // Text was appended to the end
    const appendedText = newText.slice(oldText.length);
    if (appendedText) {
      changes.push({
        type: 'insert',
        position: oldText.length,
        text: appendedText,
        field
      });
    }
    return changes;
  }
  
  // Handle the case of prepending content to the beginning  
  if (newText.endsWith(oldText)) {
    // Text was prepended to the beginning
    const prependedText = newText.slice(0, newText.length - oldText.length);
    if (prependedText) {
      changes.push({
        type: 'insert',
        position: 0,
        text: prependedText,
        field
      });
    }
    return changes;
  }
  
  // Very basic diff - in production, use a proper diff algorithm like Myers
  if (newText.length > oldText.length) {
    // Find common prefix
    let commonPrefixLength = 0;
    while (commonPrefixLength < oldText.length && 
           commonPrefixLength < newText.length &&
           oldText[commonPrefixLength] === newText[commonPrefixLength]) {
      commonPrefixLength++;
    }
    
    // Find common suffix
    let commonSuffixLength = 0;
    while (commonSuffixLength < (oldText.length - commonPrefixLength) && 
           commonSuffixLength < (newText.length - commonPrefixLength) &&
           oldText[oldText.length - 1 - commonSuffixLength] === newText[newText.length - 1 - commonSuffixLength]) {
      commonSuffixLength++;
    }
    
    // Calculate insertion
    const insertPosition = commonPrefixLength;
    const insertedText = newText.slice(commonPrefixLength, newText.length - commonSuffixLength);
    
    if (insertedText) {
      changes.push({
        type: 'insert',
        position: insertPosition,
        text: insertedText,
        field
      });
    }
  } else if (newText.length < oldText.length) {
    // Find common prefix
    let commonPrefixLength = 0;
    while (commonPrefixLength < oldText.length && 
           commonPrefixLength < newText.length &&
           oldText[commonPrefixLength] === newText[commonPrefixLength]) {
      commonPrefixLength++;
    }
    
    // Find common suffix
    let commonSuffixLength = 0;
    while (commonSuffixLength < (oldText.length - commonPrefixLength) && 
           commonSuffixLength < (newText.length - commonPrefixLength) &&
           oldText[oldText.length - 1 - commonSuffixLength] === newText[newText.length - 1 - commonSuffixLength]) {
      commonSuffixLength++;
    }
    
    // Calculate deletion
    const deletePosition = commonPrefixLength;
    const deleteLength = oldText.length - commonPrefixLength - commonSuffixLength;
    
    if (deleteLength > 0) {
      changes.push({
        type: 'delete',
        position: deletePosition,
        length: deleteLength,
        field
      });
    }
  } else {
    // Same length, find differing sections
    let start = 0;
    let end = oldText.length - 1;
    
    // Find start of difference
    while (start < oldText.length && oldText[start] === newText[start]) {
      start++;
    }
    
    // Find end of difference
    while (end > start && 
           oldText[end] === newText[end]) {
      end--;
    }
    
    if (start <= end) {
      changes.push({
        type: 'replace',
        position: start,
        length: end - start + 1,
        text: newText.slice(start, end + 1),
        field
      });
    }
  }
  
  return changes;
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + '...';
}

/**
 * Generate a random color for avatars/placeholders
 */
export function generateColor(seed: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-gray-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
