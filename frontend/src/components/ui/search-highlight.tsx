import React from 'react';

interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({ 
  text, 
  searchTerm, 
  className = '' 
}) => {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex pattern that's case-insensitive and global
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  // Split the text by the search term
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part matches the search term (case-insensitive)
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return (
            <mark 
              key={index} 
              className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-semibold"
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default SearchHighlight;
