import React from 'react';
import {
    BoltIcon as ZapIcon,
    ShareIcon as Network,
    ShieldCheckIcon,
    ArrowPathIcon as RefreshIcon,
    XCircleIcon,
    ViewfinderCircleIcon as ViewfinderIcon
} from '@heroicons/react/24/outline';

export const UsageCostsTab: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Usage & Costs</h2>
                    <p className="text-sm text-gray-400">Track API usage, estimate costs, and monitor local resource savings.</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Savings</span>
                    <span className="text-2xl font-bold text-emerald-300">$127.42</span>
                    <span className="text-emerald-500/60 text-[10px] ml-2">vs Cloud Ops</span>
                </div>
            </div>

            {/* Cost Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ZapIcon className="w-16 h-16 text-yellow-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Local Compute</h3>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-white">42.5</span>
                        <span className="text-sm text-gray-400">hrs</span>
                    </div>
                    <p className="text-xs text-gray-500">GPU Runtime (This Month)</p>
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Est. Energy cost:</span>
                        <span className="font-mono text-yellow-400/80">~$3.40</span>
                    </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Network className="w-16 h-16 text-blue-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Cloud API Costs</h3>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-white">$14.20</span>
                    </div>
                    <p className="text-xs text-gray-500">OpenAI + Gemini + Grok</p>
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Projected (EOM):</span>
                        <span className="font-mono text-blue-400/80">$18.50</span>
                    </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldCheckIcon className="w-16 h-16 text-purple-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Safety Checks</h3>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-white">8,492</span>
                    </div>
                    <p className="text-xs text-gray-500">Images Rated locally</p>
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Cloud equivalent:</span>
                        <span className="font-mono text-emerald-400/80">~$42.00 saved</span>
                    </div>
                </div>
            </div>

            {/* Safety Management Tools */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
                    Content Safety Management
                </h3>
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-white mb-2">Bulk Actions</h4>
                            <p className="text-xs text-gray-400 mb-4">Manage safety ratings across the entire gallery database to ensure compliance.</p>

                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-indigo-500/50 hover:bg-gray-900 transition-all text-left group">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-200">Re-scan Unrated Images</span>
                                        <span className="block text-xs text-gray-500 group-hover:text-gray-400">Finds images missing safety tags and queues them for analysis.</span>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <RefreshIcon className="w-4 h-4" />
                                    </div>
                                </button>

                                <button className="w-full flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-red-500/50 hover:bg-gray-900 transition-all text-left group">
                                    <div>
                                        <span className="block text-sm font-medium text-red-200">Quarantine/Hide 'Explicit' Content</span>
                                        <span className="block text-xs text-red-400/60 group-hover:text-red-400/80">Globally sets all R/X/XXX rated images to Private visibility.</span>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                        <XCircleIcon className="w-4 h-4" />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-white mb-2">Disk Management</h4>
                            <p className="text-xs text-gray-400 mb-4">Optimize storage by managing duplicates and generated artifacts.</p>

                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-purple-500/50 hover:bg-gray-900 transition-all text-left group">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-200">Find Duplicates</span>
                                        <span className="block text-xs text-gray-500 group-hover:text-gray-400">Scans for visual duplicates using perceptual hashing.</span>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <ViewfinderIcon className="w-4 h-4" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
