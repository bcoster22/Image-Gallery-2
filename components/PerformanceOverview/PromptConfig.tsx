import React from 'react';
import { Info } from 'lucide-react';

interface PromptConfigProps {
    prompt: string;
    setPrompt: (value: string) => void;
    schedulers: string[];
    selectedScheduler: string;
    setSelectedScheduler: (value: string) => void;
}

export function PromptConfig({
    prompt,
    setPrompt,
    schedulers,
    selectedScheduler,
    setSelectedScheduler
}: PromptConfigProps) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Info className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Test Prompt</h2>
                        <p className="text-sm text-neutral-400">Used for generation models and vision verification</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-neutral-800/50 p-2 rounded-lg border border-white/5">
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Scheduler</label>
                    <select
                        value={selectedScheduler}
                        onChange={(e) => setSelectedScheduler(e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 min-w-[120px]"
                    >
                        {schedulers.length > 0 ? (
                            schedulers.map(s => <option key={s} value={s}>{s}</option>)
                        ) : (
                            <option value="dpm++">dpm++ (Default)</option>
                        )}
                    </select>
                </div>
            </div>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your test prompt..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
            />
            <p className="text-xs text-neutral-500 mt-2">
                💡 Generation models will create an image from this prompt. Vision models will verify if the generated image matches.
            </p>
        </div>
    );
}
