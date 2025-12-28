import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NavBar } from './components/layout/NavBar';
// FIX: Added AppSettings to import for settings migration.
import { ImageInfo, AdminSettings, User, GenerationTask, Notification, AspectRatio, GalleryView, AiProvider, UploadProgress, AppSettings, AnalysisProgress, QueueStatus, ActiveJob, GenerationResult, GenerationSettings, UpscaleSettings, QueueItem } from './types';
import { analyzeImage, animateImage, editImage, generateImageFromPrompt, adaptPromptToTheme, FallbackChainError, detectSubject, testProviderConnection } from './services/aiService';
import { fileToDataUrl, getImageMetadata, dataUrlToBlob, generateVideoThumbnail, createGenericPlaceholder, extractAIGenerationMetadata, resizeImage, getClosestSupportedAspectRatio } from './utils/fileUtils';
import { RateLimitedApiQueue } from './utils/rateLimiter';
import { initDB, getImages, saveImage, deleteImages, updateImage, getNegativePrompts, saveNegativePrompt, deleteNegativePrompt, NegativePrompt } from './utils/idb';
import { DEFAULT_NEGATIVE_PROMPTS } from './constants/prompts';
import ImageGrid from './components/ImageGrid';
import ImageViewer from './components/ImageViewer';
import UploadArea from './components/UploadArea';
import { getFriendlyErrorMessage } from './utils/errorUtils';
import { AdminSettingsPage } from './components/AdminSettingsPage';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import BottomNav from './components/BottomNav';
import NotificationArea from './components/NotificationArea';
import VeoKeySelectionModal from './components/VeoKeySelectionModal';
import CreationsPage from './components/CreationsPage';
import IdleSlideshow from './components/IdleSlideshow';
import { Search as SearchIcon, Settings as SettingsIcon, X as CloseIcon, AlertTriangle as WarningIcon, Play as PlayIcon, Square as StopIcon, Activity } from 'lucide-react';
import PromptHistoryPage from './components/PromptHistoryPage';
import SelectionActionBar from './components/SelectionActionBar';

import ConfirmationModal from './components/ConfirmationModal';
import { useSelection } from './hooks/useSelection';
import { useGalleryData } from './hooks/useGalleryData';
import { useGenerationQueue } from './hooks/useGenerationQueue';
import { useImageActions } from './hooks/useImageActions';
import { useBatchOperations } from './hooks/useBatchOperations';
import PromptSubmissionModal from './components/PromptSubmissionModal';
import { PromptModalConfig } from './components/PromptModal/types';
import BatchRemixModal from './components/BatchRemixModal';
import Spinner from './components/Spinner';
import StatusPage from './components/StatusPage';
import GenerationStatusIndicator from './components/GenerationStatusIndicator';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import AnalysisProgressIndicator from './components/AnalysisProgressIndicator';
import UserProfilePage from './components/UserProfilePage';
import NavigationBenchmark from './components/NavigationBenchmark';
import LogViewer from './components/LogViewer';
import DuplicatesPage from './components/DuplicatesPage';
import PerformanceOverview from './components/PerformanceOverview';
import DiagnosticsPage from './components/Diagnostics';
import { useLogWatcher } from './hooks/useLogWatcher';

const SETTINGS_STORAGE_KEY = 'ai_gallery_settings_v2'; // Updated key for new structure
const OLD_SETTINGS_STORAGE_KEY = 'ai_gallery_settings'; // Old key for migration
const USER_STORAGE_KEY = 'ai_gallery_user';
const PROMPTS_STORAGE_KEY = 'ai_gallery_prompts';
// const NEGATIVE_PROMPTS_STORAGE_KEY = 'ai_gallery_negative_prompts'; // Deprecated for IDB
const MAX_PROMPT_HISTORY = 100;

const MOCK_USERS = {
  google: {
    id: 'user_google_123',
    name: 'Alex',
    email: 'alex@google.com',
    avatarUrl: `https://api.dicebear.com/8.x/adventurer/svg?seed=Alex`,
    slideshowAdaptivePan: true,
    slideshowSmartCrop: true,
    disableSmartCropNotifications: true,
    slideshowBounce: true
  },
  github: {
    id: 'user_github_456',
    name: 'Sam',
    email: 'sam@github.com',
    avatarUrl: `https://api.dicebear.com/8.x/adventurer/svg?seed=Sam`,
    slideshowAdaptivePan: true,
    slideshowSmartCrop: true,
    disableSmartCropNotifications: true,
    slideshowBounce: true
  },
};

interface TagFilterBarProps {
  allTags: string[];
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

const TagFilterBar: React.FC<TagFilterBarProps> = ({ allTags, activeTags, onToggleTag, onClear }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]); // Initialize ref array

  // Verify buttonRefs length matches tags
  React.useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, allTags.length);
  }, [allTags]);

  // Use native event listener to support non-passive behavior for preventDefault
  React.useEffect(() => {
    const handleWheelNative = (e: WheelEvent) => {
      if (scrollRef.current) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          scrollRef.current.scrollLeft += e.deltaY;
        }
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheelNative, { passive: false });
    }
    return () => {
      if (el) {
        el.removeEventListener('wheel', handleWheelNative);
      }
    };
  }, [allTags.length]);

  if (allTags.length === 0) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    // With grid-rows-2 and grid-flow-col:
    // Item 0 (0,0) -> Down -> Item 1 (0,1)
    // Item 1 (0,1) -> Up -> Item 0 (0,0)
    // Item 0 (0,0) -> Right -> Item 2 (1,0)
    // Item 1 (0,1) -> Right -> Item 3 (1,1)

    // Layout Logic:
    // Even index (0,2,4) is Top Row. Odd index (1,3,5) is Bottom Row.
    const isTopRow = index % 2 === 0;
    const isBottomRow = !isTopRow;
    const lastIndex = allTags.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isTopRow && index + 1 <= lastIndex) nextIndex = index + 1;
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isBottomRow) nextIndex = index - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index + 2 <= lastIndex) nextIndex = index + 2;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (index - 2 >= 0) nextIndex = index - 2;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    if (nextIndex !== index) {
      setFocusedIndex(nextIndex);
      buttonRefs.current[nextIndex]?.focus();
      // Ensure visible
      buttonRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden relative group">
      {activeTags.size > 0 && (
        <div className="flex justify-end items-center mb-2">
          <button
            onClick={onClear}
            className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <CloseIcon className="w-4 h-4 mr-1" />
            Clear Filter
          </button>
        </div>
      )}

      {/* Scroll Fade Hint (Right) */}
      <div className="absolute right-0 top-4 bottom-4 w-12 bg-gradient-to-l from-gray-900/80 to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {allTags.map((tag, index) => {
          const isActive = activeTags.has(tag);
          return (
            <button
              key={tag}
              ref={el => buttonRefs.current[index] = el}
              onClick={() => onToggleTag(tag)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              tabIndex={focusedIndex === index ? 0 : -1}
              className={`snap-start px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-md transform scale-105' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              title={tag}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};


const NoSettingsPrompt: React.FC<{ onSettingsClick: () => void }> = ({ onSettingsClick }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="text-center p-10 border-2 border-dashed border-gray-600 rounded-2xl bg-gray-800/50">
      <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Gemini Vision Gallery</h2>
      <p className="text-gray-400 mb-6">Please configure your AI providers in settings to get started.</p>
      <button
        onClick={onSettingsClick}
        className="flex items-center mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
      >
        <SettingsIcon className="w-5 h-5 mr-2" />
        Go to Settings
      </button>
    </div>
  </div>
);




const App: React.FC = () => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [similarImages, setSimilarImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [processingSmartCropIds, setProcessingSmartCropIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [galleryView, setGalleryView] = useState<GalleryView>('public');
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [promptModalConfig, setPromptModalConfig] = useState<PromptModalConfig | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);

  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [veoRetryState, setVeoRetryState] = useState<{ sourceImage: ImageInfo | null, prompt: string, aspectRatio: AspectRatio } | null>(null);

  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  // Default to false, user must enable the "Screensaver" mode
  const [isSlideshowEnabled, setIsSlideshowEnabled] = useState(false);
  const [slideshowNeedsSlowdown, setSlideshowNeedsSlowdown] = useState(false);
  const [triggerBulkDownload, setTriggerBulkDownload] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load prompt history", e);
      return [];
    }
  });
  // Use object array for IDB items, but simplistic array for UI props usually?
  // We'll map to strings for UI where needed, or update UI to accept objects.
  // For now, let's keep simplistic state:
  const [negativePromptHistory, setNegativePromptHistory] = useState<NegativePrompt[]>([]);


  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [showPerformanceOverview, setShowPerformanceOverview] = useState(false);
  const [statsHistory, setStatsHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('moondream_stats');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('moondream_stats', JSON.stringify(statsHistory));
  }, [statsHistory]);
  const {
    selectedIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelection: setSelectedIds
  } = useSelection();

  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);

  // Queue management ref to prevent double-submission
  const queuedAnalysisIds = useRef<Set<string>>(new Set());
  const apiQueue = useMemo(() => new RateLimitedApiQueue(), []);

  // Upload cancellation ref
  const uploadAbortRef = useRef<boolean>(false);

  const addNotification = useCallback((notification: Omit<Notification, 'id'> & { id?: string }) => {
    const id = notification.id || self.crypto.randomUUID();
    setNotifications(prev => [...prev.filter(n => n.id !== id), { ...notification, id }]);
  }, []);

  const handleCancelUpload = useCallback(() => {
    uploadAbortRef.current = true;
    addNotification({ status: 'warning', message: 'Cancelling import...' });
  }, [addNotification]);

  const updateNotification = useCallback((id: string, updates: Partial<Omit<Notification, 'id'>>) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // --- Log Watcher for System Events ---
  useLogWatcher(addNotification);

  // --- Image Actions Hook ---
  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    handleDeleteSelected,
    handleConfirmDelete,
    handleCancelDelete,
    handleToggleImagePublicStatus,
    handleBatchMakePublic,
    handleBatchMakePrivate
  } = useImageActions({
    images,
    setImages,
    selectedIds,
    setSelectedIds,
    currentUser,
    addNotification,
    toggleSelectionMode,
    setSelectedImage,
    setSimilarImages
  });

  // Adaptive Concurrency State
  const queueRef = useRef<QueueItem[]>([]);
  const activeRequestsRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const activeJobsRef = useRef<ActiveJob[]>([]); // Track active job details
  // Adaptive Concurrency State
  const [concurrencyLimit, setConcurrencyLimit] = useState(1);
  const consecutiveSuccesses = useRef(0);
  const recoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkBackendHealthRef = useRef<(() => Promise<void>) | null>(null);
  const analysisProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_CONCURRENCY = 5;
  const queuedGenerationIds = useRef<Set<string>>(new Set());
  const [generationResults, setGenerationResults] = useState<{ id: string; url: string }[]>([]);

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    activeCount: 0,
    pendingCount: 0,
    isPaused: false,
    activeJobs: [],
    queuedJobs: [],
    concurrencyLimit: concurrencyLimit
  });

  // Helper to sync ref state to UI state
  const syncQueueStatus = useCallback(() => {
    setQueueStatus({
      activeCount: activeRequestsRef.current,
      pendingCount: queueRef.current.length,
      isPaused: isPausedRef.current,
      activeJobs: [...activeJobsRef.current],
      queuedJobs: queueRef.current.map(item => ({
        id: item.id,
        fileName: item.fileName,
        size: item.data.image ? item.data.image.dataUrl.length : 0,
        startTime: item.addedAt,
        taskType: item.taskType
      })),
      concurrencyLimit: concurrencyLimit
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isPausedRef.current) {
      // If paused, we only resume if active requests drain to 0
      if (activeRequestsRef.current === 0) {
        console.log("Queue drained. Resuming...");
        isPausedRef.current = false;
        syncQueueStatus();
      } else {
        return;
      }
    }

    if (activeRequestsRef.current >= concurrencyLimit) return;

    while (activeRequestsRef.current < concurrencyLimit && queueRef.current.length > 0) {
      const task = queueRef.current.shift();
      if (!task) {
        syncQueueStatus();
        break;
      }

      // For analysis, check if we should still proceed
      if (task.taskType === 'analysis' && task.data.image) {
        if (!queuedAnalysisIds.current.has(task.data.image.id)) {
          syncQueueStatus();
          continue;
        }
      }

      activeRequestsRef.current++;

      // Add to active jobs list
      const job: ActiveJob = {
        id: task.id,
        fileName: task.fileName,
        size: task.data.image ? task.data.image.dataUrl.length : 0,
        startTime: Date.now(),
        taskType: task.taskType
      };
      activeJobsRef.current.push(job);
      syncQueueStatus();

      // EXECUTE TASK
      (async () => {
        let shouldUpdateProgress = true;
        try {
          if (task.taskType === 'analysis' && task.data.image) {
            // --- EXISTING ANALYSIS LOGIC ---
            const imageToAnalyze = task.data.image;
            setAnalysisProgress(prev => ({ ...prev!, fileName: imageToAnalyze.fileName }));
            addNotification({ id: imageToAnalyze.id, status: 'processing', message: `Analyzing ${imageToAnalyze.fileName}...` });

            let imageForAnalysis = { ...imageToAnalyze };
            if (settings?.performance?.downscaleImages) {
              const resizedUrl = await resizeImage(imageToAnalyze.dataUrl, { maxDimension: settings.performance.maxAnalysisDimension });
              imageForAnalysis.dataUrl = resizedUrl;
            }

            const analysisMetadata = await analyzeImage(
              imageForAnalysis,
              settings!,
              undefined,
              (msg) => updateNotification(imageToAnalyze.id, { message: msg })
            );

            if (analysisMetadata.stats) {
              setStatsHistory(prev => [...prev, {
                timestamp: Date.now(),
                tokensPerSec: analysisMetadata.stats!.tokensPerSec,
                device: analysisMetadata.stats!.device
              }]);
            }

            const updatedImage = { ...imageToAnalyze, ...analysisMetadata, analysisFailed: false };
            setImages(prev => prev.map(img => img.id === imageToAnalyze.id ? updatedImage : img));
            setSelectedImage(prev => (prev && prev.id === imageToAnalyze.id ? updatedImage : prev));
            setSimilarImages(prev => prev.map(img => img.id === imageToAnalyze.id ? updatedImage : img));

            saveImage(updatedImage);
            updateNotification(imageToAnalyze.id, { status: 'success', message: `Successfully analyzed ${imageToAnalyze.fileName}.` });

            // Progress is updated in the finally block below

            // Remove from analyzing set
            setAnalyzingIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(imageToAnalyze.id);
              return newSet;
            });
            queuedAnalysisIds.current.delete(imageToAnalyze.id);

          } else if (task.taskType === 'generate' && task.data.prompt && task.data.aspectRatio) {
            // --- NEW GENERATION LOGIC ---
            addNotification({ id: task.id, status: 'processing', message: `Generating: ${task.fileName}...` });

            const result = await generateImageFromPrompt(
              task.data.prompt,
              settings!,
              task.data.aspectRatio,
              task.data.sourceImage,
              task.data.generationSettings
            );

            if (result.image) {
              // Metadata for saving
              const meta = {
                ...task.data.generationSettings,
                aspectRatio: task.data.aspectRatio,
                provider: settings!.providers[settings!.routing.generation[0]]?.apiKey ? settings!.routing.generation[0] : 'unknown'
              };

              await handleSaveGeneratedImage(result.image, task.data.prompt, meta);

              // Add to generation results for modal display
              setGenerationResults(prev => [...prev, { id: task.id, url: result.image }]);
              addNotification({ id: task.id, status: 'success', message: `Generated: ${task.fileName}` });
            } else {
              throw new Error("No image data returned.");
            }
          }

          // Adaptive Concurrency Success
          consecutiveSuccesses.current++;
          if (consecutiveSuccesses.current >= 3 && concurrencyLimit < MAX_CONCURRENCY) {
            setConcurrencyLimit(prev => prev + 1);
            consecutiveSuccesses.current = 0;
          }


        } catch (err: any) {
          const errorMessage = err.message || '';
          console.error(`Task ${task.fileName} failed:`, errorMessage);

          // Check for "Queue is full" or Connection Errors
          const isConnectionError = errorMessage.toLowerCase().includes('failed to fetch') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('Network request failed') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('Load failed') ||
            errorMessage.includes('500') ||
            errorMessage.includes('Internal Server Error');

          if (isConnectionError && settings?.resilience?.pauseOnLocalFailure) {
            console.warn(`Backend Connection Lost (${errorMessage}). Pausing queue.`);
            updateNotification(task.id, { status: 'warning', message: 'Backend Lost. Pausing Queue...' });

            isPausedRef.current = true;
            queueRef.current.unshift(task); // Re-queue current task to front
            shouldUpdateProgress = false;

            // Start Recovery Check
            if (!recoveryIntervalRef.current) {
              const intervalMs = settings.resilience.checkBackendInterval || 5000;
              recoveryIntervalRef.current = setInterval(() => {
                if (checkBackendHealthRef.current) checkBackendHealthRef.current();
              }, intervalMs);
            }

            syncQueueStatus();
            return; // Stop processing final block/failure marking for this task
          }

          if (errorMessage.includes("Queue is full") || errorMessage.includes("rejected")) {
            console.warn(`Backpressure. Pausing queue and re-queueing ${task.fileName}.`);
            updateNotification(task.id, { status: 'warning', message: `Server busy. Re-queueing ${task.fileName}...` });
            isPausedRef.current = true;
            queueRef.current.unshift(task); // Re-queue
            shouldUpdateProgress = false;
            // Reduce concurrency
            setConcurrencyLimit(prev => Math.max(1, Math.floor(prev / 2)));
            consecutiveSuccesses.current = 0;
          } else {
            updateNotification(task.id, { status: 'error', message: `Failed: ${task.fileName}` });
            if (task.taskType === 'analysis' && task.data.image) {
              // Mark analysis as failed
              const failedImg = { ...task.data.image, analysisFailed: true, analysisError: errorMessage };
              setImages(prev => prev.map(img => img.id === failedImg.id ? failedImg : img));
              saveImage(failedImg);
              // Remove from analyzing set
              setAnalyzingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(task.data.image!.id);
                return newSet;
              });
              queuedAnalysisIds.current.delete(task.data.image.id);
            }
            // Reset concurrency on failure
            setConcurrencyLimit(1);
            consecutiveSuccesses.current = 0;
          }
        } finally {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
          activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== task.id);

          // Update progress for analysis tasks
          if (task.taskType === 'analysis' && shouldUpdateProgress) {
            setAnalysisProgress(prev => {
              if (!prev) return null;
              const newCurrent = prev.current + 1;

              // Auto-dismiss when complete
              if (newCurrent >= prev.total) {
                console.log('[Analysis Progress] Batch complete, setting 2s auto-dismiss timeout');
                // Clear any existing timeout first
                if (analysisProgressTimeoutRef.current) {
                  console.log('[Analysis Progress] Clearing existing timeout before setting new one');
                  clearTimeout(analysisProgressTimeoutRef.current);
                }
                // Set new timeout and store its ID
                analysisProgressTimeoutRef.current = setTimeout(() => {
                  console.log('[Analysis Progress] Auto-dismiss timeout fired, clearing modal');
                  setAnalysisProgress(null);
                  analysisProgressTimeoutRef.current = null;
                }, 2000);
                return { ...prev, current: newCurrent }; // Show 100% briefly
              }

              return { ...prev, current: newCurrent };
            });
          }

          // Remove from queued generation IDs
          if (task.taskType === 'generate') {
            queuedGenerationIds.current.delete(task.id);
          }

          syncQueueStatus();
          processQueue(); // Loop to next
        }
      })();
    }

  }, [settings, addNotification, updateNotification, setStatsHistory, syncQueueStatus]);

  const runImageAnalysis = useCallback((imagesToAnalyze: ImageInfo[], isRetry: boolean = false) => {
    if (imagesToAnalyze.length === 0 || !hasValidSettings(settings)) return;

    // Filter out images that are already in the queue or currently analyzing to prevent duplicates
    const uniqueImagesToAnalyze = imagesToAnalyze.filter(img => !queuedAnalysisIds.current.has(img.id));

    if (uniqueImagesToAnalyze.length === 0) return;

    // Mark as queued immediately
    uniqueImagesToAnalyze.forEach(img => queuedAnalysisIds.current.add(img.id));

    // Update Visual State (Spinner) Synchronously for immediate feedback
    setAnalyzingIds(prev => {
      const newSet = new Set(prev);
      uniqueImagesToAnalyze.forEach(img => newSet.add(img.id));
      return newSet;
    });

    // Clear failure flags locally for retries
    if (isRetry) {
      setImages(prev => prev.map(img =>
        uniqueImagesToAnalyze.find(u => u.id === img.id)
          ? { ...img, analysisFailed: false }
          : img
      ));
    }

    // Update Progress Counter
    setAnalysisProgress(prev => {
      // If previous batch finished (current >= total), start fresh.
      // Otherwise, append to the existing total.
      const isFreshBatch = !prev || prev.current >= prev.total;

      if (isFreshBatch) {
        // Clear any pending auto-dismiss timeout when starting a new batch
        if (analysisProgressTimeoutRef.current) {
          console.log('[Analysis Progress] Clearing old timeout on fresh batch');
          clearTimeout(analysisProgressTimeoutRef.current);
          analysisProgressTimeoutRef.current = null;
        }
      }

      return {
        current: isFreshBatch ? 0 : prev.current,
        total: (isFreshBatch ? 0 : prev.total) + uniqueImagesToAnalyze.length,
        fileName: isFreshBatch ? uniqueImagesToAnalyze[0].fileName : prev.fileName,
      };
    });

    // Add to queue and start processing
    const queueItems: QueueItem[] = uniqueImagesToAnalyze.map(img => ({
      id: img.id,
      taskType: 'analysis' as const,
      fileName: img.fileName,
      addedAt: Date.now(),
      data: { image: img }
    }));
    queueRef.current.push(...queueItems);
    processQueue();
  }, [settings, processQueue]);

  // Add generation tasks to queue
  const handleAddToGenerationQueue = useCallback((items: QueueItem[]) => {
    items.forEach(item => {
      queuedGenerationIds.current.add(item.id);

      // Multi-tier priority queue logic:
      // Priority 3 (IMMEDIATE): Regenerate caption, user explicitly waiting
      // Priority 2 (INTERACTIVE): Generation Studio, user actively watching  
      // Priority 1 (PRELOAD): Slideshow preload, "Smart fit to screen"
      // Priority 0 (BACKGROUND): Batch processing, closed modal

      const itemPriority = item.priority || 0; // Default to BACKGROUND

      // Find insertion point: insert after same/higher priority, before lower priority
      let insertIndex = queueRef.current.length; // Default: end of queue

      for (let i = 0; i < queueRef.current.length; i++) {
        const queueItemPriority = queueRef.current[i].priority || 0;
        if (itemPriority > queueItemPriority) {
          // Found item with lower priority - insert here
          insertIndex = i;
          break;
        }
      }

      queueRef.current.splice(insertIndex, 0, item);
    });

    addNotification({
      status: 'processing',
      message: `Added ${items.length} image${items.length > 1 ? 's' : ''} to generation queue`
    });

    syncQueueStatus();
    processQueue();
  }, [addNotification, syncQueueStatus, processQueue]);


  useEffect(() => {
    // Load settings with migration from old format
    const storedSettingsV2 = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettingsV2) {
      try {
        setSettings(JSON.parse(storedSettingsV2));
      } catch (e) { console.error("Failed to parse V2 settings", e); }
    } else {
      const oldSettingsRaw = localStorage.getItem(OLD_SETTINGS_STORAGE_KEY);
      if (oldSettingsRaw) {
        try {
          const oldSettings: AppSettings = JSON.parse(oldSettingsRaw);

          let migratedProvider: AiProvider = 'gemini';
          if (oldSettings.provider === 'moondream') {
            migratedProvider = oldSettings.moondreamApiKey ? 'moondream_cloud' : 'moondream_local';
          } else if (['gemini', 'openai', 'grok', 'comfyui'].includes(oldSettings.provider)) {
            migratedProvider = oldSettings.provider as AiProvider;
          }

          // Migrate to new AdminSettings structure
          const newSettings: AdminSettings = {
            providers: {
              gemini: {
                apiKey: oldSettings.geminiApiKey,
                generationModel: oldSettings.geminiGenerationModel,
                veoModel: oldSettings.geminiVeoModel,
                safetySettings: oldSettings.geminiSafetySettings,
              },
              grok: {
                apiKey: oldSettings.grokApiKey,
                generationModel: oldSettings.grokGenerationModel,
              },
              moondream_cloud: {
                apiKey: oldSettings.moondreamApiKey,
              },
              moondream_local: {
                endpoint: oldSettings.moondreamEndpoint,
                model: 'moondream-2',
                captionModel: 'moondream-2',
                taggingModel: 'moondream-2',
              },
              openai: {
                apiKey: oldSettings.openaiApiKey,
                generationModel: oldSettings.openaiGenerationModel,
                organizationId: null,
                projectId: null,
                textGenerationModel: 'GPT-4.1',
              },
              comfyui: {
                mode: 'local',
                endpoint: 'http://127.0.0.1:8188',
                apiKey: '',
              },
            },
            routing: { // Default routing based on old primary provider
              vision: [migratedProvider],
              generation: [migratedProvider],
              animation: [migratedProvider],
              editing: [migratedProvider],
              textGeneration: [migratedProvider],
              captioning: [migratedProvider],
              tagging: [migratedProvider],
            },
            performance: {
              downscaleImages: true,
              maxAnalysisDimension: 1024,
              vramUsage: 'balanced',
            },
            prompts: {
              assignments: {},
              strategies: []
            },
            contentSafety: {
              enabled: true,
              autoClassify: true,
              threshold: 80,
              nsfwKeyword: "NSFW",
              sfwKeyword: "SFW",
              blurNsfw: true,
              showConfidence: false,
              useSingleModelSession: true
            },
            appearance: {
              thumbnailSize: 40,
              thumbnailHoverScale: 1.2
            }
          };
          setSettings(newSettings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
          localStorage.removeItem(OLD_SETTINGS_STORAGE_KEY);
          addNotification({ status: 'success', message: 'Settings have been updated to the new V2 format.' });
        } catch (e) {
          console.error("Failed to migrate old settings", e);
        }
      }
    }


    // Load user session
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }

    // Initialize DB and Load Data
    const loadDbData = async () => {
      try {
        setIsDbLoading(true);
        await initDB();

        // 1. Load Images
        const loadedImages = await getImages();
        setImages(loadedImages);

        // 2. Load Negative Prompts
        const loadedPrompts = await getNegativePrompts();

        if (loadedPrompts.length === 0) {
          // Seed defaults
          console.log("Seeding default negative prompts...");
          for (const prompt of DEFAULT_NEGATIVE_PROMPTS) {
            await saveNegativePrompt(prompt);
          }
          // Reload
          const reloaded = await getNegativePrompts();
          setNegativePromptHistory(reloaded);
        } else {
          setNegativePromptHistory(loadedPrompts);
        }

      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
        addNotification({ status: 'error', message: 'Could not load your saved gallery data.' });
      } finally {
        setIsDbLoading(false);
      }
    };
    loadDbData();

  }, [addNotification]);

  const addPromptToHistory = useCallback((prompt: string) => {
    setPromptHistory(prev => {
      const newHistory = [prompt, ...prev.filter(p => p !== prompt)].slice(0, MAX_PROMPT_HISTORY);
      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const hasValidSettings = (s: AdminSettings | null): boolean => {
    if (!s) return false;
    // A simple check to see if at least one provider has some form of key/endpoint.
    const { gemini, grok, moondream_cloud, moondream_local, openai } = s.providers;
    return !!(gemini.apiKey || grok.apiKey || moondream_local.endpoint || moondream_cloud.apiKey || openai.apiKey);
  };

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);


  const handleSaveSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    setGalleryView('public'); // Go back to the main view after saving
    addNotification({ status: 'success', message: 'Administrator settings saved successfully!' });
  };

  const handleLogin = (provider: 'google' | 'github') => {
    const user = MOCK_USERS[provider];
    setCurrentUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setIsLoginModalOpen(false);
    setGalleryView('my-gallery'); // Switch to user's gallery after login
  };

  const addNegativePromptToHistory = useCallback(async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    // Check if already exists in state to avoid DB thrashing
    const exists = negativePromptHistory.some(p => p.content === trimmed);
    if (exists) return;

    try {
      const newPrompt = await saveNegativePrompt(trimmed);
      setNegativePromptHistory(prev => [newPrompt, ...prev]);
    } catch (e) {
      console.error("Failed to save negative prompt", e);
    }
  }, [negativePromptHistory]);

  const deleteNegativePromptFromHistory = useCallback(async (content: string) => {
    // Find ID from content
    const item = negativePromptHistory.find(p => p.content === content);
    if (!item) return;

    try {
      await deleteNegativePrompt(item.id);
      setNegativePromptHistory(prev => prev.filter(p => p.id !== item.id));
    } catch (e) {
      console.error("Failed to delete negative prompt", e);
    }
  }, [negativePromptHistory]);

  const clearPromptHistory = useCallback(() => {
    setPromptHistory([]);
    localStorage.removeItem(PROMPTS_STORAGE_KEY);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setGalleryView('public'); // Switch to public view after logout
  };

  const handleToggleNsfwBlur = () => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      contentSafety: {
        ...settings.contentSafety,
        blurNsfw: !settings.contentSafety?.blurNsfw
      }
    };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    addNotification({
      status: 'success',
      message: `NSFW blur ${newSettings.contentSafety.blurNsfw ? 'enabled' : 'disabled'}`
    });
  };

  const handleClearFailedTasks = useCallback(() => {
    setGenerationTasks(prev => prev.filter(t => t.status !== 'failed'));
  }, []);

  const handleRetryAnalysis = useCallback((imageId?: string) => {
    if (!hasValidSettings(settings)) {
      addNotification({ status: 'error', message: 'Please check your settings before retrying.' });
      return;
    }

    let imagesToRetry: ImageInfo[] = [];

    if (imageId) {
      const img = images.find(i => i.id === imageId);
      if (img) imagesToRetry.push(img);
    } else {
      // Retry all failed in my gallery
      imagesToRetry = images.filter(img => img.analysisFailed && img.ownerId === currentUser?.id);
    }

    if (imagesToRetry.length === 0) {
      addNotification({ status: 'success', message: 'No failed items to retry.' });
      return;
    }

    // Pass true for isRetry to prioritize these tasks
    runImageAnalysis(imagesToRetry, true);
  }, [images, currentUser, settings, runImageAnalysis, addNotification]);


  const handleFilesChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      addNotification({ status: 'error', message: 'Please sign in to upload images.' });
      return;
    }
    if (!hasValidSettings(settings)) {
      addNotification({ status: 'error', message: 'Please configure your AI provider in settings before uploading.' });
      setGalleryView('admin-settings');
      return;
    }
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // FIX: Explicitly type imageFiles and cast file to any in filter to avoid 'unknown' errors
    const imageFiles: File[] = Array.from(files).filter((file: any) => file.type && file.type.startsWith('image/')) as File[];
    const totalFiles = imageFiles.length;
    if (totalFiles === 0) return;

    let bytesProcessed = 0;
    const uploadStartTime = Date.now();
    const processingTimes: number[] = [];
    const newImages: ImageInfo[] = [];

    // Reset abort flag
    uploadAbortRef.current = false;
    setUploadProgress({ current: 0, total: totalFiles, eta: -1, speed: 0, fileName: '' });

    for (let i = 0; i < totalFiles; i++) {
      // Check for cancellation
      if (uploadAbortRef.current) {
        addNotification({ status: 'info', message: `Import cancelled. ${newImages.length} of ${totalFiles} images imported.` });
        setUploadProgress(null);
        break;
      }

      const file = imageFiles[i];
      const processStartTime = Date.now();

      setUploadProgress(prev => ({ ...prev!, current: i + 1, fileName: file.name }));

      try {
        const aiMetadata = await extractAIGenerationMetadata(file);
        const dataUrl = await fileToDataUrl(file);
        const basicMetadata = await getImageMetadata(dataUrl);

        const newImage: ImageInfo = {
          id: self.crypto.randomUUID(),
          file,
          fileName: file.name,
          dataUrl,
          ...basicMetadata,
          ownerId: currentUser!.id,
          isPublic: false,
          source: 'upload',
          authorName: currentUser!.name,
          authorAvatarUrl: currentUser!.avatarUrl,
          likes: Math.floor(Math.random() * 1000),
          commentsCount: Math.floor(Math.random() * 200),
          ...(aiMetadata?.originalMetadataPrompt ? { originalMetadataPrompt: aiMetadata.originalMetadataPrompt } : {}),
          ...(aiMetadata?.keywords ? { keywords: aiMetadata.keywords } : {}),
        };
        newImages.push(newImage);

        if (aiMetadata?.originalMetadataPrompt) {
          addNotification({ status: 'success', message: `Imported ${newImage.fileName} with embedded prompt.` });
        }
      } catch (e: any) {
        console.error("Error processing file:", file.name, e);
        addNotification({ status: 'error', message: `Failed to process ${file.name}.` });
      }

      bytesProcessed += file.size;
      processingTimes.push(Date.now() - processStartTime);
      const elapsedSeconds = (Date.now() - uploadStartTime) / 1000;
      const speed = elapsedSeconds > 0 ? (bytesProcessed / 1024 / 1024) / elapsedSeconds : 0;

      let eta = -1;
      if (i >= 1) {
        const avgTimePerFile = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
        const remainingFiles = totalFiles - (i + 1);
        eta = Math.round((remainingFiles * avgTimePerFile) / 1000);
      }
      setUploadProgress(prev => ({ ...prev!, speed: parseFloat(speed.toFixed(2)), eta }));
    }

    setImages(prev => [...prev, ...newImages]);
    Promise.all(newImages.map(img => saveImage(img))).catch(e => {
      console.error("Failed to save new images to DB", e);
      addNotification({ status: 'error', message: 'Failed to save new images.' });
    });

    setUploadProgress(prev => ({ ...prev!, current: totalFiles, fileName: 'Completed!', eta: 0 }));
    setTimeout(() => setUploadProgress(null), 3000);

    // Start analysis for images that need it
    const imagesToAnalyze = newImages.filter(img => !img.recreationPrompt);
    if (imagesToAnalyze.length > 0) {
      runImageAnalysis(imagesToAnalyze);
    }

  }, [settings, currentUser, addNotification, runImageAnalysis]);

  const handleImageSelect = useCallback((image: ImageInfo) => {
    if (isSearchingSimilar || image.isGenerating) return;

    // Videos can be selected, but we don't run similarity search on them.
    if (image.isVideo && !image.videoUrl) { // Offline video
      setSelectedImage(image);
      setSimilarImages([image]);
      return;
    }

    setSelectedImage(image);
    setIsSearchingSimilar(true);
    setIsLoading(true); // Keep for UI consistency, even if it's fast
    setError(null);
    setSimilarImages([]);

    // New logic: Local keyword-based similarity search
    if (!image.keywords || image.keywords.length === 0) {
      setSimilarImages([image]); // No keywords, so no similar images to find
    } else {
      const targetKeywords = new Set(image.keywords.map(kw => kw.toLowerCase()));

      const otherImages = images.filter(img =>
        img.id !== image.id &&
        !img.isVideo &&
        !img.isGenerating &&
        (img.isPublic || img.ownerId === currentUser?.id) &&
        img.keywords &&
        img.keywords.length > 0
      );

      const scoredImages = otherImages.map(otherImage => {
        const otherKeywords = new Set(otherImage.keywords!.map(kw => kw.toLowerCase()));
        const intersection = new Set([...targetKeywords].filter(kw => otherKeywords.has(kw)));
        return { image: otherImage, score: intersection.size };
      });

      // Filter out images with no matching keywords, then sort by score
      const sortedSimilar = scoredImages
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.image);

      const MAX_SIMILAR_IMAGES = 9;
      const topSimilar = sortedSimilar.slice(0, MAX_SIMILAR_IMAGES);

      setSimilarImages([image, ...topSimilar]);
    }

    setIsLoading(false);
    setIsSearchingSimilar(false);

  }, [images, isSearchingSimilar, currentUser]);


  const handleCloseViewer = () => {
    setSelectedImage(null);
    setSimilarImages([]);
    setError(null);
  };

  const handleKeywordSelect = (keyword: string) => {
    setSearchQuery(keyword);
    handleCloseViewer();
  };

  /* 
   * Save a blob/dataURL to the gallery. 
   */
  const saveImageToGallery = useCallback(async (dataUrl: string, isPublic: boolean, prompt?: string, source?: ImageInfo['source'], savedToGallery?: boolean, generationMetadata?: any) => {
    if (!currentUser) {
      addNotification({ status: 'error', message: 'You must be signed in to save an image.' });
      return;
    }
    try {
      const fileName = `${source || 'ai-creation'}-${Date.now()}.png`;
      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], fileName, { type: 'image/png' });

      const metadata = await getImageMetadata(dataUrl);
      const newImage: ImageInfo = {
        id: self.crypto.randomUUID(),
        file,
        fileName,
        dataUrl,
        ...metadata,
        ownerId: currentUser.id,
        isPublic,
        recreationPrompt: prompt,
        source,
        savedToGallery,
        generationMetadata,
        // New fields for card UI
        authorName: currentUser.name,
        authorAvatarUrl: currentUser.avatarUrl,
        likes: 0,
        commentsCount: 0,
      };

      setImages(prevImages => [newImage, ...prevImages]);
      saveImage(newImage).catch(e => {
        console.error("Failed to save image to DB", e);
        addNotification({ status: 'error', message: 'Failed to save image.' });
      });

      addNotification({ status: 'success', message: `New ${source || 'creation'} saved to your gallery!` })

      if (settings && !prompt) { // Only analyze if it wasn't a generation with a known prompt
        runImageAnalysis([newImage]);
      }
    } catch (error) {
      console.error("Failed to save image:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addNotification({ status: 'error', message: `Could not save: ${errorMessage}` });
    }
  }, [settings, currentUser, addNotification, runImageAnalysis]);

  const handleSaveGeneratedImage = useCallback(async (imageInput: string | any, prompt: string | boolean, metadata?: any) => {
    // Defensive input handling
    let base64Image = '';
    if (typeof imageInput === 'string') {
      base64Image = imageInput;
    } else if (imageInput && typeof imageInput === 'object' && imageInput.image) {
      base64Image = imageInput.image;
    }

    if (!base64Image) {
      console.error("handleSaveGeneratedImage received invalid input:", imageInput);
      return;
    }

    const safePrompt = typeof prompt === 'string' ? prompt : (typeof metadata === 'string' ? metadata : '');
    if (safePrompt) addPromptToHistory(safePrompt);

    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    // User Update: Prefer session-based autoSave setting (metadata.autoSaveToGallery) over user profile default
    // Default fallback to optional chaining if undefined.
    const shouldSaveToGallery = metadata?.autoSaveToGallery ?? currentUser?.autoSaveToGallery;
    saveImageToGallery(dataUrl, false, safePrompt, 'generated', shouldSaveToGallery, metadata);
  }, [addPromptToHistory, saveImageToGallery, currentUser]);

  const handleRegenerateCaption = useCallback(async (imageId: string) => {
    const imageToRegenerate = images.find(img => img.id === imageId);
    if (!imageToRegenerate || !settings) return;

    // Check if already queued
    if (queuedAnalysisIds.current.has(imageId)) {
      addNotification({ status: 'warning', message: 'Image is already queued for analysis.' });
      return;
    }

    // Update Progress Counter
    setAnalysisProgress(prev => {
      const isFreshBatch = !prev || prev.current >= prev.total;
      if (isFreshBatch) {
        // Clear any pending auto-dismiss timeout when starting a new batch
        if (analysisProgressTimeoutRef.current) {
          clearTimeout(analysisProgressTimeoutRef.current);
          analysisProgressTimeoutRef.current = null;
        }
        return {
          current: 0,
          total: 1, // Only one image being regenerated
          fileName: imageToRegenerate.fileName,
        };
      }
      return {
        current: prev.current,
        total: prev.total + 1,
        fileName: prev.fileName, // Keep the original file name for the batch
      };
    });

    // Add to queue with IMMEDIATE priority (user explicitly waiting)
    const queueItem: QueueItem = {
      id: imageToRegenerate.id,
      taskType: 'analysis',
      fileName: imageToRegenerate.fileName,
      addedAt: Date.now(),
      priority: 3, // QueuePriority.IMMEDIATE - user is staring at screen waiting
      data: { image: imageToRegenerate }
    };

    // Priority insertion (same logic as generation queue)
    const itemPriority = queueItem.priority || 0;
    let insertIndex = queueRef.current.length;

    for (let i = 0; i < queueRef.current.length; i++) {
      const queueItemPriority = queueRef.current[i].priority || 0;
      if (itemPriority > queueItemPriority) {
        insertIndex = i;
        break;
      }
    }

    queueRef.current.splice(insertIndex, 0, queueItem);
    queuedAnalysisIds.current.add(imageId);

    // Update visual state (spinner)
    setAnalyzingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });

    // Update UI
    syncQueueStatus();
    addNotification({ id: imageId, status: 'info', message: 'Queued for regeneration...' });

    // Trigger processing
    processQueue();
  }, [images, settings, addNotification, syncQueueStatus, processQueue]);

  const handleSaveEnhancedImage = useCallback(async (base64Image: string, isPublic: boolean, prompt: string) => {
    addPromptToHistory(prompt);
    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    saveImageToGallery(dataUrl, isPublic, prompt, 'enhanced', currentUser?.autoSaveToGallery);
  }, [addPromptToHistory, saveImageToGallery, currentUser]);

  const handleStartAnimation = useCallback(async (
    sourceImage: ImageInfo | null,
    prompt: string,
    aspectRatio: AspectRatio,
    isRetry: boolean = false,
  ) => {
    const activeVideoTasks = generationTasks.filter(t => t.type === 'video' && t.status === 'processing').length;
    if (activeVideoTasks >= 2 && !isRetry) {
      addNotification({ status: 'error', message: 'Too many active video generations. Please wait for current ones to finish.' });
      return;
    }

    if (!settings || !currentUser) return;
    addPromptToHistory(prompt);

    const taskId = self.crypto.randomUUID();

    const placeholderImage: ImageInfo = {
      id: taskId,
      dataUrl: sourceImage?.dataUrl || createGenericPlaceholder(aspectRatio),
      fileName: `Generating video for "${prompt.substring(0, 30)}..."`,
      file: sourceImage?.file || new File([], ''),
      ownerId: currentUser.id,
      isPublic: false,
      authorName: currentUser.name,
      authorAvatarUrl: currentUser.avatarUrl,
      isGenerating: true,
      source: 'video',
      recreationPrompt: prompt,
      width: sourceImage?.width,
      height: sourceImage?.height,
      aspectRatio: sourceImage?.aspectRatio,
    };

    setImages(prev => [placeholderImage, ...prev]);

    const newTask: GenerationTask = {
      id: taskId,
      type: 'video',
      status: 'processing',
      sourceImageId: sourceImage?.id,
      sourceImageName: sourceImage?.fileName || `"${prompt.substring(0, 30)}..."`,
      prompt: prompt,
    };

    setGenerationTasks(prev => [...prev, newTask]);

    (async () => {
      try {
        let imageForAnimation: ImageInfo | null = sourceImage;
        let videoSource: ImageInfo['source'] = 'video';
        let finalThumbnailDataUrl = sourceImage?.dataUrl;

        if (sourceImage) {
          try {
            // Step 1: Try to enhance the source image before animation
            addNotification({ id: `${taskId}-enhance`, status: 'processing', message: `Enhancing source image...` });
            const enhancementPrompt = "Remove any text or watermarks. Enhance image quality and resolution to be as sharp and detailed as possible, preparing it for video generation.";
            const enhancedResult = await editImage(sourceImage, enhancementPrompt, settings);
            const enhancedDataUrl = `data:image/png;base64,${enhancedResult.image}`;
            const enhancedBlob = await dataUrlToBlob(enhancedDataUrl);
            const enhancedFileName = `enhanced-${sourceImage.fileName}`;
            const enhancedFile = new File([enhancedBlob], enhancedFileName, { type: 'image/png' });

            imageForAnimation = {
              ...sourceImage,
              id: self.crypto.randomUUID(),
              file: enhancedFile,
              fileName: enhancedFileName,
              dataUrl: enhancedDataUrl,
            };
            updateNotification(`${taskId}-enhance`, { status: 'success', message: 'Image enhanced successfully.' });
          } catch (enhancementError: any) {
            console.warn("Image enhancement failed before animation. Proceeding with original image.", enhancementError);
            const friendlyMessage = getFriendlyErrorMessage(enhancementError);
            updateNotification(`${taskId}-enhance`, { status: 'error', message: `Enhancement failed: ${friendlyMessage}. Using original image.` });
            // Fallback to the original image is the default behavior, so we just continue.
          }
        }

        addNotification({ id: taskId, status: 'processing', message: `Starting video generation... This may take a few minutes.` });
        const { uri, apiKey } = await animateImage(imageForAnimation, prompt, aspectRatio, settings);
        const response = await fetch(`${uri}&key=${apiKey}`);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to download video file (status: ${response.status}). Response: ${errorBody}`);
        }
        const videoBlob = await response.blob();

        if (!finalThumbnailDataUrl) {
          finalThumbnailDataUrl = await generateVideoThumbnail(videoBlob);
          videoSource = 'prompt';
        }

        const metadata = await getImageMetadata(finalThumbnailDataUrl);
        const videoUrl = URL.createObjectURL(videoBlob);
        const fileName = `ai-video-${Date.now()}.mp4`;
        const videoFile = new File([videoBlob], fileName, { type: 'video/mp4' });

        const finalVideoInfo: ImageInfo = {
          ...placeholderImage,
          isGenerating: false,
          isVideo: true,
          videoUrl: videoUrl,
          file: videoFile,
          fileName: fileName,
          dataUrl: finalThumbnailDataUrl,
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio,
          recreationPrompt: prompt,
          source: videoSource
        };

        setImages(prev => prev.map(img => img.id === taskId ? finalVideoInfo : img));
        saveImage(finalVideoInfo).catch(e => {
          console.error("Failed to save final video to DB", e);
          addNotification({ status: 'error', message: 'Failed to save completed video.' });
        });
        updateNotification(taskId, { status: 'success', message: `New video saved to your gallery!` });
        setGenerationTasks(prev => prev.filter(t => t.id !== taskId));

      } catch (error: any) {
        console.error("Background animation task failed:", error);
        const friendlyMessage = getFriendlyErrorMessage(error);

        setImages(prev => prev.filter(img => img.id !== taskId));

        if (!isRetry && friendlyMessage.toLowerCase().includes('api key')) {
          setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
          setVeoRetryState({ sourceImage, prompt, aspectRatio });
          addNotification({ status: 'error', message: `Animation failed: Please select a valid API key.` });
        } else {
          setGenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: friendlyMessage } : t));
          addNotification({ status: 'error', message: `Animation for "${newTask.sourceImageName}" failed. See Creations for details.` });
        }
      }
    })();
  }, [settings, currentUser, addNotification, updateNotification, addPromptToHistory, generationTasks]);

  const handleGenerationSubmit = useCallback(async (
    sourceImage: ImageInfo,
    prompt: string,
    taskType: 'image' | 'enhance',
    aspectRatio: AspectRatio,
    providerOverride?: AiProvider,
    generationSettings?: GenerationSettings | UpscaleSettings,
    autoSaveToGallery?: boolean
  ) => {
    if (!currentUser) {
      addNotification({ status: 'error', message: 'Please sign in to generate images.' });
      return;
    }
    if (!settings) {
      addNotification({ status: 'error', message: 'System settings are not loaded. Please refresh or check configuration.' });
      return;
    }
    addPromptToHistory(prompt);

    const taskId = self.crypto.randomUUID();
    const newTask: GenerationTask = {
      id: taskId,
      type: taskType,
      status: 'processing',
      sourceImageId: sourceImage.id,
      sourceImageName: sourceImage.fileName,
      prompt,
    };
    setGenerationTasks(prev => [...prev, newTask]);
    addNotification({ status: 'success', message: `Starting AI image ${taskType}...` });


    // Create ephemeral settings if a provider override is active or advanced settings used
    let runSettings = settings;

    // 1. Handle Routing Overrides
    if (providerOverride) {
      runSettings = {
        ...runSettings,
        routing: {
          ...runSettings.routing,
          [taskType === 'image' ? 'generation' : 'editing']: [providerOverride]
        }
      };
    }

    // 2. Handle Model/Param Overrides
    if (generationSettings && providerOverride) {
      // We only apply model overrides if a specific provider is also selected (or auto picked? currently only explicit supported)
      // Actually, if providerOverride is set, we apply model to THAT provider.
      // If Auto, we don't easily know which provider wins, so Advanced Settings usually implies an explicit provider.
      // For now, logic assumes providerOverride is set if generationSettings is provided (handled in Modal UI)

      // Deep clone to modify provider config safely
      runSettings = JSON.parse(JSON.stringify(runSettings));

      const providerConfig = runSettings.providers[providerOverride];
      if (providerConfig) {
        // Override Model
        if ('model' in generationSettings && generationSettings.model) {
          if (taskType === 'image') providerConfig.generationModel = generationSettings.model;
          // For 'enhance', it might be different, but typically it's model-less or uses 'model' arg
        }

        // Override Args (Steps, CFG)
        // Ensure args object exists
        if (!providerConfig.args) providerConfig.args = {};

        if ('steps' in generationSettings) providerConfig.args.steps = generationSettings.steps;
        if ('cfg_scale' in generationSettings) providerConfig.args.guidance_scale = generationSettings.cfg_scale;

        // For upscale, it's method/megapixels
        // Moondream Local provider might handle 'method' in its specific args if needed, 
        // but current logic mainly supports generation params.
      }
    }

    (async () => {
      try {
        let generatedResult: GenerationResult;
        if (taskType === 'image') {
          generatedResult = await generateImageFromPrompt(prompt, runSettings, aspectRatio, sourceImage);
          await handleSaveGeneratedImage(generatedResult.image, false, prompt);
        } else { // enhance
          generatedResult = await editImage(sourceImage, prompt, runSettings);
          await handleSaveEnhancedImage(generatedResult.image, false, prompt);
        }
        setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
      } catch (error: any) {
        console.error(`Background ${taskType} task failed:`, error);
        const friendlyMessage = getFriendlyErrorMessage(error);
        setGenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: friendlyMessage } : t));
        addNotification({ status: 'error', message: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} for "${sourceImage.fileName}" failed. See Creations for details.` });
      }
    })();

  }, [settings, currentUser, addNotification, addPromptToHistory, handleSaveGeneratedImage, handleSaveEnhancedImage]);

  const handleSelectAll = () => {
    const allIds = filteredImages.map(img => img.id);
    selectAll(allIds);
  };

  const handleVeoRetry = async () => {
    if (!veoRetryState) return;
    try {
      await (window as any).aistudio?.openSelectKey();
      const { sourceImage, prompt, aspectRatio } = veoRetryState;
      setVeoRetryState(null);
      handleStartAnimation(sourceImage, prompt, aspectRatio, true);
    } catch (e) {
      console.error("Veo key selection failed or was cancelled during retry.", e);
      setVeoRetryState(null);
    }
  };

  const handleGenerateFromPromptHistory = (prompt: string, taskType: 'image' | 'video') => {
    if (!currentUser) return;
    setPromptModalConfig({
      taskType,
      initialPrompt: prompt,
      aspectRatio: taskType === 'video' ? '16:9' : '1:1', // Sensible defaults
    });
  };



  const handleGridItemClick = (image: ImageInfo, event: React.MouseEvent) => {
    if (isSelectionMode || event.ctrlKey || event.metaKey) {
      if (!isSelectionMode && (event.ctrlKey || event.metaKey)) {
        toggleSelectionMode(true);
      }
      toggleSelection(image.id);
    } else {
      handleImageSelect(image);
    }
  };













  const handleToggleTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  const handleClearTags = useCallback(() => {
    setActiveTags(new Set());
  }, []);

  const allTags = useMemo<string[]>(() => {
    const relevantImages = images.filter(img =>
      (galleryView === 'public' && img.isPublic) ||
      (galleryView === 'my-gallery' && currentUser && img.ownerId === currentUser.id)
    );

    const tagCounts: Record<string, number> = {};
    relevantImages.forEach(image => {
      if (image.keywords) {
        image.keywords.forEach((kw) => {
          if (typeof kw === 'string') {
            const lowerKw = kw.toLowerCase();
            tagCounts[lowerKw] = (tagCounts[lowerKw] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([tag]) => tag);
  }, [images, galleryView, currentUser]);

  const filteredImages = useMemo(() => {
    let displayedImages: ImageInfo[];
    if (galleryView === 'public') {
      displayedImages = images.filter(img => img.isPublic);
    } else if (galleryView === 'my-gallery' && currentUser) {
      // Show images owned by user AND (uploaded OR explicitly saved to gallery)
      // savedToGallery === undefined is treated as TRUE for backwards compatibility (old uploads)
      displayedImages = images.filter(img =>
        img.ownerId === currentUser.id &&
        (img.source === 'upload' || !img.source || img.savedToGallery !== false)
      );
    } else if (galleryView === 'creations') {
      // Include completed creations (generated/enhanced images), filtered by user
      displayedImages = images.filter(img => img.source && img.source !== 'upload' && !img.isGenerating && (!currentUser || img.ownerId === currentUser.id));
    } else {
      displayedImages = [];
    }

    // Apply search query filter
    const lowercasedQuery = searchQuery.toLowerCase();
    const searchedImages = searchQuery
      ? displayedImages.filter(image =>
        // FIX: Explicitly type 'kw' as a string to resolve 'toLowerCase' does not exist on type 'unknown'.
        image.keywords?.some((kw: any) => typeof kw === 'string' && kw.toLowerCase().includes(lowercasedQuery))
      )
      : displayedImages;

    // Apply tag filter
    if (activeTags.size === 0) {
      return searchedImages;
    }
    return searchedImages.filter(image => {
      if (!image.keywords) return false;
      // FIX: Explicit typing for keywords filtering and mapping
      const validKeywords = image.keywords.filter((kw: any): kw is string => typeof kw === 'string');
      const imageKeywords = new Set(validKeywords.map((kw: string) => kw.toLowerCase()));
      return Array.from(activeTags).every((tag: string) => imageKeywords.has(tag.toLowerCase()));
    });
  }, [images, searchQuery, galleryView, currentUser, activeTags]);

  const completedCreations = useMemo(() => {
    return images.filter(img => img.source && img.source !== 'upload' && !img.isGenerating);
  }, [images]);

  const generatingSourceIds = useMemo(() => {
    return new Set(generationTasks.filter(t => t.status === 'processing').map(t => t.sourceImageId).filter(Boolean));
  }, [generationTasks]);



  // --- RESILIENCE LOGIC ---
  const checkBackendHealth = useCallback(async () => {
    if (!settings?.resilience?.pauseOnLocalFailure) return;

    try {
      // Check if backend is reachable (Moondream Local)
      // We assume Moondream Local is the "Critical" backend for now
      await testProviderConnection('moondream_local', settings);
      console.log("Backend recovered!");

      // Stop checking
      if (recoveryIntervalRef.current) {
        clearInterval(recoveryIntervalRef.current);
        recoveryIntervalRef.current = null;
      }

      // Resume
      isPausedRef.current = false;
      addNotification({ status: 'success', message: 'Backend Connection Restored. Resuming Queue.' });

      // Resume processing (avoid direct cycle by relying on next tick or effect, but direct call is safe here)
      // But we need to call processQueue. It's safe if we use the ref or just wait for trigger.
      // We will trigger prompt submission logic? No, processQueue.
      // Since checkBackendHealth depends on processQueue, and processQueue logic starts interval...
      // We handle cycle via Ref.
      // actually we can't call processQueue here if it's not defined yet? 
      // It IS defined in the scope (functions are hoisted, consts are not).
      // But processQueue is const. 
      // We will use a separate useEffect to bind the ref.
    } catch (e) {
      console.log("Backend still down...");
    }
  }, [settings, addNotification]);

  // Update logic to call processQueue when recovered
  useEffect(() => {
    checkBackendHealthRef.current = async () => {
      await checkBackendHealth();
      if (!recoveryIntervalRef.current && !isPausedRef.current) {
        processQueue();
      }
    };
  }, [checkBackendHealth, processQueue]);

  // -------------------------

  // --- Smart Crop Logic ---

  const performSmartCrop = async (image: ImageInfo, isBackground: boolean = false) => {
    if (!settings) return;

    // Register job manually for Queue Monitor
    const jobId = crypto.randomUUID();
    activeRequestsRef.current++;
    activeJobsRef.current.push({
      id: jobId,
      fileName: image.fileName,
      size: image.dataUrl.length,
      startTime: Date.now(),
      taskType: 'smart-crop'
    });
    syncQueueStatus();

    setProcessingSmartCropIds(prev => new Set(prev).add(image.id));

    try {
      if (!isBackground && !currentUser?.disableSmartCropNotifications) {
        addNotification({ status: 'info', message: 'Smart Cropping ' + image.fileName + '...' });
      }

      const crop = await detectSubject(image, settings);
      if (crop) {
        await updateImage(image.id, { smartCrop: crop });
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, smartCrop: crop } : img));
        if (!isBackground && !currentUser?.disableSmartCropNotifications) {
          addNotification({ status: 'success', message: 'Smart Crop complete.' });
        }
      }
    } catch (e) {
      console.error('Smart crop failed for ' + image.id, e);
      if (!isBackground && !currentUser?.disableSmartCropNotifications) {
        addNotification({ status: 'error', message: 'Failed to crop ' + image.fileName });
      }
    } finally {
      // Cleanup job
      activeRequestsRef.current--;
      activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== jobId);
      syncQueueStatus();
      setProcessingSmartCropIds(prev => {
        const next = new Set(prev);
        next.delete(image.id);
        return next;
      });
    }
  };

  const handleSmartCrop = async () => {
    const idsToProcess = Array.from(selectedIds);
    // Filter out already cropped images
    const pendingIds = idsToProcess.filter(id => {
      const img = images.find(i => i.id === id);
      return img && !img.smartCrop;
    });

    if (pendingIds.length === 0) {
      addNotification({ status: 'info', message: "All selected images already have Smart Crop." });
      toggleSelectionMode(false);
      setSelectedIds(new Set());
      return;
    }

    addNotification({ status: 'info', message: 'Smart Cropping ' + pendingIds.length + ' images...' });

    // Process sequentially to be nice to the local GPU
    for (const id of pendingIds) {
      const image = images.find(img => img.id === id);
      if (image) {
        await performSmartCrop(image, false);
      }
    }

    toggleSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Auto Smart Crop Effect for Slideshow with Lookahead
  useEffect(() => {
    if (!isSlideshowActive || !currentUser?.slideshowSmartCrop || !settings) return;

    // Find images that need smart cropping
    // Process up to 3 images ahead to ensure smooth transitions
    const LOOKAHEAD_COUNT = 3;
    const candidates = filteredImages
      .filter(img => !img.smartCrop && !img.isGenerating && !processingSmartCropIds.has(img.id))
      .slice(0, LOOKAHEAD_COUNT);

    if (candidates.length === 0) return;

    // Process candidates in order, respecting concurrency limits
    const timer = setTimeout(() => {
      candidates.forEach((candidate, index) => {
        // Stagger processing slightly to avoid overwhelming the queue
        setTimeout(() => {
          // Check concurrency - allow up to 2 concurrent smart crop operations
          if (activeRequestsRef.current < 2) {
            performSmartCrop(candidate, true);
          }
        }, index * 200); // 200ms stagger between each
      });
    }, 500); // Initial delay to let current image settle

    return () => clearTimeout(timer);
  }, [isSlideshowActive, currentUser?.slideshowSmartCrop, filteredImages, settings, queueStatus.activeCount, processingSmartCropIds]); // Re-run when queue changes to pick up next slot

  const showUploadArea = galleryView === 'my-gallery' && currentUser && filteredImages.length === 0 && !searchQuery;

  // Calculate if there are any failed analysis items for the current user
  const failedAnalysisCount = useMemo(() => {
    if (!currentUser) return 0;
    return images.filter(img => img.analysisFailed && img.ownerId === currentUser.id).length;
  }, [images, currentUser]);


  // --- Idle Slideshow Logic ---
  const handleCloseSlideshow = useCallback(() => {
    setIsSlideshowActive(false);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // If auto-start is disabled, or blocking conditions are met, do not schedule
    if (!isSlideshowEnabled || isSelectionMode || isSlideshowActive || selectedImage || (galleryView !== 'public' && galleryView !== 'my-gallery')) {
      return;
    }

    // Auto-start slideshow after 3 seconds of inactivity
    idleTimerRef.current = window.setTimeout(() => {
      if (filteredImages.length > 0) {
        setIsSlideshowActive(true);
      }
    }, 3000);
  }, [isSelectionMode, isSlideshowActive, isSlideshowEnabled, selectedImage, galleryView, filteredImages.length]);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();
  }, [galleryView, selectedImage, isSlideshowActive, isSlideshowEnabled]);

  useEffect(() => {
    // Automatically exit selection mode if the user logs out.
    if (isSelectionMode && !currentUser) {
      toggleSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [currentUser, isSelectionMode]);

  useEffect(() => {
    // Clear filters when the main view changes to provide a clean slate.
    setActiveTags(new Set());
    setSearchQuery('');
  }, [galleryView]);

  // Handle drag-to-desktop download
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Check if drag ended outside the browser window (to desktop/file system)
    // When dropEffect is 'none', it usually means dropped outside browser
    if (e.dataTransfer.dropEffect === 'none' && selectedIds.size > 0) {
      // Trigger bulk download
      setTriggerBulkDownload(true);
      // Reset after a short delay
      setTimeout(() => setTriggerBulkDownload(false), 100);
    }
  }, [selectedIds]);


  // --- Queue Control Handlers ---
  const handlePauseQueue = useCallback((paused: boolean) => {
    isPausedRef.current = paused;
    if (!paused) {
      addNotification({ status: 'info', message: 'Queue Resumed' });
      // Check if queue has items and process
      if (queueRef.current.length > 0) {
        processQueue();
      }
    } else {
      addNotification({ status: 'warning', message: 'Queue Paused' });
    }
    syncQueueStatus();
  }, [addNotification, syncQueueStatus, processQueue]);

  const handleClearQueue = useCallback(() => {
    const count = queueRef.current.length;
    queueRef.current = [];
    // Clear ID trackers
    const removedGenIds = Array.from(queuedGenerationIds.current);
    const removedAnalysisIds = Array.from(queuedAnalysisIds.current);

    queuedGenerationIds.current.clear();
    queuedAnalysisIds.current.clear();

    // We should probably NOT clear activeJobsRef, they are running.
    // queueRef is strictly pending.

    // Update AnalysisProgress if we just cleared the pending batch?
    // No, AnalysisProgress tracks current batch total. 
    // If we clear queue, we might want to reset the "Total" count if valid?
    // But typically we just let it finish current and stop.

    addNotification({ status: 'success', message: `Cleared ${count} items from queue` });
    syncQueueStatus();
  }, [addNotification, syncQueueStatus]);

  const handleRemoveFromQueue = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    const originalCount = queueRef.current.length;

    // Filter the queue
    queueRef.current = queueRef.current.filter(item => !idSet.has(item.id));

    // Update trackers
    ids.forEach(id => {
      queuedGenerationIds.current.delete(id);
      queuedAnalysisIds.current.delete(id);
    });

    const removedCount = originalCount - queueRef.current.length;
    if (removedCount > 0) {
      addNotification({ status: 'success', message: `Removed ${removedCount} items` });
      syncQueueStatus();
    }
  }, [addNotification, syncQueueStatus]);


  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    setSelectedIds(newSelectedIds);
  };

  const {
    isBatchRemixModalOpen,
    setIsBatchRemixModalOpen,
    handleBatchRegenerate,
    handleBatchRemixClick,
    handleConfirmBatchRemix,
    handleBatchEnhance,
    handleBatchAnimate
  } = useBatchOperations({
    images,
    setImages,
    selectedIds,
    setSelectedIds,
    toggleSelectionMode,
    addNotification,
    handleRegenerateCaption, // defined at ~1220 calling processQueue
    settings,
    currentUser,
    setGenerationTasks,
    setStatsHistory,
    handleSaveGeneratedImage, // defined at ~1199
    handleGenerationSubmit,
    handleStartAnimation
  });

  const handleOpenEnhanceStudio = useCallback(() => {
    if (selectedIds.size === 0) return;

    // Batch Logic
    const selectedImagesList = images.filter(img => selectedIds.has(img.id));
    if (selectedImagesList.length === 0) return;

    // First image is still the "primary" context for initial load
    const firstImage = selectedImagesList[0];

    setPromptModalConfig({
      taskType: 'enhance',
      image: firstImage,
      batchImages: selectedImagesList,
      initialPrompt: firstImage.recreationPrompt || "Enhance this image"
    });
  }, [selectedIds, images]);

  const handleOpenGenerationStudio = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedImagesList = images.filter(img => selectedIds.has(img.id));
    if (selectedImagesList.length === 0) return;

    const firstImage = selectedImagesList[0];

    setPromptModalConfig({
      taskType: 'image',
      image: firstImage,
      initialPrompt: firstImage.recreationPrompt || '',
      aspectRatio: firstImage.aspectRatio ? getClosestSupportedAspectRatio(firstImage.aspectRatio) as AspectRatio : '1:1'
    });
  }, [selectedIds, images]);

  const handleOpenTxt2Img = useCallback(() => {
    setPromptModalConfig({
      taskType: 'image',
      initialPrompt: '',
      aspectRatio: '1:1'
    });
  }, []);

  return (
    <MainLayout
      onSetView={setGalleryView}
      onShowLogs={() => setShowSystemLogs(true)}
      isSlideshowEnabled={isSlideshowEnabled}
      onToggleSlideshow={setIsSlideshowEnabled}
      setIsSlideshowActive={setIsSlideshowActive}
      currentView={galleryView}
      currentUser={currentUser}
      onLogout={handleLogout}
      onLogin={() => setIsLoginModalOpen(true)}
      settings={settings}
      onToggleNsfwBlur={handleToggleNsfwBlur}
    >
      {/* <NavigationBenchmark /> */}

      {isDbLoading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-gray-400">Loading your gallery...</p>
          </div>
        </div>
      ) : galleryView === 'admin-settings' ? (
        <AdminSettingsPage currentSettings={settings} onSave={handleSaveSettings} onCancel={() => setGalleryView('public')} />
      ) : !hasValidSettings(settings) ? (
        <NoSettingsPrompt onSettingsClick={() => setGalleryView('admin-settings')} />
      ) : (
        <div>
          <NavBar
            currentView={galleryView}
            onSetView={setGalleryView}
            currentUser={currentUser}
            generationTasks={generationTasks}
            queueStatus={queueStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onShowDuplicates={() => setShowDuplicates(true)}
            onShowCreations={() => setGalleryView('creations')}
            hasImages={filteredImages.length > 0}
            isSelectionMode={isSelectionMode}
            onToggleSelectionMode={toggleSelectionMode}
            failedAnalysisCount={failedAnalysisCount}
            onRetryAnalysis={handleRetryAnalysis}
            onFilesSelected={handleFilesChange}
            onOpenGenerationStudio={handleOpenTxt2Img}
          />

          {(galleryView === 'public' || galleryView === 'my-gallery' || galleryView === 'creations') && (
            <TagFilterBar
              allTags={allTags}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
              onClear={handleClearTags}
            />
          )}

          {showPerformanceOverview ? (
            <PerformanceOverview
              settings={settings}
              onBack={() => setShowPerformanceOverview(false)}
            />
          ) : galleryView === 'status' ? (
            <StatusPage
              statsHistory={statsHistory}
              settings={settings}
              queueStatus={queueStatus}
              onPauseQueue={handlePauseQueue}
              onClearQueue={handleClearQueue}
              onRemoveFromQueue={handleRemoveFromQueue}
              onShowPerformance={() => setShowPerformanceOverview(true)}
              onShowDiagnostics={() => setShowHealthDashboard(true)}
            />
          ) : galleryView === 'profile-settings' && currentUser ? (
            <UserProfilePage
              user={currentUser}
              onUpdateUser={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
              }}
              galleryImages={images}
              settings={settings}
              addNotification={addNotification}
              onClose={() => setGalleryView('my-gallery')}
            />
          ) : galleryView === 'creations' && currentUser ? (
            <CreationsPage
              tasks={generationTasks}
              completedCreations={filteredImages} // Use filtered images for search/tags support
              onImageClick={handleGridItemClick}
              analyzingIds={analyzingIds}
              generatingIds={generatingSourceIds}
              disabled={isSearchingSimilar}
              onClearFailedTasks={handleClearFailedTasks}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
            />
          ) : galleryView === 'prompt-history' && currentUser ? (
            <PromptHistoryPage
              promptHistory={promptHistory}
              images={images}
              onGenerateFromPrompt={handleGenerateFromPromptHistory}
            />
          ) : showUploadArea ? (
            <UploadArea onFilesChange={handleFilesChange} />
          ) : filteredImages.length > 0 ? (
            <ImageGrid
              images={filteredImages}
              onImageClick={handleGridItemClick}
              analyzingIds={analyzingIds}
              generatingIds={generatingSourceIds}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              blurNsfw={settings?.contentSafety?.blurNsfw}
              layout={currentUser?.galleryLayout || 'masonry'}
              onDragEnd={handleDragEnd}
            />
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>{galleryView === 'public' ? 'No featured images yet.' : galleryView === 'my-gallery' ? 'Your gallery is empty.' : 'No items found.'}</p>
              <p className="text-sm mt-1">{!currentUser ? 'Sign in to upload and manage your items.' : (activeTags.size > 0 || searchQuery) ? 'Try adjusting your filters.' : galleryView === 'my-gallery' ? 'Upload some images to get started.' : ''}</p>
            </div>
          )}
        </div>
      )}


      {
        selectedImage && (
          <ImageViewer
            initialImage={selectedImage}
            contextImages={filteredImages}
            isLoading={isLoading}
            error={error}
            onClose={handleCloseViewer}
            settings={settings}
            onKeywordClick={handleKeywordSelect}
            onSaveGeneratedImage={handleSaveGeneratedImage}
            onSaveEnhancedImage={handleSaveEnhancedImage}
            onRegenerateCaption={handleRegenerateCaption}
            onStartAnimation={handleStartAnimation}
            onTogglePublicStatus={handleToggleImagePublicStatus}
            currentUser={currentUser}
            promptHistory={promptHistory}
            setPromptModalConfig={setPromptModalConfig}
            addNotification={addNotification}
            onRetryAnalysis={(id) => runImageAnalysis([images.find(i => i.id === id)!], true)}
            onSmartCrop={(img) => performSmartCrop(img, false)}
            processingSmartCropIds={processingSmartCropIds}
          />
        )
      }

      <UploadProgressIndicator progress={uploadProgress} onCancel={handleCancelUpload} />
      <AnalysisProgressIndicator progress={analysisProgress} />
      <NotificationArea notifications={notifications} onDismiss={removeNotification} />

      {
        isSelectionMode && (
          <SelectionActionBar
            count={selectedIds.size}
            selectedImages={images.filter(img => selectedIds.has(img.id))}
            onClear={() => setSelectedIds(new Set())}
            onDelete={handleDeleteSelected}
            onMakePublic={handleBatchMakePublic}
            onMakePrivate={handleBatchMakePrivate}
            onRemix={handleOpenGenerationStudio}
            onEnhance={handleOpenEnhanceStudio}

            onRegenerate={handleBatchRegenerate}
            onSelectAll={handleSelectAll}
            onSmartCrop={handleSmartCrop}
            onAnimate={handleBatchAnimate}
            triggerDownload={triggerBulkDownload}
          />
        )
      }

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={'Are you sure you want to delete ' + selectedIds.size + ' item' + (selectedIds.size === 1 ? '' : 's') + '? This action cannot be undone.'}
        confirmText="Delete"
        confirmButtonVariant="danger"
      />

      <BatchRemixModal
        isOpen={isBatchRemixModalOpen}
        onClose={() => setIsBatchRemixModalOpen(false)}
        onConfirm={handleConfirmBatchRemix}
        count={selectedIds.size}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
      <VeoKeySelectionModal
        isOpen={!!veoRetryState}
        onClose={() => setVeoRetryState(null)}
        onSelectKey={handleVeoRetry}
        isRetry={true}
      />
      {
        promptModalConfig && (
          <PromptSubmissionModal
            isOpen={!!promptModalConfig}
            onClose={() => {
              setPromptModalConfig(null);
              setGenerationResults([]); // Clear results when modal closes
            }}
            config={promptModalConfig}
            promptHistory={promptHistory}
            negativePromptHistory={negativePromptHistory.map(n => n.content)} // Pass mapped strings
            settings={settings}
            onSaveGeneratedImage={(dataUrl, prompt, metadata) => {
              handleSaveGeneratedImage(dataUrl, prompt, metadata);
            }}
            onSaveNegativePrompt={addNegativePromptToHistory}
            onAddToGenerationQueue={handleAddToGenerationQueue}
            queuedGenerationCount={queuedGenerationIds.current.size}
            generationResults={generationResults}
            onDeleteNegativePrompt={deleteNegativePromptFromHistory}
            onSubmit={(prompt, options) => {
              if (!promptModalConfig) return;

              const { image } = promptModalConfig;
              const aspectRatio = options.aspectRatio || '1:1';
              const useSourceImage = options.useSourceImage;
              const providerId = options.providerId;

              if (promptModalConfig.taskType === 'image') {
                const dummyImage: ImageInfo = image || {
                  id: '', file: new File([], ''), fileName: 'prompt-history.png',
                  dataUrl: '', ownerId: currentUser!.id, isPublic: false
                };
                handleGenerationSubmit(dummyImage, prompt, 'image', aspectRatio, providerId, options.generationSettings, options.autoSaveToGallery);
              } else if (promptModalConfig.taskType === 'enhance' && image) {
                handleGenerationSubmit(image, prompt, 'enhance', aspectRatio, providerId, options.generationSettings, options.autoSaveToGallery);
              } else if (promptModalConfig.taskType === 'video') {
                const sourceImage = useSourceImage ? image : null;
                // TODO: Support Video Provider Override
                handleStartAnimation(sourceImage, prompt, aspectRatio);
              }

              setPromptModalConfig(null);
            }}
          />
        )
      }
      <IdleSlideshow
        images={filteredImages}
        isActive={isSlideshowActive}
        onClose={() => setIsSlideshowActive(false)}
        transition={currentUser?.slideshowTransition || 'fade'}
        useSmartCrop={!!currentUser?.slideshowSmartCrop}
        useAdaptivePan={!!currentUser?.slideshowAdaptivePan}
        interval={slideshowNeedsSlowdown ? Math.max((currentUser?.slideshowInterval || 5000) * 2, 8000) : currentUser?.slideshowInterval}
        animationDuration={currentUser?.slideshowAnimationDuration}
        enableBounce={!!currentUser?.slideshowBounce}
        randomOrder={currentUser?.slideshowRandomOrder}
        processingSmartCropIds={processingSmartCropIds}
        onRequestSlowdown={setSlideshowNeedsSlowdown}
      />
      <BottomNav
        currentView={galleryView}
        onViewChange={setGalleryView}
        onFilesSelected={handleFilesChange}
      />

      {showSystemLogs && <LogViewer onClose={() => setShowSystemLogs(false)} />}
      {
        showDuplicates && (
          <DuplicatesPage
            images={images.filter(img => img.ownerId === currentUser?.id)}
            onDeleteImages={(ids) => {
              deleteImages(ids);
              setShowDuplicates(false);
            }}
            onClose={() => setShowDuplicates(false)}
          />
        )
      }
      {showHealthDashboard && (
        <DiagnosticsPage
          onClose={() => setShowHealthDashboard(false)}
        />
      )}
    </MainLayout>
  );
};

export default App;
