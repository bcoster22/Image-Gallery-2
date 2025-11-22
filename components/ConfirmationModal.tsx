import React from 'react';
import { CloseIcon, WarningIcon } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'primary',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const confirmButtonClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6 border border-gray-700 relative animate-fade-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
            <div className="bg-red-900/50 rounded-full p-3 mb-4">
                <WarningIcon className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            
            <div className="flex justify-center gap-4 w-full">
                <button
                    onClick={onClose}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-300"
                >
                    {cancelText}
                </button>
                 <button
                    onClick={handleConfirm}
                    className={`w-full text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-300 ${confirmButtonClasses[confirmButtonVariant]}`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
      </div>
      <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;
