
import { ImageInfo, AdminSettings, AspectRatio, ImageAnalysisResult } from "../../types";

const callMoondreamApi = async (
  fullUrl: string,
  apiKey: string | null,
  body: object,
  isCloud: boolean,
  timeoutSeconds: number = 120
): Promise<{ text: string, stats?: any }> => {
  if (!fullUrl) {
    throw new Error("Moondream API endpoint URL is missing.");
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (isCloud) {
      headers['X-Moondream-Auth'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  try {
    console.log(`DEBUG: Sending request to ${fullUrl}`, JSON.stringify(body, null, 2));
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Moondream API Error: ${response.status} - ${errorBody}`);
      throw new Error(`Moondream API error (${response.status}): ${errorBody}`);
    }

    // Handle streaming response if requested
    if ((body as any).stream) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let stats = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last line in the buffer if it's incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6); // Remove "data: " prefix
                const data = JSON.parse(jsonStr);

                if (data.chunk) {
                  fullText += data.chunk;
                }
                if (data.stats) {
                  stats = data.stats;
                }
                if (data.completed) {
                  // Stream finished
                }
              } catch (e) {
                console.warn('Failed to parse SSE line:', trimmedLine, e);
              }
            }
          }
        }
      }

      console.log('DEBUG: Moondream Streamed Response (Accumulated):', fullText);

      // Construct a JSON object that matches the expected output structure
      const result = {
        caption: fullText,
        _stats: stats
      };

      return { text: JSON.stringify(result), stats };
    }

    const data = await response.json();
    console.log('DEBUG: Moondream API response:', JSON.stringify(data, null, 2));

    // Check for specific timeout error in the data
    if (data.error && (data.status === 'timeout' || data.error === 'Request timeout')) {
      throw new Error("Moondream Request Timeout: The operation took too long. Try using a smaller image or running on a faster machine (GPU).");
    }

    // Check for other errors (e.g. Queue full)
    if (data.error || data.status === 'rejected') {
      const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(`Moondream API Error: ${errorMessage}`);
    }

    // Try to find the answer string in various common keys
    let answer = data.answer || data.caption || data.text || data.response || data.generated_text;

    // Check for OpenAI-style response
    if (!answer && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      answer = data.choices[0].text || data.choices[0].message?.content;
    }

    if (typeof answer !== 'string') {
      // If we still can't find a string, but we got a JSON object, maybe the whole object is the result 
      // (though unlikely for a caption API, but possible for custom endpoints)
      console.warn("Could not find standard answer key. Returning stringified data as fallback.");
      answer = JSON.stringify(data);
    }

    // Check if the answer itself is a JSON error object
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        console.error('Detected JSON error in response:', parsed.error);
        throw new Error(`Model returned an error: ${parsed.error}`);
      }
    } catch (e) {
      // If it's not valid JSON, that's fine - continue with validation
      if (e instanceof SyntaxError) {
        // Not JSON, continue
      } else {
        // It was JSON with an error field, rethrow
        throw e;
      }
    }

    // Validate that the answer is not an error message
    const lowerAnswer = answer.toLowerCase();
    const errorPatterns = [
      'error', 'exception', 'failed', 'cuda', 'memory', 'allocation',
      'traceback', 'pytorch', 'out of memory', 'oom', 'timeout',
      'queue is full', 'rejected', 'invalid', 'not found', 'meta tensor',
      'cannot copy'
    ];

    const containsError = errorPatterns.some(pattern => lowerAnswer.includes(pattern));
    if (containsError) {
      console.error('Detected error message in response:', answer);
      throw new Error(`Model returned an error: ${answer.substring(0, 200)}`);
    }

    console.log('DEBUG: Final Parsed Caption:', answer);

    // Calculate stats if usage data is available
    let stats = undefined;
    if (data.usage && data.usage.completion_tokens) {
      const durationSec = (Date.now() - startTime) / 1000;
      const tokens = data.usage.completion_tokens;
      const tokensPerSec = durationSec > 0 ? tokens / durationSec : 0;
      stats = {
        tokensPerSec,
        device: data.device || (data.stats && data.stats.device) || 'GPU', // Try to get from API, fallback to GPU
        totalTokens: tokens,
        duration: durationSec
      };
      console.log(`DEBUG: Calculated stats: ${tokens} tokens in ${durationSec.toFixed(2)}s = ${tokensPerSec.toFixed(2)} t/s`);
    }

    return { text: answer, stats };
  } catch (error) {
    console.error("Error calling Moondream API:", error);
    if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Failed to fetch from Moondream. If using Local mode, ensure the server is running. Otherwise, check the Cloud endpoint in settings.`);
    }
    if (error instanceof Error) {
      throw new Error(`Moondream API call failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while calling the Moondream API.");
  }
};

export const testConnectionCloud = async (settings: AdminSettings): Promise<void> => {
  const apiKey = settings.providers.moondream_cloud.apiKey;
  if (!apiKey) throw new Error("API key is missing.");

  // We can test by sending a request with no image.
  // Expectation: 
  // 401 -> Invalid Key
  // 400 -> Bad Request (Missing image), but Key was accepted
  // 200 -> OK (If API allows empty body, unlikely but possible)
  try {
    const response = await fetch('https://api.moondream.ai/v1/caption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moondream-Auth': apiKey
      },
      body: JSON.stringify({}) // Missing image_url
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API Key.");
    }

    // If we get a 400, it means auth passed but payload failed, which is good enough for a connection check.
    if (response.ok || response.status === 400) {
      return;
    }

    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error: any) {
    console.error("Moondream Cloud connection test failed:", error);
    throw new Error(error.message || "Failed to connect to Moondream Cloud.");
  }
};

/**
 * Normalize endpoint URL by removing trailing slash and /v1 suffix if present.
 * This allows users to specify either "http://localhost:2021" or "http://localhost:2021/v1"
 */
const normalizeEndpoint = (endpoint: string): string => {
  return endpoint.replace(/\/$/, '').replace(/\/v1$/, '');
};

export const testConnectionLocal = async (settings: AdminSettings): Promise<void> => {
  const endpoint = settings.providers.moondream_local.endpoint;
  if (!endpoint) throw new Error("Endpoint is missing.");

  try {
    // Try to fetch the health endpoint to see if server is up.
    const baseUrl = normalizeEndpoint(endpoint);
    const response = await fetch(`${baseUrl}/health`);

    if (response.ok) {
      return;
    }

    throw new Error(`Server reachable but returned unexpected status: ${response.status}`);
  } catch (error: any) {
    console.error("Moondream Local connection test failed:", error);
    throw new Error(error.message || "Failed to connect to Moondream Local server.");
  }
};


import { executeStrategy } from '../promptStrategy';

export const analyzeImageCloud = async (
  image: ImageInfo,
  settings: AdminSettings,
  onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
  const { apiKey } = settings.providers.moondream_cloud;
  if (!apiKey) throw new Error("API key is missing for Moondream Cloud.");

  // Check for assigned strategy
  const assignedStrategyId = settings.prompts.assignments?.['moondream_cloud'];
  const strategy = settings.prompts.strategies.find(s => s.id === assignedStrategyId);

  if (strategy) {
    return executeStrategy(
      strategy,
      image,
      async (prompt) => {
        const fullUrl = 'https://api.moondream.ai/v1/query';
        const body = { image_url: image.dataUrl, question: prompt, stream: false, max_tokens: 1024 };
        const response = await callMoondreamApi(fullUrl, apiKey, body, true);
        return response;
      },
      onStatus
    );
  }

  // Fallback to default single-shot prompt if no strategy assigned
  const fullUrl = 'https://api.moondream.ai/v1/query';
  const prompt = `Describe this image in extreme detail for an AI image generator. Provide a comprehensive description of approximately 200 words. Focus on the subject's physical appearance, including specific details about gender, age, body type, fitness level, muscle definition, and proportions (e.g. breast size, waist-to-hip ratio if applicable). Describe facial features, hair, clothing (material, fit), pose, and expression. Include details about the background, lighting, and artistic style. Respond with a single valid JSON object containing "keywords" (array), "recreationPrompt" (string), and "rating" (string, either "SFW" or "NSFW").`;
  const body = { image_url: image.dataUrl, question: prompt, stream: false, max_tokens: 1024 };

  if (onStatus) onStatus("Sending image to Moondream Cloud...");
  const { text: responseText, stats } = await callMoondreamApi(fullUrl, apiKey, body, true);

  try {
    const result = JSON.parse(responseText);
    if (result.answer) {
      // Handle case where answer is a string containing JSON
      try {
        const parsedAnswer = JSON.parse(result.answer);
        return {
          recreationPrompt: parsedAnswer.recreationPrompt || result.answer,
          keywords: parsedAnswer.keywords || [],
          stats
          // rating: parsedAnswer.rating // Rating is not part of ImageAnalysisResult yet
        };
      } catch {
        return { recreationPrompt: result.answer, keywords: [], stats };
      }
    }
    return {
      recreationPrompt: result.recreationPrompt || "No description generated.",
      keywords: result.keywords || [],
      stats
      // rating: result.rating
    };
  } catch (error) {
    console.error("Error parsing Moondream Cloud response:", error);
    throw new Error("Failed to parse Moondream Cloud response.");
  }
};

export const analyzeImageLocal = async (
  image: ImageInfo,
  settings: AdminSettings,
  onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
  const { endpoint, model } = settings.providers.moondream_local;
  const baseUrl = normalizeEndpoint(endpoint || 'http://localhost:2021/v1');

  // Handle NSFW Detector Model
  if (model === 'nsfw-detector') {
    if (onStatus) onStatus("Checking for NSFW content...");
    const classifyUrl = `${baseUrl}/v1/classify`;
    const body = {
      image_url: image.dataUrl,
      model: 'nsfw-detector'
    };

    // We reuse callMoondreamApi but we need to handle the different response structure
    // callMoondreamApi expects a standard structure or returns stringified JSON
    // Let's call it and parse the result
    const { text: responseText, stats } = await callMoondreamApi(classifyUrl, "", body, false);

    try {
      const result = JSON.parse(responseText);
      // result structure: { label: "SFW", score: 0.9, predictions: [...], _stats: ... }

      const label = result.label || "Unknown";
      const score = result.score !== undefined ? (result.score * 100).toFixed(1) + '%' : "N/A";
      const predictions = result.predictions || [];

      // Create a description from the classification
      const description = `NSFW Classification: ${label} (${score} confidence).`;

      // Extract keywords from predictions
      const keywords = predictions.map((p: any) => `${p.label} (${(p.score * 100).toFixed(0)}%)`);

      return {
        recreationPrompt: description,
        keywords: keywords,
        stats: result._stats ? {
          tokensPerSec: result._stats.tokens_per_sec,
          device: 'GPU', // Assumed
          totalTokens: result._stats.tokens,
          duration: result._stats.duration
        } : stats
      };
    } catch (e) {
      console.error("Failed to parse NSFW result", e);
      return {
        recreationPrompt: "Failed to parse NSFW classification result.",
        keywords: [],
        stats
      };
    }
  }

  // Standard VLM Models (Moondream 2, 3, etc.)
  const apiUrl = `${baseUrl}/v1/chat/completions`;

  // Check for assigned strategy
  const assignedStrategyId = settings.prompts.assignments?.['moondream_local'];
  const strategy = settings.prompts.strategies.find(s => s.id === assignedStrategyId);

  // Fallback to default Detective Strategy if no assignment (or if we want a hardcoded fallback)
  // For now, let's use the first available strategy as a fallback or a simple prompt
  const strategyToUse = strategy || settings.prompts.strategies[0];

  if (strategyToUse) {
    return executeStrategy(
      strategyToUse,
      image,
      async (prompt) => {
        const body = {
          model: model || "moondream-2", // Use selected model or default
          messages: [
            {
              role: "user", content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: image.dataUrl } }
              ]
            }
          ],
          stream: false,
          max_tokens: 1024
        };
        const response = await callMoondreamApi(apiUrl, "", body, false);
        return response;
      },
      onStatus
    );
  }

  // Absolute fallback if no strategies exist at all
  const prompt = "Describe this image.";
  const body = {
    model: model || "moondream-2",
    messages: [
      {
        role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image.dataUrl } }
        ]
      }
    ],
    stream: false,
    max_tokens: 1024
  };

  const { text: responseText, stats } = await callMoondreamApi(apiUrl, "", body, false);
  return {
    recreationPrompt: responseText,
    keywords: [],
    stats
  };
};

// Compatibility export for when the service doesn't distinguish yet (though we've split it)
export const analyzeImage = async (
  image: ImageInfo,
  settings: AdminSettings,
  onStatus?: (message: string) => void
): Promise<{ keywords: string[], recreationPrompt: string, stats?: any }> => {
  // Prefer cloud if configured, else local
  if (settings.providers.moondream_cloud.apiKey) return analyzeImageCloud(image, settings, onStatus);
  return analyzeImageLocal(image, settings, onStatus);
};

const NOT_SUPPORTED_ERROR = "This function is not supported by the Moondream provider.";

export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<string> => {
  throw new Error(NOT_SUPPORTED_ERROR);
};

export const animateImage = async (
  image: ImageInfo | null,
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AdminSettings
): Promise<{ uri: string, apiKey: string }> => {
  throw new Error(NOT_SUPPORTED_ERROR);
};

export const editImage = async (
  image: ImageInfo,
  prompt: string,
  settings: AdminSettings
): Promise<string> => {
  throw new Error(NOT_SUPPORTED_ERROR);
}

export const generateKeywordsForPrompt = async (
  prompt: string,
  settings: AdminSettings
): Promise<string[]> => {
  throw new Error(NOT_SUPPORTED_ERROR);
};

export const enhancePromptWithKeywords = async (
  prompt: string,
  keywords: string[],
  settings: AdminSettings
): Promise<string> => {
  throw new Error(NOT_SUPPORTED_ERROR);
};

export const adaptPromptToTheme = async (
  originalPrompt: string,
  theme: string,
  settings: AdminSettings
): Promise<string> => {
  throw new Error(NOT_SUPPORTED_ERROR);
};
