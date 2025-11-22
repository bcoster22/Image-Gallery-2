
import React from 'react';
import { GenerationTask, ImageInfo } from '../types';
import ImageGrid from './ImageGrid';
import Spinner from './Spinner';
import { WarningIcon, CheckCircleIcon, TrashIcon } from './icons';

interface CreationsPageProps {
  tasks: GenerationTask[];
  completedCreations: ImageInfo[];
  onImageSelect: (image: ImageInfo) => void;
  analyzingIds: Set<string>;
  generatingIds: Set<string>;
  disabled?: boolean;
  onClearFailedTasks?: () => void;
}

const getTaskSourceName = (task: GenerationTask): string => {
    if (task.sourceImageName) {
        return task.sourceImageName;
    }
    if (task.type === 'video' || task.type === 'image') {
        return `"${task.prompt.substring(0, 30)}..."`;
    }
    return 'Unknown Source';
}

const getTaskDescription = (task: GenerationTask): string => {
    switch(task.type) {
        case 'video':
            return task.sourceImageName ? `Video from:` : `Video from prompt:`;
        case 'image':
            return `Image from prompt:`;
        case 'enhance':
            return `Enhancing:`;
        default:
            return `Processing:`;
    }
}

const CreationsPage: React.FC<CreationsPageProps> = ({
  tasks,
  completedCreations,
  onImageSelect,
  analyzingIds,
  generatingIds,
  disabled,
  onClearFailedTasks
}) => {
  const inProgressTasks = tasks.filter(t => t.status === 'processing');
  const failedTasks = tasks.filter(t => t.status === 'failed');
  const hasActivity = inProgressTasks.length > 0 || failedTasks.length > 0;

  return (
    <div className="space-y-12">
      {/* 1. Completed Creations Section (Now at Top) */}
      <section>
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                    Completed Creations
                </h2>
                <p className="text-gray-400 text-sm mt-1">Your recently generated AI content</p>
            </div>
            <div className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 font-medium border border-gray-700">
                {completedCreations.length} items
            </div>
        </div>

        {completedCreations.length > 0 ? (
          <ImageGrid
            images={completedCreations}
            onImageClick={onImageSelect}
            analyzingIds={analyzingIds}
            generatingIds={generatingIds}
            disabled={disabled}
            isSelectionMode={false}
            selectedIds={new Set()}
          />
        ) : (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
            <p className="text-xl text-gray-400 font-semibold">No creations yet</p>
            <p className="text-gray-500 mt-2">Use the AI viewer or upload images to get started!</p>
          </div>
        )}
      </section>

      {/* 2. Generation Tasks Section (Moved to Bottom) */}
      {hasActivity && (
        <section className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">Activity Log</h2>
                <span className="text-xs font-medium bg-gray-700 text-gray-300 px-2 py-1 rounded-md">
                    {inProgressTasks.length} Active / {failedTasks.length} Failed
                </span>
            </div>
            {failedTasks.length > 0 && onClearFailedTasks && (
                <button 
                    onClick={onClearFailedTasks}
                    className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded-md transition-colors"
                >
                    <TrashIcon className="w-3 h-3" />
                    Clear Failed
                </button>
            )}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inProgressTasks.map(task => (
              <div key={task.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700/50 shadow-sm flex flex-col gap-2 animate-pulse">
                 <div className="flex justify-between items-start">
                    <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">{task.type}</span>
                    <Spinner className="w-4 h-4 text-blue-400" />
                 </div>
                 <div>
                     <p className="text-gray-400 text-xs mb-0.5">{getTaskDescription(task)}</p>
                     <p className="text-white font-medium text-sm truncate" title={getTaskSourceName(task)}>{getTaskSourceName(task)}</p>
                 </div>
                 <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                     <div className="bg-blue-500 h-1.5 rounded-full w-2/3 animate-pulse"></div>
                 </div>
              </div>
            ))}

            {failedTasks.map(task => (
              <div key={task.id} className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg shadow-sm flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                    <span className="text-xs uppercase font-bold text-red-400 tracking-wider">{task.type} Failed</span>
                    <WarningIcon className="w-5 h-5 text-red-500" />
                 </div>
                 <div>
                    <p className="text-red-300/70 text-xs mb-0.5">Source:</p>
                    <p className="text-red-200 font-medium text-sm truncate">{getTaskSourceName(task)}</p>
                 </div>
                 <div className="mt-2 bg-red-900/20 p-2 rounded text-xs text-red-300 break-words">
                    {task.error || "Unknown error"}
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CreationsPage;
