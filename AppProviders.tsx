import React, { ReactNode } from 'react';
import { NotificationProvider } from './contexts/NotificationContext';
import { GlobalProvider } from './contexts/GlobalContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <NotificationProvider>
            <GlobalProvider>
                {children}
            </GlobalProvider>
        </NotificationProvider>
    );
};
