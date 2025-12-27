import React from 'react';
import { AdminSettings } from '../../types';

interface PerformanceTabProps {
    settings: AdminSettings;
    onUpdateSettings: (settings: AdminSettings) => void;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ settings, onUpdateSettings }) => {

    const handleChange = <K extends keyof AdminSettings['performance']>(
        field: K,
        value: AdminSettings['performance'][K]
    ) => {
        onUpdateSettings({
            ...settings,
            performance: {
                ...settings.performance,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Performance Settings</h2>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-2">Image Analysis</h3>
                <p className="text-sm text-gray-400 mb-4">Downscaling images before sending them to AI can significantly improve analysis speed and reduce costs, but may slightly decrease accuracy.</p>
                <div className="flex items-center justify-between mb-3">
                    <label htmlFor="downscale-toggle" className="text-sm font-medium text-gray-200">Downscale images for AI analysis</label>
                    <input
                        type="checkbox"
                        id="downscale-toggle"
                        checked={settings.performance?.downscaleImages ?? true}
                        onChange={e => handleChange('downscaleImages', e.target.checked)}
                        className="h-5 w-5 rounded-md border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="dimension-input" className="text-sm font-medium text-gray-200">Max dimension (pixels)</label>
                    <input
                        type="number"
                        id="dimension-input"
                        value={settings.performance?.maxAnalysisDimension ?? 1024}
                        onChange={e => handleChange('maxAnalysisDimension', parseInt(e.target.value, 10))}
                        className="w-24 bg-gray-700 border border-gray-600 rounded-md p-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        disabled={!settings.performance?.downscaleImages}
                    />
                </div>
            </div>

            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white mb-1">VRAM Management</h3>
                            <div className="group relative">
                                <div className="cursor-help text-gray-400 hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="absolute left-full top-0 ml-2 w-72 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs z-50 hidden group-hover:block">
                                    <h4 className="font-bold text-indigo-400 mb-2">VRAM Strategies:</h4>
                                    <ul className="space-y-2 text-gray-300">
                                        <li><strong className="text-white">High:</strong> Keeps all models loaded. Best for 24GB+ VRAM. Fastest switching.</li>
                                        <li><strong className="text-white">Balanced:</strong> Smart switching. Unloads the unused model when switching tasks. Best for 12-16GB VRAM.</li>
                                        <li><strong className="text-white">Low:</strong> Aggressively unloads models after every request. Best for 8GB VRAM.</li>
                                    </ul>
                                    <p className="mt-2 text-gray-500 italic">System naturally recovers from OOM errors by unloading all models and retrying.</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Configure how GPU memory is managed between models.</p>
                    </div>
                    <select
                        value={settings.performance?.vramUsage || 'balanced'}
                        onChange={(e) => handleChange('vramUsage', e.target.value as any)}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                        <option value="high">High Performance (Keep All Loaded)</option>
                        <option value="balanced">Balanced (Smart Switching)</option>
                        <option value="low">Low VRAM (Unload After Use)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
