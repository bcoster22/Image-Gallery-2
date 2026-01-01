import React, { useState, useEffect, useRef } from 'react';
import { AdminSettings } from '../../types';
import { ArrowPathIcon, WrenchIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ToolsTabProps {
    settings: AdminSettings;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({ settings }) => {
    const [models, setModels] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [fp16, setFp16] = useState(true);
    const [isConverting, setIsConverting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [conversionStatus, setConversionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Fetch models on mount
    useEffect(() => {
        fetchModels();
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const endpoint = settings.providers.moondream_local?.endpoint || 'http://localhost:2020';
            const res = await fetch(`${endpoint}/v1/models`);
            if (!res.ok) throw new Error('Failed to fetch models');
            const data = await res.json();

            // Filter: Only suggest converting Diffusers models (folders)
            // Strategy: Look for specific patterns or just list everything and let user decide?
            // Safer: List models that likely need conversion (e.g. diffusers/* or HF cache)
            // Based on discovery logic: source='custom' name='diffusers/...'
            // Actually, we can filter by ID starting with 'diffusers/' or containing 'models--'
            const convertibles = (data.data || []).filter((m: any) =>
                m.id.startsWith('diffusers/') ||
                m.id.includes('models--')
            );

            setModels(convertibles);
            if (convertibles.length > 0) setSelectedModelId(convertibles[0].id);
        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, `Error fetching models: ${e}`]);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleConvert = async () => {
        if (!selectedModelId) return;

        setIsConverting(true);
        setConversionStatus('running');
        setLogs([]); // Clear logs

        try {
            const endpoint = settings.providers.moondream_local?.endpoint || 'http://localhost:2020';

            const response = await fetch(`${endpoint}/v1/tools/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: selectedModelId,
                    fp16: fp16
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            // Handle SSE Streaming
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.message) {
                                setLogs(prev => [...prev, data.message]);
                            }
                            if (data.completed) {
                                if (data.success) setConversionStatus('success');
                                else setConversionStatus('error');
                                setIsConverting(false);
                            }
                        } catch (e) {
                            // ignore parse error for partial chunks
                        }
                    }
                }
            }

        } catch (e: any) {
            setLogs(prev => [...prev, `Critical Error: ${e.message}`]);
            setConversionStatus('error');
            setIsConverting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-2">

            {/* Header / Intro */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-start gap-4">
                    <div className="bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/30">
                        <WrenchIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Model Conversion Tool</h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                            Convert folder-based <strong>Diffusers</strong> models or HuggingFace cache directories into single
                            <code>.safetensors</code> checkpoint files. This can improve compatibility with other tools
                            and simplify file management.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 space-y-4">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Configuration</h3>

                        {/* Model Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 pl-1">Target Model</label>
                            <div className="relative">
                                <select
                                    value={selectedModelId}
                                    onChange={(e) => setSelectedModelId(e.target.value)}
                                    disabled={isConverting || loadingModels}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 pl-3 pr-8 text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                                >
                                    {loadingModels ? (
                                        <option>Loading models...</option>
                                    ) : models.length === 0 ? (
                                        <option>No convertible models found</option>
                                    ) : (
                                        models.map(m => (
                                            <option key={m.id} value={m.id}>{m.id} ({Math.round(m.size_bytes / 1024 / 1024 / 1024 * 10) / 10} GB)</option>
                                        ))
                                    )}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    <ArrowPathIcon className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                                </div>
                            </div>
                            <button onClick={fetchModels} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1 ml-1">
                                <ArrowPathIcon className="w-3 h-3" /> Refresh List
                            </button>
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                            <input
                                type="checkbox"
                                id="fp16"
                                checked={fp16}
                                onChange={(e) => setFp16(e.target.checked)}
                                disabled={isConverting}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                            />
                            <label htmlFor="fp16" className="text-sm text-gray-300 cursor-pointer select-none">
                                <span className="font-medium text-white">FP16 Optimization</span>
                                <span className="block text-xs text-gray-500">Reduces file size by ~50% (Recommended)</span>
                            </label>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleConvert}
                            disabled={isConverting || !selectedModelId}
                            className={`
                                w-full py-3 px-4 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2
                                ${isConverting
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-indigo-500/25'
                                }
                            `}
                        >
                            {isConverting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Converting...
                                </>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    Start Conversion
                                </>
                            )}
                        </button>
                    </div>

                    {/* Status Card */}
                    {conversionStatus !== 'idle' && (
                        <div className={`p-4 rounded-xl border border-l-4 ${conversionStatus === 'success' ? 'bg-green-900/20 border-green-500/50 border-l-green-500 text-green-200' :
                                conversionStatus === 'error' ? 'bg-red-900/20 border-red-500/50 border-l-red-500 text-red-200' :
                                    'bg-indigo-900/20 border-indigo-500/50 border-l-indigo-500 text-indigo-200'
                            }`}>
                            <div className="flex items-center gap-3">
                                {conversionStatus === 'success' ? <CheckCircleIcon className="w-6 h-6" /> :
                                    conversionStatus === 'error' ? <ExclamationTriangleIcon className="w-6 h-6" /> :
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}

                                <div className="font-bold">
                                    {conversionStatus === 'success' ? 'Ready!' :
                                        conversionStatus === 'error' ? 'Failed' :
                                            'Processing...'}
                                </div>
                            </div>
                            {conversionStatus === 'success' && (
                                <p className="text-xs mt-2 opacity-80">
                                    The converted file has been saved to the database (filesystem).
                                    You may need to refresh the model list in the Generation Studio to see it.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Log Output */}
                <div className="lg:col-span-2">
                    <div className="bg-black/80 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[500px] shadow-inner">
                        <div className="bg-gray-800/80 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                            <span className="text-xs font-mono text-gray-400">Terminal Output</span>
                            {logs.length > 0 && (
                                <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white transition-colors">
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                                    <div className="w-16 h-0.5 bg-gray-700 mb-2"></div>
                                    Waiting for task...
                                </div>
                            ) : (
                                logs.map((line, i) => (
                                    <div key={i} className={`break-all ${line.toLowerCase().includes('error') || line.toLowerCase().includes('failed') ? 'text-red-400' :
                                            line.toLowerCase().includes('success') || line.toLowerCase().includes('completed') ? 'text-green-400' :
                                                'text-gray-300'
                                        }`}>
                                        <span className="text-gray-600 mr-2 opacity-50 select-none">$</span>
                                        {line}
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
