
import React from 'react';
import { TrashIcon, XCircleIcon, WandIcon, CheckCircleIcon, UserIcon } from './icons';

interface SelectionActionBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  onRemix: () => void;
  onMakePublic: () => void;
  onMakePrivate: () => void;
}

const SelectionActionBar: React.FC<SelectionActionBarProps> = ({ count, onDelete, onClear, onRemix, onMakePublic, onMakePrivate }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 p-4 flex justify-center transition-transform duration-300 ease-in-out ${count > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl flex flex-wrap items-center justify-between p-3 gap-3 w-full max-w-2xl">
        <div className="flex items-center gap-3 border-r border-gray-600 pr-3 mr-1">
          <button onClick={onClear} className="p-2 text-gray-400 hover:text-white transition-colors" title="Clear selection">
            <XCircleIcon className="w-6 h-6" />
          </button>
          <p className="text-white font-medium whitespace-nowrap">
            <span className="text-indigo-400">{count}</span> selected
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-grow justify-center sm:justify-start">
            <button
                onClick={onRemix}
                disabled={count === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Adapt selected images to a new theme"
            >
                <WandIcon className="w-4 h-4" />
                Remix
            </button>

            <div className="h-6 w-px bg-gray-600 mx-1"></div>

            <button
                onClick={onMakePublic}
                disabled={count === 0}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Make selected public"
            >
                <CheckCircleIcon className="w-4 h-4 text-green-400" />
                Public
            </button>
             <button
                onClick={onMakePrivate}
                disabled={count === 0}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Make selected private"
            >
                <UserIcon className="w-4 h-4 text-gray-300" />
                Private
            </button>
        </div>

        <div className="border-l border-gray-600 pl-3 ml-1">
            <button
            onClick={onDelete}
            disabled={count === 0}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <TrashIcon className="w-5 h-5" />
            Delete
            </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionActionBar;
