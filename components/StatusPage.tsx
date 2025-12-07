import React, { useMemo, useState, useEffect } from "react";
import { AdminSettings, ImageAnalysisStats, QueueStatus } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  // Keyframes: 
  // 0-40: Blue (240) -> Green (120)
  // 40-60: Green (120) -> Yellow (60)
  // 60-80: Yellow (60) -> Orange (30)
  // 80-100: Orange (30) -> Red (0)

  // Clamp value
  const v = Math.max(0, Math.min(100, value));
  let hue = 120; // Default green

  if (v <= 40) {
    // 0 -> 240 (Blue), 40 -> 120 (Green)
    // Map 0-40 to 240-120
    hue = 240 - ((v / 40) * 120);
  } else if (v <= 60) {
    // 40 -> 120 (Green), 60 -> 60 (Yellow)
    // Map 0-20 (v-40) to 120-60
    hue = 120 - (((v - 40) / 20) * 60);
  } else if (v <= 80) {
    // 60 -> 60 (Yellow), 80 -> 30 (Orange)
    // Map 0-20 (v-60) to 60-30
    hue = 60 - (((v - 60) / 20) * 30);
  } else {
    // 80 -> 30 (Orange), 100 -> 0 (Red)
    // Map 0-20 (v-80) to 30-0
    hue = 30 - (((v - 80) / 20) * 30);
  }

  return `hsl(${hue}, 100%, 50%)`;
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
}

interface StatusPageProps {
  statsHistory: StatPoint[];
  settings: AdminSettings | null;
  queueStatus?: QueueStatus;
}

export default function StatusPage({ statsHistory, settings, queueStatus }: StatusPageProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '1w'>('1h');
  const [otelMetrics, setOtelMetrics] = useState<OtelMetrics | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  const handleResetGpu = async () => {
    setResetting(true);
    setResetError(null);
    setShowSetupInstructions(false);
    try {
      const response = await fetch('http://localhost:2021/v1/system/gpu-reset', {
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
      const response = await fetch(`http://localhost:2021/v1/system/gpu-boost?gpu_id=${id}&enable=${enable}`, {
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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:2021/metrics');
        if (res.ok) {
          const data = await res.json();
          setOtelMetrics(data);
        }
      } catch (e) {
        console.error("Failed to fetch Moondream metrics", e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

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
    ? (filteredStats.reduce((acc, curr) => acc + curr.tokensPerSec, 0) / filteredStats.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

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
                  {otelMetrics ? `${otelMetrics.cpu.toFixed(1)}% ` : (latestStat ? latestStat.tokensPerSec.toFixed(1) + ' t/s' : '0.0%')}
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {otelMetrics ? `${otelMetrics.memory.toFixed(1)}% ` : (latestStat ? (latestStat.device === 'GPU' ? 'Unknown' : latestStat.device) : '-')}
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

                    {/* Header: Icon + Meta */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-green-500/10 rounded-xl">
                        <Cpu className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 font-medium">NVIDIA</div>
                        <div className="text-xs text-neutral-500">GPU {gpu.id}</div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-2 mb-4">
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

                      <button
                        className="h-7 text-xs px-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors w-fit"
                        onClick={() => setResetModalOpen(true)}
                      >
                        Reset GPU
                      </button>
                    </div>

                    {/* Name */}
                    <div className="font-bold text-white leading-tight mb-6 text-lg">{gpu.name}</div>

                    <div className="space-y-4">
                      {/* Load */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Load</span>
                          <span className="text-white font-medium">{gpu.load}%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${gpu.load}%`,
                              backgroundColor: getSmoothColor(gpu.load)
                            }}
                          />
                        </div>
                      </div>

                      {/* VRAM */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">VRAM</span>
                          <span className="text-white">{gpu.memory_used} / {gpu.memory_total} MB</span>
                        </div>
                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${(gpu.memory_used / gpu.memory_total) * 100}%`,
                              backgroundColor: getSmoothColor((gpu.memory_used / gpu.memory_total) * 100)
                            }}
                          />
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Temperature</span>
                          <span className="text-white font-medium">{gpu.temperature}°C</span>
                        </div>
                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, gpu.temperature)}%`, // Temp usually 0-100 scale fits well visually
                              backgroundColor: getSmoothColor(gpu.temperature)
                            }}
                          />
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
                                {/* Task Badge for Active Job */}
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
                            <div className="flex flex-col items-end gap-0.5 text-xs text-neutral-400">
                              <span>{(job.size / 1024).toFixed(1)} KB</span>
                              <span>{((Date.now() - job.startTime) / 1000).toFixed(1)}s</span>
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
                              {/* Task Type Badge */}
                              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider",
                                job.taskType === 'smart-crop' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                  job.taskType === 'video' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                                    job.taskType === 'generate' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                      "bg-violet-500/10 text-violet-400 border-violet-500/20" // Analysis/Default
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
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6">
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
                  formatter={(value: number) => [`${value.toFixed(2)} t / s`, 'Speed']}
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
        </div>

      </div>
      {/* Custom Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 text-red-500 text-lg font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Reset GPU Warning
            </div>
            <div className="text-neutral-400 text-sm mb-6">
              This will forcibly reset the GPU PCIe bus.
              <br /><br />
              <strong className="text-white">⚠️ DANGER:</strong> If your display is connected to this GPU, your screen may <strong>FREEZE</strong> or go <strong>BLACK</strong>.
              <br /><br />
              Only proceed if you know what you are doing and have saved all work.
            </div>

            {showSetupInstructions && (
              <div className="bg-black/40 p-4 rounded-lg border border-amber-500/20 mb-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2 text-sm font-medium">
                  <Lock className="w-4 h-4" />
                  Permission Denied
                </div>
                <p className="text-xs text-neutral-400 mb-2">
                  Passwordless sudo is required for this feature. Run this in your terminal:
                </p>
                <div className="bg-black p-2 rounded border border-white/10 flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-neutral-500" />
                  <code className="text-xs font-mono text-emerald-400">./setup_gpu_reset.sh</code>
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
      )}
    </div >
  );
}
