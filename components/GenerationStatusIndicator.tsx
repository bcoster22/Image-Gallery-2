import React from 'react';
import { GenerationTask } from '../types';
import Spinner from './Spinner';

interface GenerationStatusIndicatorProps {
  tasks: GenerationTask[];
  onStatusClick: () => void;
}

const GenerationStatusIndicator: React.FC<GenerationStatusIndicatorProps> = ({ tasks, onStatusClick }) => {
  const activeTasks = tasks.filter(t => t.status === 'processing');

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <button
      onClick={onStatusClick}
      className="flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-300 whitespace-nowrap bg-gray-700 hover:bg-gray-600 text-gray-200"
      title="View generation status"
    >
      <Spinner className="w-4 h-4" />
      <span>Creating ({activeTasks.length})...</span>
    </button>
  );
};

export default GenerationStatusIndicator;