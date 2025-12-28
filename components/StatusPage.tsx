import React, { useMemo, useState, useEffect } from "react";
import { OtelMetrics, StatusPageProps } from './StatusPage/StatusPage.types';

// Sub-components
import { Header } from './StatusPage/Header';
import { StatusBanner } from './StatusPage/StatusBanner';
import { MoondreamCard } from './StatusPage/MoondreamCard';
import { EnvironmentCard } from './StatusPage/EnvironmentCard';
import { PerformanceStats } from './StatusPage/PerformanceStats';
import { GPUMetrics } from './StatusPage/GPUMetrics';
import { QueueMonitor } from './StatusPage/QueueMonitor';

export default function StatusPage({
  statsHistory, settings, queueStatus, onPauseQueue, onClearQueue, onRemoveFromQueue,
  onShowPerformance, onShowDiagnostics, startCalibration, stopCalibration, calibrationStatus,
  isBatchMode, onToggleBatchMode,
  optimalBatchSize, batchSizeCalibrated, onCalibrateBatchSize, batchCalibrationInProgress
}: StatusPageProps) {
  // Global State (Fetched here, passed down)
  const [otelMetrics, setOtelMetrics] = useState<OtelMetrics | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '1w'>('1h');

  // Note: Local history state (vramHistory, etc) has been moved to GPUControlCard for better isolation

  const moondreamUrl = useMemo(() => {
    const url = settings?.providers.moondream_local.endpoint || 'http://localhost:2020';
    // Remove both trailing slash and trailing /v1 because metrics are at the root
    return url.replace(/\/$/, "").replace(/\/v1$/, "");
  }, [settings]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${moondreamUrl}/metrics`);
      if (res.ok) {
        const data = await res.json();
        // console.log('[StatusPage] Metrics loaded_models:', data.loaded_models);
        setOtelMetrics(data);
        setServerReachable(true);
      } else {
        setOtelMetrics(null);
        setServerReachable(false);
      }
    } catch (e) {
      console.error("Failed to fetch Moondream metrics", e);
      setOtelMetrics(null);
      setServerReachable(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [moondreamUrl]);

  // Derived Status
  const latestStat = statsHistory[statsHistory.length - 1];
  const moondreamStatus = useMemo(() => {
    if (!settings?.providers.moondream_local.endpoint) return "down"; // Not configured
    if (!serverReachable) return "down"; // Connection failed
    if (!latestStat) return "idle";
    const timeSinceLast = Date.now() - latestStat.timestamp;
    if (timeSinceLast > 5 * 60 * 1000) return "idle"; // Inactive for > 5 mins
    return "operational";
  }, [settings, latestStat, serverReachable]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <Header onShowPerformance={onShowPerformance} onShowDiagnostics={onShowDiagnostics} />

        <StatusBanner
          moondreamStatus={moondreamStatus}
          latestStat={latestStat}
        />

        <PerformanceStats
          statsHistory={statsHistory}
          timeRange={timeRange}
        />

        {queueStatus && (
          <QueueMonitor
            queueStatus={queueStatus}
            onPauseQueue={onPauseQueue}
            onRemoveFromQueue={onRemoveFromQueue}
            onClearQueue={onClearQueue}
            startCalibration={startCalibration}
            stopCalibration={stopCalibration}
            calibrationStatus={calibrationStatus}
            isBatchMode={isBatchMode}
            onToggleBatchMode={onToggleBatchMode}
            optimalBatchSize={optimalBatchSize}
            batchSizeCalibrated={batchSizeCalibrated}
            onCalibrateBatchSize={onCalibrateBatchSize}
            batchCalibrationInProgress={batchCalibrationInProgress}
          />
        )}

        {/* Provider Section: Moondream Station */}
        <div className="pt-6 border-t border-white/10">
          <MoondreamCard
            moondreamStatus={moondreamStatus}
            otelMetrics={otelMetrics}
            latestStat={latestStat}
          >
            {otelMetrics?.environment && (
              <EnvironmentCard
                environment={otelMetrics.environment}
                otelMetrics={otelMetrics}
                latestStat={latestStat}
                moondreamStatus={moondreamStatus}
              />
            )}

            <GPUMetrics
              otelMetrics={otelMetrics}
              settings={settings}
              moondreamUrl={moondreamUrl}
              onRefreshMetrics={fetchMetrics}
            />
          </MoondreamCard>
        </div>


      </div>
    </div>
  );
}
