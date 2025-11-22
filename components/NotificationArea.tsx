
import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { CheckCircleIcon, XCircleIcon, CloseIcon } from './icons';
import Spinner from './Spinner';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss all notifications, but give errors more time to be read
    const duration = notification.status === 'error' ? 10000 : 5000;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.status, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };
  
  const isSuccess = notification.status === 'success';
  const isProcessing = notification.status === 'processing';
  const isError = notification.status === 'error';

  const getBorderColor = () => {
    if (isProcessing) return 'border-blue-500';
    if (isSuccess) return 'border-green-500';
    if (isError) return 'border-red-500';
    return 'border-gray-500';
  };
  
  const getIcon = () => {
    if (isProcessing) return <Spinner className="h-6 w-6 text-blue-400" />;
    if (isSuccess) return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    return <XCircleIcon className="h-6 w-6 text-red-500" />;
  };
  
  const getTitle = () => {
      if (isProcessing) return 'Processing';
      if (isSuccess) return 'Success';
      return 'Error';
  }

  const getTitleColor = () => {
      if (isProcessing) return 'text-blue-200';
      if (isSuccess) return 'text-green-200';
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
