import React, { useState, useMemo } from 'react';
import { ImageInfo } from '../types';
import { CopyIcon, SearchIcon, CloseIcon, SparklesIcon, VideoCameraIcon } from './icons';

interface PromptHistoryPageProps {
  promptHistory: string[];
  images: ImageInfo[];
  onGenerateFromPrompt: (prompt: string, taskType: 'image' | 'video') => void;
}

const PromptHistoryPage: React.FC<PromptHistoryPageProps> = ({ promptHistory, images, onGenerateFromPrompt }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const handleCopy = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const promptKeywordsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const image of images) {
      if (image.recreationPrompt && image.keywords) {
        if (!map.has(image.recreationPrompt)) {
          map.set(image.recreationPrompt, new Set());
        }
        const keywordSet = map.get(image.recreationPrompt)!;
        for (const keyword of image.keywords) {
          keywordSet.add(keyword.toLowerCase());
        }
      }
    }
    return map;
  }, [images]);

  const filteredPrompts = useMemo(() => {
    if (!filterQuery) {
      return promptHistory;
    }
    const lowercasedQuery = filterQuery.toLowerCase();
    return promptHistory.filter(prompt => {
      // Check if prompt text matches
      if (prompt.toLowerCase().includes(lowercasedQuery)) {
        return true;
      }
      // Check if associated image keywords match
      const keywords = promptKeywordsMap.get(prompt);
      if (keywords) {
        for (const keyword of keywords) {
          if (keyword.includes(lowercasedQuery)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [promptHistory, filterQuery, promptKeywordsMap]);

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-white">Prompt History</h2>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                <input
                    type="text"
                    placeholder="Filter prompts or keywords..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {filterQuery && (
                    <button
                        onClick={() => setFilterQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Clear filter"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>

      {filteredPrompts.length > 0 ? (
        <div className="space-y-3">
          {filteredPrompts.map((prompt, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-gray-300 text-sm flex-grow">{prompt}</p>
              <div className="flex-shrink-0 flex items-center gap-2 self-end sm:self-center">
                <button
                    onClick={() => onGenerateFromPrompt(prompt, 'image')}
                    className="bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white font-semibold py-1.5 px-3 rounded-md transition-colors text-xs flex items-center"
                    title="Generate Image"
                >
                    <SparklesIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onGenerateFromPrompt(prompt, 'video')}
                    className="bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white font-semibold py-1.5 px-3 rounded-md transition-colors text-xs flex items-center"
                    title="Generate Video"
                >
                    <VideoCameraIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleCopy(prompt, index)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-semibold py-1.5 px-3 rounded-md transition-colors text-xs flex items-center"
                >
                    <CopyIcon className="w-4 h-4 mr-2" />
                    {copiedIndex === index ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <p>{filterQuery ? 'No prompts match your filter.' : 'Your prompt history is empty.'}</p>
          <p className="text-sm mt-1">
            {filterQuery ? 'Try a different search term.' : 'Prompts from AI generations will appear here.'}
            </p>
        </div>
      )}
    </div>
  );
};

export default PromptHistoryPage;