import React, { useState, useRef } from 'react';
import { Check, Image as ImageIcon, Camera, Sliders, X } from 'lucide-react';
import { UserProfilePageProps } from './UserProfilePage/types';
import { ProfileHeader } from './UserProfilePage/ProfileHeader';
import { AvatarSelector } from './UserProfilePage/AvatarSelector';
import { ProfileSettings } from './UserProfilePage/ProfileSettings';

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user,
    onUpdateUser,
    galleryImages,
    settings,
    addNotification,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'banner' | 'avatar' | 'preferences'>('banner');
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    const [pickerFilter, setPickerFilter] = useState<'all' | 'mine'>('mine');

    // Local State Buffer (so we can save all at once)
    const [localUser, setLocalUser] = useState(user);

    // We update localUser on changes, then commit on Save
    // The sub-components act on this 'localUser' state
    const updateLocalUser = (updates: Partial<typeof user>) => {
        setLocalUser(prev => ({ ...prev, ...updates }));
    };

    const saveProfile = () => {
        onUpdateUser(localUser);
        addNotification({ status: 'success', message: 'Profile updated successfully!' });
    };

    // Helper for ProfileHeader to update banner specific fields
    const handleBannerPosChange = (pos: { x: number; y: number; scale: number }) => {
        updateLocalUser({ bannerPosition: pos });
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
                        <div className="h-px bg-gray-700/50 my-1"></div>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'preferences' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            <Sliders className="w-5 h-5" />
                            <div>
                                <div className="font-semibold">Preferences</div>
                                <div className="text-xs opacity-70">Layout & View Options</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-2">
                    {activeTab === 'banner' && (
                        <ProfileHeader
                            bannerUrl={localUser.bannerUrl}
                            bannerPos={localUser.bannerPosition || { x: 50, y: 50, scale: 1 }}
                            onBannerUrlChange={(url) => updateLocalUser({ bannerUrl: url })}
                            onBannerPosChange={handleBannerPosChange}
                            onOpenGalleryPicker={() => setIsGalleryPickerOpen(true)}
                            addNotification={addNotification}
                        />
                    )}

                    {activeTab === 'avatar' && (
                        <AvatarSelector
                            avatarUrl={localUser.avatarUrl}
                            onAvatarChange={(url) => updateLocalUser({ avatarUrl: url })}
                            settings={settings}
                            addNotification={addNotification}
                        />
                    )}

                    {activeTab === 'preferences' && (
                        <ProfileSettings
                            user={localUser}
                            onUpdateUser={updateLocalUser}
                        />
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
                                                updateLocalUser({ bannerUrl: img.dataUrl });
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

