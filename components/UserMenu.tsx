import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { UserIcon, LogoutIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  onSetView: (view: 'my-gallery') => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onSetView }) => {
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
              onClick={handleMyGalleryClick}
              className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-gray-700"
            >
              <UserIcon className="w-5 h-5 mr-3" />
              My Gallery
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
