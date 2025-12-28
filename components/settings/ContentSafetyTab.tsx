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

            {/* How It Works - Info Box */}
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-3 mb-6">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-blue-300">How Content Safety Works</h3>
                        <div className="text-xs text-gray-300 space-y-1.5">
                            <p>
                                <strong className="text-blue-200">Rating Detection:</strong> Uses WD14 tagging model to detect 5-level content ratings
                                (<span className="text-green-400">G</span>, <span className="text-green-300">PG</span>, <span className="text-yellow-300">PG-13</span>, <span className="text-orange-400">R</span>, <span className="text-red-400">X</span>, <span className="text-red-500">XXX</span>).
                            </p>
                            <p>
                                <strong className="text-blue-200">Classification:</strong> Ratings are mapped to binary NSFW/SFW classification.
                                <span className="text-red-400 ml-1">R, X, XXX</span> → NSFW |
                                <span className="text-green-400 ml-1">G, PG, PG-13</span> → SFW
                            </p>
                            <p>
                                <strong className="text-blue-200">Confidence Scores:</strong> Extracted from tagging results (e.g., <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">score:explicit:0.95</code> = 95% confidence).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Setup Requirements */}
            <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg space-y-2 mb-6">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-amber-300">Setup Requirements</h3>
                        <ol className="text-xs text-gray-300 list-decimal list-inside space-y-1">
                            <li><strong>Enable WD14 Tagger:</strong> Go to <span className="text-blue-300">Providers → Moondream Local</span> and select a WD14 tagging model</li>
                            <li><strong>Configure Routing:</strong> Add WD14 to <span className="text-blue-300">Routing → Tagging</span> capability</li>
                            <li><strong>Enable Content Safety:</strong> Toggle "Enable Safety Filters" below</li>
                            <li><strong>Adjust Threshold:</strong> Set confidence threshold (80%+ recommended for accuracy)</li>
                        </ol>
                    </div>
                </div>
            </div>

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
