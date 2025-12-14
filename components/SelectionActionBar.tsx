import React from 'react';
import { TrashIcon, XCircleIcon, WandIcon, CheckCircleIcon, UserIcon, RefreshIcon, SelectAllIcon, ViewfinderIcon } from './icons';
import { ImageInfo } from '../types';
import BulkDownloader from './BulkDownloader';

interface SelectionActionBarProps {
  count: number;
  selectedImages: ImageInfo[];
  onDelete: () => void;
  onClear: () => void;
  onRemix: () => void;
  onMakePublic: () => void;
  onMakePrivate: () => void;
  onRegenerate: () => void;
  onSelectAll: () => void;
  onSmartCrop: () => void;
  triggerDownload?: boolean;
}

const SelectionActionBar: React.FC<SelectionActionBarProps> = ({ count, selectedImages, onDelete, onClear, onRemix, onMakePublic, onMakePrivate, onRegenerate, onSelectAll, onSmartCrop, triggerDownload }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 p-4 flex justify-center transition-transform duration-300 ease-in-out ${count > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl flex flex-wrap items-center gap-2 p-2 max-w-[95vw] sm:max-w-4xl mx-auto">

        {/* Selection Info & Clear */}
        <div className="flex items-center gap-2 pl-2 pr-3 border-r border-gray-700/50 mr-1">
          <button
            onClick={onClear}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-all"
            title="Clear selection"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-200 whitespace-nowrap">
            <span className="text-white font-bold">{count}</span>
            <span className="hidden sm:inline ml-1">selected</span>
          </span>
          <button
            onClick={onSelectAll}
            className="ml-1 p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-700/50 rounded-full transition-all"
            title="Select All"
          >
            <SelectAllIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Actions - Now ungrouped/flat */}

        <BulkDownloader
          selectedImages={selectedImages}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
          triggerDownload={triggerDownload}
        />

        <div className="w-px h-6 bg-gray-700/50 mx-1 hidden sm:block"></div>

        <button
          onClick={onRemix}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-colors"
          title="Remix selected"
        >
          <WandIcon className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline">Remix</span>
        </button>

        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-colors"
          title="Regenerate selected"
        >
          <RefreshIcon className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Regenerate</span>
        </button>

        <button
          onClick={onSmartCrop}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-colors"
          title="Smart Crop"
        >
          <ViewfinderIcon className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Smart Crop</span>
        </button>

        <div className="w-px h-6 bg-gray-700/50 mx-1 hidden sm:block"></div>

        {/* Privacy */}
        <div className="flex bg-gray-800/50 rounded-lg p-0.5 border border-gray-700/30">
          <button
            onClick={onMakePublic}
            className="p-1.5 rounded-md text-gray-400 hover:text-green-400 hover:bg-gray-700 transition-all"
            title="Make Public"
          >
            <CheckCircleIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onMakePrivate}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all"
            title="Make Private"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Delete */}
        <div className="pl-1 ml-auto sm:ml-1">
          <button
            onClick={onDelete}
            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-all"
            title="Delete Selected"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default SelectionActionBar;
