import React, { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import { AiProvider, Capability, AdminSettings } from '../../types';
import { capabilityDetails, providerCapabilities } from '../../services/providerCapabilities';

export type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error';

export const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    let colorClass = 'bg-gray-600 border-gray-500'; // Idle
    let textColor = 'text-gray-500';
    let pulse = '';
    let label = 'Not Configured';

    if (status === 'checking') {
        colorClass = 'bg-yellow-500 border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
        textColor = 'text-yellow-400';
        pulse = 'animate-pulse';
        label = 'Checking...';
    } else if (status === 'success') {
        colorClass = 'bg-green-500 border-green-300 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
        textColor = 'text-green-400';
        label = 'Online';
    } else if (status === 'error') {
        colorClass = 'bg-red-600 border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.6)]';
        textColor = 'text-red-400';
        label = 'Connection Failed';
    }

    return (
        <div className="flex items-center ml-4 gap-2" title={label}>
            <div className={`w-2.5 h-2.5 rounded-full border-[1.5px] flex-shrink-0 ${colorClass} ${pulse}`}></div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
                {status === 'idle' ? 'Not Configured' : label}
            </span>
        </div>
    );
};

interface CapabilityTagProps {
    capability: Capability;
    configured: boolean;
    providerId: AiProvider;
    settings: AdminSettings; // Needed for testing
}

export const CapabilityTag: React.FC<CapabilityTagProps> = ({ capability, configured, providerId, settings }) => {
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const details = capabilityDetails[capability];

    if (!details) return null;
    const Icon = details.icon;

    // Better short names
    const shortName = {
        vision: 'Vision',
        generation: 'Generation',
        animation: 'Animation',
        editing: 'Editing',
        textGeneration: 'Text',
        captioning: 'Captioning',
        tagging: 'Tagging'
    }[capability] || details.name.split(' ')[0];

    const handleTest = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!configured) return;

        setTestStatus('testing');
        setErrorMessage('');

        try {
            // Dynamic import to avoid circular dependencies if possible, 
            // but we might need to rely on passed function or context in future.
            // For now, mirroring original dynamic import logic.
            const { registry } = await import('../../services/providerRegistry');
            const provider = registry.getProvider(providerId);

            if (provider && 'testCapability' in provider) {
                await (provider as any).testCapability(capability, settings);
                setTestStatus('success');
            } else {
                // Fallback mock check if not implemented
                if (providerId !== 'moondream_local') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    setTestStatus('success');
                } else {
                    throw new Error("Capability test not implemented");
                }
            }
        } catch (error: any) {
            setTestStatus('failure');
            setErrorMessage(error.message || "Test failed");
        }
    };

    return (
        <div className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border transition-colors cursor-default relative group ${testStatus === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
            testStatus === 'failure' ? 'bg-red-500/20 text-red-300 border-red-500/50' :
                configured ? 'bg-green-500/10 text-green-300 border-green-500/30' :
                    'bg-gray-700/50 text-gray-400 border-gray-600'
            }`}
            title={errorMessage || `${details.name} - ${configured ? 'Configured' : 'Not configured'}`}
        >
            {testStatus === 'testing' ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            ) : (
                <Icon className={`w-3.5 h-3.5 ${testStatus === 'success' ? 'text-green-400' :
                    testStatus === 'failure' ? 'text-red-400' :
                        configured ? 'text-green-400' : 'text-gray-500'
                    }`} />
            )}
            <span>{shortName}</span>

            {/* Test Button (for all Moondream Local capabilities) */}
            {configured && providerId === 'moondream_local' && (capability === 'vision' || capability === 'generation' || capability === 'captioning' || capability === 'tagging') && (
                <button
                    onClick={handleTest}
                    className={`ml-1 focus:outline-none transition-opacity ${testStatus === 'failure' ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                    title="Run Test"
                >
                    <div className={`w-3 h-3 rounded-full ${testStatus === 'failure' ? 'bg-red-400 animate-pulse' : 'bg-current'}`}></div>
                </button>
            )}

            {/* Error Tooltip */}
            {testStatus === 'failure' && errorMessage && (
                <div className="absolute left-0 top-full mt-2 w-max max-w-[200px] z-50 p-2 bg-red-900 border border-red-700 text-white text-xs rounded shadow-xl hidden group-hover:block">
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

export const RestartServerButton: React.FC<{ endpoint?: string; restartUrl?: string }> = ({ endpoint, restartUrl }) => {
    // ... (existing implementation details if you want to keep them, or just delegate to ServerControlPanel logic if possible. For now, leaving as is to avoid breaking other things)
    const [status, setStatus] = useState<'idle' | 'restarting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleRestart = async () => {
        if (!endpoint && !restartUrl) return;

        setStatus('restarting');
        setMessage('Restarting server...');

        try {
            let targetUrl = restartUrl;
            if (!targetUrl && endpoint) {
                const baseUrl = endpoint.replace(/\/+$/, '');
                targetUrl = `${baseUrl}/system/restart`;
            }

            if (!targetUrl) throw new Error("No restart URL");

            const response = await fetch(targetUrl, { method: 'POST' });

            if (response.ok) {
                setStatus('success');
                setMessage('Restart triggered. Waiting for service...');

                const healthUrl = endpoint ? endpoint.replace(/\/v1\/?$/, '/health') : '';
                if (!healthUrl) {
                    // If no endpoint, just wait a bit
                    setTimeout(() => {
                        setStatus('idle');
                        setMessage('');
                    }, 3000);
                    return;
                }

                let retries = 0;
                const maxRetries = 20;

                const poll = setInterval(async () => {
                    retries++;
                    try {
                        const res = await fetch(healthUrl);
                        if (res.ok) {
                            clearInterval(poll);
                            setStatus('success');
                            setMessage('Server is back online!');
                            setTimeout(() => {
                                setStatus('idle');
                                setMessage('');
                            }, 5000);
                        }
                    } catch (e) {
                        // Ignore connection errors
                    }

                    if (retries >= maxRetries) {
                        clearInterval(poll);
                        setStatus('error');
                        setMessage('Server restart timed out. Check logs.');
                    }
                }, 2000);

            } else {
                throw new Error('Server returned error');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to trigger restart');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="flex items-center mt-2">
            <button
                onClick={handleRestart}
                disabled={!endpoint && !restartUrl || status === 'restarting'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${status === 'restarting' ? 'bg-yellow-500/20 text-yellow-300 cursor-wait' :
                    status === 'success' ? 'bg-green-500/20 text-green-300' :
                        status === 'error' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
            >
                {status === 'restarting' ? (
                    <>
                        <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                        Restarting...
                    </>
                ) : status === 'success' ? (
                    <>
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Restarted
                    </>
                ) : (
                    <>
                        <RefreshIcon className="w-3.5 h-3.5" />
                        Restart Server
                    </>
                )}
            </button>
            {message && <span className="ml-2 text-xs text-gray-400 animate-fade-in">{message}</span>}
        </div>
    );
};

export const ServerControlPanel: React.FC<{ managerUrl: string; endpoint?: string; onServerReady?: () => void }> = ({ managerUrl, endpoint, onServerReady }) => {
    const [processStatus, setProcessStatus] = useState<'running' | 'stopped' | 'crashed' | 'unknown'>('unknown');
    const [actionStatus, setActionStatus] = useState<'idle' | 'loading'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${managerUrl}/control/status`);
                if (res.ok) {
                    const data = await res.json();
                    setProcessStatus(data.status);
                } else {
                    setProcessStatus('unknown');
                }
            } catch (e) {
                setProcessStatus('unknown');
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, [managerUrl]);

    const handleAction = async (action: 'start' | 'stop' | 'restart') => {
        setActionStatus('loading');
        setMessage(`${action.charAt(0).toUpperCase() + action.slice(1)}ing...`);

        try {
            const res = await fetch(`${managerUrl}/control/${action}`, { method: 'POST' });
            if (res.ok) {
                // Wait a moment for status to update
                setTimeout(() => {
                    setActionStatus('idle');
                    setMessage('');

                    // Trigger callback on successful start/restart
                    if ((action === 'start' || action === 'restart') && onServerReady) {
                        onServerReady();
                    }
                }, 2000);
            } else {
                const data = await res.json();
                setMessage(`Error: ${data.message}`);
                setTimeout(() => setActionStatus('idle'), 3000);
            }
        } catch (e) {
            setMessage('Network error');
            setTimeout(() => setActionStatus('idle'), 3000);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-300">Process Control</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${processStatus.includes('running') ? 'bg-green-500/20 text-green-400' :
                    processStatus === 'stopped' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                    {processStatus}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {!processStatus.includes('running') && (
                    <button
                        onClick={() => handleAction('start')}
                        disabled={actionStatus === 'loading'}
                        className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 rounded px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        Start
                    </button>
                )}

                {processStatus.includes('running') && (
                    <>
                        <button
                            onClick={() => handleAction('stop')}
                            disabled={actionStatus === 'loading'}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            Stop
                        </button>
                        <button
                            onClick={() => handleAction('restart')}
                            disabled={actionStatus === 'loading'}
                            className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 rounded px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            Restart
                        </button>
                    </>
                )}
            </div>
            {message && <div className="text-[10px] text-gray-400 text-center animate-pulse">{message}</div>}
        </div>
    );
};
