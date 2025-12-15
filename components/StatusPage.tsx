import React, { useMemo, useState, useEffect } from "react";
import { AdminSettings, ImageAnalysisStats, QueueStatus } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Cpu, HardDrive, Server, Zap, AlertTriangle, Terminal, Lock, Clock, ScanEye, Crop, Film, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProviderBenchmark } from '../src/components/ProviderBenchmark';

// ---------- Utilities ----------
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function statusColor(status: "operational" | "degraded" | "down" | "idle") {
  switch (status) {
    case "operational":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "degraded":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
    case "down":
      return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
    case "idle":
      return "bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30";
  }
}

function fmtAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------- Components ----------
interface StatPoint {
  timestamp: number;
  tokensPerSec: number;
  device: 'CPU' | 'GPU';
}

// Interpolate check for smooth color transition
function getSmoothColor(value: number) {
  // New gradient ranges:
  // 0-20: Blue (240)
  // 20-50: Green (120)
  // 50-70: Yellow (60)
  // 70-85: Orange (30)
  // 85-95: Red (0)
  // 95-100: Blood Red (0 with higher saturation)

  const v = Math.max(0, Math.min(100, value));
  let hue = 120;
  let saturation = 100;
  let lightness = 50;

  if (v <= 20) {
    // Blue
    hue = 240;
  } else if (v <= 50) {
    // Blue to Green: 20-50 (30 range)
    const progress = (v - 20) / 30;
    hue = 240 - (progress * 120); // 240 -> 120
  } else if (v <= 70) {
    // Green to Yellow: 50-70 (20 range)
    const progress = (v - 50) / 20;
    hue = 120 - (progress * 60); // 120 -> 60
  } else if (v <= 85) {
    // Yellow to Orange: 70-85 (15 range)
    const progress = (v - 70) / 15;
    hue = 60 - (progress * 30); // 60 -> 30
  } else if (v <= 95) {
    // Orange to Red: 85-95 (10 range)
    const progress = (v - 85) / 10;
    hue = 30 - (progress * 30); // 30 -> 0
  } else {
    // Blood Red: 95-100
    hue = 0;
    saturation = 100;
    lightness = 40; // Darker red for "blood red"
  }

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

interface OtelMetrics {
  cpu: number;
  memory: number;
  device: string;
  environment?: {
    platform: string;
    accelerator_available: boolean;
    torch_version: string;
    cuda_version: string;
    hip_version?: string;
    execution_type: string;
  };
  gpus?: {
    id: number;
    name: string;
    load: number;
    memory_used: number;
    memory_total: number;
    temperature: number;
    fan_control_supported?: boolean;
  }[];
  loaded_models?: {
    id: string;
    name: string;
    vram_mb: number;
    ram_mb: number;
    loaded_at: number;
  }[];
  ghost_memory?: {
    detected: boolean;
    ghost_vram_mb: number;
  };
}

interface StatusPageProps {
  statsHistory: StatPoint[];
  settings: AdminSettings | null;
  queueStatus?: QueueStatus;
}

export default function StatusPage({ statsHistory, settings, queueStatus }: StatusPageProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '1w'>('1h');
  const [otelMetrics, setOtelMetrics] = useState<OtelMetrics | null>(null);
  const [vramHistory, setVramHistory] = useState<{ timestamp: number; used: number; total: number }[]>([]);
  const [vramTimeRange, setVramTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');
  const [loadHistory, setLoadHistory] = useState<{ timestamp: number; load: number }[]>([]);
  const [loadTimeRange, setLoadTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');
  const [tempHistory, setTempHistory] = useState<{ timestamp: number; temp: number }[]>([]);
  const [tempTimeRange, setTempTimeRange] = useState<'realtime' | '1min' | '5min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr' | '1w'>('5min');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [setupCommand, setSetupCommand] = useState<string>("/home/bcoster/.gemini/antigravity/brain/5d2b2b6e-62df-4aef-9214-aa14de5529d3/setup_gpu_reset.sh");
  const [primeProfile, setPrimeProfile] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; description: string; last_known_vram_mb?: number }>>([]);
  const [modelLoadCounts, setModelLoadCounts] = useState<Record<string, number>>({});
  const [modelUnloadCounts, setModelUnloadCounts] = useState<Record<string, number>>({});
  const [lastVramUsed, setLastVramUsed] = useState(0);

  const [currentlyLoadedModels, setCurrentlyLoadedModels] = useState<Set<string>>(new Set());
  const [autoFixTriggered, setAutoFixTriggered] = useState<{ timestamp: number; active: boolean }>({ timestamp: 0, active: false });

  // CSS for hiding scrollbar
  const scrollbarHideStyle = `
    .models-list-scroll::-webkit-scrollbar {
      display: none;
    }
  `;

  const moondreamUrl = useMemo(() => {
    const url = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    // Remove both trailing slash and trailing /v1 because metrics are at the root
    return url.replace(/\/$/, "").replace(/\/v1$/, "");
  }, [settings]);

  const handleResetGpu = async () => {
    setResetting(true);
    setResetError(null);
    setShowSetupInstructions(false);
    setSetupCommand("/home/bcoster/.moondream-station/moondream-station/setup_gpu_reset.sh");
    try {
      const response = await fetch(`${moondreamUrl}/v1/system/gpu-reset`, {
        method: 'POST',
      });

      if (response.status === 403) {
        setShowSetupInstructions(true);
        throw new Error("Permission denied");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Reset failed');
      }

      // Success
      setResetModalOpen(false);
      alert("GPU Reset Command Sent. Monitor system behavior.");
    } catch (error: any) {
      console.error("GPU Reset Error:", error);
      if (error.message !== "Permission denied") {
        setResetError(error.message);
      }
    } finally {
      setResetting(false);
    }
  };

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
        // Visual feedback
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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${moondreamUrl}/metrics`);
        if (res.ok) {
          const data = await res.json();
          console.log('[StatusPage] Metrics loaded_models:', data.loaded_models);
          setOtelMetrics(data);
        }
        // Also fetch Prime status occasionally or once
        const primeRes = await fetch(`${moondreamUrl}/v1/system/prime-profile`);
        if (primeRes.ok) {
          const pData = await primeRes.json();
          if (pData.profile) setPrimeProfile(pData.profile);
        }
      } catch (e) {
        console.error("Failed to fetch Moondream metrics", e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2s

    // Fetch available models once
    const fetchModels = async () => {
      try {
        console.log('[StatusPage] Fetching models from:', `${moondreamUrl}/v1/models`);
        const res = await fetch(`${moondreamUrl}/v1/models`);
        console.log('[StatusPage] Models response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[StatusPage] Models data:', data);
          console.log('[StatusPage] Setting availableModels to:', data.models);
          setAvailableModels(data.models || []);
        } else {
          console.error('[StatusPage] Models fetch failed with status:', res.status);
        }
      } catch (e) {
        console.error("[StatusPage] Failed to fetch models", e);
      }
    };
    fetchModels();

    return () => clearInterval(interval);
  }, [moondreamUrl]);

  // Update GPU metrics history and track model loads/unloads
  useEffect(() => {
    if (otelMetrics?.gpus?.[0]) {
      const gpu = otelMetrics.gpus[0];
      const timestamp = Date.now();

      // Sync loaded models from backend
      if (otelMetrics.loaded_models) {
        const backendLoadedIds = new Set(otelMetrics.loaded_models.map(m => m.id));

        // Capture VRAM stats from live models into 'Last Known' history
        // This ensures that even auto-switched models leave a record before unloading
        setAvailableModels(prev => {
          let changed = false;
          const newModels = prev.map(m => {
            const loaded = otelMetrics.loaded_models?.find(lm => lm.id === m.id);
            // Update if we have new data and it differs from stored 'last known'
            // Note: We check if loaded.vram_mb > 0 to avoid zeroing out valid history if backend reports 0 briefly
            if (loaded && loaded.vram_mb > 0 && m.last_known_vram_mb !== loaded.vram_mb) {
              changed = true;
              return { ...m, last_known_vram_mb: loaded.vram_mb };
            }
            return m;
          });
          return changed ? newModels : prev;
        });

        // Detect new loads by comparing with previous state
        backendLoadedIds.forEach((modelId: string) => {
          if (!currentlyLoadedModels.has(modelId)) {
            // Model just loaded
            setModelLoadCounts(prev => ({
              ...prev,
              [modelId]: (prev[modelId] || 0) + 1
            }));
          }
        });

        // Detect unloads
        currentlyLoadedModels.forEach((modelId) => {
          if (!backendLoadedIds.has(modelId)) {
            // Model just unloaded
            setModelUnloadCounts(prev => ({
              ...prev,
              [modelId]: (prev[modelId] || 0) + 1
            }));
          }
        });

        // Only update if the set actually changed
        const currentIds = Array.from(currentlyLoadedModels).sort().join(',');
        const newIds = Array.from(backendLoadedIds).sort().join(',');
        if (currentIds !== newIds) {
          setCurrentlyLoadedModels(backendLoadedIds);
        }
      }

      setLastVramUsed(gpu.memory_used);

      // Update VRAM history
      setVramHistory(prev => {
        const newState = [...prev, { timestamp, used: gpu.memory_used, total: gpu.memory_total }];
        return newState.slice(-2000);
      });

      // Update Load history
      setLoadHistory(prev => {
        const newState = [...prev, { timestamp, load: gpu.load }];
        return newState.slice(-2000);
      });

      // Update Temperature history
      setTempHistory(prev => {
        const newState = [...prev, { timestamp, temp: gpu.temperature }];
        return newState.slice(-2000);
      });
    }
  }, [otelMetrics, currentlyLoadedModels]); // Dependencies for this useEffect

  // Auto-Fix Zombie Memory
  useEffect(() => {
    if (otelMetrics?.ghost_memory?.detected) {
      const now = Date.now();
      // Cooldown: 60 seconds between auto-fixes
      if (now - autoFixTriggered.timestamp > 60000 && !autoFixTriggered.active) {
        console.log("[StatusPage] Zombie Memory Detected! Auto-fixing...");
        setAutoFixTriggered({ timestamp: now, active: true });

        // Trigger Free Ram
        handleFreeRam(true).then(() => {
          // Reset active flag after a short delay to allow UI to settle
          setTimeout(() => {
            setAutoFixTriggered(prev => ({ ...prev, active: false }));
          }, 5000);
        }).catch(err => {
          console.error("Auto-fix failed:", err);
          setAutoFixTriggered(prev => ({ ...prev, active: false }));
        });
      }
    }
  }, [otelMetrics, autoFixTriggered]); // Dependencies

  const filteredStats = useMemo(() => {
    const now = Date.now();
    let cutoff = now;
    switch (timeRange) {
      case '1h': cutoff -= 60 * 60 * 1000; break;
      case '6h': cutoff -= 6 * 60 * 60 * 1000; break;
      case '12h': cutoff -= 12 * 60 * 60 * 1000; break;
      case '24h': cutoff -= 24 * 60 * 60 * 1000; break;
      case '1w': cutoff -= 7 * 24 * 60 * 60 * 1000; break;
    }
    return statsHistory.filter(s => s.timestamp >= cutoff);
  }, [timeRange, statsHistory]);

  const latestStat = statsHistory[statsHistory.length - 1];

  // Determine Moondream Status
  const moondreamStatus = useMemo(() => {
    if (!settings?.providers.moondream_local.endpoint) return "down"; // Not configured
    if (!latestStat) return "idle";
    const timeSinceLast = Date.now() - latestStat.timestamp;
    if (timeSinceLast > 5 * 60 * 1000) return "idle"; // Inactive for > 5 mins
    return "operational";
  }, [settings, latestStat]);

  const avgSpeed = filteredStats.length > 0
    ? (filteredStats.reduce((acc, curr) => acc + (curr.tokensPerSec || 0), 0) / filteredStats.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white p-6">
      <style>{scrollbarHideStyle}</style>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/20 text-cyan-400 grid place-items-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="text-neutral-400">Real-time service health and performance metrics</p>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={cn("flex items-center gap-3 rounded-2xl px-6 py-4 border", statusColor(moondreamStatus))}>
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
          </div>
          <div className="text-lg font-medium capitalize">
            {moondreamStatus === 'operational' ? 'All Systems Operational' :
              moondreamStatus === 'idle' ? 'System Idle' :
                'Service Disconnected'}
          </div>
          <div className="ml-auto text-sm opacity-75 hidden sm:block">
            Last activity: {latestStat ? fmtAgo(latestStat.timestamp) : 'Never'}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Moondream Service Card */}
          <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Moondream Station</h3>
                  <p className="text-xs text-neutral-400">Local Inference Engine</p>
                </div>
              </div>
              <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase", statusColor(moondreamStatus))}>
                {moondreamStatus}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-medium">CPU Usage</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {otelMetrics ? `${(otelMetrics.cpu || 0).toFixed(1)}% ` : (latestStat ? (latestStat.tokensPerSec || 0).toFixed(1) + ' t/s' : '0.0%')}
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {otelMetrics ? `${(otelMetrics.memory || 0).toFixed(1)}% ` : (latestStat ? (latestStat.device === 'GPU' ? 'Unknown' : latestStat.device) : '-')}
                </div>
              </div>
            </div>
          </div>

          {/* Environment Status Card */}
          {otelMetrics?.environment && (
            <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Environment</h3>
                    <p className="text-xs text-neutral-400">Runtime Configuration</p>
                  </div>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase",
                  otelMetrics.environment.accelerator_available ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                )}>
                  {otelMetrics.environment.accelerator_available ? 'Accelerator Active' : 'CPU Only'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-neutral-400 text-xs font-medium mb-1">Platform</div>
                  <div className="text-lg font-bold text-white">{otelMetrics.environment.platform}</div>
                  <div className="text-xs text-neutral-500">
                    {otelMetrics.environment.platform === 'CUDA' ? `v${otelMetrics.environment.cuda_version} ` :
                      otelMetrics.environment.platform === 'ROCm' ? `v${otelMetrics.environment.hip_version} ` : 'Standard'}
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-neutral-400 text-xs font-medium mb-1">PyTorch</div>
                  <div className="text-lg font-bold text-white">{otelMetrics.environment.torch_version}</div>
                  <div className="text-xs text-neutral-500">
                    {otelMetrics.environment.execution_type}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aggregate Stats Card */}
          <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Performance Overview</h3>
                  <p className="text-xs text-neutral-400">Historical Analysis</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Avg Speed ({timeRange})</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {avgSpeed} <span className="text-sm text-neutral-500">t/s</span>
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-medium">Total Requests</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {filteredStats.length}
                </div>
              </div>
            </div>
          </div>

          {/* GPU Status Section */}
          {otelMetrics?.gpus && otelMetrics.gpus.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-green-400" />
                GPU Status
              </h2>
              <div className={cn("grid gap-4", otelMetrics.gpus.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                {otelMetrics.gpus.map((gpu) => (
                  <div key={gpu.id} className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 group">

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
                            {autoFixTriggered.active ? "Auto-Fixing Zombie Memory..." : "Zombie Memory Detected"}
                          </h4>
                          <p className="text-xs text-yellow-200/80 mt-1">
                            {autoFixTriggered.active
                              ? "Automatically freeing VRAM to resolve the issue."
                              : `Found ~${Math.round(otelMetrics.ghost_memory.ghost_vram_mb)}MB of unaccounted VRAM usage.`}
                          </p>
                          {!autoFixTriggered.active && (
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
                          onClick={handleFreeRam}
                          title="Unload model to free VRAM"
                        >
                          Free VRAM
                        </button>
                      </div>
                    </div>


                    <div className="space-y-4">
                      {/* Load */}
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
                              <AreaChart data={(() => {
                                const now = Date.now();
                                let cutoff = now;
                                switch (loadTimeRange) {
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
                                return loadHistory.filter(d => d.timestamp >= cutoff);
                              })()}>
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

                      {/* VRAM Graph */}
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
                              <AreaChart data={(() => {
                                const now = Date.now();
                                let cutoff = now;
                                switch (vramTimeRange) {
                                  case 'realtime': cutoff = now - 30 * 1000; break; // 30 seconds
                                  case '1min': cutoff = now - 60 * 1000; break;
                                  case '5min': cutoff = now - 5 * 60 * 1000; break;
                                  case '30min': cutoff = now - 30 * 60 * 1000; break;
                                  case '1hr': cutoff = now - 60 * 60 * 1000; break;
                                  case '6hr': cutoff = now - 6 * 60 * 60 * 1000; break;
                                  case '12hr': cutoff = now - 12 * 60 * 60 * 1000; break;
                                  case '24hr': cutoff = now - 24 * 60 * 60 * 1000; break;
                                  case '1w': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
                                }
                                return vramHistory.filter(d => d.timestamp >= cutoff);
                              })()}>
                                <defs>
                                  <linearGradient id="vramGradient" x1="0" y1="0" x2="0" y2="1">
                                    {/* Dynamic gradient based on current VRAM usage percentage */}
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

                      {/* Temperature */}
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
                              <AreaChart data={(() => {
                                const now = Date.now();
                                let cutoff = now;
                                switch (tempTimeRange) {
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
                                return tempHistory.filter(d => d.timestamp >= cutoff);
                              })()}>
                                <defs>
                                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                    {(() => {
                                      const color = getSmoothColor(gpu.temperature);
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
                                  dataKey="temp"
                                  stroke={getSmoothColor(gpu.temperature)}
                                  fillOpacity={1}
                                  fill="url(#tempGradient)"
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Models Section */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold mb-1">
                          <div className="flex items-center gap-2">
                            <span>Available Models ({availableModels.length})</span>
                            <div className="relative">
                              <div className="group w-3.5 h-3.5">
                                <svg
                                  className="w-3.5 h-3.5 text-neutral-500 hover:text-neutral-300 cursor-help transition-colors"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {/* Tooltip */}
                                <div className="pointer-events-none invisible group-hover:visible absolute left-0 top-full mt-1 w-64 bg-neutral-800 border border-neutral-700 rounded-lg p-3 shadow-xl z-[100] text-[10px] leading-relaxed">
                                  <div className="font-semibold text-white mb-2">VRAM Tracking</div>
                                  <div className="space-y-1.5 text-neutral-300">
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm">🟢</span>
                                      <div>
                                        <span className="text-yellow-400 font-medium">Yellow</span> - Currently loaded (real-time)
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm">⚪</span>
                                      <div>
                                        <span className="text-neutral-400 italic font-medium">Gray italic</span> - Unloaded (last known)
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm">⚪</span>
                                      <div>
                                        <span className="text-neutral-600 font-medium">Dark gray "—"</span> - Never loaded
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-neutral-700 text-neutral-400">
                                    Hover over VRAM to see RAM usage
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Test Button - Modern 2025 Style */}
                          <button
                            onClick={async (e) => {
                              const button = e.currentTarget;
                              const originalText = button.innerHTML;

                              try {
                                button.disabled = true;
                                button.innerHTML = '<span class="flex items-center gap-1.5"><svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</span>';

                                console.log('[Test] Starting model load cycle...');

                                for (let i = 0; i < availableModels.length; i++) {
                                  const model = availableModels[i];
                                  try {
                                    console.log(`[Test] [${i + 1}/${availableModels.length}] Loading ${model.id}...`);
                                    button.innerHTML = `<span class="flex items-center gap-1.5"><svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>${i + 1}/${availableModels.length}</span>`;

                                    const res = await fetch(`${moondreamUrl}/v1/models/switch`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ model: model.id })
                                    });

                                    if (res.ok) {
                                      const data = await res.json();
                                      console.log(`[Test] ✓ Loaded ${model.id}:`, data);

                                      // Backend now returns VRAM/RAM usage in the response!
                                      // Update local state immediately without waiting for metrics
                                      if (data.vram_mb !== undefined) {
                                        setModelLoadCounts(prev => ({
                                          ...prev,
                                          [model.id]: (prev[model.id] || 0) + 1
                                        }));

                                        // Update the available models list with new last_known_vram
                                        setAvailableModels(prev => prev.map(m =>
                                          m.id === model.id
                                            ? { ...m, last_known_vram_mb: data.vram_mb }
                                            : m
                                        ));

                                        // Update the display text for this specific button run
                                        // (Optional: could show the measured VRAM momentarily)
                                        console.log(`[Test] Measured VRAM: ${data.vram_mb}MB`);
                                      }

                                      // Short delay just to separate the requests visually
                                      await new Promise(resolve => setTimeout(resolve, 2000));
                                    } else {
                                      const error = await res.text();
                                      console.error(`[Test] ✗ Failed to load ${model.id}:`, error);
                                    }
                                  } catch (e) {
                                    console.error(`[Test] ✗ Error loading ${model.id}:`, e);
                                  }
                                }

                                console.log('[Test] ✓ Cycle complete! Check the models list for VRAM values.');
                                button.innerHTML = '<span class="flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Done!</span>';
                                await new Promise(resolve => setTimeout(resolve, 2000));
                              } catch (e) {
                                console.error('[Test] Fatal error:', e);
                                button.innerHTML = '<span class="flex items-center gap-1.5">Error</span>';
                                await new Promise(resolve => setTimeout(resolve, 2000));
                              } finally {
                                button.disabled = false;
                                button.innerHTML = originalText;
                              }
                            }}
                            className="group relative px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[10px] font-semibold rounded-md transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Test Load
                            </span>
                          </button>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-[20px_1fr_65px_50px_65px] gap-2 text-[9px] text-neutral-500 uppercase tracking-wide pb-0.5 border-b border-white/5">
                          <div className="text-center">●</div>
                          <div>Model</div>
                          <div className="text-right">VRAM</div>
                          <div className="text-right">Loads</div>
                          <div className="text-right">Unloads</div>
                        </div>

                        {/* Models List - Loaded first, then unloaded */}
                        <div
                          className="models-list-scroll space-y-0.5 max-h-48 overflow-y-auto"
                          style={{
                            scrollbarWidth: 'none', /* Firefox */
                            msOverflowStyle: 'none', /* IE/Edge */
                          }}
                        >
                          {availableModels
                            .sort((a, b) => {
                              // Sort: loaded models first
                              const aLoaded = currentlyLoadedModels.has(a.id);
                              const bLoaded = currentlyLoadedModels.has(b.id);
                              if (aLoaded && !bLoaded) return -1;
                              if (!aLoaded && bLoaded) return 1;
                              return 0;
                            })
                            .map(model => {
                              const isLoaded = currentlyLoadedModels.has(model.id);
                              const loadCount = modelLoadCounts[model.id] || 0;
                              const unloadCount = modelUnloadCounts[model.id] || 0;

                              // Get real VRAM/RAM usage from backend
                              const loadedModel = otelMetrics?.loaded_models?.find(m => m.id === model.id);
                              let vramUsage = '—';
                              let ramUsage = '—';
                              let isHistorical = false;

                              if (loadedModel) {
                                // Real measurements from backend (currently loaded)
                                vramUsage = `${(loadedModel.vram_mb / 1024).toFixed(1)}GB`;
                                ramUsage = `${(loadedModel.ram_mb / 1024).toFixed(1)}GB`;
                              } else if (model.last_known_vram_mb && model.last_known_vram_mb > 0) {
                                // Last known VRAM (model was loaded before, now unloaded)
                                vramUsage = `${(model.last_known_vram_mb / 1024).toFixed(1)}GB`;
                                isHistorical = true;
                              }

                              return (
                                <div
                                  key={model.id}
                                  className="grid grid-cols-[20px_1fr_65px_50px_65px] gap-2 text-xs items-center py-0.5 hover:bg-white/5 rounded transition-colors"
                                >
                                  {/* Loaded Indicator */}
                                  <div className="text-center text-sm leading-none">
                                    {isLoaded ? '🟢' : '⚪'}
                                  </div>

                                  {/* Model Name */}
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[10px] leading-tight truncate ${isLoaded ? 'text-white font-medium' : 'text-neutral-400'}`}>
                                      {model.name}
                                    </div>
                                  </div>

                                  {/* VRAM Usage */}
                                  <div
                                    className={`text-right text-[9px] tabular-nums ${isLoaded
                                      ? 'text-yellow-400'
                                      : isHistorical
                                        ? 'text-neutral-500 italic'
                                        : 'text-neutral-600'
                                      }`}
                                    title={
                                      loadedModel
                                        ? `RAM: ${ramUsage}`
                                        : isHistorical
                                          ? 'Last known VRAM usage'
                                          : ''
                                    }
                                  >
                                    {vramUsage}
                                  </div>

                                  {/* Load Count */}
                                  <div className={`text-right text-[10px] tabular-nums ${loadCount > 0 ? 'text-green-400 font-semibold' : 'text-neutral-600'}`}>
                                    {loadCount}
                                  </div>

                                  {/* Unload Count */}
                                  <div className={`text-right text-[10px] tabular-nums ${unloadCount > 0 ? 'text-blue-400 font-semibold' : 'text-neutral-600'}`}>
                                    {unloadCount}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue Monitor Card */}
          {queueStatus && (
            <div className="col-span-1 md:col-span-2 bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Queue Monitor</h3>
                    <p className="text-xs text-neutral-400">Adaptive Concurrency</p>
                  </div>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase",
                  queueStatus.isPaused ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                )}>
                  {queueStatus.isPaused ? 'Paused (Backpressure)' : 'Running'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="space-y-4">
                  <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="text-neutral-400 text-xs font-medium mb-1">Active Threads</div>
                      <div className="text-2xl font-bold text-white">
                        {queueStatus.activeCount} <span className="text-sm text-neutral-500">/ {queueStatus.concurrencyLimit}</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="text-neutral-400 text-xs font-medium mb-1">Queue Depth</div>
                      <div className="text-2xl font-bold text-white">
                        {queueStatus.pendingCount}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>



                {/* Jobs List (Active & Queued) */}
                <div className="col-span-1 md:col-span-2 bg-black/20 rounded-xl p-4 overflow-hidden flex flex-col gap-4">

                  {/* Active Jobs */}
                  <div>
                    <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Active Processing
                    </h4>
                    {queueStatus.activeJobs.length === 0 ? (
                      <div className="text-neutral-600 text-xs italic py-2">No active jobs</div>
                    ) : (
                      <div className="space-y-2">
                        {queueStatus.activeJobs.map(job => (
                          <div key={job.id} className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <div className="flex flex-col gap-0.5 max-w-[200px]">
                                <span className="truncate text-neutral-200">{job.fileName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                              <div className="flex flex-col items-end text-xs text-neutral-400 mr-2">
                                <span>{((job.size || 0) / 1024).toFixed(1)} KB</span>
                                <span>{((Date.now() - (job.startTime || Date.now())) / 1000).toFixed(1)}s</span>
                              </div>
                              {/* Task Badge */}
                              <div className={cn("flex items-center gap-1 w-fit px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider",
                                job.taskType === 'smart-crop' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                  job.taskType === 'video' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                                    job.taskType === 'generate' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                      "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              )}>
                                {job.taskType === 'smart-crop' ? <Crop className="w-3 h-3" /> :
                                  job.taskType === 'video' ? <Film className="w-3 h-3" /> :
                                    job.taskType === 'generate' ? <ImageIcon className="w-3 h-3" /> :
                                      <ScanEye className="w-3 h-3" />}
                                <span>{job.taskType === 'smart-crop' ? 'Crop' :
                                  job.taskType === 'video' ? 'Video' :
                                    job.taskType === 'generate' ? 'Gen' :
                                      'Scan'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Queued Jobs */}
                  {queueStatus.queuedJobs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Queued
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
                        {queueStatus.queuedJobs.map((job, idx) => (
                          <div key={job.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg p-2 text-sm opacity-75">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="text-xs text-neutral-500 w-4">{idx + 1}.</div>
                              <span className="truncate text-neutral-300 max-w-[200px]">{job.fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              {/* Task Badge */}
                              <div className={cn("flex items-center gap-1 w-fit px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider",
                                job.taskType === 'smart-crop' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                  job.taskType === 'video' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                                    job.taskType === 'generate' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                      "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              )}>
                                {job.taskType === 'smart-crop' ? <Crop className="w-3 h-3" /> :
                                  job.taskType === 'video' ? <Film className="w-3 h-3" /> :
                                    job.taskType === 'generate' ? <ImageIcon className="w-3 h-3" /> :
                                      <ScanEye className="w-3 h-3" />}
                                <span>{job.taskType === 'smart-crop' ? 'Crop' :
                                  job.taskType === 'video' ? 'Video' :
                                    job.taskType === 'generate' ? 'Gen' :
                                      'Scan'}</span>
                              </div>
                              <span>Waiting...</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Provider Benchmark Section */}
        <ProviderBenchmark settings={settings} />

        {/* Charts Section */}
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6" >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Inference Speed History</h3>
              <p className="text-sm text-neutral-400">Tokens per second over time</p>
            </div>
            <div className="flex bg-black/30 rounded-lg p-1">
              {(['1h', '6h', '12h', '24h', '1w'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    timeRange === range
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#525252"
                  fontSize={12}
                  tickMargin={10}
                />
                <YAxis
                  stroke="#525252"
                  fontSize={12}
                  tickFormatter={(val) => `${val} t / s`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#333',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  itemStyle={{ color: '#818cf8' }}
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  formatter={(value: number) => [`${(value || 0).toFixed(2)} t / s`, 'Speed']}
                />
                <Line
                  type="monotone"
                  dataKey="tokensPerSec"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div >

      </div >
      {/* Custom Reset Modal */}
      {
        resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 text-white rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-2 text-red-500 text-lg font-semibold mb-2">
                <AlertTriangle className="w-5 h-5" />
                {showSetupInstructions ? "Permission Denied" : "Reset GPU Warning"}
              </div>
              {!showSetupInstructions && (
                <div className="text-neutral-400 text-sm mb-6">
                  This will forcibly reset the GPU PCIe bus.
                  <br /><br />
                  <strong className="text-white">⚠️ DANGER:</strong> If your display is connected to this GPU, your screen may <strong>FREEZE</strong> or go <strong>BLACK</strong>.
                  <br /><br />
                  Only proceed if you know what you are doing and have saved all work.
                </div>
              )}

              {showSetupInstructions && (
                <div className="bg-black/40 p-4 rounded-lg border border-amber-500/20 mb-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2 text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    Privileges Required
                  </div>
                  <p className="text-xs text-neutral-400 mb-2">
                    To perform this action without a password prompt, you need to configure sudo access.
                    Run this command in your terminal:
                  </p>
                  <div className="bg-black p-2 rounded border border-white/10 flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-neutral-500" />
                    <code className="text-xs font-mono text-emerald-400">{setupCommand}</code>
                  </div>
                </div>
              )}

              {resetError && (
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-red-400 text-sm mb-4">
                  Error: {resetError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-transparent border border-neutral-700 hover:bg-neutral-800 text-white text-sm transition-colors"
                >
                  {showSetupInstructions ? "Close" : "Cancel"}
                </button>
                {!showSetupInstructions && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleResetGpu(); }}
                    disabled={resetting}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white border-none text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetting ? "Resetting..." : "I Understand, Reset GPU"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
