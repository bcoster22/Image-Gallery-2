import { ImageInfo } from '../types';

const DB_NAME = 'ai-gallery-db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(true);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject(false);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveImage = (image: ImageInfo): Promise<void> => {
    // The videoUrl is a temporary blob URL and should not be stored.
    // It will be recreated on load from the stored file blob.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { videoUrl, ...imageToStore } = image;
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(imageToStore);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error saving image:", request.error);
            reject(request.error);
        };
    });
};

export const getImages = (): Promise<ImageInfo[]> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const images: ImageInfo[] = request.result.map((img: any) => {
                // Recreate videoUrl if it's a video and the file (blob) exists
                if (img.isVideo && img.file instanceof Blob) {
                    img.videoUrl = URL.createObjectURL(img.file);
                }
                return img;
            });
            resolve(images);
        };
        request.onerror = () => {
            console.error("Error getting images:", request.error);
            reject(request.error);
        };
    });
};

export const deleteImages = (ids: string[]): Promise<void[]> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const deletePromises = ids.map(id => {
            return new Promise<void>((resolveDelete, rejectDelete) => {
                const request = store.delete(id);
                request.onsuccess = () => resolveDelete();
                request.onerror = () => {
                    console.error(`Error deleting image ${id}:`, request.error);
                    rejectDelete(request.error);
                };
            });
        });

        Promise.all(deletePromises).then(resolve as any).catch(reject);
    });
};

export const updateImage = (id: string, updates: Partial<ImageInfo>): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const data = request.result;
            if (!data) return reject("Image not found");

            const updatedData = { ...data, ...updates };
            // Ensure videoUrl is not stored (it's handled on load)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { videoUrl, ...dataToStore } = updatedData;

            const updateRequest = store.put(dataToStore);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
};
