import React, { useState, useRef, useEffect } from 'react';
import { ImageInfo, GenerationSettings, UpscaleSettings } from '../types';

interface ImageComparisonProps {
    sourceImage: ImageInfo;
    settings: GenerationSettings | UpscaleSettings;
    taskType: 'img2img' | 'txt2img' | 'upscale';
}

const ImageComparison: React.FC<ImageComparisonProps> = ({ sourceImage, settings, taskType }) => {
    const [magnifierEnabled, setMagnifierEnabled] = useState(false);
    const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const isGenerationSettings = (s: any): s is GenerationSettings => {
        return 'steps' in s && 'cfg_scale' in s;
    };

    const isUpscaleSettings = (s: any): s is UpscaleSettings => {
        return 'method' in s && 'targetMegapixels' in s;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!magnifierEnabled || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMagnifierPosition({ x, y });
    };

    const getMagnifierStyle = () => {
        if (!imageRef.current) return {};

        const magnifierSize = 150;
        const zoom = 2;

        return {
            position: 'absolute' as const,
            left: `${magnifierPosition.x - magnifierSize / 2}px`,
            top: `${magnifierPosition.y - magnifierSize / 2}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            border: '3px solid #fff',
            borderRadius: '50%',
            backgroundImage: `url(${sourceImage.dataUrl})`,
            backgroundSize: `${imageRef.current.width * zoom}px ${imageRef.current.height * zoom}px`,
            backgroundPosition: `-${magnifierPosition.x * zoom - magnifierSize / 2}px -${magnifierPosition.y * zoom - magnifierSize / 2}px`,
            pointerEvents: 'none' as const,
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        };
    };

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Image Preview with Magnifier */}
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-400">Source Image</p>
                    <button
                        onClick={() => setMagnifierEnabled(!magnifierEnabled)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${magnifierEnabled
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        title="Toggle magnifier"
                    >
                        🔍 {magnifierEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div
                    className="relative bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setMagnifierEnabled(false)}
                >
                    <img
                        ref={imageRef}
                        src={sourceImage.dataUrl}
                        alt="Source for generation"
                        className="max-w-full max-h-64 object-contain rounded-md mx-auto cursor-crosshair"
                    />
                    {magnifierEnabled && (
                        <div style={getMagnifierStyle()} />
                    )}
                </div>
            </div>

            {/* Settings Preview */}
            <div className="flex-grow overflow-y-auto">
                <p className="text-sm font-medium text-gray-400 mb-2">Current Settings</p>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 space-y-2">
                    {/* Model Info */}
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Model:</span>
                        <span className="text-white font-mono">{settings.model}</span>
                    </div>

                    {/* Generation Settings */}
                    {isGenerationSettings(settings) && (
                        <>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Steps:</span>
                                <span className="text-indigo-400 font-mono">{settings.steps}</span>
                            </div>
                            {taskType === 'img2img' && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Denoise:</span>
                                    <span className="text-purple-400 font-mono">{settings.denoise}%</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">CFG Scale:</span>
                                <span className="text-green-400 font-mono">{settings.cfg_scale}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Seed:</span>
                                <span className="text-gray-300 font-mono">
                                    {settings.seed === -1 ? 'Random' : settings.seed}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Upscale Settings */}
                    {isUpscaleSettings(settings) && (
                        <>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Method:</span>
                                <span className="text-purple-400 font-mono">{settings.method}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Target:</span>
                                <span className="text-purple-400 font-mono">{settings.targetMegapixels}MP</span>
                            </div>
                            {settings.tiled && (
                                <>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Tiled:</span>
                                        <span className="text-green-400">✓ Enabled</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Tile Size:</span>
                                        <span className="text-gray-300 font-mono">{settings.tile_size}px</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Overlap:</span>
                                        <span className="text-gray-300 font-mono">{settings.tile_overlap}px</span>
                                    </div>
                                </>
                            )}
                            {settings.method === 'sd-upscale' && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Denoise:</span>
                                    <span className="text-purple-400 font-mono">{settings.denoise}%</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Estimated output */}
                    <div className="pt-2 mt-2 border-t border-gray-700">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Source Size:</span>
                            <span className="text-gray-300 font-mono">
                                {sourceImage.width}×{sourceImage.height}
                            </span>
                        </div>
                        {isUpscaleSettings(settings) && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Output Size:</span>
                                <span className="text-green-400 font-mono">
                                    {(() => {
                                        const sourceMP = ((sourceImage.width || 0) * (sourceImage.height || 0)) / 1_000_000;
                                        const scaleFactor = Math.sqrt(settings.targetMegapixels / sourceMP);
                                        return Math.round((sourceImage.width || 0) * scaleFactor);
                                    })()}×
                                    {(() => {
                                        const sourceMP = ((sourceImage.width || 0) * (sourceImage.height || 0)) / 1_000_000;
                                        const scaleFactor = Math.sqrt(settings.targetMegapixels / sourceMP);
                                        return Math.round((sourceImage.height || 0) * scaleFactor);
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Estimated time/quality */}
                    <div className="pt-2 mt-2 border-t border-gray-700">
                        {isGenerationSettings(settings) && (
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Est. Time:</span>
                                    <span className="text-yellow-400">
                                        {settings.steps <= 8 ? '~5-10s' : settings.steps <= 30 ? '~15-30s' : '~45-60s'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Quality:</span>
                                    <span className={settings.steps >= 20 ? 'text-green-400' : 'text-yellow-400'}>
                                        {settings.steps <= 8 ? 'Fast' : settings.steps <= 30 ? 'Balanced' : 'High'}
                                    </span>
                                </div>
                            </div>
                        )}
                        {isUpscaleSettings(settings) && (
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Est. Time:</span>
                                    <span className="text-yellow-400">
                                        {settings.targetMegapixels <= 4 ? '~10-20s' :
                                            settings.targetMegapixels <= 8 ? '~30-60s' :
                                                settings.targetMegapixels <= 16 ? '~60-120s' :
                                                    settings.targetMegapixels <= 24 ? '~2-3min' :
                                                        settings.targetMegapixels <= 32 ? '~3-5min' : '~5-8min'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">VRAM Usage:</span>
                                    <span className={settings.tiled ? 'text-green-400' : 'text-yellow-400'}>
                                        {settings.tiled ? 'Low (Tiled)' : 'High'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="pt-2 mt-2 border-t border-gray-700">
                        <div className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded">
                            <span className="font-medium">💡 Tip:</span>{' '}
                            {isGenerationSettings(settings) && taskType === 'img2img' && (
                                <>Lower denoise ({settings.denoise < 50 ? 'currently low' : 'try 30-50%'}) keeps more of the original image.</>
                            )}
                            {isUpscaleSettings(settings) && !settings.tiled && (
                                <>Enable tiling for better performance on large images!</>
                            )}
                            {isGenerationSettings(settings) && settings.steps < 10 && (
                                <>Using Lightning mode - great for quick previews!</>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageComparison;
