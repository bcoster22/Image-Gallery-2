import { ImageInfo } from '../types';

const DB_NAME = 'ai-gallery-db';
const DB_VERSION = 2; // Incremented for new store
const STORE_IMAGES = 'images';
const STORE_PROMPTS = 'negative_prompts';

let db: IDBDatabase;

export interface NegativePrompt {
    id: string;
    content: string;
    category?: string;
    timestamp: number;
}

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

            // Image Store
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
            }

            // Negative Prompts Store
            if (!db.objectStoreNames.contains(STORE_PROMPTS)) {
                const store = db.createObjectStore(STORE_PROMPTS, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// --- Images ---

export const saveImage = (image: ImageInfo): Promise<void> => {
    // The videoUrl is a temporary blob URL and should not be stored.
    // It will be recreated on load from the stored file blob.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { videoUrl, ...imageToStore } = image;
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
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
        const transaction = db.transaction([STORE_IMAGES], 'readonly');
        const store = transaction.objectStore(STORE_IMAGES);
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
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);

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
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
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

// --- Negative Prompts ---

export const getNegativePrompts = (): Promise<NegativePrompt[]> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_PROMPTS], 'readonly');
        const store = transaction.objectStore(STORE_PROMPTS);
        const index = store.index('timestamp'); // Sort by timestamp 
        const request = index.getAll(); // get all sorted by timestamp

        request.onsuccess = () => {
            // Return newest first? index.getAll() returns ascending.
            // Let's reverse to get newest first.
            resolve(request.result.reverse());
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveNegativePrompt = (content: string): Promise<NegativePrompt> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_PROMPTS], 'readwrite');
        const store = transaction.objectStore(STORE_PROMPTS);

        // Check for duplicate content first? 
        // For simplicity, we just add. De-duping can happen in UI or here.
        // Let's rely on ID uniqueness.

        const newPrompt: NegativePrompt = {
            id: crypto.randomUUID(),
            content,
            timestamp: Date.now()
        };

        const request = store.put(newPrompt);
        request.onsuccess = () => resolve(newPrompt);
        request.onerror = () => reject(request.error);
    });
};

export const deleteNegativePrompt = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const transaction = db.transaction([STORE_PROMPTS], 'readwrite');
        const store = transaction.objectStore(STORE_PROMPTS);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
