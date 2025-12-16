import { ImageInfo, AdminSettings, AspectRatio, ImageAnalysisResult, ProviderCapabilities } from "../../types";
import { BaseProvider } from "../baseProvider";
import { registry } from "../providerRegistry";

const API_ENDPOINT = "https://api.x.ai/v1";

export class GrokProvider extends BaseProvider {
  readonly id = 'grok';
  readonly name = 'Grok (xAI)';
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
    captioning: true,
    tagging: false
  };

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.grok.apiKey;
  }

  async testConnection(settings: AdminSettings): Promise<void> {
    const { apiKey } = settings.providers.grok;
    if (!apiKey) throw new Error("API key is missing for Grok.");

    // Simple test: list models
    const response = await fetch(`${API_ENDPOINT}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error("Failed to connect to Grok.");
  }

  async analyzeImage(
    image: ImageInfo,
    settings: AdminSettings
  ): Promise<ImageAnalysisResult> {
    const apiKey = settings.providers.grok.apiKey;
    if (!apiKey) throw new Error("API key is missing for Grok.");

    const prompt = `Analyze the provided image. Your primary goal is to create a detailed "recreationPrompt" for an AI image generator. Describe the subject, their appearance (e.g., "person with long brown hair"), expression, clothing, and pose. Do not guess sensitive demographics like race or exact age; use general descriptive terms (e.g., "young adult," "elderly person"). Also describe the background, lighting, and overall artistic style (e.g., photograph, watercolor, 3D render). In addition to the "recreationPrompt", provide an array of 5-10 descriptive "keywords". Respond ONLY with a valid JSON object containing two keys: "keywords" and "recreationPrompt".`;

    const startTime = Date.now();

    const body = {
      model: 'grok-2-vision-1212',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image.dataUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Grok returned an empty response during analysis.");
      }

      const result = JSON.parse(content.trim());
      if (!result.keywords || !result.recreationPrompt) {
        throw new Error("Grok returned an invalid JSON structure.");
      }

      // Calculate stats
      const duration = (Date.now() - startTime) / 1000;
      result.stats = {
        duration,
        totalTokens: data.usage?.total_tokens,
        device: 'Cloud'
      };

      return result;

    } catch (e: any) {
      console.error(`Error during Grok API call for image ${image.file.name}:`, e);
      throw new Error(e.message || "An unknown error occurred during Grok analysis.");
    }
  }

  async generateImage(
    prompt: string,
    settings: AdminSettings,
    aspectRatio?: AspectRatio
  ): Promise<string> {
    const apiKey = settings.providers.grok.apiKey;
    const model = settings.providers.grok.generationModel;
    if (!apiKey) throw new Error("API key is missing for Grok.");
    if (!model) throw new Error("Image generation model is not configured for Grok.");

    const body = {
      model: model,
      prompt: prompt,
      n: 1,
      response_format: 'b64_json',
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const b64Json = data.data[0]?.b64_json;

      if (!b64Json) {
        throw new Error("Grok image generation failed to produce an image.");
      }

      return b64Json;

    } catch (e: any) {
      console.error("Error during Grok API call for image generation:", e);
      throw new Error(e.message || "An unknown error occurred during Grok image generation.");
    }
  }

  async generateKeywords(
    prompt: string,
    settings: AdminSettings
  ): Promise<string[]> {
    const apiKey = settings.providers.grok.apiKey;
    if (!apiKey) throw new Error("API key is missing for Grok.");

    const systemPrompt = `You are an AI assistant for a video creation app. Based on the following image description, generate a list of 10-12 creative, single-word or two-word keywords. These keywords should relate to potential motion, action, mood, style, and atmosphere for a viral video. Examples: dynamic, energetic, cinematic, moody, flowing, dramatic-lighting, slow-motion, supermodel-pose, action-shot. Output ONLY a single, comma-separated string of these keywords.`;

    const body = {
      model: 'grok-2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 100,
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Grok returned an empty response during keyword generation.");
      }

      return content.trim().split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);

    } catch (e: any) {
      console.error(`Error during Grok API call for keyword generation:`, e);
      throw new Error(e.message || "An unknown error occurred during Grok keyword generation.");
    }
  }

  async enhancePrompt(
    prompt: string,
    keywords: string[],
    settings: AdminSettings
  ): Promise<string> {
    const apiKey = settings.providers.grok.apiKey;
    if (!apiKey) throw new Error("API key is missing for Grok.");

    const keywordsString = keywords.join(', ');
    const systemPrompt = `You are a creative director for short, viral videos. Your task is to take a descriptive prompt for a static image and enhance it to be a dynamic video prompt. You MUST incorporate the feeling and ideas from the following keywords: ${keywordsString}. Infuse the original prompt with motion, feeling, and emotion. The output must be a single, concise video prompt only, without any conversational text, labels, or explanations.`;

    const body = {
      model: 'grok-2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Grok returned an empty response during prompt enhancement.");
      }

      return content.replace(/```(prompt|json)?/g, '').trim();

    } catch (e: any) {
      console.error(`Error during Grok API call for prompt enhancement:`, e);
      throw new Error(e.message || "An unknown error occurred during Grok prompt enhancement.");
    }
  }

  async adaptPrompt(
    originalPrompt: string,
    theme: string,
    settings: AdminSettings
  ): Promise<string> {
    const apiKey = settings.providers.grok.apiKey;
    if (!apiKey) throw new Error("API key is missing for Grok.");

    const systemPrompt = `You are an expert image prompt engineer. Your task is to rewrite an existing image description to incorporate a new specific theme or subject, while strictly maintaining the original image's composition, background, lighting, camera angle, and action.
    
    Original Prompt: ${originalPrompt}
    New Theme/Subject: ${theme}
    
    Output: A single, detailed image generation prompt that merges the new theme into the original scene. Do not add explanations.`;

    const body = {
      model: 'grok-2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: "Adapt the prompt." }
      ],
      temperature: 0.7,
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Grok returned an empty response during prompt adaptation.");
      }

      return content.trim();

    } catch (e: any) {
      console.error(`Error during Grok API call for prompt adaptation:`, e);
      throw new Error(e.message || "An unknown error occurred during Grok prompt adaptation.");
    }
  }
}

// Register Provider
registry.register(new GrokProvider());
