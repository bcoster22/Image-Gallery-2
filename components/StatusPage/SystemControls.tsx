import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, RotateCcw, Power } from 'lucide-react';

interface SystemControlsProps {
    moondreamUrl: string;
}

export function SystemControls({ moondreamUrl }: SystemControlsProps) {
    const [devMode, setDevMode] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [restartLoading, setRestartLoading] = useState(false);

    useEffect(() => {
        fetchDevMode();
    }, [moondreamUrl]);

    const fetchDevMode = async () => {
        try {
            const res = await fetch(`${moondreamUrl}/v1/system/dev-mode`);
            if (res.ok) {
                const data = await res.json();
                setDevMode(data.enabled);
            }
        } catch (e) {
            console.error("Failed to fetch Dev Mode status", e);
        }
    };

    const toggleDevMode = async () => {
        if (!confirm(`Are you sure you want to ${devMode ? 'DISABLE' : 'ENABLE'} Development Mode?\n\nEnable: Faster startup, low memory, slower inference.\nDisable: Slower startup, high memory, fast inference.\n\nA RESTART WILL BE REQUIRED.`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${moondreamUrl}/v1/system/dev-mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !devMode })
            });

            if (res.ok) {
                const data = await res.json();
                setDevMode(data.enabled);
                alert("Settings saved. Please click 'Force Restart' to apply changes.");
            } else {
                const text = await res.text();
                console.error("Toggle failed:", res.status, text);
                alert(`Failed to update setting (HTTP ${res.status}): ${text}`);
            }
        } catch (e) {
            console.error("Toggle exception:", e);
            alert("Failed to update setting: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handlePanicRestart = async () => {
        if (!confirm("⚠️ PANIC RESTART ⚠️\n\nThis will aggressively kill the backend service and all worker processes.\nUse this if the system is stuck or using excessive memory.\n\nContinue?")) {
            return;
        }

        setRestartLoading(true);
        try {
            // Using the Station Manager port (3001) as identified
            const res = await fetch('http://localhost:3001/control/restart', {
                method: 'POST'
            });

            if (res.ok) {
                alert("Service is restarting... Please wait 10-15 seconds for it to come back online.");
            } else {
                const text = await res.text();
                alert("Restart failed: " + text);
            }
        } catch (e) {
            alert("Failed to trigger restart. Is Station Manager (Port 3001) running? Error: " + e);
        } finally {
            setRestartLoading(false);
        }
    };

    return (
        <div className="bg-black/20 rounded-xl p-4 mt-4 border border-white/5">
            <h3 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                <Power className="w-4 h-4" />
                System Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dev Mode Toggle */}
                <div className="bg-neutral-900/50 rounded-lg p-3 flex items-center justify-between border border-white/5">
                    <div>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <Zap className={`w-4 h-4 ${devMode ? 'text-yellow-400' : 'text-neutral-500'}`} />
                            Development Mode
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Disables compilation for fast startup & low RAM.
                        </p>
                    </div>

                    <button
                        onClick={toggleDevMode}
                        disabled={loading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${devMode ? 'bg-blue-600' : 'bg-neutral-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${devMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Panic Button */}
                <div className="bg-red-900/10 rounded-lg p-3 flex items-center justify-between border border-red-500/20">
                    <div>
                        <div className="flex items-center gap-2 text-red-200 font-medium">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Panic Restart
                        </div>
                        <p className="text-xs text-red-400/60 mt-1">
                            Force kill service & clear memory.
                        </p>
                    </div>

                    <button
                        onClick={handlePanicRestart}
                        disabled={restartLoading}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold rounded shadow-lg transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className={`w-3 h-3 ${restartLoading ? 'animate-spin' : ''}`} />
                        {restartLoading ? 'Killing...' : 'FORCE RESTART'}
                    </button>
                </div>
            </div>
        </div>
    );
}
