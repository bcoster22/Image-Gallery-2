
/**
 * Computes a "difference hash" (dHash) for an image.
 * This is a perceptual hash that is robust to scaling and aspect ratio changes.
 * 
 * Algorithm:
 * 1. Resize to 9x8 (72 pixels).
 * 2. Convert to grayscale.
 * 3. Calculate bit differences between adjacent pixels in each row.
 *    (pixel[x] > pixel[x+1] ? 1 : 0)
 * 4. Result is a 64-bit fingerprint.
 */
export const computeImageHash = (blob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const width = 9;
            const height = 8;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Draw resized image (grayscale conversion happens manually usually, 
            // or we can just read RGB and average them)
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            let hash = '';

            // Iterate rows
            for (let y = 0; y < height; y++) {
                // Iterate cols up to width - 1
                for (let x = 0; x < width - 1; x++) {
                    const indexCurrent = (y * width + x) * 4;
                    const indexRight = (y * width + (x + 1)) * 4;

                    // Calculate brightness (grayscale)
                    // R*0.299 + G*0.587 + B*0.114 is standard perception, 
                    // but simple average (R+G+B)/3 is often enough for hashing.
                    // Let's use simple average for speed.

                    const brightnessCurrent = (data[indexCurrent] + data[indexCurrent + 1] + data[indexCurrent + 2]) / 3;
                    const brightnessRight = (data[indexRight] + data[indexRight + 1] + data[indexRight + 2]) / 3;

                    if (brightnessCurrent > brightnessRight) {
                        hash += '1';
                    } else {
                        hash += '0';
                    }
                }
            }

            resolve(hash);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };

        img.src = url;
    });
};

/**
 * Calculates the Hamming Distance between two hashes (binary strings).
 * Lower distance = more similar.
 * Distance 0 = Exact match.
 * Distance < 5 = Likely duplicate (visual scaling/re-compression).
 */
export const calculateHammingDistance = (hash1: string, hash2: string): number => {
    if (hash1.length !== hash2.length) {
        throw new Error("Hashes must be of equal length");
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
};
