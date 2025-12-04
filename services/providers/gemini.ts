import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold, SafetySetting } from "@google/genai";
import { ImageInfo, AdminSettings, GeminiSafetySettings, AspectRatio, ImageAnalysisResult, ProviderCapabilities } from "../../types";
import { dataUrlToBase64, getMimeTypeFromDataUrl, resizeImage } from '../../utils/fileUtils';
import { BaseProvider } from "../baseProvider";
import { registry } from "../providerRegistry";

const DEFAULT_SAFETY_SETTINGS: GeminiSafetySettings = {
  harassment: HarmBlockThreshold.BLOCK_NONE,
  hateSpeech: HarmBlockThreshold.BLOCK_NONE,
  sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
  dangerousContent: HarmBlockThreshold.BLOCK_NONE,
};

const buildGeminiSafetySettings = (settings: AdminSettings): SafetySetting[] => {
  const customSettings = settings.providers.gemini.safetySettings || DEFAULT_SAFETY_SETTINGS;
  return [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: customSettings.harassment },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: customSettings.hateSpeech },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: customSettings.sexuallyExplicit },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: customSettings.dangerousContent },
  ];
}

const getVeoSupportedAspectRatio = (aspectRatio: AspectRatio): '16:9' | '9:16' => {
  switch (aspectRatio) {
    case '3:4':
    case '9:16':
      return '9:16'; // Portrait
    case '1:1':
    case '4:3':
    case '16:9':
    default:
      return '16:9'; // Landscape or square
  }
};

export class GeminiProvider extends BaseProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    generation: true,
    animation: true,
    editing: true,
    textGeneration: true
  };

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.gemini.apiKey;
  }

  async testConnection(settings: AdminSettings): Promise<void> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });
    // Simple test: list models or generate a small text
    try {
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Hello",
      });
    } catch (e: any) {
      throw new Error(e.message || "Failed to connect to Gemini.");
    }
  }

  async analyzeImage(
    image: ImageInfo,
    settings: AdminSettings,
    onStatus?: (message: string) => void
  ): Promise<ImageAnalysisResult> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze the provided image. Your primary goal is to create a detailed "recreationPrompt" for an AI image generator. Describe the subject, their appearance (e.g., "person with long brown hair"), expression, clothing, and pose. Do not guess sensitive demographics like race or exact age; use general descriptive terms (e.g., "young adult," "elderly person"). Also describe the background, lighting, and overall artistic style (e.g., photograph, watercolor, 3D render). In addition to the "recreationPrompt", provide an array of 5-10 descriptive "keywords". Respond with a single JSON object containing only two keys: "keywords" and "recreationPrompt".`;

    const imagePart = {
      inlineData: {
        data: dataUrlToBase64(image.dataUrl),
        mimeType: getMimeTypeFromDataUrl(image.dataUrl)
      }
    };

    const contents = { parts: [{ text: prompt }, imagePart] };
    const startTime = Date.now();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Descriptive keywords for the image."
              },
              recreationPrompt: {
                type: Type.STRING,
                description: "A detailed prompt for recreating the image with an AI generator."
              }
            },
            required: ["keywords", "recreationPrompt"]
          },
          safetySettings: buildGeminiSafetySettings(settings),
        },
      });

      const promptBlockReason = response.promptFeedback?.blockReason;
      if (promptBlockReason) {
        throw new Error(`Gemini analysis was blocked for image ${image.file.name} for safety reasons: ${promptBlockReason}.`);
      }

      const candidate = response?.candidates?.[0];
      if (!candidate) {
        throw new Error("Gemini analysis returned an invalid response with no candidates.");
      }

      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        const details = candidate.finishMessage || response.promptFeedback?.blockReason || 'No details provided.';
        throw new Error(`Gemini analysis failed for image ${image.file.name}. Reason: ${candidate.finishReason}. Details: ${details}`);
      }

      const text = response?.text;
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error("Gemini returned an empty response during analysis.");
      }

      const result = JSON.parse(text.trim());

      // Calculate stats
      // Gemini doesn't always return token usage in the main response object in the same way, 
      // but we can approximate duration.
      // usageMetadata is available on response
      const usage = response.usageMetadata;
      const duration = (Date.now() - startTime) / 1000;

      result.stats = {
        duration: duration,
        totalTokens: usage?.totalTokenCount,
        device: 'Cloud'
      };

      return result;

    } catch (e: any) {
      console.error(`Error during Gemini API call for image ${image.file.name}:`, e);
      throw new Error(e.message || "An unknown error occurred during Gemini analysis.");
    }
  }

  async generateImage(
    prompt: string,
    settings: AdminSettings,
    aspectRatio?: AspectRatio
  ): Promise<string> {
    const apiKey = settings.providers.gemini.apiKey;
    const model = settings.providers.gemini.generationModel;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    if (!model) throw new Error("Image generation model is not configured for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
      }

      throw new Error("Gemini image generation failed to produce an image.");
    } catch (e: any) {
      console.error("Error during Gemini API call for image generation:", e);
      throw new Error(e.message || "An unknown error occurred during Gemini image generation.");
    }
  }

  async editImage(
    image: ImageInfo,
    prompt: string,
    settings: AdminSettings
  ): Promise<string> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    const resizedDataUrl = await resizeImage(image.dataUrl, { maxDimension: 1536 });

    const imagePart = {
      inlineData: {
        data: dataUrlToBase64(resizedDataUrl),
        mimeType: getMimeTypeFromDataUrl(resizedDataUrl),
      },
    };
    const textPart = { text: prompt };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE],
          safetySettings: buildGeminiSafetySettings(settings),
        },
      });

      const promptBlockReason = response.promptFeedback?.blockReason;
      if (promptBlockReason) {
        throw new Error(`Gemini image editing was blocked due to prompt: ${promptBlockReason}.`);
      }

      const candidate = response?.candidates?.[0];
      if (!candidate) {
        throw new Error("Gemini image editing returned an invalid response with no candidates.");
      }

      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        const details = candidate.finishMessage || 'No details provided.';
        throw new Error(`Gemini image editing failed. Reason: ${candidate.finishReason}. This is often due to the source image content. Details: ${details}`);
      }

      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return base64ImageBytes;
          }
        }
      }

      console.error("Gemini image editing response did not contain an image. Full response:", JSON.stringify(response, null, 2));
      throw new Error("Gemini image editing failed to produce an image.");

    } catch (e: any) {
      console.error("Error during Gemini API call for image editing:", e);
      throw new Error(e.message || "An unknown error occurred during Gemini image editing.");
    }
  }

  async animateImage(
    image: ImageInfo | null,
    prompt: string,
    aspectRatio: AspectRatio,
    settings: AdminSettings
  ): Promise<{ uri: string, apiKey: string }> {
    const apiKey = settings.providers.gemini.apiKey;
    const model = settings.providers.gemini.veoModel;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    if (!model) throw new Error("Video generation model is not configured for Gemini.");

    const ai = new GoogleGenAI({ apiKey });
    const veoAspectRatio = getVeoSupportedAspectRatio(aspectRatio);

    const requestBody: any = {
      model: model,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: veoAspectRatio,
      }
    };

    if (image) {
      const resizedDataUrl = await resizeImage(image.dataUrl, { maxDimension: 1024 });
      requestBody.image = {
        imageBytes: dataUrlToBase64(resizedDataUrl),
        mimeType: getMimeTypeFromDataUrl(resizedDataUrl),
      };
    }

    try {
      let operation = await ai.models.generateVideos(requestBody);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.error) {
        throw new Error(`Veo operation failed: ${operation.error.message}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

      if (!downloadLink) {
        const raiReasons = operation.response?.raiMediaFilteredReasons?.join(', ');
        let errorMessage = "Veo operation finished without error, but no video URI was found.";
        if (raiReasons) {
          errorMessage = `Video generation was blocked by safety policies. Reason: ${raiReasons}`;
        }
        console.error("Veo operation finished without error, but no video URI was found. Full response:", JSON.stringify(operation.response, null, 2));
        throw new Error(errorMessage);
      }

      return { uri: downloadLink, apiKey };

    } catch (e: any) {
      console.error("Error during Gemini Veo API call:", JSON.stringify(e, null, 2));
      throw new Error(e.message || "An unknown error occurred during Gemini video generation.");
    }
  }

  async generateKeywords(
    prompt: string,
    settings: AdminSettings
  ): Promise<string[]> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an AI assistant for a video creation app. Based on the following image description, generate a list of 10-12 creative, single-word or two-word keywords. These keywords should relate to potential motion, action, mood, style, and atmosphere for a viral video. Examples: dynamic, energetic, cinematic, moody, flowing, dramatic-lighting, slow-motion, supermodel-pose, action-shot. Output ONLY a single, comma-separated string of these keywords.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.8,
          safetySettings: buildGeminiSafetySettings(settings),
        },
      });

      const text = response.text.trim();
      if (!text) return [];
      return text.split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);

    } catch (e: any) {
      console.error("Error during Gemini API call for keyword generation:", e);
      throw new Error(e.message || "An unknown error occurred during Gemini keyword generation.");
    }
  }

  async enhancePrompt(
    prompt: string,
    keywords: string[],
    settings: AdminSettings
  ): Promise<string> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    const keywordsString = keywords.join(', ');
    const systemInstruction = `You are a creative director for short, viral videos. Your task is to take a descriptive prompt for a static image and enhance it to be a dynamic video prompt. You MUST incorporate the feeling and ideas from the following keywords: ${keywordsString}. Infuse the original prompt with motion, feeling, and emotion. The output must be a single, concise video prompt only, without any conversational text, labels, or explanations.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          safetySettings: buildGeminiSafetySettings(settings),
        },
      });
      return response.text.trim();
    } catch (e: any) {
      console.error("Error during Gemini API call for prompt enhancement with keywords:", e);
      throw new Error(e.message || "An unknown error occurred during Gemini prompt enhancement.");
    }
  }

  async adaptPrompt(
    originalPrompt: string,
    theme: string,
    settings: AdminSettings
  ): Promise<string> {
    const apiKey = settings.providers.gemini.apiKey;
    if (!apiKey) throw new Error("API key is missing for Gemini.");
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert image prompt engineer. Your task is to rewrite an existing image description to incorporate a new specific theme or subject, while strictly maintaining the original image's composition, background, lighting, camera angle, and action.
  
    Original Prompt: ${originalPrompt}
    New Theme/Subject: ${theme}
  
    Output: A single, detailed image generation prompt that merges the new theme into the original scene. Do not add explanations.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Adapt the prompt.",
        config: {
          systemInstruction,
          temperature: 0.7,
          safetySettings: buildGeminiSafetySettings(settings),
        },
      });
      return response.text.trim();
    } catch (e: any) {
      console.error("Error during Gemini API call for prompt adaptation:", e);
      throw new Error(e.message || "An unknown error occurred during Gemini prompt adaptation.");
    }
  }
}

// Register Provider
registry.register(new GeminiProvider());

// Helper for prompt shortening (not part of interface but used by Grok)
export const shortenPrompt = async (
  prompt: string,
  settings: AdminSettings
): Promise<string> => {
  const apiKey = settings.providers.gemini.apiKey;
  if (!apiKey) throw new Error("API key is missing for Gemini.");
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a prompt shortener. You will be given a long, descriptive prompt for an AI image generator. Your task is to shorten it to be under 900 characters while preserving the core artistic direction, subject matter, and essential details. Do not add any conversational text or explanations. Only output the shortened prompt.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        safetySettings: buildGeminiSafetySettings(settings),
      },
    });
    return response.text;
  } catch (e: any) {
    console.error("Error during Gemini API call for prompt shortening:", e);
    throw new Error(e.message || "An unknown error occurred during prompt shortening.");
  }
};
