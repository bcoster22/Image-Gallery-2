import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification } from '../types';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'> & { id?: string }) => void;
    updateNotification: (id: string, updates: Partial<Omit<Notification, 'id'>>) => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, updateNotification, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
