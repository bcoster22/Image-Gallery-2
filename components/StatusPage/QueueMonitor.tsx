import React, { useState } from 'react';
import { Server, Play, Pause, Zap, Clock, Activity, Trash2, X, Info } from 'lucide-react';
import { cn } from '../../utils/statusUtils';
import { QueueStatus } from '../../types';

import { CalibrationStatus } from '../../types/queue';

interface QueueMonitorProps {
    queueStatus: QueueStatus;
    onPauseQueue?: (paused: boolean) => void;
    onRemoveFromQueue?: (ids: string[]) => void;
    onClearQueue?: () => void;
    startCalibration?: () => void;
    stopCalibration?: () => void;
    calibrationStatus?: CalibrationStatus;
    isBatchMode?: boolean;
    onToggleBatchMode?: () => void;
    // Batch size calibration
    optimalBatchSize?: number;
    batchSizeCalibrated?: boolean;
    onCalibrateBatchSize?: () => void;
    batchCalibrationInProgress?: boolean;
}

export function QueueMonitor({
    queueStatus, onPauseQueue, onRemoveFromQueue, onClearQueue,
    startCalibration, stopCalibration, calibrationStatus,
    isBatchMode, onToggleBatchMode,
    optimalBatchSize = 4, batchSizeCalibrated, onCalibrateBatchSize, batchCalibrationInProgress
}: QueueMonitorProps) {
    const [selectedQueueIds, setSelectedQueueIds] = useState<Set<string>>(new Set());

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedQueueIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedQueueIds(newSet);
    };

    const handleRemoveSelected = () => {
        if (selectedQueueIds.size > 0 && onRemoveFromQueue) {
            onRemoveFromQueue(Array.from(selectedQueueIds));
            setSelectedQueueIds(new Set());
        }
    };

    const handleClearQueue = () => {
        if (onClearQueue) {
            onClearQueue();
            setSelectedQueueIds(new Set());
        }
    };

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
                <div className={cn("px-2 py-1 rounded text-xs font-medium uppercase transition-all duration-300",
                    queueStatus.isPaused
                        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                        : queueStatus.concurrencyLimit < 4
                            ? "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30"
                            : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                )}>
                    {queueStatus.isPaused
                        ? 'Paused (Cooldown)'
                        : queueStatus.concurrencyLimit < 4
                            ? `Running (Throttled: ${queueStatus.concurrencyLimit}x)`
                            : 'Running (Optimal)'}
                </div>
                <div className="flex items-center gap-2">
                    {/* Calibration Controls */}
                    {startCalibration && stopCalibration && (
                        calibrationStatus?.isActive ? (
                            <button
                                onClick={stopCalibration}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Stop Test
                            </button>
                        ) : (
                            <button
                                onClick={startCalibration}
                                disabled={queueStatus.pendingCount === 0}
                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border",
                                    queueStatus.pendingCount > 0
                                        ? "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                                        : "bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed"
                                )}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Calibrate
                            </button>
                        )
                    )}

                    {/* Batch Size Calibration Button */}
                    {onCalibrateBatchSize && (
                        <button
                            onClick={onCalibrateBatchSize}
                            disabled={batchCalibrationInProgress}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border",
                                batchCalibrationInProgress
                                    ? "bg-neutral-800 text-neutral-500 border-neutral-700 cursor-wait"
                                    : "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                            )}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            {batchCalibrationInProgress ? "Calibrating..." : "Calibrate Batch Size"}
                        </button>
                    )}

                    {onToggleBatchMode && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={onToggleBatchMode}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border",
                                    isBatchMode
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                                        : "bg-neutral-800 text-neutral-500 border-neutral-700 hover:bg-neutral-700"
                                )}
                            >
                                <Zap className={cn("w-3.5 h-3.5", isBatchMode && "text-blue-400")} />
                                Batch Tag: {isBatchMode ? `${optimalBatchSize} imgs` : "OFF"}
                            </button>
                            <div className="group relative">
                                <Info className="w-3.5 h-3.5 text-neutral-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-900 border border-white/10 rounded-lg text-[10px] text-neutral-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                                    High-speed tagging (WD14 only). <br />
                                    <span className="text-amber-400">Skips detailed captions.</span>
                                </div>
                            </div>
                        </div>
                    )}

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
                            {queueStatus.isPaused ? "Resume" : "Pause"}
                        </button>
                    )}
                    {onClearQueue && queueStatus.pendingCount > 0 && (
                        <button
                            onClick={handleClearQueue}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="space-y-4">
                    <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
                        {calibrationStatus?.isActive && (
                            <div className="absolute inset-0 bg-violet-500/10 pointer-events-none" />
                        )}
                        <div>
                            <div className="text-neutral-400 text-xs font-medium mb-1 flex items-center gap-2">
                                Active Threads
                                {calibrationStatus?.isActive && <span className="text-violet-400 font-bold animate-pulse">CALIBRATION MODE</span>}
                            </div>
                            <div className="text-2xl font-bold text-white z-10 relative">
                                {queueStatus.activeCount} <span className="text-sm text-neutral-500">/ {queueStatus.concurrencyLimit}</span>
                            </div>
                            {calibrationStatus?.isActive ? (
                                <div className="text-[10px] text-violet-300 mt-1 font-mono">
                                    Step {calibrationStatus.currentConcurrency} — {calibrationStatus.timeRemainingInStep.toFixed(0)}s left
                                </div>
                            ) : (
                                calibrationStatus?.results && calibrationStatus.results.length > 0 && (
                                    <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                                        Last Sweet Spot: {calibrationStatus.results.reduce((prev, curr) => curr.avgTPS > prev.avgTPS ? curr : prev).concurrency} threads
                                    </div>
                                )
                            )}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 z-10">
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
                <div className="col-span-1 md:col-span-2 bg-black/20 rounded-xl p-4 overflow-hidden flex flex-col gap-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

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

                    {/* Queued Jobs */}
                    {queueStatus.queuedJobs.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Pending Queue ({queueStatus.queuedJobs.length})
                                </h4>
                                {selectedQueueIds.size > 0 && onRemoveFromQueue && (
                                    <button
                                        onClick={handleRemoveSelected}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove ({selectedQueueIds.size})
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1.5 text-xs">
                                {queueStatus.queuedJobs.slice(0, 5).map((job, index) => (
                                    <div key={job.id} className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg p-2 hover:bg-blue-500/10 transition-colors group">
                                        {onRemoveFromQueue && (
                                            <input
                                                type="checkbox"
                                                checked={selectedQueueIds.has(job.id)}
                                                onChange={() => handleToggleSelect(job.id)}
                                                className="w-3.5 h-3.5 rounded border-neutral-500 bg-neutral-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                            />
                                        )}
                                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                            <span className="text-neutral-500 font-mono text-[10px] w-5">#{index + 1}</span>
                                            <span className="truncate text-neutral-300">{job.fileName}</span>
                                        </div>
                                        <div className={cn("px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider",
                                            job.taskType === 'analysis' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                job.taskType === 'generate' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                                                    "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                        )}>
                                            {job.taskType}
                                        </div>
                                    </div>
                                ))}
                                {queueStatus.queuedJobs.length > 5 && (
                                    <div className="text-center text-neutral-500 text-[10px] italic pt-1">
                                        +{queueStatus.queuedJobs.length - 5} more in queue
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
