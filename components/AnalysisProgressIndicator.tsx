import React from 'react';
import { AnalysisProgress } from '../types';
import { SparklesIcon } from './icons';

interface AnalysisProgressIndicatorProps {
  progress: AnalysisProgress | null;
}

const AnalysisProgressIndicator: React.FC<AnalysisProgressIndicatorProps> = ({ progress }) => {
  const [lastProgress, setLastProgress] = React.useState<AnalysisProgress | null>(progress);

  React.useEffect(() => {
    if (progress) {
      setLastProgress(progress);
    }
  }, [progress]);

  if (!lastProgress) return null; // Don't render until we have first data

  // Active if valid progress exists, otherwise inactive (slide down)
  const isActive = !!progress;
  const currentProgress = progress || lastProgress; // Use live data or fall back to last known

  const percentage = currentProgress.total > 0 ? (currentProgress.current / currentProgress.total) * 100 : 0;
  const isComplete = currentProgress.current === currentProgress.total;

  return (
    <div className={`fixed top-24 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none transition-transform duration-500 ease-in-out ${isActive ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg p-4 pointer-events-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">{isComplete ? 'Analysis Complete' : 'Analyzing Images...'}</h3>
          </div>
          <span className="text-sm font-medium text-gray-300">{currentProgress.current} / {currentProgress.total}</span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ease-linear ${isComplete ? 'bg-green-600' : 'bg-indigo-600'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span className="truncate pr-2">Analyzing: {currentProgress.fileName}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgressIndicator;
