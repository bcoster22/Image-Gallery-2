import React from 'react';
import { AdminSettings } from '../../types';

interface ContentSafetyTabProps {
    settings: AdminSettings;
    onUpdateSettings: (settings: AdminSettings) => void;
}

export const ContentSafetyTab: React.FC<ContentSafetyTabProps> = ({ settings, onUpdateSettings }) => {

    const handleChange = <K extends keyof NonNullable<AdminSettings['contentSafety']>>(
        field: K,
        value: NonNullable<AdminSettings['contentSafety']>[K]
    ) => {
        onUpdateSettings({
            ...settings,
            contentSafety: {
                ...settings.contentSafety!,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Content Safety</h2>
            <p className="text-sm text-gray-400 mb-6">Configure automatic NSFW detection and content classification for all images.</p>

            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                    <div>
                        <label htmlFor="content-safety-enabled" className="text-sm font-medium text-gray-200">Enable Safety Filters</label>
                        <p className="text-xs text-gray-400 mt-1">Process image ratings and apply blurring</p>
                    </div>
                    <input
                        type="checkbox"
                        id="content-safety-enabled"
                        checked={settings.contentSafety?.enabled ?? true}
                        onChange={e => handleChange('enabled', e.target.checked)}
                        className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>

                {/* Threshold Slider */}
                <div className="pb-3 border-b border-gray-700/50">
                    <label htmlFor="threshold-slider" className="text-sm font-medium text-gray-200 block mb-2">
                        Classification Threshold: {settings.contentSafety?.threshold ?? 75}%
                    </label>
                    <input
                        type="range"
                        id="threshold-slider"
                        min="0"
                        max="100"
                        value={settings.contentSafety?.threshold ?? 75}
                        onChange={e => handleChange('threshold', parseInt(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg appearance-none cursor-pointer"
                        disabled={!settings.contentSafety?.enabled}
                    />
                    <p className="text-xs text-gray-400 mt-2">Only mark as NSFW if confidence is above this threshold</p>
                </div>

                {/* Keywords */}
                <div className="pb-3 border-b border-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Keywords</h3>
                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-400">NSFW Keyword</label>
                            <input
                                type="text"
                                value={settings.contentSafety?.nsfwKeyword ?? 'NSFW'}
                                onChange={e => handleChange('nsfwKeyword', e.target.value)}
                                className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                disabled={!settings.contentSafety?.enabled}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400">SFW Keyword</label>
                            <input
                                type="text"
                                value={settings.contentSafety?.sfwKeyword ?? 'SFW'}
                                onChange={e => handleChange('sfwKeyword', e.target.value)}
                                className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                disabled={!settings.contentSafety?.enabled}
                            />
                        </div>
                    </div>
                </div>

                {/* Display Options */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Display Options</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label htmlFor="show-confidence" className="text-sm text-gray-200">Show confidence scores</label>
                            <input
                                type="checkbox"
                                id="show-confidence"
                                checked={settings.contentSafety?.showConfidence ?? true}
                                onChange={e => handleChange('showConfidence', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                disabled={!settings.contentSafety?.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="blur-nsfw" className="text-sm text-gray-200">Blur NSFW images in gallery</label>
                            <input
                                type="checkbox"
                                id="blur-nsfw"
                                checked={settings.contentSafety?.blurNsfw ?? false}
                                onChange={e => handleChange('blurNsfw', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                disabled={!settings.contentSafety?.enabled}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
