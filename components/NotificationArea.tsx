import React, { useEffect, useState, useRef } from 'react';
import { Notification } from '../types';
import { CheckCircleIcon, XCircleIcon, XMarkIcon as CloseIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';
import {
  NOTIFICATION_DURATION_ERROR_MS,
  NOTIFICATION_DURATION_DEFAULT_MS,
  NOTIFICATION_EXIT_ANIMATION_MS
} from '../constants/timings';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  // Refs for proper timer cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-dismiss all notifications, but give errors more time to be read
    const duration = notification.status === 'error'
      ? NOTIFICATION_DURATION_ERROR_MS
      : NOTIFICATION_DURATION_DEFAULT_MS;

    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      exitTimerRef.current = setTimeout(() => onDismiss(notification.id), NOTIFICATION_EXIT_ANIMATION_MS);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [notification.id, notification.status, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), NOTIFICATION_EXIT_ANIMATION_MS);
  };

  const isSuccess = notification.status === 'success';
  const isProcessing = notification.status === 'processing';
  const isInfo = notification.status === 'info';
  const isWarning = notification.status === 'warning';
  const isError = notification.status === 'error';

  const getBorderColor = () => {
    if (isProcessing) return 'border-blue-500';
    if (isSuccess) return 'border-green-500';
    if (isInfo) return 'border-indigo-500';
    if (isWarning) return 'border-yellow-500';
    if (isError) return 'border-red-500';
    return 'border-gray-500';
  };

  const getIcon = () => {
    if (isProcessing) return <Spinner className="h-6 w-6 text-blue-400" />;
    if (isSuccess) return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    if (isInfo) return <SparklesIcon className="h-6 w-6 text-indigo-400" />;
    if (isWarning) return <SparklesIcon className="h-6 w-6 text-yellow-500" />; // Fallback icon or Import ExclamationIcon if available
    return <XCircleIcon className="h-6 w-6 text-red-500" />;
  };

  const getTitle = () => {
    if (isProcessing) return 'Processing';
    if (isSuccess) return 'Success';
    if (isInfo) return 'Info';
    if (isWarning) return 'Warning';
    return 'Error';
  }

  const getTitleColor = () => {
    if (isProcessing) return 'text-blue-200';
    if (isSuccess) return 'text-green-200';
    if (isInfo) return 'text-indigo-200';
    if (isWarning) return 'text-yellow-200';
    return 'text-red-200';
  }

  return (
    <div
      className={`
        w-full max-w-sm bg-gray-800 border-l-4 rounded-md shadow-lg flex items-start p-4 transition-all duration-300 pointer-events-auto
        ${getBorderColor()}
        ${isExiting ? 'animate-fade-out-right' : 'animate-fade-in-right'}
      `}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="ml-3 w-0 flex-1">
        <p className={`text-sm font-medium ${getTitleColor()}`}>
          {getTitle()}
        </p>
        <p className="mt-1 text-sm text-gray-300 break-words">{notification.message}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          onClick={handleDismiss}
          className="inline-flex text-gray-400 hover:text-gray-200 focus:outline-none"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};


interface NotificationAreaProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationArea: React.FC<NotificationAreaProps> = ({ notifications, onDismiss }) => {
  return (
    <>
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 z-[200]"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.3s ease-out forwards;
        }
        @keyframes fade-out-right {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
        .animate-fade-out-right {
          animation: fade-out-right 0.3s ease-in forwards;
        }
      `}</style>
    </>
  );
};

export default NotificationArea;
