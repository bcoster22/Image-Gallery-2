
import { ImageInfo, AdminSettings, AspectRatio } from "../../types";

const callMoondreamApi = async (
  fullUrl: string,
  apiKey: string | null,
  body: object,
  isCloud: boolean
): Promise<string> => {
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
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Moondream API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const answer = data.answer || data.caption;

    if (typeof answer !== 'string') {
      throw new Error("Invalid response from Moondream API: 'answer' or 'caption' field is missing or not a string.");
    }
    
    return answer;
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

export const testConnectionLocal = async (settings: AdminSettings): Promise<void> => {
    const endpoint = settings.providers.moondream_local.endpoint;
    if (!endpoint) throw new Error("Endpoint is missing.");

    try {
        // Try to fetch the root or a benign endpoint to see if server is up
        const baseUrl = endpoint.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/v1/models`); // Standard OAI compatible endpoint often present, or just test connectivity
        
        // If the fetch succeeds (even 404), the server is reachable.
        // Ideally we want 200.
        if (!response.ok && response.status !== 404) {
             // Try root if v1/models fails
             const rootResponse = await fetch(baseUrl);
             if (!rootResponse.ok) throw new Error("Server reachable but returned error.");
        }
    } catch (error: any) {
        console.error("Moondream Local connection test failed:", error);
        throw new Error(error.message || "Failed to connect to Moondream Local server.");
    }
};


export const analyzeImageCloud = async (
  image: ImageInfo,
  settings: AdminSettings
): Promise<{ keywords: string[], recreationPrompt: string }> => {
    const { apiKey } = settings.providers.moondream_cloud;
    if (!apiKey) throw new Error("API key is missing for Moondream Cloud.");
    
    const fullUrl = 'https://api.moondream.ai/v1/caption';
    const body = { image_url: image.dataUrl, length: "normal", stream: false };
    
    const caption = await callMoondreamApi(fullUrl, apiKey, body, true);
    
    // Fallback logic since Cloud API only provides a caption
    const keywords = caption
        .toLowerCase()
        .split(/\s+/) // split by whitespace
        .slice(0, 10)
        .map(kw => kw.replace(/[^a-z0-9]/gi, '')) // remove punctuation
        .filter(kw => kw.length > 3); // filter out short words
      
    return {
        keywords: [...new Set(keywords)], // unique keywords
        recreationPrompt: caption,
    };
};

export const analyzeImageLocal = async (
  image: ImageInfo,
  settings: AdminSettings
): Promise<{ keywords: string[], recreationPrompt: string }> => {
  const { endpoint } = settings.providers.moondream_local;
  if (!endpoint) throw new Error("Moondream endpoint is not configured for Local mode.");
  
  // Ensure endpoint doesn't end with slash and matches the structure required
  const baseUrl = endpoint.replace(/\/$/, '');
  const answerUrl = `${baseUrl}/answer`; 
  
  const prompt = `Analyze this image and respond with a single, valid JSON object. Do not include any other text or markdown formatting. The JSON object must contain two keys: "keywords" (an array of 5-10 string keywords) and "recreationPrompt" (a detailed string prompt for an AI generator). Describe the subject, their appearance (e.g., "person with long brown hair"), expression, clothing, and pose. Do not guess sensitive demographics like race or exact age; use general descriptive terms (e.g., "young adult," "elderly person"). Also describe the background, lighting, and overall artistic style.`;

  const body = { image_url: image.dataUrl, question: prompt, stream: false };

  const responseString = await callMoondreamApi(answerUrl, null, body, false);

  try {
    const cleanedString = responseString.replace(/```json\n|```/g, '').trim();
    const result = JSON.parse(cleanedString);
    if (Array.isArray(result.keywords) && typeof result.recreationPrompt === 'string') {
        return result;
    }
    throw new Error("Moondream returned invalid JSON structure.");
  } catch (e) {
      console.error("Failed to parse Moondream JSON response. Raw response:", responseString, e);
      const keywords = responseString.split(' ').slice(0, 5).map(k => k.replace(/[^a-zA-Z]/g, ''));
      return {
          keywords,
          recreationPrompt: responseString
      };
  }
};

// Compatibility export for when the service doesn't distinguish yet (though we've split it)
export const analyzeImage = async (
    image: ImageInfo,
    settings: AdminSettings
  ): Promise<{ keywords: string[], recreationPrompt: string }> => {
    // Prefer cloud if configured, else local
    if (settings.providers.moondream_cloud.apiKey) return analyzeImageCloud(image, settings);
    return analyzeImageLocal(image, settings);
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
): Promise<{uri: string, apiKey: string}> => {
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
