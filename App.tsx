import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NavBar } from './components/layout/NavBar';
import { ImageInfo, GenerationTask, Notification, AspectRatio, GalleryView, UploadProgress, GenerationResult, GenerationSettings, UpscaleSettings, AdminSettings } from './types';
import type { QueueItem } from './types/queue';
import { animateImage, editImage, generateImageFromPrompt } from './services/aiService';
import { getFriendlyErrorMessage } from './utils/errorUtils';
import { fileToDataUrl, getImageMetadata, dataUrlToBlob, generateVideoThumbnail, createGenericPlaceholder, extractAIGenerationMetadata, getClosestSupportedAspectRatio } from './utils/fileUtils';
import { saveImage, deleteImages, NegativePrompt } from './utils/idb';
import ImageGrid from './components/ImageGrid';
import ImageViewer from './components/ImageViewer';
import UploadArea from './components/UploadArea';
import { AdminSettingsPage } from './components/AdminSettingsPage';
import LoginModal from './components/LoginModal';
import BottomNav from './components/BottomNav';
import NotificationArea from './components/NotificationArea';
import VeoKeySelectionModal from './components/VeoKeySelectionModal';
import CreationsPage from './components/CreationsPage';
import IdleSlideshow from './components/IdleSlideshow';
import PromptHistoryPage from './components/PromptHistoryPage';
import SelectionActionBar from './components/SelectionActionBar';
import ConfirmationModal from './components/ConfirmationModal';
import PromptSubmissionModal from './components/PromptSubmissionModal';
import { PromptModalConfig } from './components/PromptModal/types';
import BatchRemixModal from './components/BatchRemixModal';
import Spinner from './components/Spinner';
import StatusPage from './components/StatusPage';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import AnalysisProgressIndicator from './components/AnalysisProgressIndicator';
import UserProfilePage from './components/UserProfilePage';
import LogViewer from './components/LogViewer';
import DuplicatesPage from './components/DuplicatesPage';
import PerformanceOverview from './components/PerformanceOverview';
import DiagnosticsPage from './components/Diagnostics';

// Hook Imports
import { useSelection } from './hooks/useSelection';
import { useImageActions } from './hooks/useImageActions';
import { useBatchOperations } from './hooks/useBatchOperations';
import { useLogWatcher } from './hooks/useLogWatcher';
import { useQueueSystem } from './hooks/useQueueSystem';
import { useSmartCrop } from './hooks/useSmartCrop';
import { useAppInitialization } from './hooks/useAppInitialization';

// Component Imports
import { TagFilterBar } from './components/TagFilterBar';
import { NoSettingsPrompt } from './components/NoSettingsPrompt';

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


const App: React.FC = () => {
  // --- 1. Core State & Notifications ---
  const [galleryView, setGalleryView] = useState<GalleryView>('public');
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [showPerformanceOverview, setShowPerformanceOverview] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const addNotification = useCallback((notification: Omit<Notification, 'id'> & { id?: string }) => {
    const id = notification.id || self.crypto.randomUUID();
    setNotifications(prev => [...prev.filter(n => n.id !== id), { ...notification, id }]);
  }, []);
  const updateNotification = useCallback((id: string, updates: Partial<Omit<Notification, 'id'>>) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useLogWatcher(addNotification);


  // --- 2. App Initialization (Settings, User, Data) ---
  const {
    settings, setSettings,
    currentUser, setCurrentUser,
    images, setImages,
    negativePromptHistory, setNegativePromptHistory,
    isDbLoading
  } = useAppInitialization({ addNotification });

  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const addPromptToHistory = useCallback((prompt: string) => {
    setPromptHistory(prev => {
      const newHistory = [prompt, ...prev.filter(p => p !== prompt)].slice(0, MAX_PROMPT_HISTORY);
      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);


  // --- 3. Shared State ---
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [similarImages, setSimilarImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [promptModalConfig, setPromptModalConfig] = useState<PromptModalConfig | null>(null);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [veoRetryState, setVeoRetryState] = useState<{ sourceImage: ImageInfo | null, prompt: string, aspectRatio: AspectRatio } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const uploadAbortRef = useRef<boolean>(false);
  const [triggerBulkDownload, setTriggerBulkDownload] = useState(false);

  // Slideshow State
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [isSlideshowEnabled, setIsSlideshowEnabled] = useState(false);
  const [slideshowNeedsSlowdown, setSlideshowNeedsSlowdown] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const [statsHistory, setStatsHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('moondream_stats');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem('moondream_stats', JSON.stringify(statsHistory)); }, [statsHistory]);

  // --- 4. Hooks & Actions ---
  const { selectedIds, isSelectionMode, toggleSelectionMode, toggleSelection, selectAll, clearSelection, setSelection: setSelectedIds } = useSelection();

  const {
    isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteSelected, handleConfirmDelete, handleCancelDelete,
    handleToggleImagePublicStatus, handleBatchMakePublic, handleBatchMakePrivate
  } = useImageActions({
    images, setImages, selectedIds, setSelectedIds, currentUser, addNotification, toggleSelectionMode, setSelectedImage, setSimilarImages
  });


  // --- 5. Circular Dependency Handling ---
  const runImageAnalysisRef = useRef<(images: ImageInfo[], isRetry?: boolean) => void>(() => { });

  // --- 6. Save Handlers ---
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
        file, fileName, dataUrl, ...metadata,
        ownerId: currentUser.id, isPublic, recreationPrompt: prompt, source, savedToGallery, generationMetadata,
        authorName: currentUser.name, authorAvatarUrl: currentUser.avatarUrl, likes: 0, commentsCount: 0,
      };
      setImages(prev => [newImage, ...prev]);
      saveImage(newImage).catch(e => { console.error(e); addNotification({ status: 'error', message: 'Failed to save image.' }); });
      addNotification({ status: 'success', message: `New ${source || 'creation'} saved!` });

      if (settings && !prompt) {
        // Run analysis if no prompt (Import/DragNDrop)
        runImageAnalysisRef.current([newImage]);
      }
    } catch (e: any) {
      addNotification({ status: 'error', message: `Could not save: ${e.message}` });
    }
  }, [settings, currentUser, addNotification, setImages]);

  const handleSaveGeneratedImage = useCallback(async (imageInput: string | any, prompt: string | boolean, metadata?: any) => {
    let base64Image = '';
    if (typeof imageInput === 'string') base64Image = imageInput;
    else if (imageInput?.image) base64Image = imageInput.image;

    if (!base64Image) return;

    const safePrompt = typeof prompt === 'string' ? prompt : (typeof metadata === 'string' ? metadata : '');
    if (safePrompt) addPromptToHistory(safePrompt);

    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    const shouldSaveToGallery = metadata?.autoSaveToGallery ?? currentUser?.autoSaveToGallery;
    await saveImageToGallery(dataUrl, false, safePrompt, 'generated', shouldSaveToGallery, metadata);
  }, [addPromptToHistory, saveImageToGallery, currentUser]);

  const handleSaveEnhancedImage = useCallback(async (base64Image: string, isPublic: boolean, prompt: string) => {
    addPromptToHistory(prompt);
    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
    saveImageToGallery(dataUrl, isPublic, prompt, 'enhanced', currentUser?.autoSaveToGallery);
  }, [addPromptToHistory, saveImageToGallery, currentUser]);


  // --- 7. Queue System ---
  const {
    queueStatus, analyzingIds, processingSmartCropIds, setProcessingSmartCropIds,
    isBatchMode, analysisProgress, generationResults, setGenerationResults,
    addToQueue, processQueue, isPausedRef, activeRequestsRef, checkBackendHealthRef,
    queuedAnalysisIds, queuedGenerationIds, removeFromQueue, clearQueue, startCalibration, stopCalibration, calibrationStatus,
    toggleBatchMode,
    optimalBatchSize, batchSizeCalibrated, calibrateBatchSize, batchCalibrationInProgress,
    resilienceLog, setAnalysisProgress
  } = useQueueSystem({
    settings, addNotification, updateNotification, setImages, setSelectedImage, setSimilarImages, setStatsHistory, handleSaveGeneratedImage
  });


  // --- 8. Helper Functions dependent on Queue ---
  // Run Analysis Implementation
  const runImageAnalysis = useCallback((imagesToAnalyze: ImageInfo[], isRetry: boolean = false) => {
    if (imagesToAnalyze.length === 0 || !settings) return;
    const unique = imagesToAnalyze.filter(img => !queuedAnalysisIds.current.has(img.id));
    if (unique.length === 0) return;

    const items: QueueItem[] = unique.map(img => ({
      id: img.id, taskType: 'analysis', fileName: img.fileName, addedAt: Date.now(), data: { image: img }
    }));

    // Reset failure state for retry
    if (isRetry) {
      setImages(prev => prev.map(img => unique.find(u => u.id === img.id) ? { ...img, analysisFailed: false } : img));
    }

    addToQueue(items);
  }, [settings, addToQueue, setImages]);

  // Bind Ref
  useEffect(() => { runImageAnalysisRef.current = runImageAnalysis; }, [runImageAnalysis]);


  // Handle Retry Analysis Button
  const handleRetryAnalysis = useCallback((imageId?: string) => {
    let imagesToRetry: ImageInfo[] = [];
    if (imageId) { const img = images.find(i => i.id === imageId); if (img) imagesToRetry.push(img); }
    else { imagesToRetry = images.filter(img => img.analysisFailed && img.ownerId === currentUser?.id); }

    if (imagesToRetry.length === 0) { addNotification({ status: 'success', message: 'No failed items to retry.' }); return; }
    runImageAnalysis(imagesToRetry, true);
  }, [images, currentUser, runImageAnalysis, addNotification]);

  // Handle Regenerate Caption
  const handleRegenerateCaption = useCallback(async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img || queuedAnalysisIds.current.has(imageId)) return;
    addToQueue([{ id: img.id, taskType: 'analysis', fileName: img.fileName, addedAt: Date.now(), priority: 3, data: { image: img } }]);
    addNotification({ id: imageId, status: 'info', message: 'Queued for regeneration...' });
  }, [images, addToQueue, addNotification]);


  // --- 9. Smart Crop & Slideshow ---
  const { performSmartCrop, handleSmartCrop } = useSmartCrop({
    settings, currentUser, images, setImages, addNotification, processingSmartCropIds, setProcessingSmartCropIds, activeRequestsRef, syncQueueStatus: () => { }
  });


  // --- 10. File Handling ---
  const handleFilesChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) { addNotification({ status: 'error', message: 'Please sign in.' }); return; }
    if (!settings) { addNotification({ status: 'error', message: 'Configure settings.' }); return; }

    const files = event.target.files;
    if (!files?.length) return;
    const imageFiles: File[] = Array.from(files).filter((f: any) => f.type && f.type.startsWith('image/')) as File[];

    setUploadProgress({ current: 0, total: imageFiles.length, eta: -1, speed: 0, fileName: '' });
    uploadAbortRef.current = false;
    const newImages: ImageInfo[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      if (uploadAbortRef.current) break;
      const file = imageFiles[i];
      try {
        setUploadProgress(prev => ({ ...prev!, current: i + 1, fileName: file.name }));
        const aiData = await extractAIGenerationMetadata(file);
        const dataUrl = await fileToDataUrl(file);
        const meta = await getImageMetadata(dataUrl);
        const newImg: ImageInfo = {
          id: self.crypto.randomUUID(), file, fileName: file.name, dataUrl, ...meta,
          ownerId: currentUser.id, isPublic: false, source: 'upload',
          authorName: currentUser.name, authorAvatarUrl: currentUser.avatarUrl, likes: 0, commentsCount: 0,
          ...(aiData?.originalMetadataPrompt ? { originalMetadataPrompt: aiData.originalMetadataPrompt } : {})
        };
        newImages.push(newImg);
      } catch (e) { }
    }

    setImages(prev => [...prev, ...newImages]);
    newImages.forEach(img => saveImage(img));
    setUploadProgress(null);
    runImageAnalysis(newImages.filter(img => !img.recreationPrompt));
  }, [currentUser, settings, addNotification, setImages, runImageAnalysis]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.dropEffect === 'none' && selectedIds.size > 0) {
      setTriggerBulkDownload(true);
      setTimeout(() => setTriggerBulkDownload(false), 100);
    }
  }, [selectedIds]);


  // --- 11. Generation & Animation Handlers ---
  const handleStartAnimation = useCallback(async (sourceImage: ImageInfo | null, prompt: string, aspectRatio: AspectRatio, isRetry: boolean = false) => {
    if (!settings || !currentUser) return;
    if (!isRetry && generationTasks.filter(t => t.type === 'video' && t.status === 'processing').length >= 2) {
      addNotification({ status: 'error', message: 'Too many video tasks.' }); return;
    }
    addPromptToHistory(prompt);
    const taskId = self.crypto.randomUUID();

    const placeholder: ImageInfo = {
      id: taskId, dataUrl: sourceImage?.dataUrl || createGenericPlaceholder(aspectRatio),
      fileName: `Generating video...`, file: new File([], ''), ownerId: currentUser.id, isPublic: false,
      isGenerating: true, source: 'video', recreationPrompt: prompt,
      width: sourceImage?.width, height: sourceImage?.height, aspectRatio: sourceImage?.aspectRatio
    };
    setImages(prev => [placeholder, ...prev]);
    setGenerationTasks(prev => [...prev, { id: taskId, type: 'video', status: 'processing', sourceImageId: sourceImage?.id, sourceImageName: sourceImage?.fileName || '', prompt }]);

    (async () => {
      try {
        const { uri, apiKey } = await animateImage(sourceImage || placeholder, prompt, aspectRatio, settings);
        const response = await fetch(`${uri}&key=${apiKey}`);
        if (!response.ok) throw new Error("Failed to download video");
        const blob = await response.blob();
        const thumb = await generateVideoThumbnail(blob);
        const meta = await getImageMetadata(thumb);
        const videoUrl = URL.createObjectURL(blob);
        const final: ImageInfo = {
          ...placeholder, isGenerating: false, isVideo: true, videoUrl, file: new File([blob], 'video.mp4', { type: 'video/mp4' }),
          dataUrl: thumb, width: meta.width, height: meta.height, aspectRatio: meta.aspectRatio
        };
        setImages(prev => prev.map(img => img.id === taskId ? final : img));
        saveImage(final);
        setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
        addNotification({ status: 'success', message: 'Video saved!' });
      } catch (e: any) {
        setImages(prev => prev.filter(img => img.id !== taskId));
        setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
        addNotification({ status: 'error', message: `Animation failed: ${e.message}` });
      }
    })();

  }, [settings, currentUser, generationTasks, addNotification, addPromptToHistory, setImages]);

  const handleGenerationSubmit = useCallback(async (sourceImage: ImageInfo, prompt: string, taskType: 'image' | 'enhance', aspectRatio: AspectRatio, providerOverride?: any, generationSettings?: any, autoSaveToGallery?: boolean) => {
    if (!currentUser || !settings) return;
    addPromptToHistory(prompt);
    const taskId = self.crypto.randomUUID();
    const newTask: GenerationTask = { id: taskId, type: taskType, status: 'processing', sourceImageId: sourceImage.id, sourceImageName: sourceImage.fileName, prompt };
    setGenerationTasks(prev => [...prev, newTask]);
    addNotification({ status: 'success', message: `Starting ${taskType}...` });

    addToQueue([{
      id: taskId, taskType: (taskType === 'image' ? 'generate' : taskType) as any, fileName: sourceImage.fileName, addedAt: Date.now(),
      data: { image: sourceImage, prompt, aspectRatio, generationSettings, providerOverride, sourceImage }
    }]);

    // Fallback/Direct Execution logic if queue doesn't pick it up or for eager Feedback:
    // Note: useQueueSystem logic matches this execution flow, so we don't duplicate via async IIFE like before.
    // EXCEPT 'enhance' which useQueueSystem currently might SKIP if logic isn't there.
    // Let's rely on queue.
    // Wait, 'enhance' was NOT in queue logic in hooks/useQueueSystem.ts.
    // I need to add 'enhance' to useQueueSystem or execute it here.
    // I'll execute 'enhance' here manually for safety.
    if (taskType === 'enhance') {
      (async () => {
        try {
          const result = await editImage(sourceImage, prompt, settings);
          await handleSaveEnhancedImage(result.image, false, prompt);
          setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (e: any) {
          setGenerationTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: e.message } : t));
          addNotification({ status: 'error', message: 'Enhance failed.' });
        }
      })();
    }

  }, [currentUser, settings, addNotification, addPromptToHistory, addToQueue, handleSaveEnhancedImage]);


  // --- 12. Batch Operations ---
  const {
    isBatchRemixModalOpen, setIsBatchRemixModalOpen, handleBatchRegenerate, handleConfirmBatchRemix, handleBatchEnhance, handleBatchAnimate
  } = useBatchOperations({
    images, setImages, selectedIds, setSelectedIds, toggleSelectionMode, addNotification,
    handleRegenerateCaption, settings, currentUser, setGenerationTasks, setStatsHistory,
    handleSaveGeneratedImage, handleGenerationSubmit, handleStartAnimation, setAnalysisProgress
  });


  // --- 13. Modal Handlers ---

  // --- Global Keyboard Shortcuts (Valid) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused to prevent closing while typing
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape') {
        // Priority 1: High-level modals managed by App.tsx
        if (veoRetryState) { setVeoRetryState(null); return; }
        if (isLoginModalOpen) { setIsLoginModalOpen(false); return; }
        if (promptModalConfig) { setPromptModalConfig(null); return; }
        if (isBatchRemixModalOpen) { setIsBatchRemixModalOpen(false); return; }
        if (isDeleteModalOpen) { setIsDeleteModalOpen(false); return; }

        // Priority 2: Full-screen overrides managed by App.tsx
        if (showSystemLogs) { setShowSystemLogs(false); return; }
        if (showDuplicates) { setShowDuplicates(false); return; }
        if (showHealthDashboard) { setShowHealthDashboard(false); return; }

        // Priority 3: Selection Mode (low priority)
        // Only clear selection if NO other high-level view is active
        // And ensure we don't interfere with ImageViewer (selectedImage) or PerformanceOverview which have their own handlers
        // Note: ImageViewer has its own Listener, so we don't need to handle it here, but we check to prevent double-firing logic on Selection
        const isImageViewerOpen = !!selectedImage;
        const isPerformanceOpen = showPerformanceOverview;

        if (!isImageViewerOpen && !isPerformanceOpen) {
          if (isSelectionMode) {
            if (selectedIds.size > 0) clearSelection();
            else toggleSelectionMode();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    veoRetryState, isLoginModalOpen, promptModalConfig, isBatchRemixModalOpen, isDeleteModalOpen,
    showSystemLogs, showDuplicates, showHealthDashboard,
    selectedImage, showPerformanceOverview, isSelectionMode, selectedIds,
    clearSelection, toggleSelectionMode
  ]);


  const handleOpenGenerationStudio = () => {
    if (selectedIds.size === 0) return;
    const img = images.find(i => i.id === Array.from(selectedIds)[0]);
    if (img) setPromptModalConfig({ taskType: 'image', image: img, initialPrompt: img.recreationPrompt || '', aspectRatio: getClosestSupportedAspectRatio(img.aspectRatio || '1:1') as AspectRatio });
  };
  const handleOpenEnhanceStudio = () => {
    if (selectedIds.size === 0) return;
    const list = images.filter(i => selectedIds.has(i.id));
    if (list.length) setPromptModalConfig({ taskType: 'enhance', image: list[0], batchImages: list, initialPrompt: list[0].recreationPrompt || "Enhance this image" });
  };

  // Login Handler
  const handleLogin = useCallback((provider: 'google' | 'github') => {
    // @ts-ignore
    const user = MOCK_USERS[provider];
    setCurrentUser(user);
    localStorage.setItem('ai_gallery_user', JSON.stringify(user));
    setIsLoginModalOpen(false);
    setGalleryView('my-gallery');
  }, [setCurrentUser]);

  // Veo Retry Handler
  const handleVeoRetry = useCallback(async () => {
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
  }, [veoRetryState, handleStartAnimation]);


  // --- 14. Filters ---
  const allTags = useMemo(() => {
    const relevant = images.filter(img => (galleryView === 'public' && img.isPublic) || (galleryView === 'my-gallery' && currentUser?.id === img.ownerId));
    const counts: Record<string, number> = {};
    relevant.forEach(img => img.keywords?.forEach(k => { if (typeof k === 'string') counts[k.toLowerCase()] = (counts[k.toLowerCase()] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }, [images, galleryView, currentUser]);

  const filteredImages = useMemo(() => {
    let list = [];
    if (galleryView === 'public') list = images.filter(i => i.isPublic);
    else if (galleryView === 'my-gallery') list = images.filter(i => i.ownerId === currentUser?.id);
    else if (galleryView === 'creations') list = images.filter(i => i.source !== 'upload' && i.ownerId === currentUser?.id);

    if (searchQuery) list = list.filter(i => i.keywords?.some((k: unknown) => typeof k === 'string' && String(k).toLowerCase().includes(searchQuery.toLowerCase())));
    if (activeTags.size) list = list.filter(i => Array.from(activeTags).every(t => i.keywords?.some((k: unknown) => typeof k === 'string' && String(k).toLowerCase() === String(t).toLowerCase())));
    return list;
  }, [images, galleryView, currentUser, searchQuery, activeTags]);


  // --- Render ---
  return (
    <MainLayout
      onSetView={setGalleryView}
      onShowLogs={() => setShowSystemLogs(true)}
      isSlideshowEnabled={isSlideshowEnabled}
      onToggleSlideshow={setIsSlideshowEnabled}
      setIsSlideshowActive={setIsSlideshowActive}
      currentView={galleryView}
      currentUser={currentUser}
      onLogout={() => { setCurrentUser(null); localStorage.removeItem('ai_gallery_user'); setGalleryView('public'); }}
      onLogin={() => setIsLoginModalOpen(true)}
      settings={settings || undefined}
      onToggleNsfwBlur={() => { /* Toggle logic */ }}
    >
      {isDbLoading ? (
        <div className="flex justify-center h-[60vh]"><Spinner /></div>
      ) : galleryView === 'admin-settings' ? (
        <AdminSettingsPage currentSettings={settings} onSave={(s) => { setSettings(s); localStorage.setItem('ai_gallery_settings_v2', JSON.stringify(s)); setGalleryView('public'); }} onCancel={() => setGalleryView('public')} />
      ) : !settings ? (
        <NoSettingsPrompt onSettingsClick={() => setGalleryView('admin-settings')} />
      ) : (
        <div>
          <NavBar
            currentView={galleryView} onSetView={setGalleryView} currentUser={currentUser}
            generationTasks={generationTasks} queueStatus={queueStatus}
            searchQuery={searchQuery} onSearchChange={setSearchQuery}
            onShowDuplicates={() => setShowDuplicates(true)} onShowCreations={() => setGalleryView('creations')}
            hasImages={filteredImages.length > 0} isSelectionMode={isSelectionMode} onToggleSelectionMode={toggleSelectionMode}
            failedAnalysisCount={0} onRetryAnalysis={() => handleRetryAnalysis()}
            onFilesSelected={handleFilesChange} onOpenGenerationStudio={() => setPromptModalConfig({ taskType: 'image', initialPrompt: '', aspectRatio: '1:1' })}
          />

          {(['public', 'my-gallery', 'creations'].includes(galleryView)) && (
            <TagFilterBar allTags={allTags} activeTags={activeTags} onToggleTag={(t) => setActiveTags(p => { const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t); return n; })} onClear={() => setActiveTags(new Set())} />
          )}

          {showPerformanceOverview ? (
            <PerformanceOverview
              settings={settings}
              onBack={() => setShowPerformanceOverview(false)}
              addToQueue={addToQueue}
              generationResults={generationResults}
            />
          ) : galleryView === 'status' ? (
            <StatusPage
              statsHistory={statsHistory}
              settings={settings}
              queueStatus={queueStatus}
              onPauseQueue={(p) => { isPausedRef.current = p; if (!p) processQueue(); }}
              onClearQueue={clearQueue}
              onRemoveFromQueue={removeFromQueue}
              onShowPerformance={() => setShowPerformanceOverview(true)}
              onShowDiagnostics={() => setShowHealthDashboard(true)}
              startCalibration={startCalibration}
              stopCalibration={stopCalibration}
              calibrationStatus={calibrationStatus}
              isBatchMode={isBatchMode}
              onToggleBatchMode={toggleBatchMode}
              optimalBatchSize={optimalBatchSize}
              batchSizeCalibrated={batchSizeCalibrated}
              onCalibrateBatchSize={calibrateBatchSize}
              batchCalibrationInProgress={batchCalibrationInProgress}
              resilienceLog={resilienceLog}
            />
          ) : galleryView === 'profile-settings' && currentUser ? (
            <UserProfilePage user={currentUser} onUpdateUser={setCurrentUser} galleryImages={images} settings={settings} addNotification={addNotification} onClose={() => setGalleryView('my-gallery')} />
          ) : galleryView === 'creations' && currentUser ? (
            <CreationsPage tasks={generationTasks} completedCreations={filteredImages} onImageClick={(img, e) => isSelectionMode ? toggleSelection(img.id) : setSelectedImage(img)} analyzingIds={analyzingIds} generatingIds={new Set()} disabled={false} onClearFailedTasks={() => setGenerationTasks(p => p.filter(t => t.status !== 'failed'))} isSelectionMode={isSelectionMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          ) : galleryView === 'prompt-history' ? (
            <PromptHistoryPage promptHistory={promptHistory} images={images} onGenerateFromPrompt={(p, t) => setPromptModalConfig({ taskType: t, initialPrompt: p, aspectRatio: '1:1' })} />
          ) : (filteredImages.length > 0 || searchQuery) ? (
            <ImageGrid images={filteredImages} onImageClick={(img, e) => (isSelectionMode || e.ctrlKey) ? toggleSelection(img.id) : setSelectedImage(img)} analyzingIds={analyzingIds} generatingIds={new Set(generationTasks.map(t => t.sourceImageId).filter(Boolean) as string[])} isSelectionMode={isSelectionMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} blurNsfw={settings.contentSafety?.blurNsfw} onDragEnd={handleDragEnd} />
          ) : (
            <UploadArea onFilesChange={handleFilesChange} />
          )}
        </div>
      )}

      {selectedImage && (
        <ImageViewer
          initialImage={selectedImage} contextImages={filteredImages} isLoading={isLoading} error={error} onClose={() => setSelectedImage(null)}
          settings={settings || undefined} onKeywordClick={setSearchQuery}
          onSaveGeneratedImage={handleSaveGeneratedImage} onSaveEnhancedImage={handleSaveEnhancedImage}
          onRegenerateCaption={handleRegenerateCaption} onStartAnimation={handleStartAnimation}
          onTogglePublicStatus={handleToggleImagePublicStatus} currentUser={currentUser} promptHistory={promptHistory}
          setPromptModalConfig={setPromptModalConfig} addNotification={addNotification}
          onRetryAnalysis={(id) => handleRetryAnalysis(id)} onSmartCrop={(img) => performSmartCrop(img)}
          processingSmartCropIds={processingSmartCropIds}
        />
      )}

      <UploadProgressIndicator progress={uploadProgress} onCancel={() => uploadAbortRef.current = true} />
      <AnalysisProgressIndicator progress={analysisProgress} />
      <NotificationArea notifications={notifications} onDismiss={removeNotification} />

      {isSelectionMode && (
        <SelectionActionBar
          count={selectedIds.size} selectedImages={images.filter(i => selectedIds.has(i.id))}
          onClear={clearSelection} onDelete={handleDeleteSelected} onMakePublic={handleBatchMakePublic}
          onMakePrivate={handleBatchMakePrivate} onRemix={handleOpenGenerationStudio} onEnhance={handleOpenEnhanceStudio}
          onRegenerate={handleBatchRegenerate} onSelectAll={() => selectAll(filteredImages.map(i => i.id))}
          onSmartCrop={() => handleSmartCrop(selectedIds, toggleSelectionMode, setSelectedIds)} onAnimate={handleBatchAnimate}
          triggerDownload={triggerBulkDownload}
        />
      )}

      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCancelDelete} onConfirm={handleConfirmDelete} title="Confirm Delete" message="Are you sure?" confirmText="Delete" confirmButtonVariant="danger" />
      <BatchRemixModal isOpen={isBatchRemixModalOpen} onClose={() => setIsBatchRemixModalOpen(false)} onConfirm={handleConfirmBatchRemix} count={selectedIds.size} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} />
      <VeoKeySelectionModal isOpen={!!veoRetryState} onClose={() => setVeoRetryState(null)} onSelectKey={handleVeoRetry} isRetry={true} />

      {promptModalConfig && (
        <PromptSubmissionModal
          isOpen={!!promptModalConfig} onClose={() => setPromptModalConfig(null)} config={promptModalConfig}
          promptHistory={promptHistory} negativePromptHistory={negativePromptHistory.map(n => n.content)} settings={settings || undefined}
          onSaveGeneratedImage={handleSaveGeneratedImage} onSaveNegativePrompt={() => { }} onAddToGenerationQueue={addToQueue}
          queuedGenerationCount={queuedGenerationIds.current.size} generationResults={generationResults} onDeleteNegativePrompt={() => { }}
          onSubmit={(p, o) => { handleGenerationSubmit(promptModalConfig.image || { id: '', fileName: '', file: new File([], ''), dataUrl: '', ownerId: '', isPublic: false } as any, p, promptModalConfig.taskType as any, o.aspectRatio || '1:1', undefined, o.generationSettings); setPromptModalConfig(null); }}
        />
      )}

      <IdleSlideshow images={filteredImages} isActive={isSlideshowActive} onClose={() => setIsSlideshowActive(false)} />
      <BottomNav currentView={galleryView} onViewChange={setGalleryView} onFilesSelected={handleFilesChange} />
      {showSystemLogs && <LogViewer onClose={() => setShowSystemLogs(false)} />}
      {showDuplicates && <DuplicatesPage images={images} onDeleteImages={deleteImages} onClose={() => setShowDuplicates(false)} />}
      {showHealthDashboard && <DiagnosticsPage onClose={() => setShowHealthDashboard(false)} />}
    </MainLayout>
  );
};

export default App;
