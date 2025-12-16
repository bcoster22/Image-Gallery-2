import React, { useState, useRef } from 'react';
import { ImageInfo, GenerationSettings, UpscaleSettings } from '../types';

interface EnhanceComparisonProps {
    sourceImage: ImageInfo;
    settings: GenerationSettings | UpscaleSettings;
    taskType: 'img2img' | 'txt2img' | 'upscale';
    onPreviewGenerate: (settings: any) => Promise<void>;
}

const EnhanceComparison: React.FC<EnhanceComparisonProps> = ({
    sourceImage,
    settings,
    taskType,
    onPreviewGenerate,
}) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'sidebyside' | 'split' | 'overlay'>('sidebyside');
    const [splitPosition, setSplitPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isUpscaleSettings = (s: any): s is UpscaleSettings => {
        return 'method' in s && 'targetMegapixels' in s;
    };

    // Calculate output dimensions
    const calculateOutputSize = () => {
        if (!isUpscaleSettings(settings)) return { width: 0, height: 0, scale: 1 };

        const sourceWidth = sourceImage.width || 1024;
        const sourceHeight = sourceImage.height || 768;
        const sourceMegapixels = (sourceWidth * sourceHeight) / 1_000_000;
        const scaleFactor = Math.sqrt(settings.targetMegapixels / sourceMegapixels);

        return {
            width: Math.round(sourceWidth * scaleFactor),
            height: Math.round(sourceHeight * scaleFactor),
            scale: scaleFactor,
        };
    };

    const outputSize = calculateOutputSize();

    const handlePreviewGenerate = async () => {
        setIsGenerating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setPreviewImage(sourceImage.dataUrl);
        } catch (error) {
            console.error('Preview generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setSplitPosition(Math.max(0, Math.min(100, percentage)));
    };

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Top Toolbar - View Mode Switches */}
            <div className="flex items-center justify-between flex-shrink-0 bg-gray-800/50 rounded-lg p-2 border border-gray-700/30">
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('sidebyside')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'sidebyside'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            }`}
                    >
                        Side by Side
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        disabled={!previewImage}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'split'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        Split View
                    </button>
                    <button
                        onClick={() => setViewMode('overlay')}
                        disabled={!previewImage}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'overlay'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        Overlay
                    </button>
                </div>

                {/* Output Info */}
                {isUpscaleSettings(settings) && (
                    <div className="text-xs text-gray-400 font-mono">
                        {sourceImage.width}×{sourceImage.height} → {outputSize.width}×{outputSize.height}
                    </div>
                )}
            </div>

            {/* Main Comparison Area */}
            <div className="flex-grow relative bg-gray-900/30 rounded-lg overflow-hidden border border-gray-700/30">
                {viewMode === 'sidebyside' && (
                    <div className="h-full grid grid-cols-2 gap-2 p-2">
                        {/* Original */}
                        <div className="flex flex-col bg-gray-800/30 rounded overflow-hidden">
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-800/50 border-b border-gray-700/30">
                                Original
                            </div>
                            <div className="flex-grow flex items-center justify-center p-2">
                                <img
                                    src={sourceImage.dataUrl}
                                    alt="Original"
                                    className="max-w-full max-h-full object-contain rounded"
                                />
                            </div>
                            <div className="text-xs text-gray-500 px-2 py-1 border-t border-gray-700/30 text-center">
                                {sourceImage.width}×{sourceImage.height}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="flex flex-col bg-gray-800/30 rounded overflow-hidden">
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-800/50 border-b border-gray-700/30">
                                Preview (1/3 Area)
                            </div>
                            <div className="flex-grow flex items-center justify-center p-2">
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="max-w-full max-h-full object-contain rounded"
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 p-4">
                                        <p className="mb-3 text-sm">Generate a preview to compare</p>
                                        <button
                                            onClick={handlePreviewGenerate}
                                            disabled={isGenerating}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50 text-sm shadow-lg"
                                        >
                                            {isGenerating ? '⏳ Generating...' : '⚡ Quick Preview'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 px-2 py-1 border-t border-gray-700/30 text-center">
                                {previewImage ? `${outputSize.width}×${outputSize.height}` : 'No Preview'}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'split' && previewImage && (
                    <div
                        ref={containerRef}
                        className="h-full relative"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Original (right side) */}
                        <img
                            src={sourceImage.dataUrl}
                            alt="Original"
                            className="absolute inset-0 w-full h-full object-contain"
                        />

                        {/* Preview (left side, clipped) */}
                        <div
                            className="absolute inset-0 overflow-hidden transition-all"
                            style={{ width: `${splitPosition}%` }}
                        >
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-contain"
                            />
                        </div>

                        {/* Interactive Slider */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-gradient-to-r from-indigo-500 to-purple-500 cursor-ew-resize shadow-2xl z-10"
                            style={{ left: `${splitPosition}%` }}
                            onMouseDown={handleMouseDown}
                        >
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg flex items-center justify-center cursor-ew-resize">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
                                </svg>
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-medium">
                            Preview
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-medium">
                            Original
                        </div>
                    </div>
                )}

                {viewMode === 'overlay' && previewImage && (
                    <div className="h-full relative flex items-center justify-center p-4">
                        <img
                            src={sourceImage.dataUrl}
                            alt="Original"
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ opacity: 0.5, mixBlendMode: 'difference' }}
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-3 py-1.5 rounded text-xs text-white font-medium">
                            Difference View (Move slider to adjust opacity)
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Info Panel */}
            <div className="flex-shrink-0">
                <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {isUpscaleSettings(settings) && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Target:</span>
                                    <span className="text-green-400 font-mono font-medium">{settings.targetMegapixels}MP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Scale:</span>
                                    <span className="text-purple-400 font-mono font-medium">{outputSize.scale.toFixed(2)}x</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Method:</span>
                                    <span className="text-indigo-400 font-mono">{settings.method}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Tiled:</span>
                                    <span className={settings.tiled ? 'text-green-400' : 'text-gray-500'}>
                                        {settings.tiled ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Button */}
                    {!previewImage ? (
                        <button
                            onClick={handlePreviewGenerate}
                            disabled={isGenerating}
                            className="w-full mt-3 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 text-sm shadow-lg flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Generating Preview...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>Generate Quick Preview (1/3 Area)</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handlePreviewGenerate}
                                disabled={isGenerating}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                            >
                                Regenerate
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnhanceComparison;
