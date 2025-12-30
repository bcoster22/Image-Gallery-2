import React from 'react';
import { ViewfinderCircleIcon as ViewfinderIcon } from '@heroicons/react/24/outline';
import { Layout, Check, Film } from 'lucide-react';
import { User } from '../../types';

interface ProfileSettingsProps {
    user: User;
    onUpdateUser: (updates: Partial<User>) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdateUser }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ViewfinderIcon className="w-5 h-5 text-indigo-400" />
                    Workflow
                </h3>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-white">Auto-save to My Gallery</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Automatically show new creations in your main gallery view.
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.autoSaveToGallery}
                                onChange={(e) => onUpdateUser({ autoSaveToGallery: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div className="h-px bg-gray-700/50 my-6"></div>

                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Layout className="w-5 h-5 text-indigo-400" />
                    Gallery Layout
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={() => onUpdateUser({ galleryLayout: 'masonry' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${user.galleryLayout === 'masonry' || !user.galleryLayout ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                                <div className="h-8 w-6 bg-gray-600 rounded-sm mb-1 inline-block mr-1"></div>
                                <div className="h-12 w-6 bg-gray-600 rounded-sm inline-block mr-1"></div>
                                <div className="h-6 w-6 bg-gray-600 rounded-sm inline-block"></div>
                            </div>
                            {(user.galleryLayout === 'masonry' || !user.galleryLayout) && <Check className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div className="font-semibold text-white">Masonry (Pinterest)</div>
                        <div className="text-xs text-gray-400 mt-1">Best for mixed aspect ratios. Shows full uncropped images.</div>
                    </button>

                    <button
                        onClick={() => onUpdateUser({ galleryLayout: 'grid' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${user.galleryLayout === 'grid' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="grid grid-cols-3 gap-1 w-20">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-square bg-gray-600 rounded-sm"></div>
                                ))}
                            </div>
                            {user.galleryLayout === 'grid' && <Check className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div className="font-semibold text-white">Uniform Grid</div>
                        <div className="text-xs text-gray-400 mt-1">Clean, square thumbnails. Best for scanning large collections.</div>
                    </button>
                </div>

                <div className="h-px bg-gray-700/50 my-6"></div>

                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ViewfinderIcon className="w-5 h-5 text-indigo-400" />
                    Smart Crop Behavior
                </h3>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-white">Smart Crop in Slideshow</div>
                            <div className="text-xs text-gray-400 mt-1">
                                When enabled, slideshow images will zoom to fill the screen, centered on the main subject.
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.slideshowSmartCrop}
                                onChange={(e) => onUpdateUser({ slideshowSmartCrop: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="h-px bg-gray-700/50 my-4"></div>

                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-white">Adaptive Portrait Slideshow</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Automatically pan horizontal images when viewed on portrait screens (Cinematic Pan).
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.slideshowAdaptivePan}
                                onChange={(e) => onUpdateUser({ slideshowAdaptivePan: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="h-px bg-gray-700/50 my-4"></div>

                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-white">Disable Notifications</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Hide "Smart Crop complete" status messages.
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.disableSmartCropNotifications}
                                onChange={(e) => onUpdateUser({ disableSmartCropNotifications: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div className="h-px bg-gray-700/50 my-6"></div>

                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ViewfinderIcon className="w-5 h-5 text-indigo-400" />
                    Thumbnail Appearance
                </h3>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Thumbnail Size</span>
                            <span className="text-xs text-indigo-400">{user.thumbnailSize ?? 40}px</span>
                        </div>
                        <input
                            type="range"
                            min="30" max="100" step="5"
                            value={user.thumbnailSize ?? 40}
                            onChange={(e) => onUpdateUser({ thumbnailSize: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Small</span>
                            <span>Large</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Hover Zoom</span>
                            <span className="text-xs text-indigo-400">{user.thumbnailHoverScale ?? 1.2}x</span>
                        </div>
                        <input
                            type="range"
                            min="1.0" max="2.0" step="0.1"
                            value={user.thumbnailHoverScale ?? 1.2}
                            onChange={(e) => onUpdateUser({ thumbnailHoverScale: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>None</span>
                            <span>2x</span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-700/50 my-6"></div>

                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Film className="w-5 h-5 text-indigo-400" />
                    Slideshow Experience
                </h3>

                {/* Timing Controls */}
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Image Duration</span>
                            <span className="text-xs text-indigo-400">{(user.slideshowInterval || 4000) / 1000}s</span>
                        </div>
                        <input
                            type="range"
                            min="1000" max="30000" step="500"
                            value={user.slideshowInterval || 4000}
                            onChange={(e) => onUpdateUser({ slideshowInterval: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">How long each photo stays on screen.</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-300">Transition Speed</span>
                            <span className="text-xs text-indigo-400">{(user.slideshowAnimationDuration || 1500) / 1000}s</span>
                        </div>
                        <input
                            type="range"
                            min="500" max="10000" step="100"
                            value={user.slideshowAnimationDuration || 1500}
                            onChange={(e) => onUpdateUser({ slideshowAnimationDuration: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Duration of the animation effect.</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                        <div>
                            <div className="font-medium text-white text-sm">Bounce Animation</div>
                            <div className="text-xs text-gray-400">Reverse animation direction (Ping-Pong)</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.slideshowBounce}
                                onChange={(e) => onUpdateUser({ slideshowBounce: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                        <div>
                            <div className="font-medium text-white text-sm">Random Order</div>
                            <div className="text-xs text-gray-400">Shuffle images without repeats</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!user.slideshowRandomOrder}
                                onChange={(e) => onUpdateUser({ slideshowRandomOrder: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { id: 'fade', label: 'Simple Fade', desc: 'Basic fade out then in.' },
                        { id: 'cross-fade', label: 'Cross Fade', desc: 'Smooth overlap blend (No gap).' },
                        { id: 'slide', label: 'Push Slide', desc: 'Seamless horizontal slide.' },
                        { id: 'cube', label: '3D Cube', desc: 'Rotating 3D cube effect.' },
                        { id: 'stack', label: 'Card Stack', desc: 'New photo slides up over old.' },
                        { id: 'zoom', label: 'Deep Zoom', desc: 'Immersive Z-axis movement.' },
                        { id: 'ken-burns', label: 'Ken Burns', desc: 'Cinematic pan and zoom.' },
                        { id: 'parallax', label: 'Parallax Glide', desc: 'Premium fluid motion window.' },
                        { id: 'random', label: 'Surprise Me', desc: 'Randomly cycle through all effects.' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onUpdateUser({ slideshowTransition: option.id as any })}
                            className={`p-3 rounded-lg border text-left transition-all hover:bg-gray-700/50 ${user.slideshowTransition === option.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-transparent'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <div className="font-medium text-white">{option.label}</div>
                                {user.slideshowTransition === option.id && <Check className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className="text-xs text-gray-400">{option.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
