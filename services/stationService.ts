import { AdminSettings } from '../types';

// Discriminated union for type-safe log entries
export interface BaseLogEntry {
    timestamp: string;
    level: string;
    message: string;
    source: string;
}

export interface ProgressLogEntry extends BaseLogEntry {
    type: 'progress';
    percent: number;
    current: number;
    total: number;
    raw: string;
}

export interface SystemLogEntry extends BaseLogEntry {
    type: 'system';
}

export interface ClearLogEntry extends BaseLogEntry {
    type: 'clear';
}

export interface StandardLogEntry extends BaseLogEntry {
    type?: never;
}

export type LogEntry = ProgressLogEntry | SystemLogEntry | ClearLogEntry | StandardLogEntry;

class StationService {
    private eventSource: EventSource | null = null;
    private baseUrl = 'http://localhost:3001';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;

    connectToLogStream(
        onMessage: (log: LogEntry) => void,
        onError?: (status: 'disconnected' | 'failed') => void,
        autoReconnect = true
    ) {
        if (this.eventSource) {
            this.eventSource.close();
        }

        try {
            this.eventSource = new EventSource(`${this.baseUrl}/events/logs`);

            this.eventSource.onopen = () => {
                console.log('[StationService] Connected to log stream');
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as LogEntry;
                    onMessage(data);
                } catch (e) {
                    console.error('[StationService] Failed to parse SSE message', e);
                }
            };

            this.eventSource.onerror = (e) => {
                console.warn('[StationService] SSE Connection Error', e);

                if (this.eventSource?.readyState === EventSource.CLOSED) {
                    this.disconnect();

                    if (autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`[StationService] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

                        setTimeout(() => {
                            this.connectToLogStream(onMessage, onError, autoReconnect);
                        }, this.reconnectDelay);

                        if (onError) onError('disconnected');
                    } else {
                        console.error('[StationService] Max reconnection attempts reached');
                        if (onError) onError('failed');
                    }
                }
            };
        } catch (error) {
            console.error('[StationService] Failed to establish SSE connection', error);
            if (onError) onError('failed');
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    async getStatus() {
        try {
            const res = await fetch(`${this.baseUrl}/health`);
            return await res.json();
        } catch (e) {
            return { status: 'offline', error: e };
        }
    }

    async clearLogs() {
        try {
            await fetch(`${this.baseUrl}/log/clear`, { method: 'POST' });
            return true;
        } catch (e) {
            console.error('[StationService] Failed to clear logs', e);
            return false;
        }
    }

    async restartBackend() {
        try {
            await fetch(`${this.baseUrl}/control/restart`, { method: 'POST' });
            return true;
        } catch (e) {
            return false;
        }
    }
}

export const stationService = new StationService();
