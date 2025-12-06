import React, { useState, useRef, useEffect } from 'react';
import { User, AdminSettings, ImageInfo } from '../types';
import { Upload, Sliders, Image as ImageIcon, Camera, RefreshCw, Check, X, Move } from 'lucide-react';
import { fileToDataUrl } from '../utils/fileUtils';
import { generateImageFromPrompt } from '../services/aiService';

interface UserProfilePageProps {
    user: User;
    onUpdateUser: (user: User) => void;
    galleryImages: ImageInfo[]; // For gallery picker
    settings: AdminSettings | null;
    addNotification: (notification: any) => void;
    onClose: () => void;
}

const AVATAR_PRESETS = [
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Alex',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Sam',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Milo',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Willow',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Caleb',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Sofia',
    'https://api.dicebear.com/8.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/8.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Bot1',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Bot2',
    'https://api.dicebear.com/8.x/lorelei/svg?seed=L1',
    'https://api.dicebear.com/8.x/lorelei/svg?seed=L2',
    'https://api.dicebear.com/8.x/micah/svg?seed=M1',
    'https://api.dicebear.com/8.x/micah/svg?seed=M2',
    'https://api.dicebear.com/8.x/notionists/svg?seed=N1',
];

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user,
    onUpdateUser,
    galleryImages,
    settings,
    addNotification,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'banner' | 'avatar'>('banner');
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [pickerFilter, setPickerFilter] = useState<'all' | 'mine'>('mine');

    // Banner State
    const [bannerUrl, setBannerUrl] = useState<string | undefined>(user.bannerUrl);
    const [bannerPos, setBannerPos] = useState(user.bannerPosition || { x: 50, y: 50, scale: 1 });
    const [isDraggingBanner, setIsDraggingBanner] = useState(false);
    const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
    const bannerRef = useRef<HTMLDivElement>(null);

    // Avatar State
    const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl);
    const [avatarPrompt, setAvatarPrompt] = useState<string>('');
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Banner Handlers ---

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                addNotification({ status: 'error', message: 'Please select an image file.' });
                return;
            }
            try {
                const url = await fileToDataUrl(file);
                setBannerUrl(url);
            } catch (error) {
                addNotification({ status: 'error', message: 'Failed to read image file.' });
            }
        }
    };

    const handleBannerDragCheck = (e: React.MouseEvent) => {
        if (isDraggingBanner && bannerRef.current) {
            // Calculate delta
            // This is a simplified drag simulation for the "Position" visualizer
            // In a real implementation, we'd map pixels to percentage based on container size
        }
    };

    const saveProfile = () => {
        onUpdateUser({
            ...user,
            bannerUrl,
            bannerPosition: bannerPos,
            avatarUrl
        });
        addNotification({ status: 'success', message: 'Profile updated successfully!' });
        // Don't close immediately, let user see success? Or maybe close.
        // onClose(); 
    };

    // --- Avatar Handlers ---

    const handleGenerateAvatar = async () => {
        if (!settings || !avatarPrompt.trim()) return;
        setIsGeneratingAvatar(true);
        try {
            // Use "square" aspect ratio implicitly by requesting 1:1 if supported, 
            // or just relying on the provider's default. standard 'generateImageFromPrompt' 
            // usually produces 1:1 unless specified.
            const generatedUrl = await generateImageFromPrompt(
                `Profile avatar, ${avatarPrompt}, centralized, simple background, high quality`,
                settings,
                '1:1'
            );
            // Determine if text base64 or url
            // The generateImageFromPrompt usually returns base64 data URL
            setAvatarUrl(generatedUrl);
            addNotification({ status: 'success', message: 'Avatar generated!' });
        } catch (e: any) {
            addNotification({ status: 'error', message: 'Failed to generate avatar: ' + e.message });
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={saveProfile} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4" /> Save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Sidebar - Tabs */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-2">
                        <button
                            onClick={() => setActiveTab('banner')}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'banner' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            <ImageIcon className="w-5 h-5" />
                            <div>
                                <div className="font-semibold">Profile Banner</div>
                                <div className="text-xs opacity-70">Customize your global background</div>
                            </div>
                        </button>
                        <div className="h-px bg-gray-700/50 my-1"></div>
                        <button
                            onClick={() => setActiveTab('avatar')}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'avatar' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            <Camera className="w-5 h-5" />
                            <div>
                                <div className="font-semibold">User Avatar</div>
                                <div className="text-xs opacity-70">Change your profile picture</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-2">
                    {activeTab === 'banner' && (
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
                                                backgroundSize: 'cover', // In real app we might use transform: scale() for zoom
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
                                                    onClick={() => setIsGalleryPickerOpen(true)}
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
                                                        onChange={(e) => setBannerPos({ ...bannerPos, x: parseInt(e.target.value) })}
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
                                                        onChange={(e) => setBannerPos({ ...bannerPos, y: parseInt(e.target.value) })}
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
                                                        onChange={(e) => setBannerPos({ ...bannerPos, scale: parseFloat(e.target.value) })}
                                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'avatar' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative">
                                        <img src={avatarUrl} alt="Current" className="w-24 h-24 rounded-full border-4 border-gray-700 shadow-lg" />
                                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                                            CURRENT
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Your Avatar</h3>
                                        <p className="text-gray-400 text-sm">Select a preset or generate a unique AI avatar.</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">AI Generator</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={avatarPrompt}
                                            onChange={(e) => setAvatarPrompt(e.target.value)}
                                            placeholder="E.g., Cyberpunk raccoon, minimalist cat, neon robot..."
                                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleGenerateAvatar}
                                            disabled={isGeneratingAvatar || !avatarPrompt.trim()}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            {isGeneratingAvatar ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Presets</h3>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                        {AVATAR_PRESETS.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setAvatarUrl(url)}
                                                className={`relative rounded-full overflow-hidden transition-transform hover:scale-110 focus:outline-none ${avatarUrl === url ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-800' : ''}`}
                                            >
                                                <img src={url} alt={`Preset ${i}`} className="w-full h-full bg-gray-700" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Gallery Picker Modal */}
            {isGalleryPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-white">Select Background Image</h3>
                            <button
                                onClick={() => setIsGalleryPickerOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-700 flex gap-4 bg-gray-800/50">
                            <button
                                onClick={() => setPickerFilter('mine')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pickerFilter === 'mine' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            >
                                My Uploads
                            </button>
                            <button
                                onClick={() => setPickerFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pickerFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            >
                                All Gallery Images
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {galleryImages
                                    .filter(img => pickerFilter === 'all' ? true : img.ownerId === user.id)
                                    .map(img => (
                                        <button
                                            key={img.id}
                                            onClick={() => {
                                                setBannerUrl(img.dataUrl);
                                                setIsGalleryPickerOpen(false);
                                                addNotification({ status: 'success', message: `Selected ${img.fileName}` });
                                            }}
                                            className="group relative aspect-square rounded-xl overflow-hidden border border-gray-700 hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <img src={img.dataUrl} alt={img.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs text-white truncate text-center">{img.fileName}</p>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                            {galleryImages.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No images found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserProfilePage;

