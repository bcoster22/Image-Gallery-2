import React, { useCallback } from 'react';

/**
 * Hook for resilience logging and metrics tracking
 * Manages the resilience log state and provides logging utilities
 */

interface UseQueueResilienceProps {
    setResilienceLog: React.Dispatch<React.SetStateAction<{
        timestamp: number;
        type: 'info' | 'warn' | 'error';
        message: string;
    }[]>>;
}

export const useQueueResilience = ({ setResilienceLog }: UseQueueResilienceProps) => {

    // Basic Resilience Logger
    const logResilience = useCallback((
        type: 'info' | 'warn' | 'error',
        message: string
    ) => {
        setResilienceLog(prev => {
            const entry = { timestamp: Date.now(), type, message };
            return [entry, ...prev].slice(0, 50); // Keep last 50
        });
    }, [setResilienceLog]);

    // Enhanced Resilience Logger with Metrics
    const logResilienceWithMetrics = useCallback((
        type: 'info' | 'warn' | 'error',
        action: string,
        metrics?: Record<string, string | number>
    ) => {
        let message = `[${action.toUpperCase()}]`;

        if (metrics) {
            const metricStr = Object.entries(metrics)
                .map(([key, val]) => {
                    if (typeof val === 'number' && !Number.isInteger(val)) {
                        return `${key}=${val.toFixed(1)}`;
                    }
                    return `${key}=${val}`;
                })
                .join(', ');
            message += ` | ${metricStr}`;
        }

        logResilience(type, message);
    }, [logResilience]);

    return {
        logResilience,
        logResilienceWithMetrics
    };
};
