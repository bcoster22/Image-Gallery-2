
import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, RefreshIcon, WarningIcon } from './icons';

interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    context: string;
    message: string;
}

interface LogViewerProps {
    onClose: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filterLevel, setFilterLevel] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('http://localhost:3001/logs?limit=200');
            const data = await res.json();
            if (data.logs) {
                // API returns newest first, reverse for terminal view (oldest at top)
                setLogs(data.logs.reverse());
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setIsLoading(false);
        }
    };

    const clearLogs = async () => {
        try {
            await fetch('http://localhost:3001/logs', { method: 'DELETE' });
            setLogs([]);
        } catch (e) {
            console.error("Failed to clear logs", e);
        }
    }

    // Initial fetch and poll
    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const filteredLogs = logs.filter(log => {
        if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                log.message.toLowerCase().includes(query) ||
                log.context.toLowerCase().includes(query) ||
                log.timestamp.includes(query)
            );
        }
        return true;
    });

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'ERROR': return 'text-red-500';
            case 'WARN': return 'text-yellow-500';
            case 'INFO': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#1e1e1e] w-full max-w-5xl h-[80vh] rounded-lg shadow-2xl flex flex-col border border-gray-700 overflow-hidden font-mono text-sm">
                {/* Header */}
                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="ml-2 text-gray-400 font-semibold">System Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchLogs}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400"
                            title="Refresh"
                        >
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-[#252526] px-4 py-2 flex items-center gap-4 border-b border-gray-700">
                    <div className="flex bg-[#3c3c3c] rounded px-2 py-1 flex-1">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="bg-transparent border-none focus:outline-none text-gray-200 w-full placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="bg-[#3c3c3c] text-gray-200 border-none rounded px-2 py-1 focus:outline-none cursor-pointer"
                    >
                        <option value="ALL">All Levels</option>
                        <option value="INFO">Info</option>
                        <option value="WARN">Warnings</option>
                        <option value="ERROR">Errors</option>
                    </select>

                    <div className="flex items-center gap-2 border-l border-gray-600 pl-4">
                        <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="rounded bg-[#3c3c3c] border-gray-600"
                            />
                            <span>Auto-scroll</span>
                        </label>
                    </div>

                    <button
                        onClick={clearLogs}
                        className="px-3 py-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded transition-colors text-xs uppercase font-bold tracking-wide"
                    >
                        Clear
                    </button>
                </div>

                {/* Log Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#1e1e1e] text-gray-300"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                            <WarningIcon className="w-12 h-12 mb-2" />
                            <p>No logs found</p>
                        </div>
                    ) : (
                        filteredLogs.map((log, idx) => (
                            <div key={idx} className="group hover:bg-[#2a2d2e] p-1 rounded -mx-2 px-2 transition-colors flex gap-3 break-all">
                                <span className="text-gray-500 whitespace-nowrap pt-[2px] select-none text-xs w-36">{log.timestamp}</span>
                                <span className={`font-bold w-12 pt-[2px] ${getLevelColor(log.level)}`}>{log.level}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[#4ec9b0] font-semibold mr-2">[{log.context}]</span>
                                    <span className="text-[#d4d4d4] font-[Consolas]">{log.message}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#007acc] px-2 py-1 text-white text-xs flex justify-between">
                    <span>Server: localhost:3001</span>
                    <span>{filteredLogs.length} events</span>
                </div>
            </div>
        </div>
    );
};

export default LogViewer;
