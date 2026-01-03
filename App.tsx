import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NavBar } from './components/layout/NavBar';
import { ImageInfo, GenerationTask, AspectRatio, GalleryView } from './types';
import type { QueueItem } from './types/queue';
import { getClosestSupportedAspectRatio } from './utils/fileUtils';
import { deleteImages } from './utils/idb';
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
import { useGlobalState } from './contexts/GlobalContext';
import { useNotification } from './contexts/NotificationContext';
import { useAppModals } from './hooks/useAppModals';
import { useFileUpload } from './hooks/useFileUpload';
import { useImageSave } from './hooks/useImageSave';
import { useGeneration } from './hooks/useGeneration';

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
  const {
    settings, setSettings,
    currentUser, setCurrentUser,
    images, setImages,
    negativePromptHistory, setNegativePromptHistory,
    isDbLoading
  } = useGlobalState();

  const { notifications, addNotification, updateNotification, removeNotification } = useNotification();

  // Log Watcher uses the notification context
  useLogWatcher(addNotification);


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

  // --- 2. Shared State ---
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [similarImages, setSimilarImages] = useState<ImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
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

  // --- 3. Hooks & Actions ---
  const { selectedIds, isSelectionMode, toggleSelectionMode, toggleSelection, selectAll, clearSelection, setSelection: setSelectedIds } = useSelection();

  // Layout State
  const [galleryView, setGalleryView] = useState<GalleryView>('public');

  const {
    isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteSelected, handleConfirmDelete, handleCancelDelete,
    handleToggleImagePublicStatus, handleBatchMakePublic, handleBatchMakePrivate
  } = useImageActions({
    images, setImages, selectedIds, setSelectedIds, currentUser, addNotification, toggleSelectionMode, setSelectedImage, setSimilarImages
  });


  // --- 4. Circular Dependency Handling ---
  const runImageAnalysisRef = useRef<(images: ImageInfo[], isRetry?: boolean) => void>(() => { });


  // --- 5. Image Save Hooks ---
  const { saveImageToGallery, handleSaveGeneratedImage, handleSaveEnhancedImage } = useImageSave({
    currentUser,
    settings,
    setImages,
    addNotification,
    runImageAnalysis: (images) => runImageAnalysisRef.current(images, false),
    addPromptToHistory
  });

  // --- 6. Queue System ---
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


  // --- 7. Helper Functions dependent on Queue ---
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
  }, [settings, addToQueue, setImages, queuedAnalysisIds]);

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


  // --- 8. File Upload Hook ---
  const { uploadProgress, handleFilesChange, cancelUpload } = useFileUpload({
    currentUser,
    settings,
    setImages,
    addNotification,
    runImageAnalysis
  });

  // --- 9. Generation Hook ---
  const { handleStartAnimation, handleGenerationSubmit } = useGeneration({
    currentUser,
    settings,
    generationTasks,
    setGenerationTasks,
    setImages,
    addNotification,
    addPromptToHistory,
    addToQueue
  });

  // --- 10. Smart Crop & Slideshow ---
  const { performSmartCrop, handleSmartCrop } = useSmartCrop({
    settings, currentUser, images, setImages, addNotification, processingSmartCropIds, setProcessingSmartCropIds, activeRequestsRef, syncQueueStatus: () => { }
  });





  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.dropEffect === 'none' && selectedIds.size > 0) {
      setTriggerBulkDownload(true);
      setTimeout(() => setTriggerBulkDownload(false), 100);
    }
  }, [selectedIds]);

  // --- 11. Batch Operations ---
  const {
    isBatchRemixModalOpen, setIsBatchRemixModalOpen, handleBatchRegenerate, handleConfirmBatchRemix, handleBatchEnhance, handleBatchAnimate
  } = useBatchOperations({
    images, setImages, selectedIds, setSelectedIds, toggleSelectionMode, addNotification,
    handleRegenerateCaption, settings, currentUser, setGenerationTasks, setStatsHistory,
    handleSaveGeneratedImage, handleGenerationSubmit, handleStartAnimation, setAnalysisProgress
  });

  // --- 12. App Modals ---
  const {
    isLoginModalOpen, setIsLoginModalOpen,
    promptModalConfig, setPromptModalConfig,
    veoRetryState, setVeoRetryState,
    showSystemLogs, setShowSystemLogs,
    showDuplicates, setShowDuplicates,
    showHealthDashboard, setShowHealthDashboard,
    showPerformanceOverview, setShowPerformanceOverview
  } = useAppModals({
    selectedImage,
    isSelectionMode,
    selectedIds,
    clearSelection,
    toggleSelectionMode
  });

  // --- 13. Autoshow Idle Trigger ---
  useEffect(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Only set timer if enabled AND not already active
    if (!isSlideshowEnabled || isSlideshowActive) return;

    const startIdleTimer = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setIsSlideshowActive(true);
      }, 10000); // 10s idle timeout
    };

    startIdleTimer();

    const handleActivity = () => startIdleTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('wheel', handleActivity);

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, [isSlideshowEnabled, isSlideshowActive]);


  // --- 14. Modal Handlers ---


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

      <UploadProgressIndicator progress={uploadProgress} onCancel={cancelUpload} />
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
