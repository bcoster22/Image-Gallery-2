import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { fileToDataUrl } from '../../utils/fileUtils';
import { ImageInfo } from '../../types';

interface ProfileHeaderProps {
    bannerUrl?: string;
    bannerPos: { x: number; y: number; scale: number };
    onBannerUrlChange: (url: string) => void;
    onBannerPosChange: (pos: { x: number; y: number; scale: number }) => void;
    onOpenGalleryPicker: () => void;
    addNotification: (notification: any) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    bannerUrl,
    bannerPos,
    onBannerUrlChange,
    onBannerPosChange,
    onOpenGalleryPicker,
    addNotification
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag state (placeholders as per original code logic)
    const bannerRef = useRef<HTMLDivElement>(null);
    const [isDraggingBanner, setIsDraggingBanner] = useState(false);

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                addNotification({ status: 'error', message: 'Please select an image file.' });
                return;
            }
            try {
                const url = await fileToDataUrl(file);
                onBannerUrlChange(url);
            } catch (error) {
                addNotification({ status: 'error', message: 'Failed to read image file.' });
            }
        }
    };

    const handleBannerDragCheck = (e: React.MouseEvent) => {
        if (isDraggingBanner && bannerRef.current) {
            // Logic placeholder as per original file
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Banner Preview */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative group">
                <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1 rounded text-xs font-mono text-gray-300">
                    LIVE PREVIEW
                </div>

                {/* Simulated Header Interface to show context */}
                <div className="h-40 relative w-full overflow-hidden bg-gray-950">
                    {bannerUrl ? (
                        <div
                            className="w-full h-full"
                            style={{
                                backgroundImage: `url(${bannerUrl})`,
                                backgroundPosition: `${bannerPos.x}% ${bannerPos.y}%`,
                                backgroundSize: 'cover',
                                transform: `scale(${bannerPos.scale})`,
                                transformOrigin: `${bannerPos.x}% ${bannerPos.y}%`,
                                transition: 'transform 0.1s'
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            No banner selected
                        </div>
                    )}

                    {/* Fake UI Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent pointer-events-none"></div>
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between opacity-50 pointer-events-none">
                        <div className="w-32 h-6 bg-gray-700 rounded"></div>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-800 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Source</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Upload Image
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleBannerUpload}
                                />
                                <button
                                    onClick={onOpenGalleryPicker}
                                    className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <ImageIcon className="w-4 h-4" /> Select from Gallery
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Adjust</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Position X</span>
                                        <span>{bannerPos.x}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={bannerPos.x}
                                        onChange={(e) => onBannerPosChange({ ...bannerPos, x: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Position Y</span>
                                        <span>{bannerPos.y}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={bannerPos.y}
                                        onChange={(e) => onBannerPosChange({ ...bannerPos, y: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Zoom</span>
                                        <span>{bannerPos.scale.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1" max="2" step="0.1"
                                        value={bannerPos.scale}
                                        onChange={(e) => onBannerPosChange({ ...bannerPos, scale: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
