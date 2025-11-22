import React from 'react';
import { AnalysisProgress } from '../types';
import { SparklesIcon } from './icons';

interface AnalysisProgressIndicatorProps {
  progress: AnalysisProgress | null;
}

const AnalysisProgressIndicator: React.FC<AnalysisProgressIndicatorProps> = ({ progress }) => {
  if (!progress) return null;

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress.current === progress.total;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg p-4 pointer-events-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">{isComplete ? 'Analysis Complete' : 'Analyzing Images...'}</h3>
            </div>
            <span className="text-sm font-medium text-gray-300">{progress.current} / {progress.total}</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
          <div 
            className={`h-2.5 rounded-full transition-all duration-300 ease-linear ${isComplete ? 'bg-green-600' : 'bg-indigo-600'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
            <span className="truncate pr-2">Analyzing: {progress.fileName}</span>
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

export default AnalysisProgressIndicator;
