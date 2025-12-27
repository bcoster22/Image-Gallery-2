import { useState, useEffect } from 'react';
import { User, Notification } from '../types';

const USER_STORAGE_KEY = 'ai_gallery_user';

export const MOCK_USERS = {
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

interface UseAuthReturn {
    currentUser: User | null;
    login: (provider: 'google' | 'github') => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

export const useAuth = (
    onLoginCallback?: () => void,
    onLogoutCallback?: () => void
): UseAuthReturn => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Initial load
    useEffect(() => {
        try {
            const stored = localStorage.getItem(USER_STORAGE_KEY);
            if (stored) {
                setCurrentUser(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to parse user from local storage', e);
        }
    }, []);

    const login = (provider: 'google' | 'github') => {
        const user = MOCK_USERS[provider];
        setCurrentUser(user as User); // Mock users match User interface by design
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        if (onLoginCallback) {
            onLoginCallback();
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);

        if (onLogoutCallback) {
            onLogoutCallback();
        }
    };

    const updateUser = (updates: Partial<User>) => {
        setCurrentUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    return {
        currentUser,
        login,
        logout,
        updateUser
    };
};
