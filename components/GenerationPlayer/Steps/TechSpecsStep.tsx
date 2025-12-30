import React from 'react';
import { AdjustmentsHorizontalIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import ConfigSection from '../ConfigSection';
import { GenerationSettings } from '../../../types';

interface TechSpecsStepProps {
    settings: GenerationSettings;
    onSettingsChange: (settings: GenerationSettings) => void;
    autoSeedAdvance: boolean;
    onAutoSeedAdvanceChange?: (enabled: boolean) => void;
}

export const TechSpecsStep: React.FC<TechSpecsStepProps> = ({
    settings,
    onSettingsChange,
    autoSeedAdvance,
    onAutoSeedAdvanceChange
}) => {

    const updateSetting = (key: keyof GenerationSettings, value: any) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <ConfigSection number={4} title="Tech Specs" icon={AdjustmentsHorizontalIcon} defaultOpen={false}>
            <div className="space-y-4">
                {/* Scheduler Selection */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1.5 text-left">Scheduler</label>
                    <div className="relative">
                        <select
                            value={settings.scheduler || 'dpm_pp_2m_karras'}
                            onChange={e => updateSetting('scheduler', e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white appearance-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="dpm_pp_2m_karras">DPM++ 2M Karras</option>
                            <option value="dpm_pp_2m">DPM++ 2M</option>
                            <option value="euler">Euler</option>
                            <option value="euler_a">Euler Ancestral</option>
                            <option value="lms">LMS</option>
                        </select>
                        <ChevronDownIcon className="w-3 h-3 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Quality Steps</span>
                        <span className="text-emerald-400 font-mono font-bold bg-emerald-900/30 px-2 rounded">{settings.steps}</span>
                    </div>

                    <div className="relative w-full h-6 flex items-center group">
                        {/* Custom Track Background */}
                        <div className="absolute w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            {/* Active Fill (Green) */}
                            <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-green-400 rounded-full transition-all duration-75 ease-out"
                                style={{ width: `${((settings.steps || 30) / 150) * 100}%` }}
                            />
                        </div>

                        {/* Native Range Input (Invisible Overlay) */}
                        <input
                            type="range"
                            min="1"
                            max="150"
                            step="1"
                            value={settings.steps || 30}
                            onChange={e => updateSetting('steps', Number(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Custom Thumb (Visual Only - follows position) */}
                        <div
                            className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-lg border-2 border-emerald-500 pointer-events-none transition-all duration-75 ease-out group-hover:scale-110 group-active:scale-95 z-0"
                            style={{ left: `calc(${((settings.steps || 30) / 150) * 100}% - 7px)` }}
                        />
                    </div>

                    {/* Tick Marks / Scale */}
                    <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1 px-1">
                        <span>1</span>
                        <span>30</span>
                        <span>75</span>
                        <span>150</span>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Classifier Free Guidance (CFG)</span>
                        <span className="text-amber-400 font-mono font-bold bg-amber-900/30 px-2 rounded">{settings.cfg_scale ? settings.cfg_scale.toFixed(1) : '7.0'}</span>
                    </div>

                    <div className="relative w-full h-6 flex items-center group">
                        {/* Custom Track Background */}
                        <div className="absolute w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            {/* Active Fill (Yellow) */}
                            <div
                                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-75 ease-out"
                                style={{ width: `${((settings.cfg_scale || 7) / 20) * 100}%` }}
                            />
                        </div>

                        {/* Native Range Input (Invisible Overlay) */}
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={settings.cfg_scale}
                            onChange={e => updateSetting('cfg_scale', Number(e.target.value))}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Custom Thumb */}
                        <div
                            className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-lg border-2 border-amber-500 pointer-events-none transition-all duration-75 ease-out group-hover:scale-110 group-active:scale-95 z-0"
                            style={{ left: `calc(${((settings.cfg_scale || 7) / 20) * 100}% - 7px)` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Seed</span>
                        <span className="text-indigo-400 font-mono text-[10px]">
                            {settings.seed === -1 ? 'RANDOMIZED' : 'FIXED'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={settings.seed === -1 ? "Random" : settings.seed}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === "Random" || val === "") {
                                    updateSetting('seed', -1);
                                } else {
                                    const num = Number(val);
                                    if (!isNaN(num)) updateSetting('seed', num);
                                }
                            }}
                            className={`w-full bg-[#0a0a0a] border rounded p-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono transition-colors ${settings.seed === -1
                                ? 'border-indigo-500/50 text-indigo-400 italic'
                                : 'border-gray-700 text-white'
                                }`}
                        />
                        <button
                            onClick={() => {
                                if (settings.seed === -1) {
                                    // Generate random seed
                                    updateSetting('seed', Math.floor(Math.random() * 2147483647));
                                } else {
                                    // Set to Random
                                    updateSetting('seed', -1);
                                }
                            }}
                            className={`px-3 rounded text-xs transition-colors border ${settings.seed === -1
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                }`}
                            title={settings.seed === -1 ? "Click to fix seed" : "Click to randomize"}
                        >
                            🎲
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={() => onAutoSeedAdvanceChange && onAutoSeedAdvanceChange(!autoSeedAdvance)}
                            className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${autoSeedAdvance ? 'bg-indigo-600' : 'bg-gray-700'}`}
                        >
                            <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${autoSeedAdvance ? 'translate-x-3' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-[10px] text-gray-500 cursor-pointer" onClick={() => onAutoSeedAdvanceChange && onAutoSeedAdvanceChange(!autoSeedAdvance)}>
                            Auto-Advance Seed
                        </span>
                    </div>
                </div>
            </div>
        </ConfigSection>
    );
};
