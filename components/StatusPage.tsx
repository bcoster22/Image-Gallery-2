import React, { useMemo, useState } from "react";
import { AdminSettings, ImageAnalysisStats, QueueStatus } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, Zap, Server, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

interface StatusPageProps {
  statsHistory: StatPoint[];
  settings: AdminSettings | null;
  queueStatus?: QueueStatus;
}

export default function StatusPage({ statsHistory, settings, queueStatus }: StatusPageProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '1w'>('1h');

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
                  <span className="text-xs font-medium">Current Speed</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {latestStat ? latestStat.tokensPerSec.toFixed(1) : '0.0'} <span className="text-sm text-neutral-500">t/s</span>
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-medium">Device</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {latestStat ? latestStat.device : '-'}
                </div>
              </div>
            </div>
          </div>

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
                              <span className="truncate text-neutral-200 max-w-[200px]">{job.fileName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-400">
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
                            <div className="text-xs text-neutral-500">
                              Waiting...
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
                  tickFormatter={(val) => `${val} t/s`}
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
                  formatter={(value: number) => [`${value.toFixed(2)} t/s`, 'Speed']}
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
    </div >
  );
}
