
import React from 'react';
import { MagnifyingGlassIcon as SearchIcon, XMarkIcon as CloseIcon, ExclamationTriangleIcon as WarningIcon } from '@heroicons/react/24/outline';
import GenerationStatusIndicator from '../GenerationStatusIndicator';
import { GalleryView, User, GenerationTask, QueueStatus } from '../../types';

interface NavBarProps {
    currentView: GalleryView;
    onSetView: (view: GalleryView) => void;
    currentUser: User | null;
    generationTasks: GenerationTask[];
    queueStatus: QueueStatus;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onShowDuplicates: () => void;
    onShowCreations: () => void;
    hasImages: boolean;
    isSelectionMode: boolean;
    onToggleSelectionMode: () => void;
    failedAnalysisCount: number;
    onRetryAnalysis: () => void;
    onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const NavBar: React.FC<NavBarProps> = ({
    currentView,
    onSetView,
    currentUser,
    generationTasks,
    queueStatus,
    searchQuery,
    onSearchChange,
    onShowDuplicates,
    onShowCreations,
    hasImages,
    isSelectionMode,
    onToggleSelectionMode,
    failedAnalysisCount,
    onRetryAnalysis,
    onFilesSelected
}) => {
    return (
        <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl -mx-4 px-4 py-3 mb-6 border-b border-gray-800 shadow-lg md:shadow-none md:static md:bg-transparent md:mx-0 md:px-0 md:py-0 md:border-none flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-300">
            <div className="flex items-center bg-gray-800 p-1 rounded-lg">
                <button onClick={() => onSetView('public')} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (currentView === 'public' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700')}>
                    Public Gallery
                </button>
                <button onClick={() => onSetView('my-gallery')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (currentView === 'my-gallery' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    My Gallery
                </button>
                <button onClick={() => onSetView('creations')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (currentView === 'creations' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    Creations Gallery
                </button>
                <button onClick={() => onSetView('prompt-history')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (currentView === 'prompt-history' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    Prompt History
                </button>
                <button onClick={() => onSetView('status')} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (currentView === 'status' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700')}>
                    Status
                </button>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
                <GenerationStatusIndicator
                    tasks={generationTasks}
                    onStatusClick={onShowCreations}
                    queueStatus={queueStatus}
                />

                {currentUser && hasImages && (
                    <button
                        onClick={onToggleSelectionMode}
                        className={'text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-300 whitespace-nowrap ' + (isSelectionMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200')}
                    >
                        {isSelectionMode ? 'Cancel Selection' : 'Select Items'}
                    </button>
                )}

                {currentView === 'my-gallery' && failedAnalysisCount > 0 && (
                    <button
                        onClick={onRetryAnalysis}
                        className="bg-yellow-600/80 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm whitespace-nowrap flex items-center gap-2"
                        title="Retry analysis for all failed items"
                    >
                        <WarningIcon className="w-4 h-4" />
                        Retry Failed ({failedAnalysisCount})
                    </button>
                )}

                {currentUser && currentView === 'my-gallery' && !isSelectionMode && (
                    <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm whitespace-nowrap">
                        Add Images
                        <input type="file" multiple accept="image/*" className="hidden" onChange={onFilesSelected} />
                    </label>
                )}

                {/* Search Bar */}
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by keyword..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Clear search"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    )}
                    {currentUser && currentView === 'my-gallery' && (
                        <button
                            onClick={onShowDuplicates}
                            className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Find Duplicates"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
