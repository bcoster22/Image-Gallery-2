import React, { useEffect, useState, useRef } from 'react';
import { Activity } from 'lucide-react';

interface BenchmarkStats {
    lastRenderTime: number;
    averageFps: number;
    routeChanges: number;
}

const NavigationBenchmark: React.FC = () => {
    const [stats, setStats] = useState<BenchmarkStats>({
        lastRenderTime: 0,
        averageFps: 60,
        routeChanges: 0,
    });
    const [isVisible, setIsVisible] = useState(true);

    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const startTimeRef = useRef<number>(performance.now());

    // Measure FPS
    useEffect(() => {
        let requestID: number;

        const loop = (time: number) => {
            frameCountRef.current++;
            if (time - lastTimeRef.current >= 1000) {
                setStats(prev => ({
                    ...prev,
                    averageFps: Math.round(frameCountRef.current * 1000 / (time - lastTimeRef.current))
                }));
                frameCountRef.current = 0;
                lastTimeRef.current = time;
            }
            requestID = requestAnimationFrame(loop);
        };

        requestID = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestID);
    }, []);

    // Measure Render/Navigation (simulated by prop updates or just effect cycle keying)
    useEffect(() => {
        const now = performance.now();
        const renderTime = Math.round(now - startTimeRef.current);

        setStats(prev => ({
            ...prev,
            lastRenderTime: renderTime,
            routeChanges: prev.routeChanges + 1
        }));

        // Reset start time for next update
        startTimeRef.current = now;
    }, [/* dependency tracking in parent? */]);

    // We need to hook into the parent's generic re-render or router location. 
    // Since we don't have a real router context here easily, we rely on this component mounting/updating.

    if (!isVisible) return (
        <button
            onClick={() => setIsVisible(true)}
            className="fixed bottom-4 left-4 z-50 p-2 bg-gray-900/80 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors"
            title="Show Benchmark"
        >
            <Activity size={20} />
        </button>
    );

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-gray-900/90 text-xs font-mono text-green-400 p-3 rounded-lg shadow-xl border border-gray-700/50 backdrop-blur-md transition-all duration-300 pointer-events-none sm:pointer-events-auto select-none">
            <div className="flex justify-between items-center mb-2 gap-4">
                <span className="font-bold text-gray-200 flex items-center gap-1">
                    <Activity size={12} /> perf_mon
                </span>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-white pointer-events-auto"
                >
                    ✕
                </button>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">FPS:</span>
                    <span className={`${stats.averageFps < 30 ? 'text-red-500 font-bold' : 'text-green-400'}`}>
                        {stats.averageFps}
                    </span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Last Render:</span>
                    <span className={`${stats.lastRenderTime > 200 ? 'text-yellow-500' : 'text-blue-400'}`}>
                        {stats.lastRenderTime}ms
                    </span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Updates:</span>
                    <span>{stats.routeChanges}</span>
                </div>
            </div>
        </div>
    );
};

export default NavigationBenchmark;
