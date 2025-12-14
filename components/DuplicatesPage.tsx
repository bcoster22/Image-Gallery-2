
import React, { useState, useEffect, useMemo } from 'react';
import { ImageInfo } from '../types';
import { findDuplicates, DuplicateGroup } from '../services/duplicateService';
import { Trash2, AlertTriangle, Check, X, Maximize2, Image as ImageIcon } from 'lucide-react';

interface DuplicatesPageProps {
    images: ImageInfo[];
    onDeleteImages: (ids: string[]) => void;
    onClose: () => void;
}

const DuplicatesPage: React.FC<DuplicatesPageProps> = ({ images, onDeleteImages, onClose }) => {
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
    const [resolvedCount, setResolvedCount] = useState(0);

    // Run detection on mount
    useEffect(() => {
        setIsLoading(true);
        // setTimeout to allow UI to render first
        setTimeout(() => {
            const results = findDuplicates(images);
            setGroups(results);
            setIsLoading(false);
        }, 100);
    }, [images]);

    const totalDuplicates = useMemo(() => {
        return groups.reduce((acc, group) => acc + group.images.length - 1, 0);
    }, [groups]);

    const handleResolveGroup = (groupId: string, idsToDelete: string[]) => {
        if (idsToDelete.length > 0) {
            onDeleteImages(idsToDelete);
        }
        // Remove group from UI immediately
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setResolvedCount(prev => prev + 1);
    };

    const handleKeepImage = (group: DuplicateGroup, keepId: string) => {
        const idsToDelete = group.images.filter(img => img.id !== keepId).map(img => img.id);
        handleResolveGroup(group.id, idsToDelete);
    };

    const handleSmartResolve = (group: DuplicateGroup) => {
        // Logic: Keep highest resolution, then largest file size, then oldest (original)
        const sorted = [...group.images].sort((a, b) => {
            const areaA = (a.width || 0) * (a.height || 0);
            const areaB = (b.width || 0) * (b.height || 0);
            if (areaB !== areaA) return areaB - areaA; // Descending area

            // Fallback to file size (approximate via dataUrl length if file size missing)
            const sizeA = a.file?.size || a.dataUrl.length;
            const sizeB = b.file?.size || b.dataUrl.length;
            return sizeB - sizeA;
        });

        const winner = sorted[0];
        handleKeepImage(group, winner.id);
    };

    const handleIgnoreGroup = (groupId: string) => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Scanning gallery for duplicates...</p>
                <p className="text-xs mt-2 text-gray-500">This compares perceptual hashes of all your images.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-yellow-500" />
                        Duplicate Detection
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Found {groups.length} groups with potential duplicates ({totalDuplicates} redundant images).
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-700 border-dashed">
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">No duplicates found!</h3>
                    <p className="text-gray-400 mt-2">Your gallery is clean.</p>
                    {resolvedCount > 0 && (
                        <p className="text-indigo-400 mt-4 text-sm">You resolved {resolvedCount} groups.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                            <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-300">
                                    Found {group.images.length} similar images
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleIgnoreGroup(group.id)}
                                        className="text-xs px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                    >
                                        Ignore Group
                                    </button>
                                    <button
                                        onClick={() => handleSmartResolve(group)}
                                        className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center gap-1"
                                        title="Autoselects the highest resolution/quality image and deletes the rest"
                                    >
                                        <Maximize2 className="w-3 h-3" />
                                        Smart Merge
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {group.images.map((img) => (
                                    <div key={img.id} className="relative group/card">
                                        <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative">
                                            <img
                                                src={img.dataUrl}
                                                alt={img.displayName}
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                        </div>

                                        <div className="mt-2 px-1 space-y-1">
                                            <p className="text-xs text-gray-300 truncate font-medium" title={img.fileName}>{img.fileName}</p>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                <span>{img.width}x{img.height}</span>
                                                <span>{(img.file?.size ? (img.file.size / 1024).toFixed(1) : '?')} KB</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 text-right">{new Date(img.file?.lastModified || Date.now()).toLocaleDateString()}</p>
                                        </div>

                                        <button
                                            onClick={() => handleKeepImage(group, img.id)}
                                            className="w-full mt-2 py-1.5 bg-gray-700 hover:bg-green-600 text-gray-200 hover:text-white rounded text-xs transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Check className="w-3 h-3" />
                                            Keep Only This
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DuplicatesPage;
