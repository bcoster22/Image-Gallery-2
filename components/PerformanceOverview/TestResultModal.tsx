import React from 'react';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { TestResult } from './types';

interface TestResultModalProps {
    testResult: TestResult | null;
    show: boolean;
    onClose: () => void;
}

export function TestResultModal({ testResult, show, onClose }: TestResultModalProps) {
    if (!show || !testResult) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">

                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-neutral-800/50">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {testResult.status === 'loading' || testResult.status === 'generating' ? (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : testResult.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        Performance Test: {testResult.modelId}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <XCircle className="w-6 h-6 text-neutral-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Status Steps */}
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <div className={`flex items-center gap-2 ${['loading', 'generating', 'verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                            Init
                        </div>
                        <div className="w-8 h-px bg-white/10" />
                        <div className={`flex items-center gap-2 ${['generating', 'verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                            Generation
                        </div>
                        <div className="w-8 h-px bg-white/10" />
                        <div className={`flex items-center gap-2 ${['verifying', 'success'].includes(testResult.status) ? 'text-blue-400' : ''}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                            Verification
                        </div>
                    </div>

                    {testResult.generatedImageUrl && (
                        <div className="bg-black rounded-lg overflow-hidden border border-white/10 relative group">
                            <img src={testResult.generatedImageUrl} alt="Generated Test" className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono">
                                {testResult.generationTimeMs ? `${(testResult.generationTimeMs / 1000).toFixed(2)}s` : '...'}
                            </div>
                        </div>
                    )}

                    {testResult.error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-sm">
                            {testResult.error}
                        </div>
                    )}

                    {testResult.verificationResult && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Eye className="w-3 h-3" />
                                AI Verification Result
                            </div>
                            <p className="text-sm text-blue-100">{testResult.verificationResult}</p>
                        </div>
                    )}

                    {testResult.eyeCropUrl && (
                        <div className="bg-neutral-800/50 border border-white/10 p-4 rounded-xl">
                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Eye className="w-3 h-3 text-purple-400" />
                                Detail Check (Eyes)
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="rounded-lg overflow-hidden border border-white/10 bg-black">
                                    <img src={testResult.eyeCropUrl} alt="Eye Crop" className="h-32 object-contain" />
                                </div>
                                <p className="text-xs text-neutral-500 max-w-[200px]">
                                    Automatic crop of detected eyes/face for detailed quality inspection.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-neutral-800/30 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
