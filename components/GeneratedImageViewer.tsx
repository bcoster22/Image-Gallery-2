import React, { useState } from 'react';
import { CloseIcon, SparklesIcon, DownloadIcon } from './icons';
import Spinner from './Spinner';

interface GeneratedImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  generatedImage: string | null; // base64 string
  error: string | null;
  prompt: string;
  aspectRatio: string | null;
  onSave: (base64Image: string, isPublic: boolean) => void;
  isLoggedIn: boolean;
}

const GeneratedImageViewer: React.FC<GeneratedImageViewerProps> = ({
  isOpen,
  onClose,
  isLoading,
  generatedImage,
  error,
  prompt,
  aspectRatio,
  onSave,
  isLoggedIn,
}) => {
  const [isPublic, setIsPublic] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImage}`;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      style={{ zIndex: 100 }} // Ensure it's on top of the other modal
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 border border-gray-700 relative animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 mr-3 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">AI Generated Image</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-6 flex-grow flex items-center justify-center bg-gray-900/50 min-h-[400px]">
          {isLoading && (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-gray-300">Generating image with AI...</p>
            </div>
          )}
          {error && (
            <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <h3 className="text-lg font-semibold text-red-300">Generation Failed</h3>
              <p className="mt-2 text-red-400">{error}</p>
            </div>
          )}
          {generatedImage && (
            <img
              src={`data:image/png;base64,${generatedImage}`}
              alt="AI generated image"
              className="max-h-[60vh] max-w-full object-contain rounded-md shadow-lg animate-fade-in-img"
            />
          )}
        </main>
        
        {prompt && (
            <footer className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center flex-wrap gap-4">
                <div className='flex-grow'>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">
                    Prompt Used {aspectRatio && `(Aspect Ratio: ${aspectRatio})`}
                    </h4>
                    <p className="text-sm text-gray-300 max-h-20 overflow-y-auto pr-4">{prompt}</p>
                </div>
                {generatedImage && !isLoading && (
                    <div className="flex items-center space-x-3 ml-auto flex-shrink-0">
                        {isLoggedIn && (
                             <div className="flex items-center mr-2">
                                <input
                                    type="checkbox"
                                    id="share-publicly"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="share-publicly" className="ml-2 text-sm text-gray-300">
                                    Share Publicly
                                </label>
                            </div>
                        )}
                        <button
                            onClick={handleDownload}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center"
                            title="Download Image"
                        >
                            <DownloadIcon className="w-5 h-5 mr-2"/>
                            Download
                        </button>
                        {isLoggedIn && (
                            <button
                                onClick={() => onSave(generatedImage, isPublic)}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                            >
                                Save to Gallery
                            </button>
                        )}
                    </div>
                )}
            </footer>
        )}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        @keyframes fade-in-img {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-img {
            animation: fade-in-img 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default GeneratedImageViewer;