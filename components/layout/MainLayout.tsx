
import React from 'react';
import { TopBar } from './TopBar';
import { GalleryView, User, AdminSettings } from '../../types';

interface MainLayoutProps {
    children: React.ReactNode;
    // TopBar props passthrough
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
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    currentUser,
    // TopBar props
    onSetView,
    onShowLogs,
    isSlideshowEnabled,
    onToggleSlideshow,
    setIsSlideshowActive,
    currentView,
    onLogout,
    onLogin,
    settings,
    onToggleNsfwBlur,
    onDrop,
    onDragOver
}) => {
    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden overflow-y-auto scrollbar-none"
        >
            {/* Global Background Banner */}
            {currentUser?.bannerUrl && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div
                        className="absolute inset-0 opacity-40 transition-all duration-700 ease-in-out"
                        style={{
                            backgroundImage: 'url(' + currentUser.bannerUrl + ')',
                            backgroundPosition: (currentUser.bannerPosition?.x || 50) + '% ' + (currentUser.bannerPosition?.y || 50) + '%',
                            backgroundSize: 'cover',
                            transform: 'scale(' + (currentUser.bannerPosition?.scale || 1) + ')',
                            transformOrigin: (currentUser.bannerPosition?.x || 50) + '% ' + (currentUser.bannerPosition?.y || 50) + '%',
                        }}
                    />
                    {/* Gradient overlay to ensure text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60" />
                </div>
            )}

            {/* Main Content Wrapper - Ensure z-index is above banner */}
            <div className="relative z-10 min-h-screen flex flex-col pb-20 md:pb-0">
                <TopBar
                    onSetView={onSetView}
                    onShowLogs={onShowLogs}
                    isSlideshowEnabled={isSlideshowEnabled}
                    onToggleSlideshow={onToggleSlideshow}
                    setIsSlideshowActive={setIsSlideshowActive}
                    currentView={currentView}
                    currentUser={currentUser}
                    onLogout={onLogout}
                    onLogin={onLogin}
                    settings={settings}
                    onToggleNsfwBlur={onToggleNsfwBlur}
                />

                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
