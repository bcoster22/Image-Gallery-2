
const LOG_SERVER_URL = 'http://localhost:3001/log';

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    stack?: string;
    timestamp: string;
    url?: string;
}

class LoggingService {
    private static instance: LoggingService;
    private isEnabled: boolean = true;
    private queue: LogEntry[] = [];
    private isProcessing: boolean = false;

    private constructor() {
        // Check if server is reachable? Maybe not needed for fire-and-forget.
    }

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    public log(message: string, level: LogLevel = LogLevel.INFO, context: string = 'General', error?: any) {
        if (!this.isEnabled) return;

        let stack = undefined;
        let finalMessage = message;

        if (error) {
            if (error instanceof Error) {
                stack = error.stack;
                finalMessage = `${message}: ${error.message}`;
            } else if (typeof error === 'object') {
                try {
                    finalMessage = `${message}: ${JSON.stringify(error)}`;
                } catch (e) {
                    finalMessage = `${message}: [Circular Object]`;
                }
            } else {
                finalMessage = `${message}: ${String(error)}`;
            }
        }

        const entry: LogEntry = {
            level,
            message: finalMessage,
            context,
            stack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        console.log(`[${context}] ${finalMessage}`, error || ''); // Keep console log

        this.queue.push(entry);
        this.processQueue();
    }

    public error(message: string, context: string = 'Error', error?: any) {
        this.log(message, LogLevel.ERROR, context, error);
    }

    public warn(message: string, context: string = 'Warning', error?: any) {
        this.log(message, LogLevel.WARN, context, error);
    }

    public info(message: string, context: string = 'Info') {
        this.log(message, LogLevel.INFO, context);
    }

    public track(action: string, details?: any) {
        this.log(action, LogLevel.INFO, 'UserInteraction', details);
    }


    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        // Process batch immediately (or Debounce?) 
        // For now, process one by one to ensure delivery
        try {
            while (this.queue.length > 0) {
                const entry = this.queue.shift();
                if (!entry) break;

                try {
                    await fetch(LOG_SERVER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(entry),
                        keepalive: true // Important for logs during unload
                    });
                } catch (e) {
                    // Silently fail if log server is down to avoid loops
                    // console.warn("Failed to send log to server", e);
                    // Put back in queue? Nah, drop it to avoid memory leak if server is dead.
                }
            }
        } finally {
            this.isProcessing = false;
            // Check again in case new logs came in
            if (this.queue.length > 0) this.processQueue();
        }
    }
}

export const logger = LoggingService.getInstance();
