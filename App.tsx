import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// FIX: Added AppSettings to import for settings migration.
import { ImageInfo, AdminSettings, User, GenerationTask, Notification, AspectRatio, GalleryView, AiProvider, UploadProgress, AppSettings, AnalysisProgress, QueueStatus, ActiveJob, GenerationResult, GenerationSettings, UpscaleSettings } from './types';
import { analyzeImage, animateImage, editImage, generateImageFromPrompt, adaptPromptToTheme, FallbackChainError, detectSubject } from './services/aiService';
import { fileToDataUrl, getImageMetadata, dataUrlToBlob, generateVideoThumbnail, createGenericPlaceholder, extractAIGenerationMetadata, resizeImage, getClosestSupportedAspectRatio } from './utils/fileUtils';
import { RateLimitedApiQueue } from './utils/rateLimiter';
import { initDB, getImages, saveImage, deleteImages, updateImage } from './utils/idb';
import ImageGrid from './components/ImageGrid';
import ImageViewer from './components/ImageViewer';
import UploadArea from './components/UploadArea';
import AdminSettingsPage from './components/AdminSettingsPage';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import BottomNav from './components/BottomNav';
import NotificationArea from './components/NotificationArea';
import VeoKeySelectionModal from './components/VeoKeySelectionModal';
import CreationsPage from './components/CreationsPage';
import IdleSlideshow from './components/IdleSlideshow';
import { SearchIcon, SettingsIcon, CloseIcon, WarningIcon, PlayIcon, StopIcon } from './components/icons';
import PromptHistoryPage from './components/PromptHistoryPage';
import SelectionActionBar from './components/SelectionActionBar';
import { Activity } from 'lucide-react';
import ConfirmationModal from './components/ConfirmationModal';
import PromptSubmissionModal, { PromptModalConfig } from './components/PromptSubmissionModal';
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

const SETTINGS_STORAGE_KEY = 'ai_gallery_settings_v2'; // Updated key for new structure
const OLD_SETTINGS_STORAGE_KEY = 'ai_gallery_settings'; // Old key for migration
const USER_STORAGE_KEY = 'ai_gallery_user';
const PROMPTS_STORAGE_KEY = 'ai_gallery_prompts';
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

const getFriendlyErrorMessage = (error: any): string => {
  const message = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : 'An unknown error occurred.';
  const lowerCaseMessage = message.toLowerCase();

  if (lowerCaseMessage.includes('api key') || lowerCaseMessage.includes('401') || lowerCaseMessage.includes('403') || lowerCaseMessage.includes('requested entity was not found')) {
    return 'API Key Invalid or Missing. Please check your settings and ensure the key is correct and has the necessary permissions.';
  }
  if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('rate limit') || lowerCaseMessage.includes('resource_exhausted') || lowerCaseMessage.includes('429')) {
    return 'Rate Limit or Quota Exceeded. The AI provider\'s limit has been reached. Please wait or check your plan details.';
  }
  if (lowerCaseMessage.includes('safety')) {
    const reason = message.split(/safety|:|due to/i).pop()?.trim().replace(/\.$/, '') || 'Unknown';
    return `Content Policy Violation. The request was blocked for safety reasons (${reason}).`;
  }
  return message; // Return original message if no specific pattern is matched
};


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
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [statsHistory, setStatsHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('moondream_stats');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('moondream_stats', JSON.stringify(statsHistory));
  }, [statsHistory]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchRemixModalOpen, setIsBatchRemixModalOpen] = useState(false);
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

  // Adaptive Concurrency State
  const queueRef = useRef<ImageInfo[]>([]);
  const activeRequestsRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const activeJobsRef = useRef<ActiveJob[]>([]); // Track active job details
  // Adaptive Concurrency State
  const [concurrencyLimit, setConcurrencyLimit] = useState(1);
  const consecutiveSuccesses = useRef(0);
  const MAX_CONCURRENCY = 5;

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
      queuedJobs: queueRef.current.map(img => ({
        id: img.id,
        fileName: img.fileName,
        size: img.dataUrl.length,
        startTime: Date.now(), // Placeholder, strictly it's not started
        taskType: 'analysis'
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
      const imageToAnalyze = queueRef.current.shift();
      if (!imageToAnalyze) {
        syncQueueStatus();
        break;
      }

      // Double-check if we should still proceed
      if (!queuedAnalysisIds.current.has(imageToAnalyze.id)) {
        syncQueueStatus();
        continue;
      }

      activeRequestsRef.current++;

      // Add to active jobs list
      const job: ActiveJob = {
        id: imageToAnalyze.id,
        fileName: imageToAnalyze.fileName,
        size: imageToAnalyze.dataUrl.length, // Approximate size in chars
        startTime: Date.now(),
        taskType: 'analysis'
      };
      activeJobsRef.current.push(job);
      syncQueueStatus();

      // Start analysis task
      (async () => {
        setAnalysisProgress(prev => ({
          ...prev!,
          fileName: imageToAnalyze.fileName,
        }));

        // Note: Notification is handled per image start
        addNotification({ id: imageToAnalyze.id, status: 'processing', message: `Analyzing ${imageToAnalyze.fileName}...` });

        try {
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
            const newStat = {
              timestamp: Date.now(),
              tokensPerSec: analysisMetadata.stats.tokensPerSec,
              device: analysisMetadata.stats.device
            };
            setStatsHistory(prev => [...prev, newStat]);
          }

          const updatedImage = { ...imageToAnalyze, ...analysisMetadata, analysisFailed: false };
          setImages(prev => prev.map(img => img.id === imageToAnalyze.id ? updatedImage : img));

          // Update selectedImage if it matches
          setSelectedImage(prev => (prev && prev.id === imageToAnalyze.id ? updatedImage : prev));

          // Update similarImages if it contains the image
          setSimilarImages(prev => prev.map(img => img.id === imageToAnalyze.id ? updatedImage : img));

          saveImage(updatedImage);
          updateNotification(imageToAnalyze.id, { status: 'success', message: `Successfully analyzed ${imageToAnalyze.fileName}.` });

          // Adaptive Concurrency: Increase on stable success
          consecutiveSuccesses.current++;
          if (consecutiveSuccesses.current >= 3 && concurrencyLimit < MAX_CONCURRENCY) {
            setConcurrencyLimit(prev => {
              const newLimit = prev + 1;
              console.log(`Increasing concurrency limit to ${newLimit}`);
              return newLimit;
            });
            consecutiveSuccesses.current = 0;
          }
        } catch (err: any) {
          const errorMessage = err.message || '';

          // Check for "Queue is full" or similar backpressure errors
          if (errorMessage.includes("Queue is full") || errorMessage.includes("rejected")) {
            console.warn(`Backpressure detected for ${imageToAnalyze.fileName}. Pausing queue.`);
            updateNotification(imageToAnalyze.id, { status: 'warning', message: `Server busy. Re-queueing ${imageToAnalyze.fileName}...` });

            // Pause and Re-queue
            isPausedRef.current = true;
            queueRef.current.unshift(imageToAnalyze); // Put back at front
            activeRequestsRef.current--;

            // Adaptive Concurrency: Back off on pressure
            setConcurrencyLimit(prev => {
              const newLimit = Math.max(1, Math.floor(prev / 2));
              console.log(`Backpressure detected. Reducing concurrency limit to ${newLimit}`);
              return newLimit;
            });
            consecutiveSuccesses.current = 0;

            // Remove from active jobs
            activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== imageToAnalyze.id);
            syncQueueStatus();

            return; // Exit task, do not cleanup progress yet as we are re-trying
          }

          const friendlyMessage = getFriendlyErrorMessage(err);
          updateNotification(imageToAnalyze.id, { status: 'error', message: `Analysis of ${imageToAnalyze.fileName} failed: ${friendlyMessage}` });
          const updatedImage = { ...imageToAnalyze, analysisFailed: true };
          setImages(prev => prev.map(img => img.id === imageToAnalyze.id ? updatedImage : img));
        } finally {
          activeRequestsRef.current--;

          // Remove from active jobs
          activeJobsRef.current = activeJobsRef.current.filter(j => j.id !== imageToAnalyze.id);

          // Update progress after each image (success or fail)
          setAnalysisProgress(prev => {
            if (!prev) return null;
            const newCurrent = prev.current + 1;
            // If we are done with this batch (current == total), clear progress
            if (newCurrent >= prev.total) {
              setTimeout(() => setAnalysisProgress(null), 1000);
            }
            return {
              ...prev,
              current: newCurrent,
            };
          });

          // Remove from analyzing set
          setAnalyzingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageToAnalyze.id);
            return newSet;
          });
          queuedAnalysisIds.current.delete(imageToAnalyze.id);

          syncQueueStatus();

          // Trigger next item
          processQueue();
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

      return {
        current: isFreshBatch ? 0 : prev.current,
        total: (isFreshBatch ? 0 : prev.total) + uniqueImagesToAnalyze.length,
        fileName: isFreshBatch ? uniqueImagesToAnalyze[0].fileName : prev.fileName,
      };
    });

    // Add to queue and start processing
    queueRef.current.push(...uniqueImagesToAnalyze);
    processQueue();
  }, [settings, processQueue]);


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

    // Load prompt history
    const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
    if (storedPrompts) {
      try {
        const parsedPrompts = JSON.parse(storedPrompts);
        if (Array.isArray(parsedPrompts)) {
          // FIX: Ensure that only strings are set in the prompt history, avoiding potential type issues with JSON.parse.
          setPromptHistory(parsedPrompts.filter((p): p is string => typeof p === 'string'));
        }
      } catch (e) {
        console.error("Failed to parse prompts from localStorage", e);
      }
    }

    const loadDbData = async () => {
      try {
        await initDB();
        const loadedImages = await getImages();
        setImages(loadedImages);
      } catch (e) {
        console.error("Failed to load images from IndexedDB", e);
        addNotification({ status: 'error', message: 'Could not load your saved gallery.' });
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

  const saveImageToGallery = useCallback(async (dataUrl: string, isPublic: boolean, prompt?: string, source?: ImageInfo['source'], savedToGallery?: boolean) => {
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

  const handleSaveGeneratedImage = useCallback(async (base64Image: string, isPublic: boolean, prompt: string) => {
    addPromptToHistory(prompt);
    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    saveImageToGallery(dataUrl, isPublic, prompt, 'generated', currentUser?.autoSaveToGallery);
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
      return {
        current: isFreshBatch ? 0 : prev.current,
        total: (isFreshBatch ? 0 : prev.total) + 1,
        fileName: isFreshBatch ? imageToRegenerate.fileName : prev.fileName,
      };
    });

    // Add to queue
    queueRef.current.push(imageToRegenerate);
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
    generationSettings?: GenerationSettings | UpscaleSettings
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
    const allIds = new Set(filteredImages.map(img => img.id));
    setSelectedIds(allIds);
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

  const handleToggleImagePublicStatus = (imageId: string) => {
    // Find the image from the master list to determine its new status
    const originalImage = images.find(img => img.id === imageId);
    if (!originalImage) {
      console.warn(`Could not find image with id ${imageId} to toggle public status.`);
      return;
    };

    const updatedImage = { ...originalImage, isPublic: !originalImage.isPublic };

    // Save the change to the database
    saveImage(updatedImage).catch(e => console.error(`Failed to update public status for ${imageId} in DB`, e));

    // Update all relevant state variables to ensure the UI updates instantly
    setImages(prev => prev.map(img => (img.id === imageId ? updatedImage : img)));
    setSelectedImage(prev => (prev && prev.id === imageId ? updatedImage : prev));
    setSimilarImages(prev => prev.map(img => (img.id === imageId ? updatedImage : img)));
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // Explicitly disable slideshow when entering selection mode to prevent overlay issues
        setIsSlideshowActive(false);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
      }
      return newMode;
    });
    setSelectedIds(new Set()); // Always clear selection when toggling mode
  };

  const handleToggleSelection = (imageId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const ownedIds = Array.from(selectedIds).filter(id => {
      const img = images.find(i => i.id === id);
      return img && img.ownerId === currentUser?.id;
    });

    if (ownedIds.length === 0) {
      addNotification({ status: 'error', message: "You can only delete images you own." });
      return;
    }

    if (ownedIds.length < selectedIds.size) {
      // We are only deleting a subset
      setSelectedIds(new Set(ownedIds));
    }

    setIsDeleteModalOpen(true);
  };

  const handleBatchMakePublic = () => {
    const ids = Array.from(selectedIds);
    const ownedIds = ids.filter(id => {
      const img = images.find(i => i.id === id);
      return img && img.ownerId === currentUser?.id;
    });

    if (ownedIds.length === 0) {
      addNotification({ status: 'error', message: "You can only change visibility of images you own." });
      return;
    }

    const updatedImages = images.map(img => {
      if (ownedIds.includes(img.id)) {
        return { ...img, isPublic: true };
      }
      return img;
    });

    setImages(updatedImages);
    // Batch save logic ideal, but iterative for now
    ownedIds.forEach(id => {
      const img = updatedImages.find(i => i.id === id);
      if (img) saveImage(img);
    });

    addNotification({ status: 'success', message: `${ownedIds.length} images made public.` });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchMakePrivate = () => {
    const ids = Array.from(selectedIds);
    const ownedIds = ids.filter(id => {
      const img = images.find(i => i.id === id);
      return img && img.ownerId === currentUser?.id;
    });

    if (ownedIds.length === 0) {
      addNotification({ status: 'error', message: "You can only change visibility of images you own." });
      return;
    }

    const updatedImages = images.map(img => {
      if (ownedIds.includes(img.id)) {
        return { ...img, isPublic: false };
      }
      return img;
    });

    setImages(updatedImages);
    ownedIds.forEach(id => {
      const img = updatedImages.find(i => i.id === id);
      if (img) saveImage(img);
    });

    addNotification({ status: 'success', message: `${ownedIds.length} images made private.` });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchRegenerate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    addNotification({ status: 'success', message: `Starting caption regeneration for ${ids.length} images...` });
    setIsSelectionMode(false);
    setSelectedIds(new Set());

    ids.forEach(id => {
      handleRegenerateCaption(id);
    });
  };

  const handleBatchRemixClick = () => {
    if (selectedIds.size === 0) return;
    setIsBatchRemixModalOpen(true);
  };
  // ...


  const handleConfirmBatchRemix = (theme: string) => {
    if (!settings || !currentUser) return;
    setIsBatchRemixModalOpen(false);

    const ids = Array.from(selectedIds);
    const imagesToRemix = images.filter(img => ids.includes(img.id));

    if (imagesToRemix.length === 0) return;

    addNotification({ status: 'success', message: `Starting remix for ${imagesToRemix.length} images...` });
    setIsSelectionMode(false);
    setSelectedIds(new Set());

    // Iterate and launch tasks
    imagesToRemix.forEach(sourceImage => {
      const taskId = self.crypto.randomUUID();
      const newTask: GenerationTask = {
        id: taskId,
        type: 'image',
        status: 'processing',
        sourceImageId: sourceImage.id,
        sourceImageName: sourceImage.fileName,
        prompt: `Remix: ${theme}`,
      };
      setGenerationTasks(prev => [...prev, newTask]);

      (async () => {
        try {
          let prompt = sourceImage.recreationPrompt;

          if (!prompt) {
            addNotification({ id: `${taskId}-analyze`, status: 'processing', message: `Analyzing ${sourceImage.fileName} for remix...` });
            const analysis = await analyzeImage(sourceImage, settings);

            if (analysis.stats) {
              const newStat = {
                timestamp: Date.now(),
                tokensPerSec: analysis.stats.tokensPerSec,
                device: analysis.stats.device
              };
              setStatsHistory(prev => [...prev, newStat]);
            }

            prompt = analysis.recreationPrompt;

            // Save analysis result
            const updatedImage = { ...sourceImage, ...analysis, analysisFailed: false };
            setImages(prev => prev.map(img => img.id === sourceImage.id ? updatedImage : img));
            saveImage(updatedImage);
          }

          // Step 1: Adapt prompt
          const adaptedPrompt = await adaptPromptToTheme(prompt!, theme, settings);

          // Step 2: Generate Image
          const aspectRatio = sourceImage.aspectRatio ? getClosestSupportedAspectRatio(sourceImage.aspectRatio) : '1:1';
          const generatedBase64 = await generateImageFromPrompt(adaptedPrompt, settings, aspectRatio);

          // Step 3: Save
          await handleSaveGeneratedImage(generatedBase64, false, adaptedPrompt);

          setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error: any) {
          console.error(`Remix task failed for ${sourceImage.fileName}:`, error);
          const friendlyMessage = getFriendlyErrorMessage(error);
          setGenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: friendlyMessage } : t));
          addNotification({ status: 'error', message: `Remix for "${sourceImage.fileName}" failed.` });
        }
      })();
    });
  };

  const handleConfirmDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    setImages(prev => {
      const imagesToDeleteSet = new Set(idsToDelete);
      // Revoke any existing blob URLs to prevent memory leaks
      prev.forEach(img => {
        if (imagesToDeleteSet.has(img.id) && img.videoUrl) {
          URL.revokeObjectURL(img.videoUrl);
        }
      });
      return prev.filter(img => !imagesToDeleteSet.has(img.id));
    });

    deleteImages(idsToDelete as string[]).catch(e => {
      console.error("Failed to delete images from DB", e);
      addNotification({ status: 'error', message: 'Failed to delete some items.' });
    });


    setIsDeleteModalOpen(false);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleGridItemClick = (image: ImageInfo, event: React.MouseEvent) => {
    if (isSelectionMode || event.ctrlKey || event.metaKey) {
      if (!isSelectionMode && (event.ctrlKey || event.metaKey)) {
        setIsSelectionMode(true);
      }
      handleToggleSelection(image.id);
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
      setIsSelectionMode(false);
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

    setIsSelectionMode(false);
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
      setIsSelectionMode(false);
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


  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    setSelectedIds(newSelectedIds);
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden overflow-y-auto scrollbar-none">
      {/* Global Background Banner */}
      {currentUser?.bannerUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-40 transition-all duration-700 ease-in-out"
            style={{
              backgroundImage: 'url(' + currentUser.bannerUrl + ')',
              backgroundPosition: (currentUser.bannerPosition?.x || 50) + '% ' + (currentUser.bannerPosition?.y || 50) + '%',
              backgroundSize: 'cover',
              transform: 'scale(' + (currentUser.bannerPosition?.scale || 1) + ')',
              transformOrigin: (currentUser.bannerPosition?.x || 50) + '% ' + (currentUser.bannerPosition?.y || 50) + '%',
            }}
          />
          {/* Gradient overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60" />
        </div>
      )}
      {/* <NavigationBenchmark /> */}

      {/* Main Content Wrapper - Ensure z-index is above banner */}
      <div className="relative z-10 min-h-screen flex flex-col pb-20 md:pb-0">
        <header className="hidden md:flex p-4 sm:p-6 border-b border-gray-700/50 justify-between items-center bg-gray-900/40 backdrop-blur-md sticky top-0 z-50">
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
              Gemini Vision Gallery
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setGalleryView('admin-settings')}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowSystemLogs(true)}
              className="p-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
              title="System Logs"
              aria-label="System Logs"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            {/* Slideshow Toggle Slider */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                // Toggle the ENABLED state
                const newState = !isSlideshowEnabled;
                setIsSlideshowEnabled(newState);

                // If turning off, immediately stop any running slideshow
                if (!newState) {
                  setIsSlideshowActive(false);
                }
              }}
              className="flex items-center gap-2 cursor-pointer group"
              title={isSlideshowEnabled ? "Slideshow Auto-Start On" : "Slideshow Auto-Start Off"}
            >
              <div className="relative">
                <div className={`w-11 h-6 rounded-full transition-colors ${isSlideshowEnabled ? 'bg-indigo-600' : 'bg-gray-700'} relative`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${isSlideshowEnabled ? 'translate-x-full' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors hidden sm:inline">{isSlideshowEnabled ? 'Auto' : 'Off'}</span>
            </div>
            <button
              onClick={() => setGalleryView('status')}
              className={'p-2 rounded-full transition-colors ' + (galleryView === 'status' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700')}
              title="System Status"
            >
              <Activity className="w-6 h-6" />
            </button>
            {currentUser ? (
              <UserMenu
                user={currentUser}
                onLogout={handleLogout}
                onSetView={setGalleryView}
                nsfwBlurEnabled={settings?.contentSafety?.blurNsfw ?? false}
                onToggleNsfwBlur={handleToggleNsfwBlur}
              />
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
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
              <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl -mx-4 px-4 py-3 mb-6 border-b border-gray-800 shadow-lg md:shadow-none md:static md:bg-transparent md:mx-0 md:px-0 md:py-0 md:border-none flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-300">
                <div className="flex items-center bg-gray-800 p-1 rounded-lg">
                  <button onClick={() => setGalleryView('public')} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (galleryView === 'public' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700')}>
                    Public Gallery
                  </button>
                  <button onClick={() => setGalleryView('my-gallery')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (galleryView === 'my-gallery' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    My Gallery
                  </button>
                  <button onClick={() => setGalleryView('creations')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (galleryView === 'creations' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    Creations Gallery
                  </button>
                  <button onClick={() => setGalleryView('prompt-history')} disabled={!currentUser} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (galleryView === 'prompt-history' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700') + ' disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent'}>
                    Prompt History
                  </button>
                  <button onClick={() => setGalleryView('status')} className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (galleryView === 'status' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700')}>
                    Status
                  </button>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <GenerationStatusIndicator
                    tasks={generationTasks}
                    onStatusClick={() => setGalleryView('creations')}
                  />
                  {currentUser && filteredImages.length > 0 && (
                    <button
                      onClick={toggleSelectionMode}
                      className={'text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-300 whitespace-nowrap ' + (isSelectionMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200')}
                    >
                      {isSelectionMode ? 'Cancel Selection' : 'Select Items'}
                    </button>
                  )}
                  {galleryView === 'my-gallery' && failedAnalysisCount > 0 && (
                    <button
                      onClick={() => handleRetryAnalysis()}
                      className="bg-yellow-600/80 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm whitespace-nowrap flex items-center gap-2"
                      title="Retry analysis for all failed items"
                    >
                      <WarningIcon className="w-4 h-4" />
                      Retry Failed ({failedAnalysisCount})
                    </button>
                  )}
                  {currentUser && galleryView === 'my-gallery' && !isSelectionMode && (
                    <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 text-sm whitespace-nowrap">
                      Add Images
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleFilesChange} />
                    </label>
                  )}
                  <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by keyword..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Clear search"
                      >
                        <CloseIcon className="h-5 w-5" />
                      </button>
                    )}
                    {currentUser && galleryView === 'my-gallery' && (
                      <button
                        onClick={() => setShowDuplicates(true)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Find Duplicates"
                        aria-label="Find duplicate images"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(galleryView === 'public' || galleryView === 'my-gallery' || galleryView === 'creations') && (
                <TagFilterBar
                  allTags={allTags}
                  activeTags={activeTags}
                  onToggleTag={handleToggleTag}
                  onClear={handleClearTags}
                />
              )}

              {galleryView === 'status' ? (
                <StatusPage statsHistory={statsHistory} settings={settings} queueStatus={queueStatus} />
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
        </main>

        {selectedImage && (
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
        )}

        <UploadProgressIndicator progress={uploadProgress} onCancel={handleCancelUpload} />
        <AnalysisProgressIndicator progress={analysisProgress} />
        <NotificationArea notifications={notifications} onDismiss={removeNotification} />

        {isSelectionMode && (
          <SelectionActionBar
            count={selectedIds.size}
            selectedImages={images.filter(img => selectedIds.has(img.id))}
            onClear={() => setSelectedIds(new Set())}
            onDelete={handleDeleteSelected}
            onMakePublic={handleBatchMakePublic}
            onMakePrivate={handleBatchMakePrivate}
            onRemix={handleBatchRemixClick}
            onRegenerate={handleBatchRegenerate}
            onSelectAll={handleSelectAll}
            onSmartCrop={handleSmartCrop}
            triggerDownload={triggerBulkDownload}
          />
        )}

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
        {promptModalConfig && (
          <PromptSubmissionModal
            isOpen={!!promptModalConfig}
            onClose={() => setPromptModalConfig(null)}
            config={promptModalConfig}
            promptHistory={promptHistory}
            settings={settings}
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
                handleGenerationSubmit(dummyImage, prompt, 'image', aspectRatio, providerId, options.generationSettings);
              } else if (promptModalConfig.taskType === 'enhance' && image) {
                handleGenerationSubmit(image, prompt, 'enhance', aspectRatio, providerId, options.generationSettings);
              } else if (promptModalConfig.taskType === 'video') {
                const sourceImage = useSourceImage ? image : null;
                // TODO: Support Video Provider Override
                handleStartAnimation(sourceImage, prompt, aspectRatio);
              }

              setPromptModalConfig(null);
            }}
          />
        )}
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
        {showDuplicates && (
          <DuplicatesPage
            images={images.filter(img => img.ownerId === currentUser?.id)}
            onDeleteImages={(ids) => {
              deleteImages(ids);
              setShowDuplicates(false);
            }}
            onClose={() => setShowDuplicates(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
