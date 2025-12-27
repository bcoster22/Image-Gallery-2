import React from 'react';
import Modal from './Modal';
import { XMarkIcon as CloseIcon, VideoCameraIcon, ArrowTopRightOnSquareIcon as ExternalLinkIcon } from '@heroicons/react/24/outline';

interface VeoKeySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKey: () => void;
  isRetry: boolean;
}

const VeoKeySelectionModal: React.FC<VeoKeySelectionModalProps> = ({ isOpen, onClose, onSelectKey, isRetry }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
    >
      <div className="text-center relative">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 text-gray-400 hover:text-white transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <VideoCameraIcon className="w-12 h-12 text-green-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Veo Animation Requires API Key</h2>

          {isRetry && (
            <div className="text-sm text-yellow-300 bg-yellow-900/50 p-3 rounded-md mb-4 w-full">
              <p>Your previous attempt failed. This might be due to an invalid or unselected API key. Please select a valid key for your project.</p>
            </div>
          )}

          <p className="text-gray-300 mb-2">Video generation with Veo is a premium feature. To proceed, you must select a valid Google Cloud API key associated with a project that has billing enabled.</p>

          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6 group">
            Learn about billing for Gemini API
            <ExternalLinkIcon className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
          </a>

          <button
            onClick={onSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            Select API Key
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VeoKeySelectionModal;
