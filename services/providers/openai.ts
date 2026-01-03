import { ImageInfo, AdminSettings, AspectRatio, ImageAnalysisResult, ProviderCapabilities, GenerationResult } from "../../types";
import { BaseProvider } from "../baseProvider";
import { registry } from "../providerRegistry";

const API_ENDPOINT = "https://api.openai.com/v1";

const mapAspectRatioToSize = (aspectRatio: AspectRatio): '1024x1024' | '1792x1024' | '1024x1792' => {
  switch (aspectRatio) {
    case '16:9':
    case '4:3': // Closest match
      return '1792x1024';
    case '9:16':
    case '3:4': // Closest match
      return '1024x1792';
    case '1:1':
    default:
      return '1024x1024';
  }
};

const callChatCompletions = async (
  messages: { role: 'system' | 'user'; content: string }[],
  settings: AdminSettings
): Promise<string> => {
  const { apiKey, organizationId, projectId, textGenerationModel } = settings.providers.openai;
  if (!apiKey) throw new Error("API key is missing for OpenAI.");
  if (!textGenerationModel) throw new Error("Text generation model is not configured for OpenAI.");

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (organizationId) headers['OpenAI-Organization'] = organizationId;
  if (projectId) headers['OpenAI-Project'] = projectId;

  const body = {
    model: textGenerationModel,
    messages,
    temperature: 0.7,
  };

  const response = await fetch(`${API_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message || `OpenAI API error (${response.status})`;
    throw new Error(errorMessage);
  }

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  // Attach stats to the string result if possible? 
  // No, callChatCompletions returns a string. 
  // We need to refactor analyzeImage to handle stats separately or change callChatCompletions return type.
  // For now, let's keep callChatCompletions as is and handle stats in analyzeImage if we were using it there.
  // But wait, OpenAIProvider.analyzeImage is not implemented yet (it throws error).
  // So we don't need to update it for analyzeImage stats yet unless we implement it.
  // However, the task says "Update all providers... to return stats".
  // OpenAI analyzeImage is NOT implemented in the current codebase (it throws NOT_IMPLEMENTED_ERROR).
  // So I will skip OpenAI analyzeImage stats for now, as it's not used.
  // But I should check if I need to implement it? The plan said "Update analyzeImage...".
  // If it's not implemented, I can't update it.
  // I will check if I should implement it. The user didn't ask to implement OpenAI vision, just refactor.
  // So I will leave it as is.
  return content;
};

export class OpenAIProvider extends BaseProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities: ProviderCapabilities = {
    vision: false, // Could be true if we implement GPT-4 Vision
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
    captioning: false,
    tagging: false
  };

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.openai.apiKey;
  }

  async testConnection(settings: AdminSettings): Promise<void> {
    const { apiKey } = settings.providers.openai;
    if (!apiKey) throw new Error("API key is missing for OpenAI.");
    // Simple test: list models or just check if key is valid by making a cheap call
    // Using models endpoint is safer/cheaper than generation
    const response = await fetch(`${API_ENDPOINT}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error("Failed to connect to OpenAI.");
  }

  async generateImageFromPrompt(
    prompt: string,
    aspectRatio: AspectRatio,
    sourceImage: ImageInfo | undefined,
    overrides: any,
    settings: AdminSettings
  ): Promise<GenerationResult> {
    const { apiKey, organizationId, projectId, generationModel } = settings.providers.openai;
    if (!apiKey) throw new Error("API key is missing for OpenAI.");
    if (!generationModel) throw new Error("Image generation model is not configured for OpenAI.");

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (organizationId) headers['OpenAI-Organization'] = organizationId;
    if (projectId) headers['OpenAI-Project'] = projectId;

    const body = {
      model: generationModel,
      prompt: prompt,
      n: 1,
      size: mapAspectRatioToSize(aspectRatio || '1:1'),
      response_format: 'b64_json',
    };

    try {
      const response = await fetch(`${API_ENDPOINT}/images/generations`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.message || `OpenAI API error (${response.status})`;
        throw new Error(errorMessage);
      }

      const b64Json = data.data[0]?.b64_json;

      if (!b64Json) {
        throw new Error("OpenAI image generation failed to produce an image.");
      }

      return {
        image: b64Json,
        metadata: {
          format: 'base64'
        }
      };

    } catch (e: any) {
      console.error("Error during OpenAI API call for image generation:", e);
      throw new Error(e.message || "An unknown error occurred during OpenAI image generation.");
    }
  }

  async generateKeywords(
    prompt: string,
    settings: AdminSettings
  ): Promise<string[]> {
    const systemPrompt = `You are an AI assistant for a video creation app. Based on the following image description, generate a list of 10-12 creative, single-word or two-word keywords. These keywords should relate to potential motion, action, mood, style, and atmosphere for a viral video. Examples: dynamic, energetic, cinematic, moody, flowing, dramatic-lighting, slow-motion, supermodel-pose, action-shot. Output ONLY a single, comma-separated string of these keywords.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt }
    ];

    const content = await callChatCompletions(messages, settings);
    return content.trim().split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);
  }

  async enhancePrompt(
    prompt: string,
    keywords: string[],
    settings: AdminSettings
  ): Promise<string> {
    const keywordsString = keywords.join(', ');
    const systemPrompt = `You are a creative director for short, viral videos. Your task is to take a descriptive prompt for a static image and enhance it to be a dynamic video prompt. You MUST incorporate the feeling and ideas from the following keywords: ${keywordsString}. Infuse the original prompt with motion, feeling, and emotion. The output must be a single, concise video prompt only, without any conversational text, labels, or explanations.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt }
    ];

    return await callChatCompletions(messages, settings);
  }

  async adaptPrompt(
    originalPrompt: string,
    theme: string,
    settings: AdminSettings
  ): Promise<string> {
    const systemPrompt = `You are an expert image prompt engineer. Your task is to rewrite an existing image description to incorporate a new specific theme or subject, while strictly maintaining the original image's composition, background, lighting, camera angle, and action.
    
    Original Prompt: ${originalPrompt}
    New Theme/Subject: ${theme}
    
    Output: A single, detailed image generation prompt that merges the new theme into the original scene. Do not add explanations.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: "Adapt the prompt." }
    ];

    return await callChatCompletions(messages, settings);
  }
}

// Register Provider
registry.register(new OpenAIProvider());
