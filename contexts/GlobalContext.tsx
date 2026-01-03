import React, { createContext, useContext, ReactNode } from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { useNotification } from './NotificationContext';
import { AdminSettings, User, ImageInfo } from '../types';
import { NegativePrompt } from '../utils/idb';

interface GlobalContextType {
    settings: AdminSettings | null;
    setSettings: React.Dispatch<React.SetStateAction<AdminSettings | null>>;
    currentUser: User | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    images: ImageInfo[];
    setImages: React.Dispatch<React.SetStateAction<ImageInfo[]>>;
    negativePromptHistory: NegativePrompt[];
    setNegativePromptHistory: React.Dispatch<React.SetStateAction<NegativePrompt[]>>;
    isDbLoading: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalState = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalState must be used within a GlobalProvider');
    }
    return context;
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addNotification } = useNotification();
    const state = useAppInitialization({ addNotification });

    return (
        <GlobalContext.Provider value={state}>
            {children}
        </GlobalContext.Provider>
    );
};
