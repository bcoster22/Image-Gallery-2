import { AspectRatio } from "../types";

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const dataUrlToBase64 = (dataUrl: string): string => {
  const parts = dataUrl.split(',');
  if (parts.length < 2 || !parts[1]) {
    throw new Error('Invalid Data URL format');
  }
  return parts[1];
};

export const dataUrlToBlob = (dataUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Trim any whitespace
      const trimmedDataUrl = dataUrl.trim();

      const parts = trimmedDataUrl.split(',');
      if (parts.length < 2) {
        throw new Error('Invalid Data URL format');
      }

      const matches = parts[0].match(/^data:(.+);base64$/);
      if (!matches || matches.length < 2) {
        throw new Error('Data URL must be base64 encoded');
      }

      const mimeType = matches[1];
      // Remove any whitespace from base64 string (common issue)
      const base64 = parts[1].replace(/\s/g, '');

      // Validate base64 characters
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        throw new Error('Invalid base64 characters in data URL');
      }

      // Convert base64 to binary
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
};

export const getMimeTypeFromDataUrl = (dataUrl: string): string => {
  const matches = dataUrl.match(/^data:(.+);base64,/);
  if (!matches || matches.length < 2) {
    throw new Error('Could not extract MIME type from Data URL');
  }
  return matches[1];
}

const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

export const getImageMetadata = (dataUrl: string): Promise<{ width: number, height: number, aspectRatio: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const commonDivisor = gcd(img.width, img.height);
      const aspectRatio = `${img.width / commonDivisor}:${img.height / commonDivisor}`;
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio,
      });
    };
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
  });
};

export const getClosestSupportedAspectRatio = (aspectRatio: string): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' => {
  const supportedRatios = {
    '1:1': 1,
    '3:4': 3 / 4,
    '4:3': 4 / 3,
    '9:16': 9 / 16,
    '16:9': 16 / 9,
  };

  const [w, h] = aspectRatio.split(':').map(Number);
  if (!h || !w) return '1:1';
  const decimalRatio = w / h;

  let closest: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
  let minDiff = Infinity;

  for (const [key, value] of Object.entries(supportedRatios)) {
    const diff = Math.abs(decimalRatio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key as '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    }
  }
  return closest;
};

export const reverseAspectRatio = (aspectRatio: string): string => {
  return aspectRatio.split(':').reverse().join(':');
};

export const resizeImage = (dataUrl: string, options: { maxDimension: number }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { maxDimension } = options;
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      let newWidth = width;
      let newHeight = height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          newWidth = maxDimension;
          newHeight = (height * maxDimension) / width;
        } else {
          newHeight = maxDimension;
          newWidth = (width * maxDimension) / height;
        }
      } else {
        // No resize needed, return original
        return resolve(dataUrl);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(newWidth);
      canvas.height = Math.round(newHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Forcing PNG to avoid quality loss and ensure compatibility.
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image could not be loaded for resizing.'));
    img.src = dataUrl;
  });
};

export const generateVideoThumbnail = (videoBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;

    video.onloadedmetadata = () => {
      video.currentTime = 0.1; // Seek to a very early frame
    };

    video.onseeked = async () => {
      if (!context) {
        reject(new Error('Canvas 2D context is not available.'));
        return;
      }
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get data URL from canvas
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Clean up the blob URL
      URL.revokeObjectURL(video.src);

      resolve(dataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail generation.'));
    };

    // Start loading the video
    video.play().catch(e => {
      // Autoplay is often prevented, but the events should still fire for metadata loading.
    });
  });
};

export const createGenericPlaceholder = (aspectRatio: AspectRatio): string => {
  const ratios = {
    '1:1': { w: 100, h: 100 },
    '3:4': { w: 75, h: 100 },
    '4:3': { w: 100, h: 75 },
    '9:16': { w: 56, h: 100 },
    '16:9': { w: 100, h: 56 },
  };
  const { w, h } = ratios[aspectRatio] || ratios['16:9'];
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        <rect width="${w}" height="${h}" fill="#374151" />
        <g transform="translate(${(w - 50) / 2} ${(h - 50) / 2}) scale(0.5)">
            <path d="M41.3 7.8C52.4 13.1 59 24.3 59 36.5c0 14.8-10.4 27.2-24.1 29.7 -2.4.4-4.2-1.4-3.8-3.8.3-2.3 2-10.3 2-10.3s-2.9 5.8-3.3 6.6c-1.2 2.6-4.2 3.6-6.8 2.5 -2.6-1.2-3.6-4.2-2.5-6.8 1-2.3 6.3-13.1 6.3-13.1s-4.3.8-5 .8c-2.6.2-4.9-1.8-4.8-4.4.1-2.6 2.4-4.6 5-4.5 1.5.1 7.2 1.9 7.2 1.9s-1-4.8-1.5-5.6C24.3 9.2 25.4 6 28 4.9c2.6-1.2 5.5.1 6.8 2.6 1 2.1 1.1 5.8 1.1 5.8s3.9-1.4 4.6-1.7c2.6-.9 5.3 1 5.8 3.6.5 2.5-1.1 5-3.6 5.5 -1.2.2-4.8.1-4.8.1s2.8 8.6 3.3 9.4c1.2 2.6.1 5.8-2.5 6.9 -2.6 1.2-5.6-.1-6.8-2.6 -1.1-2.3-1.3-6.2-1.3-6.2s-7.1 1.7-8.1 2c-2.6.9-3.9 3.9-3 6.5 .9 2.6 3.9 3.9 6.5 3 2-.7 7-3.3 7-3.3s.2 2.8.4 3.7c.9 2.6 3.9 3.9 6.5 3 2.6-.9 3.9-3.9 3-6.5C45.2 57 41 43.8 41 43.8s3.8 1.2 4.4 1.4c2.6.8 5.3-1.2 5.9-3.8.6-2.6-1.1-5.1-3.8-5.7 -1.3-.3-4.5-.3-4.5-.3s2.1-7.8 2.5-8.6c1.2-2.6.1-5.6-2.5-6.8 -2.6-1.2-5.6.1-6.8 2.5 -1.1 2.3-1.6 6.3-1.6 6.3s-5.6-2.4-6.5-2.8c-2.6-.9-5.3 1-5.9 3.6 -.6 2.6 1.1 5.1 3.8 5.7 1.3.3 5 .4 5 .4S23 48.6 22.5 49.8c-1.2 2.6-.1 5.6 2.5 6.8 2.6 1.2 5.6-.1 6.8-2.5 1.1-2.3 2.1-9.2 2.1-9.2s6.9.1 7.9.1c2.6-.1 4.7-2.3 4.6-4.9s-2.3-4.7-4.9-4.6c-1.6.1-4.1.8-4.1.8s-2.2-9.1-2.6-10.3c-1.2-2.6-4.1-3.8-6.8-2.6 -2.6 1.2-3.8 4.1-2.6 6.8C25.3 24.1 31.7 37 31.7 37s-3.9-1-4.5-1.1c-2.6-.5-5.1 1.3-5.7 3.8 -.5 2.6 1.2 5.1 3.8 5.7 1.3.3 5.4.3 5.4.3s-3.7 7.9-4.2 8.9c-1.2 2.6-.1 5.6 2.5 6.8 2.6 1.2 5.6-.1 6.8-2.5 1.1-2.3 1.1-6.1 1.1-6.1S39 52.8 40.1 53.4c2.6 1.4 5.8.3 7-2.3C49.5 48 44.5 34.6 44.5 34.6s3.3.4 3.9.5c2.6.5 5.1-1.3 5.7-3.8C54.6 28.8 53 26.3 50.3 25.8c-1.3-.2-4.1-.2-4.1-.2s1.4-5.6 1.8-6.4c1.2-2.6.1-5.6-2.5-6.8 -2.6-1.2-5.6.1-6.8 2.5 -1 2.2-1.2 5.5-1.2 5.5z" 
            fill="#4b5563" opacity="0.6" />
        </g>
    </svg>`;
  const base64 = btoa(svgContent);
  return `data:image/svg+xml;base64,${base64}`;
};

const parseA1111Parameters = (data: string): string | null => {
  const lines = data.split('\n');
  const negativePromptIndex = lines.findIndex(line => line.startsWith('Negative prompt:'));
  const mainPromptLines = negativePromptIndex > -1 ? lines.slice(0, negativePromptIndex) : lines;

  let fullPrompt = mainPromptLines.join('\n').trim();
  if (!fullPrompt) return null;

  // Remove trailing metadata like "Steps: 20, Sampler: DPM++ ..."
  const metadataKeywords = ['Steps:', 'Sampler:', 'CFG scale:', 'Seed:', 'Size:'];
  let firstMetadataIndex = -1;

  for (const keyword of metadataKeywords) {
    const index = fullPrompt.lastIndexOf(keyword);
    if (index > -1) {
      if (firstMetadataIndex === -1 || index < firstMetadataIndex) {
        firstMetadataIndex = index;
      }
    }
  }

  if (firstMetadataIndex > -1) {
    fullPrompt = fullPrompt.substring(0, firstMetadataIndex).trim();
  }

  return fullPrompt.replace(/,$/, '').trim(); // Remove trailing comma and trim
};

export const extractAIGenerationMetadata = async (file: File): Promise<{ originalMetadataPrompt?: string; keywords?: string[] } | null> => {
  // We will only support PNG for now as it's common and simpler to parse client-side
  if (file.type !== 'image/png') {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return resolve(null);

      const dataView = new DataView(buffer);
      // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (dataView.getUint32(0) !== 0x89504E47 || dataView.getUint32(4) !== 0x0D0A1A0A) {
        return resolve(null);
      }

      let offset = 8;
      while (offset < dataView.byteLength) {
        const length = dataView.getUint32(offset);
        const type = new TextDecoder().decode(buffer.slice(offset + 4, offset + 8));

        if (type === 'tEXt') {
          const keywordAndData = new TextDecoder('latin1').decode(buffer.slice(offset + 8, offset + 8 + length));
          const [keyword, ...dataParts] = keywordAndData.split('\0');
          const data = dataParts.join('\0');

          if (keyword === 'parameters') {
            const prompt = parseA1111Parameters(data);
            if (prompt) {
              // Map to originalMetadataPrompt
              resolve({ originalMetadataPrompt: prompt });
              return;
            }
          }
        }

        // End of file
        if (type === 'IEND') {
          break;
        }

        offset += 12 + length; // chunk = length(4) + type(4) + data(length) + crc(4)
      }
      resolve(null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
};