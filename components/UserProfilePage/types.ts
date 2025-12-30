import { User, AdminSettings, ImageInfo } from '../../types';

export interface UserProfilePageProps {
    user: User;
    onUpdateUser: (user: User) => void;
    galleryImages: ImageInfo[];
    settings: AdminSettings | null;
    addNotification: (notification: any) => void;
    onClose: () => void;
}
