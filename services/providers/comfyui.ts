import { ImageInfo, AdminSettings, AspectRatio } from "../../types";

const NOT_IMPLEMENTED_ERROR = "This ComfyUI function is not yet implemented. Please check your workflow configuration.";

// Default Text-to-Image Workflow (SDXL or SD1.5 compatible structure)
// This is a simplified workflow. In a real scenario, we might need to load this from a file or user input.
const DEFAULT_WORKFLOW = {
  "3": {
    "inputs": {
      "seed": 0,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "4": {
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.ckpt" // Default, user might need to change this in ComfyUI or we make it configurable
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "5": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "text": "", // Will be replaced
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "text, watermark",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative)"
    }
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": ["8", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
};

export const analyzeImage = async (
  image: ImageInfo,
  settings: AdminSettings
): Promise<{ keywords: string[], recreationPrompt: string }> => {
  throw new Error("Image analysis is not supported by the ComfyUI provider.");
};

export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<string> => {
  const endpoint = settings.providers.comfyui.endpoint || 'http://127.0.0.1:8188';

  // 1. Prepare Workflow
  const workflow = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));

  // Set Prompt
  workflow["6"].inputs.text = prompt;

  // Set Dimensions based on Aspect Ratio
  const [width, height] = getDimensions(aspectRatio);
  workflow["5"].inputs.width = width;
  workflow["5"].inputs.height = height;

  // Randomize Seed
  workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);

  try {
    // 2. Queue Prompt
    const queueResponse = await fetch(`${endpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!queueResponse.ok) {
      throw new Error(`Failed to queue prompt: ${queueResponse.statusText}`);
    }

    const queueData = await queueResponse.json();
    const promptId = queueData.prompt_id;

    // 3. Wait for Execution (Polling)
    // In a real app, we should use WebSocket, but polling history is easier for a simple implementation
    let historyData = null;
    let attempts = 0;
    const maxAttempts = 60; // 1 minute timeout roughly

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));

      const historyResponse = await fetch(`${endpoint}/history/${promptId}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        if (history[promptId]) {
          historyData = history[promptId];
          break;
        }
      }
      attempts++;
    }

    if (!historyData) {
      throw new Error("Timeout waiting for image generation.");
    }

    // 4. Get Image URL
    const outputs = historyData.outputs;
    // Find the SaveImage node output (node "9" in our default workflow)
    const images = outputs["9"]?.images;

    if (!images || images.length === 0) {
      throw new Error("No images generated.");
    }

    const filename = images[0].filename;
    const subfolder = images[0].subfolder;
    const type = images[0].type;

    const imageUrl = `${endpoint}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;

    // Fetch the image to convert to blob/base64 if needed, or just return the URL
    // For local ComfyUI, the URL is accessible if the browser can reach localhost
    return imageUrl;

  } catch (error) {
    console.error("ComfyUI Generation Error:", error);
    throw error;
  }
};

export const animateImage = async (
  image: ImageInfo | null,
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<{ uri: string, apiKey: string }> => {
  throw new Error(NOT_IMPLEMENTED_ERROR);
};

export const editImage = async (
  image: ImageInfo,
  prompt: string,
  settings: AdminSettings
): Promise<string> => {
  throw new Error(NOT_IMPLEMENTED_ERROR);
}

export const generateKeywordsForPrompt = async (
  prompt: string,
  settings: AdminSettings
): Promise<string[]> => {
  throw new Error("Text generation is not supported by the ComfyUI provider.");
};

export const enhancePromptWithKeywords = async (
  prompt: string,
  keywords: string[],
  settings: AdminSettings
): Promise<string> => {
  throw new Error("Text generation is not supported by the ComfyUI provider.");
};

export const adaptPromptToTheme = async (
  originalPrompt: string,
  theme: string,
  settings: AdminSettings
): Promise<string> => {
  throw new Error("Text generation is not supported by the ComfyUI provider.");
};

function getDimensions(aspectRatio: AspectRatio): [number, number] {
  switch (aspectRatio) {
    case '1:1': return [512, 512];
    case '16:9': return [912, 512]; // Approx
    case '9:16': return [512, 912]; // Approx
    case '4:3': return [680, 512];
    case '3:4': return [512, 680];
    default: return [512, 512];
  }
}
