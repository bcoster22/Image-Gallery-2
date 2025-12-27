
import React from 'react';
import { Cog6ToothIcon as SettingsIcon } from '@heroicons/react/24/outline';
import { Activity } from 'lucide-react';
import UserMenu from '../UserMenu';
import { GalleryView, User, AdminSettings } from '../../types';

interface TopBarProps {
    onSetView: (view: GalleryView) => void;
    onShowLogs: () => void;
    isSlideshowEnabled: boolean;
    onToggleSlideshow: (enabled: boolean) => void;
    setIsSlideshowActive: (active: boolean) => void;
    currentView: GalleryView;
    currentUser: User | null;
    onLogout: () => void;
    onLogin: () => void;
    settings: AdminSettings | null;
    onToggleNsfwBlur: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    onSetView,
    onShowLogs,
    isSlideshowEnabled,
    onToggleSlideshow,
    setIsSlideshowActive,
    currentView,
    currentUser,
    onLogout,
    onLogin,
    settings,
    onToggleNsfwBlur
}) => {
    return (
        <header className="hidden md:flex p-4 sm:p-6 border-b border-gray-700/50 justify-between items-center bg-gray-900/40 backdrop-blur-md sticky top-0 z-50">
            <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
                    Gemini Vision Gallery
                </h1>
            </div>
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => onSetView('admin-settings')}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    aria-label="Settings"
                >
                    <SettingsIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={onShowLogs}
                    className="p-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
                    title="System Logs"
                    aria-label="System Logs"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </button>
                {/* Slideshow Toggle Slider */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        // Toggle the ENABLED state
                        const newState = !isSlideshowEnabled;
                        onToggleSlideshow(newState);

                        // If turning off, immediately stop any running slideshow
                        if (!newState) {
                            setIsSlideshowActive(false);
                        }
                    }}
                    className="flex items-center gap-2 cursor-pointer group"
                    title={isSlideshowEnabled ? "Slideshow Auto-Start On" : "Slideshow Auto-Start Off"}
                >
                    <div className="relative">
                        <div className={`w-11 h-6 rounded-full transition-colors ${isSlideshowEnabled ? 'bg-indigo-600' : 'bg-gray-700'} relative`}>
                            <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${isSlideshowEnabled ? 'translate-x-full' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors hidden sm:inline">{isSlideshowEnabled ? 'Auto' : 'Off'}</span>
                </div>
                <button
                    onClick={() => onSetView('status')}
                    className={'p-2 rounded-full transition-colors ' + (currentView === 'status' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700')}
                    title="System Status"
                >
                    <Activity className="w-6 h-6" />
                </button>
                {currentUser ? (
                    <UserMenu
                        user={currentUser}
                        onLogout={onLogout}
                        onSetView={onSetView}
                        nsfwBlurEnabled={settings?.contentSafety?.blurNsfw ?? false}
                        onToggleNsfwBlur={onToggleNsfwBlur}
                    />
                ) : (
                    <button
                        onClick={onLogin}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </header>
    );
};
