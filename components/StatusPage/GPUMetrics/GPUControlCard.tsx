import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, AlertTriangle, Zap, Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { statusColor, getSmoothColor } from '../../../utils/statusUtils';
import { OtelMetrics, AdminSettings } from '../StatusPage.types';


interface GPUControlCardProps {
    gpu: OtelMetrics['gpus'][0];
    otelMetrics: OtelMetrics; // Need full object for ghost_memory check
    settings: AdminSettings | null;
    moondreamUrl: string;
    onRefreshMetrics: () => Promise<void>;
}

export function GPUControlCard({ gpu, otelMetrics, settings, moondreamUrl, onRefreshMetrics }: GPUControlCardProps) {
    // Local State for History (Self-managed visualization buffers)
    const [vramHistory, setVramHistory] = useState<{ timestamp: number; used: number; total: number }[]>([]);
    const [loadHistory, setLoadHistory] = useState<{ timestamp: number; load: number }[]>([]);
    const [tempHistory, setTempHistory] = useState<{ timestamp: number; temp: number }[]>([]);

    // Time Range toggles
    const [vramTimeRange, setVramTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');
    const [loadTimeRange, setLoadTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');
    const [tempTimeRange, setTempTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');

    // Interaction State
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [showSetupInstructions, setShowSetupInstructions] = useState(false);
    const [setupCommand, setSetupCommand] = useState<string>("/home/bcoster/.gemini/antigravity/brain/5d2b2b6e-62df-4aef-9214-aa14de5529d3/setup_gpu_reset.sh");

    const [primeProfile, setPrimeProfile] = useState<string | null>(null);

    // Fetch Prime Profile on Mount
    useEffect(() => {
        const fetchPrime = async () => {
            try {
                const primeRes = await fetch(`${moondreamUrl}/v1/system/prime-profile`);
                if (primeRes.ok) {
                    const pData = await primeRes.json();
                    if (pData.profile) setPrimeProfile(pData.profile);
                }
            } catch (e) {
                console.error("Failed to fetch Prime profile", e);
            }
        };
        fetchPrime();
    }, [moondreamUrl]);

    // Update History on new props
    useEffect(() => {
        const timestamp = Date.now();
        setVramHistory(prev => {
            const newState = [...prev, { timestamp, used: gpu.memory_used, total: gpu.memory_total }];
            return newState.slice(-2000);
        });
        setLoadHistory(prev => {
            const newState = [...prev, { timestamp, load: gpu.load }];
            return newState.slice(-2000);
        });
        setTempHistory(prev => {
            const newState = [...prev, { timestamp, temp: gpu.temperature }];
            return newState.slice(-2000);
        });
    }, [gpu]);

    // Auto-Fix Logic (Backend Controlled)
    const [autoFixEnabled, setAutoFixEnabled] = useState(false);
    const [autoFixIntervalSeconds, setAutoFixIntervalSeconds] = useState(60);

    // Fetch Zombie Killer Status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${moondreamUrl}/v1/system/zombie-killer`);
                if (res.ok) {
                    const data = await res.json();
                    setAutoFixEnabled(data.enabled);
                    setAutoFixIntervalSeconds(data.interval);
                }
            } catch (e) {
                console.error("Failed to fetch zombie killer status", e);
            }
        };
        fetchStatus();
    }, [moondreamUrl]);

    // Handlers
    const handleToggleAutoFix = async (enabled: boolean) => {
        try {
            const res = await fetch(`${moondreamUrl}/v1/system/zombie-killer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
            if (res.ok) {
                const data = await res.json();
                setAutoFixEnabled(data.enabled);
            }
        } catch (e) {
            console.error("Failed to toggle zombie killer", e);
        }
    };

    const handleUpdateInterval = async (interval: number) => {
        setAutoFixIntervalSeconds(interval); // Optimistic update
        try {
            await fetch(`${moondreamUrl}/v1/system/zombie-killer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval })
            });
        } catch (e) {
            console.error("Failed to update interval", e);
        }
    };


    // Actions
    const handleBoostGpu = async (id: number, enable: boolean) => {
        try {
            const response = await fetch(`${moondreamUrl}/v1/system/gpu-boost?gpu_id=${id}&enable=${enable}`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error("Failed to set boost mode");
            const data = await response.json();
            if (data.status === "success") {
                alert(enable ? "GPU Boost Enabled (Max Fans + Persistence Mode)" : "GPU Boost Disabled (Auto Fan + Default Power)");
            }
        } catch (e) {
            console.error(e);
            alert("Error setting GPU Boost mode");
        }
    };

    const handleFreeRam = async (silent: boolean = false) => {
        try {
            const response = await fetch(`${moondreamUrl}/v1/system/unload`, { method: 'POST' });
            const data = await response.json();
            if (data.status === 'success') {
                if (!silent) alert("RAM Freed! Model unloaded.");
            } else {
                if (!silent) alert("Failed to free RAM: " + data.message);
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert("Error sending unload command");
        }
    };

    const handlePrimeSwitch = async (newProfile: string) => {
        if (!confirm(`Switch to ${newProfile}? This requires sudo permissions and you must RESTART manually after.`)) return;

        // Set instructions for Prime setup
        setSetupCommand("/home/bcoster/.moondream-station/moondream-station/setup_prime_switch.sh");

        try {
            const res = await fetch(`${moondreamUrl}/v1/system/prime-profile?profile=${newProfile}`, { method: 'POST' });
            if (res.status === 403) {
                setResetModalOpen(true);
                setShowSetupInstructions(true);
                setResetError("Permission Denied: Passwordless sudo required.");
                return;
            }
            const data = await res.json();
            if (res.ok) alert(data.message);
            else alert("Error: " + data.detail);
        } catch (e) {
            alert("Failed to switch profile");
        }
    };

    // Helper to filter chart data
    const getFilteredData = (history: any[], range: string) => {
        const now = Date.now();
        let cutoff = now;
        switch (range) {
            case 'realtime': cutoff = now - 30 * 1000; break;
            case '1min': cutoff = now - 60 * 1000; break;
            case '5min': cutoff = now - 5 * 60 * 1000; break;
            case '30min': cutoff = now - 30 * 60 * 1000; break;
            case '1hr': cutoff = now - 60 * 60 * 1000; break;
            case '6hr': cutoff = now - 6 * 60 * 60 * 1000; break;
            case '12hr': cutoff = now - 12 * 60 * 60 * 1000; break;
            case '24hr': cutoff = now - 24 * 60 * 60 * 1000; break;
            case '1w': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        }
        return history.filter(d => d.timestamp >= cutoff);
    };


    return (
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 group">

            {/* Header: Icon + GPU Name */}
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                    <Cpu className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{gpu.name}</div>
                    <div className="text-xs text-neutral-400">GPU #{gpu.id}</div>
                </div>
            </div>

            {/* Ghost/Zombie Memory Warning */}
            {otelMetrics.ghost_memory?.detected && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-100">
                            Zombie Memory Detected
                        </h4>
                        <p className="text-xs text-yellow-200/80 mt-1">
                            {autoFixEnabled
                                ? "Auto-fix enabled. Backend will clear this shortly."
                                : `Found ~${Math.round(otelMetrics.ghost_memory.ghost_vram_mb)}MB of unaccounted VRAM usage.`}
                        </p>
                        {!autoFixEnabled && (
                            <button
                                onClick={() => handleFreeRam(false)}
                                className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30 transition-colors"
                            >
                                Free VRAM to Fix
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col gap-2 mb-4">
                {/* Prime Select Toggle */}
                {primeProfile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-neutral-800/50 rounded-lg">
                        <div className="text-xs text-neutral-400 flex-1">
                            Current: <span className="text-white font-medium uppercase">{primeProfile}</span>
                        </div>
                        <button
                            className="h-6 text-[10px] px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors uppercase font-bold tracking-wider"
                            onClick={() => handlePrimeSwitch(primeProfile === 'nvidia' ? 'on-demand' : 'nvidia')}
                            title={primeProfile === 'nvidia'
                                ? "Switch to On-Demand: Saves ~600MB VRAM by moving Desktop to iGPU. Requires Logout."
                                : "Switch to NVIDIA: Maximum Performance. Requires Logout."}
                        >
                            Switch to {primeProfile === 'nvidia' ? 'On-Demand' : 'Performance'}
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        className="h-7 text-xs px-3 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10 flex-1 text-center justify-center flex items-center"
                        onClick={() => handleBoostGpu(gpu.id, true)}
                        disabled={!gpu.fan_control_supported}
                        title={gpu.fan_control_supported ? "Maximize Fans & Persistence Mode" : "Fan control not supported on this GPU"}
                    >
                        Boost Mode
                    </button>

                    <button
                        className="h-7 text-xs px-3 rounded-md bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20 border border-neutral-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-500/10 flex-1 text-center justify-center flex items-center"
                        onClick={() => handleBoostGpu(gpu.id, false)}
                        disabled={!gpu.fan_control_supported}
                        title={gpu.fan_control_supported ? "Reset Fans & Clocks to Auto" : "Fan control not supported on this GPU"}
                    >
                        Normal Mode
                    </button>
                </div>

                {/* Maintenance Settings */}
                <div className="bg-neutral-800/50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" />
                            Auto-Free Zombie VRAM
                        </div>
                        <button
                            onClick={() => handleToggleAutoFix(!autoFixEnabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${autoFixEnabled ? "bg-indigo-600" : "bg-neutral-700"}`}
                        >
                            <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoFixEnabled ? "translate-x-4.5" : "translate-x-1"}`}
                            />
                        </button>
                    </div>

                    {autoFixEnabled && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between text-[10px] text-neutral-400">
                                <span>Cooldown Interval</span>
                                <span className="text-white font-mono">{autoFixIntervalSeconds}s</span>
                            </div>
                            <input
                                type="range"
                                min="30"
                                max="300"
                                step="30"
                                value={autoFixIntervalSeconds}
                                onChange={(e) => handleUpdateInterval(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-500">
                                <span>30s</span>
                                <span>5m</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full">
                    <button
                        className="h-7 text-xs px-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex-1"
                        onClick={() => {
                            setSetupCommand("/home/bcoster/.moondream-station/moondream-station/setup_gpu_reset.sh");
                            setShowSetupInstructions(false);
                            setResetError(null);
                            setResetModalOpen(true);
                        }}
                    >
                        Reset GPU
                    </button>

                    <button
                        className="h-7 text-xs px-3 rounded-md transition-colors flex-1 font-medium border"
                        style={{
                            borderColor: getSmoothColor((gpu.memory_used / gpu.memory_total) * 100).replace(')', ', 0.3)'),
                            backgroundColor: getSmoothColor((gpu.memory_used / gpu.memory_total) * 100).replace(')', ', 0.1)'),
                            color: getSmoothColor((gpu.memory_used / gpu.memory_total) * 100)
                        }}
                        onClick={() => handleFreeRam(false)}
                        title="Unload model to free VRAM"
                    >
                        Free VRAM
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Load Chart */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Load</span>
                        <div className="flex gap-1">
                            {(['realtime', '1min', '5min', '30min', '1hr', '6hr', '12hr', '24hr', '1w'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setLoadTimeRange(range)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${loadTimeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    {range === 'realtime' ? 'RT' : range}
                                </button>
                            ))}
                        </div>
                        <span className="text-white font-medium">{gpu.load}%</span>
                    </div>
                    <div className="h-16 w-full bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 relative">
                        <div className="absolute inset-0 z-10 p-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getFilteredData(loadHistory, loadTimeRange)}>
                                    <defs>
                                        <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                                            {(() => {
                                                const color = getSmoothColor(gpu.load);
                                                return (
                                                    <>
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </>
                                                );
                                            })()}
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[0, 100]} hide />
                                    <Area
                                        type="monotone"
                                        dataKey="load"
                                        stroke={getSmoothColor(gpu.load)}
                                        fillOpacity={1}
                                        fill="url(#loadGradient)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* VRAM Chart */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400">VRAM Usage History</span>
                        <div className="flex gap-1">
                            {(['realtime', '1min', '5min', '30min', '1hr', '6hr', '12hr', '24hr', '1w'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setVramTimeRange(range)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${vramTimeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    {range === 'realtime' ? 'RT' : range}
                                </button>
                            ))}
                        </div>
                        <span className="text-white">{gpu.memory_used} / {gpu.memory_total} MB</span>
                    </div>
                    <div className="h-16 w-full bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 relative">
                        {/* Color Zones Background */}
                        <div className="absolute inset-0 flex flex-col opacity-20 z-0">
                            <div className="h-[33%] bg-green-500/20"></div>
                            <div className="h-[33%] bg-yellow-500/20"></div>
                            <div className="h-[34%] bg-red-500/20"></div>
                        </div>

                        <div className="absolute inset-0 z-10 p-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getFilteredData(vramHistory, vramTimeRange)}>
                                    <defs>
                                        <linearGradient id="vramGradient" x1="0" y1="0" x2="0" y2="1">
                                            {(() => {
                                                const currentUsage = vramHistory[vramHistory.length - 1]?.used || 0;
                                                const usagePercent = (currentUsage / gpu.memory_total) * 100;
                                                const color = getSmoothColor(usagePercent);
                                                return (
                                                    <>
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </>
                                                );
                                            })()}
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[0, gpu.memory_total]} hide />
                                    <Area
                                        type="monotone"
                                        dataKey="used"
                                        stroke={(() => {
                                            const currentUsage = vramHistory[vramHistory.length - 1]?.used || 0;
                                            const usagePercent = (currentUsage / gpu.memory_total) * 100;
                                            return getSmoothColor(usagePercent);
                                        })()}
                                        fillOpacity={1}
                                        fill="url(#vramGradient)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Temp Chart */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Temperature</span>
                        <div className="flex gap-1">
                            {(['realtime', '1min', '5min', '30min', '1hr', '6hr', '12hr', '24hr', '1w'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTempTimeRange(range)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${tempTimeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    {range === 'realtime' ? 'RT' : range}
                                </button>
                            ))}
                        </div>
                        <span className="text-white font-medium">{gpu.temperature}°C</span>
                    </div>
                    <div className="h-16 w-full bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 relative">
                        <div className="absolute inset-0 z-10 p-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getFilteredData(tempHistory, tempTimeRange)}>
                                    <defs>
                                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                            {/* 110C - Top */}
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} /> {/* Red */}
                                            {/* 85C ~ 20% */}
                                            <stop offset="20%" stopColor="#f97316" stopOpacity={0.6} /> {/* Orange */}
                                            {/* 70C ~ 35% */}
                                            <stop offset="35%" stopColor="#eab308" stopOpacity={0.6} /> {/* Yellow */}
                                            {/* 50C ~ 55% */}
                                            <stop offset="55%" stopColor="#22c55e" stopOpacity={0.4} /> {/* Green */}
                                            {/* 0C - Bottom */}
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} /> {/* Blue */}
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[0, 110]} hide />
                                    <Area
                                        type="monotone"
                                        dataKey="temp"
                                        stroke={getSmoothColor(gpu.temperature)}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#tempGradient)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>



            </div>
        </div>
    );
}

