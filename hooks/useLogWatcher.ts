import { useEffect, useRef } from 'react';
import { Notification } from '../types';

interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    context: string;
    message: string;
    source?: string;
}

export const useLogWatcher = (addNotification: (notification: Omit<Notification, 'id'>) => void) => {
    const lastLogRef = useRef<string | null>(null);
    const seenLogsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const checkLogs = async () => {
            try {
                // Fetch recent logs
                const res = await fetch('http://localhost:3001/log?limit=50');
                if (!res.ok) return; // Silent fail if server not running

                const data = await res.json();
                const logs: LogEntry[] = data.logs || [];

                // Process oldest to newest
                // API usually returns newest first, so we reverse
                const sortedLogs = [...logs].reverse();

                for (const log of sortedLogs) {
                    const logId = `${log.timestamp}-${log.message}`;

                    if (seenLogsRef.current.has(logId)) continue;
                    seenLogsRef.current.add(logId);

                    // Cleanup seen logs set if it gets too large
                    if (seenLogsRef.current.size > 1000) {
                        const arr = Array.from(seenLogsRef.current);
                        seenLogsRef.current = new Set(arr.slice(arr.length - 500));
                    }

                    // --- DETECTION LOGIC ---

                    // 1. Zombie / Memory Leaks
                    if (log.message.includes("ZOMBIE DETECTED") || log.message.includes("Ghost VRAM")) {
                        addNotification({
                            status: 'error',
                            message: `Memory Leak Detected: ${log.message}`
                        });
                    }

                    // 2. Model Unloaded (Info)
                    else if (log.message.includes("Unloaded model to free VRAM")) {
                        addNotification({
                            status: 'info',
                            message: "System: Unloaded inactive model to free VRAM."
                        });
                    }

                    // 3. Load Failures
                    else if (log.level === 'ERROR' && log.message.includes("Failed to load model")) {
                        addNotification({
                            status: 'error',
                            message: log.message
                        });
                    }

                    // 4. Load Success (Optional, maybe too spammy? Let's include for verification per user request)
                    else if (log.message.includes("Successfully loaded model")) {
                        addNotification({
                            status: 'success',
                            message: log.message
                        });
                    }
                }

            } catch (e) {
                // Ignore connection errors to avoid console spam if log server is down
            }
        };

        const interval = setInterval(checkLogs, 2000);
        return () => clearInterval(interval);
    }, [addNotification]);
};
