import React, { useState, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ImageInfo } from '../../types';

interface GenerationCanvasProps {
    displayImage: ImageInfo | { id: string; url: string; } | null;
    isGenerating: boolean;
    progress: number;
    onPrev?: () => void;
    onNext?: () => void;
    hasSessionImages: boolean;
}

export const GenerationCanvas: React.FC<GenerationCanvasProps> = ({
    displayImage,
    isGenerating,
    progress,
    onPrev,
    onNext,
    hasSessionImages
}) => {
    const [zoom, setZoom] = useState<number | 'fit'>('fit');
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom and Pan Logic
    const handleWheel = (e: React.WheelEvent) => {
        if (!e.ctrlKey && zoom === 'fit') return;
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey) {
            // Zoom
            const delta = -e.deltaY;
            const factor = 1.1;
            setZoom(prev => {
                if (prev === 'fit') return delta > 0 ? 1 : 1;
                let newZoom = delta > 0 ? prev * factor : prev / factor;
                return Math.min(Math.max(0.1, newZoom), 10);
            });
        } else {
            // Pan
            if (zoom !== 'fit') {
                setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom !== 'fit') {
            setIsPanning(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && typeof zoom === 'number') {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const renderImage = () => {
        if (!displayImage) return (
            <div className="text-gray-600 text-sm font-mono animate-pulse">
                Ready to Dream...
            </div>
        );

        const isFit = zoom === 'fit';
        const style = isFit ? {} : {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isPanning ? 'grabbing' : 'grab'
        };

        return (
            <img
                key={displayImage.id}
                src={'url' in displayImage ? displayImage.url : ''} // Partial type verification
                className={(isFit ? "max-w-full max-h-full object-contain shadow-2xl" : "max-w-none shadow-2xl") + " animate-fade-in"}
                style={style}
                draggable={false}
            />
        );
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#0f0f0f]"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid BG */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {renderImage()}

            {/* View Controls (Floating) */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-30">
                <button onClick={() => { setZoom('fit'); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 flex items-center justify-center bg-[#0a0a0a]/80 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors" title="Reset">
                    <div className="w-3 h-3 border border-current rounded-sm"></div>
                </button>
                <button onClick={() => setZoom(z => typeof z === 'number' ? z * 1.25 : 1.25)} className="w-8 h-8 flex items-center justify-center bg-[#0a0a0a]/80 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors" title="Zoom In">+</button>
                <button onClick={() => setZoom(z => typeof z === 'number' ? z * 0.8 : 0.8)} className="w-8 h-8 flex items-center justify-center bg-[#0a0a0a]/80 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors" title="Zoom Out">-</button>
            </div>

            {/* Navigation Buttons (Floating) */}
            <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20 md:flex hidden">
                <button
                    onClick={onPrev}
                    disabled={!onPrev || !hasSessionImages}
                    className={`p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all ${(!onPrev || !hasSessionImages) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <ChevronDownIcon className="w-6 h-6 rotate-90" /> {/* Left Arrow using Chevron */}
                </button>
            </div>
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20 md:flex hidden">
                <button
                    onClick={onNext}
                    disabled={!onNext || !hasSessionImages}
                    className={`p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all ${(!onNext || !hasSessionImages) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Loading Overlay */}
            {isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-40">
                    <div className="w-16 h-16 relative mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <span className="text-white font-bold tracking-widest text-sm animate-pulse">GENERATING {Math.round(progress)}%</span>
                </div>
            )}
        </div>
    );
};
