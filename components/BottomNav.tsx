import React from 'react';
import { HomeIcon, SearchIcon, PlusIcon, SparklesIcon, UserIcon } from './icons';
import { GalleryView } from '../types';

interface BottomNavProps {
    currentView: GalleryView;
    onViewChange: (view: GalleryView) => void;
    onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, onFilesSelected }) => {

    const navItems = [
        { id: 'public', label: 'Home', icon: HomeIcon, view: 'public' as GalleryView },
        {
            id: 'search', label: 'Search', icon: SearchIcon, action: () => {
                onViewChange('public');
                setTimeout(() => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(), 100);
            }
        },
        { id: 'upload', label: 'Add', icon: PlusIcon, isUpload: true },
        { id: 'creations', label: 'Creations', icon: SparklesIcon, view: 'creations' as GalleryView },
        { id: 'profile', label: 'Profile', icon: UserIcon, view: 'profile-settings' as GalleryView },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 pb-safe z-50 transition-all duration-300">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    // @ts-ignore
                    const isUpload = item.isUpload;
                    const isActive = !isUpload && currentView === item.view;
                    const Icon = item.icon;

                    if (isUpload) {
                        return (
                            <label key={item.id} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400 hover:text-gray-300 cursor-pointer">
                                <Icon className="w-6 h-6 stroke-1.5" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={onFilesSelected} />
                            </label>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            // @ts-ignore
                            onClick={() => item.action ? item.action() : onViewChange(item.view!)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
