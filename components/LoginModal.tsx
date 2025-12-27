import React from 'react';
import Modal from './Modal';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import { GoogleIcon, GithubIcon } from './BrandIcons';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: 'google' | 'github') => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
    >
      <div className="text-center relative">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 text-gray-400 hover:text-white transition-colors"
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
    </Modal>
  );
};

export default LoginModal;
