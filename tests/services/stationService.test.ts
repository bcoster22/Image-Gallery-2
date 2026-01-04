import { describe, it, expect } from 'vitest';
import { stationService, LogEntry, ProgressLogEntry } from '../../services/stationService';

describe('StationService - Type Safety', () => {
    it('should correctly type a progress log entry', () => {
        const progressEntry: ProgressLogEntry = {
            timestamp: '2026-01-04T17:20:00Z',
            level: 'INFO',
            message: 'Loading model...',
            source: 'Backend',
            type: 'progress',
            percent: 85,
            current: 17,
            total: 20,
            raw: '85%|████████▌ | 17/20 [00:03<00:00, 5.12it/s]'
        };

        expect(progressEntry.type).toBe('progress');
        expect(progressEntry.percent).toBe(85);
        expect(progressEntry.current).toBe(17);
        expect(progressEntry.total).toBe(20);
    });

    it('should handle standard log entries without type', () => {
        const standardEntry: LogEntry = {
            timestamp: '2026-01-04T17:20:00Z',
            level: 'INFO',
            message: 'Backend started',
            source: 'StationManager'
        };

        expect(standardEntry.message).toBe('Backend started');
        expect(standardEntry.type).toBeUndefined();
    });

    it('should handle system log entries', () => {
        const systemEntry: LogEntry = {
            timestamp: '2026-01-04T17:20:00Z',
            level: 'INFO',
            message: 'Connected',
            source: 'SSE',
            type: 'system'
        };

        expect(systemEntry.type).toBe('system');
    });
});

describe('StationService - Error Handling', () => {
    it('should have getStatus method', () => {
        expect(typeof stationService.getStatus).toBe('function');
    });

    it('should have restartBackend method', () => {
        expect(typeof stationService.restartBackend).toBe('function');
    });

    it('should have disconnect method', () => {
        expect(typeof stationService.disconnect).toBe('function');
    });
});
