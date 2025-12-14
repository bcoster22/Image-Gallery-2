import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2, XCircle, CheckCircle } from 'lucide-react';
import { ImageInfo } from '../types';
import { dataUrlToBlob } from '../utils/fileUtils';
import { DownloadIcon } from './icons';

interface BulkDownloaderProps {
    selectedImages: ImageInfo[];
    onSuccess?: () => void;
    className?: string; // To match toolbar styling
    triggerDownload?: boolean; // External trigger for drag-to-desktop
}

const BulkDownloader: React.FC<BulkDownloaderProps> = ({ selectedImages = [], onSuccess, className, triggerDownload }) => {
    const [status, setStatus] = useState<'idle' | 'downloading' | 'success' | 'error' | 'cancelled'>('idle');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- CONFIGURATION ---
    const CONCURRENCY_LIMIT = 3;

    // Auto-trigger download when triggerDownload prop changes to true
    useEffect(() => {
        if (triggerDownload && selectedImages.length > 0 && status === 'idle') {
            // Call startDownload directly - the drag event itself is the user gesture
            startDownload();
        }
    }, [triggerDownload]);

    // --- HELPER: Smart Fetcher with Concurrency ---
    const processBatch = async <T,>(items: T[], processItemFn: (item: T, index: number) => Promise<any>) => {
        let index = 0;
        const results: any[] = [];
        const activeWorkers = new Set<Promise<any>>();

        return new Promise((resolve) => {
            const next = async () => {
                if (abortControllerRef.current?.signal.aborted) return;

                // Final check: if all started items are done
                if (index >= items.length && activeWorkers.size === 0) {
                    resolve(results);
                    return;
                }

                while (activeWorkers.size < CONCURRENCY_LIMIT && index < items.length) {
                    const currentIndex = index++;
                    const item = items[currentIndex];

                    const promise = processItemFn(item, currentIndex)
                        .then(res => {
                            activeWorkers.delete(promise);
                            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
                            next();
                            return res;
                        })
                        .catch(err => {
                            activeWorkers.delete(promise);
                            next();
                        });

                    activeWorkers.add(promise);
                }
            };

            next();
        });
    };

    const getBlobFromImage = async (image: ImageInfo): Promise<Blob> => {
        // Prioritize IDB Blob
        if (image.file instanceof Blob) {
            return image.file;
        }
        // Fallback Data URL
        if (image.dataUrl && image.dataUrl.startsWith('data:')) {
            return await dataUrlToBlob(image.dataUrl);
        }
        // Fallback Video URL
        if (image.videoUrl) {
            const response = await fetch(image.videoUrl, { signal: abortControllerRef.current?.signal });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.blob();
        }
        throw new Error("No valid content found");
    };

    const getFilename = (image: ImageInfo) => {
        let originalName = image.displayName || image.fileName || 'image';
        // Strip ext
        originalName = originalName.replace(/\.[^/.]+$/, "");
        // Sanitize
        let safeFileName = originalName.replace(/[<>:"/\\|?*]/g, '');

        // We determine extension later from blob type usually, but here we might just append if missing
        // or rely on the blob type in the calling function if needed.
        // For simplicity, let's return base name and handle extension in loop
        return safeFileName;
    };

    // --- METHOD A: Native File System (Chrome/Edge) ---
    const downloadNative = async (dirHandle: any) => {
        await processBatch(selectedImages, async (image, i) => {
            try {
                const blob = await getBlobFromImage(image);
                let filename = getFilename(image);

                // Add extension based on blob type
                const type = blob.type;
                if (type.includes('video')) filename += '.mp4';
                else if (type.includes('png')) filename += '.png';
                else if (type.includes('jpeg') || type.includes('jpg')) filename += '.jpg';
                else if (type.includes('webp')) filename += '.webp';
                else if (type.includes('gif')) filename += '.gif';
                else filename += '.png'; // Fallback

                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();

                return { status: 'success', id: image.id };
            } catch (err: any) {
                console.error(`Failed: ${image.fileName}`, err);
                setLogs(prev => [...prev, `Failed: ${image.fileName}`]);
            }
        });
    };

    // --- METHOD B: Zip Fallback ---
    const downloadZip = async () => {
        const zip = new JSZip();
        // Flat structure for simplicity as per previous preference
        const folder = zip;

        await processBatch(selectedImages, async (image, i) => {
            try {
                const blob = await getBlobFromImage(image);
                let filename = getFilename(image);

                // Add extension
                const type = blob.type;
                if (type.includes('video')) filename += '.mp4';
                else if (type.includes('png')) filename += '.png';
                else if (type.includes('jpeg') || type.includes('jpg')) filename += '.jpg';
                else if (type.includes('webp')) filename += '.webp';
                else if (type.includes('gif')) filename += '.gif';
                else filename += '.png';

                folder.file(filename, blob);
            } catch (err: any) {
                setLogs(prev => [...prev, `Failed: ${image.fileName}`]);
            }
        });

        if (abortControllerRef.current?.signal.aborted) return;

        setLogs(prev => [...prev, "Compressing Zip file..."]);
        // Compression is fast enough usually to not block UI too much, but generateAsync is async
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `gallery-export-${new Date().toISOString().slice(0, 10)}.zip`);
    };

    const startDownload = async () => {
        if (selectedImages.length === 0) return;

        setStatus('downloading');
        setProgress({ current: 0, total: selectedImages.length });
        setLogs([]);
        abortControllerRef.current = new AbortController();

        try {
            // @ts-ignore - showDirectoryPicker is standardized but types might be missing
            if ('showDirectoryPicker' in window) {
                console.log('[BulkDownloader] showDirectoryPicker is available, attempting to use it...');
                try {
                    // @ts-ignore
                    const dirHandle = await window.showDirectoryPicker();
                    console.log('[BulkDownloader] Directory picker succeeded, using native download');
                    await downloadNative(dirHandle);
                } catch (pickerErr: any) {
                    console.error('[BulkDownloader] Directory picker failed:', pickerErr.name, pickerErr.message);
                    // User cancelled picker or permission denied
                    if (pickerErr.name === 'AbortError') {
                        console.log('[BulkDownloader] User cancelled directory picker');
                        setStatus('cancelled');
                        setTimeout(() => setStatus('idle'), 2000);
                        return;
                    }
                    // If picker fails for any other reason, fall back to ZIP
                    console.warn('[BulkDownloader] Falling back to ZIP download due to:', pickerErr.name);
                    setLogs(prev => [...prev, `Note: Using ZIP fallback (${pickerErr.name})`]);
                    await downloadZip();
                }
            } else {
                console.log('[BulkDownloader] showDirectoryPicker not available, using ZIP');
                await downloadZip();
            }

            if (!abortControllerRef.current.signal.aborted) {
                setStatus('success');
                if (onSuccess) onSuccess();
                // Auto-reset status after a delay so button comes back?
                setTimeout(() => setStatus('idle'), 3000);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('user aborted')) {
                setStatus('cancelled');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                console.error(err);
                setStatus('error');
                setLogs(prev => [...prev, err.message]);
            }
        }
    };

    const cancelDownload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setStatus('cancelled');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    // Render Trigger Button when Idle
    if (status === 'idle' || status === 'success' || status === 'cancelled' || status === 'error') {
        return (
            <button
                onClick={startDownload}
                disabled={selectedImages.length === 0}
                className={className}
                title="Download Selected"
            >
                <DownloadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
            </button>
        );
    }

    // Render Progress UI (Overlay or Inline?)
    // Since this is replacing a button in a toolbar, inline expansion might be weird.
    // A small popover or just replacing the button content might be better.
    // Given "Best UI/UX", let's make it a fixed toast/card that appears above the toolbar?
    // Or just style it to fit within the toolbar area if possible? 
    // The user provided code has a card style. Let's render that "Card" as a small absolute popup above the button.

    return (
        <div className="relative">
            {/* Placeholder button to keep layout stable */}
            <button className={`${className} opacity-50 cursor-wait`} disabled>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Processing...</span>
            </button>


            {/* Floating Progress Card */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg p-4 shadow-2xl z-50">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <Loader2 className="animate-spin text-blue-500" size={16} />
                        {status === 'downloading' ? 'Downloading...' : 'Compressing...'}
                    </span>
                    <button
                        onClick={cancelDownload}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        title="Cancel Download"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{progress.current} / {progress.total} files</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Logs */}
                {logs.length > 0 && (
                    <div className="mt-2 max-h-20 overflow-y-auto text-[10px] text-gray-500 dark:text-gray-400 font-mono space-y-0.5">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                )}

                {/* Cancel Button (prominent) */}
                <button
                    onClick={cancelDownload}
                    className="mt-3 w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                    Cancel Download
                </button>
            </div>
        </div>
    );
};

export default BulkDownloader;
