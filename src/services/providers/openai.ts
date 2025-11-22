
import { ImageInfo, AdminSettings, AspectRatio } from "../../types";

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
  return content;
};

export const testConnection = async (settings: AdminSettings): Promise<void> => {
    const { apiKey, organizationId, projectId } = settings.providers.openai;
    if (!apiKey) throw new Error("API key is missing.");

    const headers: HeadersInit = {
        'Authorization': `Bearer ${apiKey}`,
    };
    if (organizationId) headers['OpenAI-Organization'] = organizationId;
    if (projectId) headers['OpenAI-Project'] = projectId;

    try {
        // Fetch models to verify key and permissions
        const response = await fetch(`${API_ENDPOINT}/models`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data?.error?.message || `HTTP ${response.status}`);
        }
    } catch (error: any) {
        console.error("OpenAI connection test failed:", error);
        throw new Error(error.message || "Failed to connect to OpenAI API.");
    }
};

const NOT_IMPLEMENTED_ERROR = "This OpenAI function is not implemented.";

export const analyzeImage = async (
  image: ImageInfo,
  settings: AdminSettings
): Promise<{ keywords: string[], recreationPrompt: string }> => {
  throw new Error(NOT_IMPLEMENTED_ERROR);
};

export const generateImageFromPrompt = async (
  prompt: string, 
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<string> => {
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
      size: mapAspectRatioToSize(aspectRatio),
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
    
    return b64Json;

  } catch(e: any) {
    console.error("Error during OpenAI API call for image generation:", e);
    throw new Error(e.message || "An unknown error occurred during OpenAI image generation.");
  }
};

export const animateImage = async (
  image: ImageInfo | null,
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<{uri: string, apiKey: string}> => {
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
  const systemPrompt = `You are an AI assistant for a video creation app. Based on the following image description, generate a list of 10-12 creative, single-word or two-word keywords. These keywords should relate to potential motion, action, mood, style, and atmosphere for a viral video. Examples: dynamic, energetic, cinematic, moody, flowing, dramatic-lighting, slow-motion, supermodel-pose, action-shot. Output ONLY a single, comma-separated string of these keywords.`;
  
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: prompt }
  ];

  const content = await callChatCompletions(messages, settings);
  return content.trim().split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);
};

export const enhancePromptWithKeywords = async (
  prompt: string,
  keywords: string[],
  settings: AdminSettings
): Promise<string> => {
  const keywordsString = keywords.join(', ');
  const systemPrompt = `You are a creative director for short, viral videos. Your task is to take a descriptive prompt for a static image and enhance it to be a dynamic video prompt. You MUST incorporate the feeling and ideas from the following keywords: ${keywordsString}. Infuse the original prompt with motion, feeling, and emotion. The output must be a single, concise video prompt only, without any conversational text, labels, or explanations.`;
  
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: prompt }
  ];

  return await callChatCompletions(messages, settings);
};
