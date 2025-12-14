
import { ImageInfo } from '../types';
import { calculateHammingDistance } from '../utils/hashUtils';

export interface DuplicateGroup {
    id: string;
    images: ImageInfo[];
    similarityScore: number; // Lower is closer (average hamming distance)
}

/**
 * Finds groups of duplicate or similar images based on dHash.
 * @param images List of images to check.
 * @param threshold Max hamming distance to consider a match (default: 3).
 *                  0 = Exact match.
 *                  1-5 = Similar (scaling, compression).
 *                  > 10 = Different.
 * @returns List of duplicate groups.
 */
export const findDuplicates = (images: ImageInfo[], threshold: number = 3): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < images.length; i++) {
        const current = images[i];
        if (processedIds.has(current.id)) continue;
        if (!current.dHash) continue; // Skip if no hash yet

        const groupImages: ImageInfo[] = [current];

        for (let j = i + 1; j < images.length; j++) {
            const candidate = images[j];
            if (processedIds.has(candidate.id)) continue;
            if (!candidate.dHash) continue;

            try {
                const distance = calculateHammingDistance(current.dHash, candidate.dHash);
                if (distance <= threshold) {
                    groupImages.push(candidate);
                    processedIds.add(candidate.id); // Mark as processed so it's not a seed for another group
                }
            } catch (e) {
                console.error("Error comparing hashes", e);
            }
        }

        // Only create a group if we found duplicates
        if (groupImages.length > 1) {
            groups.push({
                id: `dup-group-${current.id}`,
                images: groupImages,
                similarityScore: 0 // TODO: Calculate average distance if needed
            });
            processedIds.add(current.id);
        }
    }

    return groups;
};
