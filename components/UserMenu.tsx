import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { UserIcon, LogoutIcon, ShieldCheckIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  onSetView: (view: 'my-gallery') => void;
  nsfwBlurEnabled: boolean;
  onToggleNsfwBlur: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onSetView, nsfwBlurEnabled, onToggleNsfwBlur }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMyGalleryClick = () => {
    onSetView('my-gallery');
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-700 transition-colors"
      >
        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
        <span className="text-sm font-medium text-white hidden sm:block">{user.name}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 animate-fade-in-fast">
          <div className="p-2">
            <button
              onClick={() => {
                onSetView('profile-settings');
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700"
            >
              <UserIcon className="w-5 h-5 mr-3" />
              Profile Settings
            </button>
            <div className="h-px bg-gray-700 my-1 mx-2"></div>
            <button
              onClick={handleMyGalleryClick}
              className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700"
            >
              <UserIcon className="w-5 h-5 mr-3" />
              My Gallery
            </button>
            <button
              onClick={() => {
                onToggleNsfwBlur();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700"
            >
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-3" />
                Blur NSFW
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors ${nsfwBlurEnabled ? 'bg-indigo-600' : 'bg-gray-600'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${nsfwBlurEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700"
            >
              <LogoutIcon className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
      <style>{`
          @keyframes fade-in-fast {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-fast {
            animation: fade-in-fast 0.15s ease-out;
          }
      `}</style>
    </div>
  );
};

export default UserMenu;
