import React from 'react';
import { Server, Play, Pause, Zap, Clock, Activity } from 'lucide-react';
import { cn } from '../../utils/statusUtils';
import { QueueStatus } from '../../types';

interface QueueMonitorProps {
    queueStatus: QueueStatus;
    onPauseQueue?: (paused: boolean) => void;
    onRemoveFromQueue?: (ids: string[]) => void;
    onClearQueue?: () => void;
}

export function QueueMonitor({ queueStatus, onPauseQueue, onRemoveFromQueue, onClearQueue }: QueueMonitorProps) {
    return (
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
                {onPauseQueue && (
                    <button
                        onClick={() => onPauseQueue(!queueStatus.isPaused)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border",
                            queueStatus.isPaused
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        )}
                    >
                        {queueStatus.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        {queueStatus.isPaused ? "Resume Queue" : "Pause Queue"}
                    </button>
                )}
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
                                            <div className={cn("flex items-center gap-1 w-fit px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider",
                                                job.taskType === 'smart-crop' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            )}>
                                                {job.taskType}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
