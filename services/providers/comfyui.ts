import { ImageInfo, AdminSettings, AspectRatio, ProviderCapabilities, GenerationResult } from "../../types";
import { BaseProvider } from "../baseProvider";
import { registry } from "../providerRegistry";

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
    "_meta": { "title": "KSampler" }
  },
  "4": {
    "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" },
    "class_type": "CheckpointLoaderSimple",
    "_meta": { "title": "Load Checkpoint" }
  },
  "5": {
    "inputs": { "width": 512, "height": 512, "batch_size": 1 },
    "class_type": "EmptyLatentImage",
    "_meta": { "title": "Empty Latent Image" }
  },
  "6": {
    "inputs": { "text": "", "clip": ["4", 1] },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Prompt)" }
  },
  "7": {
    "inputs": { "text": "text, watermark", "clip": ["4", 1] },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Negative)" }
  },
  "8": {
    "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE Decode" }
  },
  "9": {
    "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "Save Image" }
  }
};

function getDimensions(aspectRatio: AspectRatio): [number, number] {
  switch (aspectRatio) {
    case '1:1': return [512, 512];
    case '16:9': return [912, 512];
    case '9:16': return [512, 912];
    case '4:3': return [680, 512];
    case '3:4': return [512, 680];
    default: return [512, 512];
  }
}

export class ComfyUIProvider extends BaseProvider {
  readonly id = 'comfyui';
  readonly name = 'ComfyUI (Local)';
  readonly capabilities: ProviderCapabilities = {
    vision: false,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: false,
    captioning: false,
    tagging: false
  };

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.comfyui.endpoint;
  }

  async testConnection(settings: AdminSettings): Promise<void> {
    const endpoint = settings.providers.comfyui.endpoint || 'http://127.0.0.1:8188';
    try {
      const response = await fetch(`${endpoint}/system_stats`);
      if (!response.ok) throw new Error("Failed to connect to ComfyUI.");
    } catch (e: any) {
      throw new Error(e.message || "Failed to connect to ComfyUI.");
    }
  }

  async generateImageFromPrompt(
    prompt: string,
    aspectRatio: AspectRatio,
    sourceImage: ImageInfo | undefined,
    overrides: any,
    settings: AdminSettings
  ): Promise<GenerationResult> {
    const endpoint = settings.providers.comfyui.endpoint || 'http://127.0.0.1:8188';

    const workflow = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));
    workflow["6"].inputs.text = prompt;

    const [width, height] = getDimensions(aspectRatio || '1:1');
    workflow["5"].inputs.width = width;
    workflow["5"].inputs.height = height;

    workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000000);

    try {
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

      let historyData = null;
      let attempts = 0;
      const maxAttempts = 60;

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

      const outputs = historyData.outputs;
      const images = outputs["9"]?.images;

      if (!images || images.length === 0) {
        throw new Error("No images generated.");
      }

      const filename = images[0].filename;
      const subfolder = images[0].subfolder;
      const type = images[0].type;

      const imageUrl = `${endpoint}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
      return {
        image: imageUrl,
        metadata: {
          format: 'url'
        }
      };

    } catch (error) {
      console.error("ComfyUI Generation Error:", error);
      throw error;
    }
  }
}

// Register Provider
registry.register(new ComfyUIProvider());
