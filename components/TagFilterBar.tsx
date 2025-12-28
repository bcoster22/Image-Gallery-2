import React, { useRef, useState, useEffect } from 'react';
import { X as CloseIcon } from 'lucide-react';

interface TagFilterBarProps {
    allTags: string[];
    activeTags: Set<string>;
    onToggleTag: (tag: string) => void;
    onClear: () => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({ allTags, activeTags, onToggleTag, onClear }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]); // Initialize ref array

    // Verify buttonRefs length matches tags
    useEffect(() => {
        buttonRefs.current = buttonRefs.current.slice(0, allTags.length);
    }, [allTags]);

    // Use native event listener to support non-passive behavior for preventDefault
    useEffect(() => {
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
