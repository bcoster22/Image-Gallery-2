import React, { useEffect, useState } from 'react';
import { Terminal, Activity, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';
import { stationService, LogEntry } from '../../services/stationService';

export function ConsoleProgressBar() {
    const [progress, setProgress] = useState<LogEntry | null>(null);
    const [lastLog, setLastLog] = useState<string>('Connecting to station...');
    const [expanded, setExpanded] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [copied, setCopied] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
    const [autoClear, setAutoClear] = useState(() => {
        // Load from localStorage
        const saved = localStorage.getItem('console-auto-clear');
        return saved === 'true';
    });
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        stationService.connectToLogStream(
            (entry) => {
                setConnectionStatus('connected');
                if (entry.type === 'progress') {
                    setProgress(entry);
                    setLastLog(entry.raw || entry.message);
                } else {
                    setLastLog(entry.message);
                    if (entry.type !== 'system') {
                        // Only keep last 500 logs in frontend memory
                        setLogs(prev => [...prev.slice(-499), entry]);
                    }
                }
            },
            (status) => {
                setConnectionStatus(status);
                if (status === 'disconnected') {
                    setLastLog('Reconnecting to Station Manager...');
                } else if (status === 'failed') {
                    setLastLog('Failed to connect. Please check Station Manager.');
                }
            }
        );

        return () => stationService.disconnect();
    }, []);

    // Save auto-clear preference
    useEffect(() => {
        localStorage.setItem('console-auto-clear', autoClear.toString());
    }, [autoClear]);

    const copyLogs = () => {
        const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const clearLogs = async () => {
        try {
            await stationService.clearLogs();
            setLogs([]);
            setLastLog('Logs cleared');
        } catch (e) {
            console.error('Failed to clear logs', e);
        }
    };

    // Expose clearLogs to parent via window for test actions
    useEffect(() => {
        if (autoClear) {
            (window as any).__clearConsoleLogs = clearLogs;
        } else {
            delete (window as any).__clearConsoleLogs;
        }
    }, [autoClear]);

    // Auto-scroll console to bottom when logs update (only if expanded)
    useEffect(() => {
        if (expanded && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [logs, expanded]);

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all">
            {/* Header / Info Bar */}
            <div
                className="p-3 bg-neutral-800/50 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="p-2 bg-black rounded-lg border border-white/10">
                        <Terminal className="w-4 h-4 text-purple-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Backend Status</span>
                                {/* Connection indicator */}
                                <div className={`flex items-center gap-1 text-xs ${connectionStatus === 'connected' ? 'text-emerald-500' :
                                    connectionStatus === 'connecting' ? 'text-yellow-500' :
                                        connectionStatus === 'disconnected' ? 'text-orange-500' :
                                            'text-red-500'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                            connectionStatus === 'disconnected' ? 'bg-orange-500 animate-pulse' :
                                                'bg-red-500'
                                        }`} />
                                    <span className="capitalize">{connectionStatus}</span>
                                </div>
                            </div>
                            {progress && (
                                <span className="text-xs font-mono text-emerald-400">
                                    {progress.percent}% ({progress.current}/{progress.total})
                                </span>
                            )}
                        </div>

                        {/* Progress Bar Container */}
                        <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden w-full mb-1">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                                style={{ width: `${progress ? progress.percent : 0}%` }}
                            />
                        </div>

                        <p className="text-xs text-neutral-500 truncate font-mono">
                            {lastLog}
                        </p>
                    </div>
                </div>

                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded Console View */}
            {expanded && (
                <div className="border-t border-white/10 bg-black p-0">
                    <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/50 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-500">Live Backend Logs</span>

                            {/* Auto-clear toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={autoClear}
                                    onChange={(e) => setAutoClear(e.target.checked)}
                                    className="w-3 h-3 rounded border-neutral-600 bg-neutral-800 checked:bg-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                                />
                                <span className="text-xs text-neutral-500 group-hover:text-neutral-400">
                                    Auto-clear on test
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); clearLogs(); }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-xs transition-colors text-red-400"
                            >
                                <span>Clear Logs</span>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); copyLogs(); }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
                            >
                                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy Logs'}
                            </button>
                        </div>
                    </div>
                    <div
                        ref={scrollContainerRef}
                        className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
                    >
                        {logs.length === 0 && (
                            <div className="text-neutral-600 italic text-center py-8">Waiting for logs...</div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2 hover:bg-white/5 p-0.5 rounded">
                                <span className="text-neutral-600 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                                <span className={log.level === 'ERROR' ? 'text-red-400' : 'text-neutral-300 break-all'}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
