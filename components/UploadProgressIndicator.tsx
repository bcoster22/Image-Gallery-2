import React from 'react';
import { UploadProgress } from '../types';
import { CloudArrowUpIcon as UploadIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface UploadProgressIndicatorProps {
  progress: UploadProgress | null;
  onCancel?: () => void;
}

const formatETA = (seconds: number): string => {
  if (seconds < 0) return 'Calculating...';
  if (seconds === 0) return 'Done';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({ progress, onCancel }) => {
  if (!progress) return null;

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress.current === progress.total;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg p-4 pointer-events-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">{isComplete ? 'Upload Complete' : 'Importing Images...'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">{progress.current} / {progress.total}</span>
            {!isComplete && onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-gray-700/50"
                title="Cancel import"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span className="truncate pr-2">{progress.fileName}</span>
          <div className="flex-shrink-0">
            <span>{progress.speed} MB/s</span>
            <span className="mx-1.5">|</span>
            <span>ETA: {formatETA(progress.eta)}</span>
          </div>
        </div>
      </div>
      <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out;
            }
        `}</style>
    </div>
  );
};

export default UploadProgressIndicator;