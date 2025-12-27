import { useState, useCallback } from 'react';

interface UseSelectionReturn {
    selectedIds: Set<string>;
    isSelectionMode: boolean;
    toggleSelectionMode: (force?: boolean) => void;
    toggleSelection: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    setSelection: (ids: Set<string>) => void;
}

export const useSelection = (initialMode = false): UseSelectionReturn => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(initialMode);

    const toggleSelectionMode = useCallback((force?: boolean) => {
        setIsSelectionMode(prev => {
            const next = force !== undefined ? force : !prev;
            if (!next) {
                setSelectedIds(new Set()); // Auto-clear on exit
            }
            return next;
        });
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
        if (ids.length > 0) {
            setIsSelectionMode(true);
        }
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const setSelection = useCallback((ids: Set<string>) => {
        setSelectedIds(ids);
    }, []);

    return {
        selectedIds,
        isSelectionMode,
        toggleSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        setSelection
    };
};
