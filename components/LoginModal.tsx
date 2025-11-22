import React from 'react';
import { CloseIcon, GoogleIcon, GithubIcon } from './icons';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: 'google' | 'github') => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm m-4 p-6 border border-gray-700 relative animate-fade-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400 mb-6">Sign in to manage your gallery and generate images.</p>
        
        <div className="space-y-4">
          <button
            onClick={() => onLogin('google')}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            <GoogleIcon className="w-5 h-5 mr-3" />
            Sign in with Google
          </button>
          <button
            onClick={() => onLogin('github')}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            <GithubIcon className="w-5 h-5 mr-3" />
            Sign in with GitHub
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          This is a demonstration. Clicking a provider will sign you in with a mock user account.
        </p>
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

export default LoginModal;
