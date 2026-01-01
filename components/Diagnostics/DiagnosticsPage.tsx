import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, BookOpen } from 'lucide-react';
import { DiagnosticsPageProps, DiagnosticResult } from './DiagnosticsPage.types';
import { DEFAULT_DIAGNOSTICS_ENDPOINT, SCAN_ENDPOINT_PATH, FILTER_OPTIONS, SCORE_PENALTY } from './Diagnostics.constants';
import DiagnosticsHeader from './DiagnosticsHeader';
import DiagnosticsResultCard from './DiagnosticsResultCard';
import PasswordPromptModal from './PasswordPromptModal';

import { checkBrowserStorage, checkDatabaseIntegrity, checkWebGLSupport, checkBackendLatency, validateApiKeys } from './FrontendDiagnostics';
import { AdminSettings } from '../../types';
import ArchitectureView from './ArchitectureView';

export default function DiagnosticsPage({ onClose, moondreamUrl }: DiagnosticsPageProps) {
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [healthScore, setHealthScore] = useState(100);
    const [filter, setFilter] = useState('All');
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [fixingId, setFixingId] = useState<string | null>(null);
    const [isAutoFixEnabled, setIsAutoFixEnabled] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'diagnostics' | 'architecture'>('diagnostics');
    const failedFixesRef = React.useRef(new Set<string>());

    const runDiagnostics = async (isAutoFixRun = false) => {
        if (!isAutoFixRun) {
            // New manual run, clear failures so we retry
            failedFixesRef.current.clear();
        }
        setLoading(true);
        try {
            const baseUrl = moondreamUrl || DEFAULT_DIAGNOSTICS_ENDPOINT;
            const url = `${baseUrl}${SCAN_ENDPOINT_PATH}`;

            // Run Checks in Parallel
            const [backendRes, storageRes, dbRes, webglRes, latencyRes, apiKeysRes] = await Promise.all([
                fetch(url).then(r => r.ok ? r.json() : []).catch(() => []),
                checkBrowserStorage(),
                checkDatabaseIntegrity(),
                checkWebGLSupport(),
                checkBackendLatency(`${baseUrl}/health`),
                (async () => {
                    try {
                        const stored = localStorage.getItem('ai_gallery_settings_v2');
                        if (stored) {
                            const settings = JSON.parse(stored) as AdminSettings;
                            const flatSettings = {
                                openaiKey: settings.providers?.openai?.apiKey,
                                geminiKey: settings.providers?.gemini?.apiKey,
                                anthropicKey: null
                            };
                            return validateApiKeys(flatSettings);
                        }
                    } catch (e) { console.error("Key validation error", e); }
                    return [];
                })()
            ]);

            const backendData: DiagnosticResult[] = (Array.isArray(backendRes)
                ? backendRes
                : (backendRes?.checks && Array.isArray(backendRes.checks) ? backendRes.checks : []))
                .map((r: any) => ({ ...r, source: 'backend' }));

            // Combine all results
            const allResults = [
                ...backendData,
                { ...storageRes, source: 'frontend' as const },
                { ...dbRes, source: 'frontend' as const },
                { ...webglRes, source: 'frontend' as const },
                { ...latencyRes, source: 'frontend' as const },
                ...apiKeysRes.map(r => ({ ...r, source: 'frontend' as const }))
            ];

            setResults(allResults);

            // Calculate Score
            let score = 100;
            allResults.forEach(r => {
                if (r.status === 'fail') score -= SCORE_PENALTY.FAIL;
                if (r.status === 'warning') score -= SCORE_PENALTY.WARNING;
            });
            setHealthScore(Math.max(0, score));

            // Auto Fix Logic
            if (isAutoFixEnabled) {
                // Find candidates
                const candidates = allResults.filter(r =>
                    r.fix_id &&
                    r.status !== 'pass' &&
                    !failedFixesRef.current.has(r.fix_id)
                );

                if (candidates.length > 0) {
                    processAutoFixes(candidates);
                }
            }

        } catch (e) {
            console.error("Diagnostics failed", e);
            if (!moondreamUrl) {
                setResults([
                    { id: 'err', name: 'Backend Connectivity', category: 'network', severity: 'critical', status: 'error', message: 'Could not contact backend scanner.', timestamp: Date.now() }
                ]);
                setHealthScore(0);
            }
        } finally {
            setLoading(false);
        }
    };

    const processAutoFixes = async (candidates: DiagnosticResult[]) => {
        setLoading(true); // Keep loading state
        let anyAttempted = false;

        for (const cand of candidates) {
            if (!cand.fix_id) continue;
            console.log(`[AutoFix] Attempting fix for ${cand.id}...`);
            const success = await handleFix(cand.fix_id, true); // true = skip refresh
            anyAttempted = true;
            if (!success) {
                failedFixesRef.current.add(cand.fix_id);
            }
        }

        if (anyAttempted) {
            // Re-scan to see improvements (recursive-ish, but bounded by failedFixesRef)
            // Pass true to avoid clearing failedFixes, preventing infinite loops
            runDiagnostics(true);
        } else {
            setLoading(false);
        }
    };

    const handleSetupAutoFix = async (password: string) => {
        setSetupLoading(true);
        setSetupError(null);

        try {
            const baseUrl = moondreamUrl || DEFAULT_DIAGNOSTICS_ENDPOINT;
            const url = `${baseUrl}/diagnostics/setup-autofix`;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                setShowSetupModal(false);
                alert('Auto Fix setup completed! You can now use automated fixes.');
            } else if (res.status === 401) {
                setSetupError('Incorrect password. Please try again.');
            } else {
                const error = await res.json();
                setSetupError(error.detail || 'Setup failed');
            }
        } catch (e) {
            setSetupError(`Connection error: ${e}`);
        } finally {
            setSetupLoading(false);
        }
    };

    const handleFix = async (fixId: string, skipRefresh = false): Promise<boolean> => {
        setFixingId(fixId);
        try {
            const baseUrl = moondreamUrl || DEFAULT_DIAGNOSTICS_ENDPOINT;
            const url = `${baseUrl}/diagnostics/fix/${fixId}`;

            const res = await fetch(url, { method: 'POST' });
            if (!res.ok) {
                if (!skipRefresh) {
                    const err = await res.json();
                    alert(`Fix Failed: ${err.detail || 'Unknown error'}`);
                }
                return false;
            } else {
                if (!skipRefresh) {
                    await runDiagnostics();
                }
                return true;
            }
        } catch (e) {
            if (!skipRefresh) alert(`Fix functionality error: ${e}`);
            return false;
        } finally {
            setFixingId(null);
        }
    };

    useEffect(() => {
        runDiagnostics();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredResults = results.filter(r => {
        if (!isAdvancedMode) {
            const isEssential = ['network', 'hardware'].includes(r.category)
                || r.id === 'system_memory' || r.id === 'gpu_thermal';
            if (r.status === 'pass' && !isEssential) return false;
        }
        if (filter === 'All') return true;
        if (filter === 'Critical') return r.severity === 'critical' || r.status === 'fail';
        if (filter === 'Warning') return r.severity === 'warning' || r.status === 'warning';
        return true;
    });

    // Group by source
    const frontendResults = filteredResults.filter(r => r.source === 'frontend');
    const backendResults = filteredResults.filter(r => r.source === 'backend');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                <DiagnosticsHeader onClose={onClose} healthScore={healthScore} />

                {/* Tab Switcher */}
                <div className="border-b border-neutral-800 px-6">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('diagnostics')}
                            className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'diagnostics'
                                ? 'text-indigo-400'
                                : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                        >
                            <Activity className="w-4 h-4 inline-block mr-2" />
                            System Checks
                            {activeTab === 'diagnostics' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('architecture')}
                            className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'architecture'
                                ? 'text-indigo-400'
                                : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                        >
                            <BookOpen className="w-4 h-4 inline-block mr-2" />
                            Architecture Guide
                            {activeTab === 'architecture' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Architecture View */}
                    {activeTab === 'architecture' ? (
                        <ArchitectureView />
                    ) : (
                        <>
                            {/* Controls */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    {/* Filter Buttons */}
                                    <div className="flex gap-2 bg-neutral-800/50 p-1 rounded-lg">
                                        {FILTER_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setFilter(opt)}
                                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${filter === opt ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Advanced Toggle */}
                                    <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
                                        <span className={`text-sm ${!isAdvancedMode ? 'text-neutral-200' : 'text-neutral-500'}`}>Basic</span>
                                        <button
                                            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                                            className={`w-11 h-6 rounded-full p-1 transition-colors ${isAdvancedMode ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isAdvancedMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <span className={`text-sm ${isAdvancedMode ? 'text-indigo-400 font-medium' : 'text-neutral-500'}`}>Advanced</span>
                                    </div>

                                    {/* Auto Fix Toggle */}
                                    <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
                                        <span className={`text-sm ${!isAutoFixEnabled ? 'text-neutral-200' : 'text-neutral-500'}`}>Manual</span>
                                        <button
                                            onClick={() => setIsAutoFixEnabled(!isAutoFixEnabled)}
                                            className={`w-11 h-6 rounded-full p-1 transition-colors ${isAutoFixEnabled ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isAutoFixEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <span className={`text-sm ${isAutoFixEnabled ? 'text-emerald-400 font-medium' : 'text-neutral-500'}`}>Auto Fix</span>
                                    </div>

                                    {/* Setup Auto Fix Button */}
                                    <button
                                        onClick={() => setShowSetupModal(true)}
                                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm border border-neutral-700"
                                    >
                                        Setup Auto Fix
                                    </button>
                                </div>

                                <button
                                    onClick={() => runDiagnostics(false)}
                                    disabled={loading || !!fixingId}
                                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    {loading ? 'Scanning...' : (fixingId ? 'Applying Fix...' : 'Run New Scan')}
                                </button>
                            </div>

                            {/* Results Grid - Grouped by Source */}
                            <div className="space-y-6">
                                {/* Frontend Checks Section */}
                                {frontendResults.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <h3 className="text-lg font-semibold text-indigo-400">Frontend Checks</h3>
                                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30">
                                                {frontendResults.length}
                                            </span>
                                            <span className="text-xs text-neutral-500">Browser JavaScript</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {frontendResults.map((result) => (
                                                <DiagnosticsResultCard
                                                    key={result.id}
                                                    result={result}
                                                    onFix={(id) => handleFix(id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Backend Checks Section */}
                                {backendResults.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <h3 className="text-lg font-semibold text-green-400">Backend Checks</h3>
                                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                                {backendResults.length}
                                            </span>
                                            <span className="text-xs text-neutral-500">Python/Hardware</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {backendResults.map((result) => (
                                                <DiagnosticsResultCard
                                                    key={result.id}
                                                    result={result}
                                                    onFix={(id) => handleFix(id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!loading && filteredResults.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-neutral-500">
                                        <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>No results found for current filters.</p>
                                        {!isAdvancedMode && <p className="text-sm mt-2">Try switching to Advanced Mode to see more checks.</p>}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Password Prompt Modal */}
                {showSetupModal && (
                    <PasswordPromptModal
                        onSubmit={handleSetupAutoFix}
                        onCancel={() => {
                            setShowSetupModal(false);
                            setSetupError(null);
                        }}
                        loading={setupLoading}
                        error={setupError || undefined}
                    />
                )}
            </div>
        </div>
    );
}
