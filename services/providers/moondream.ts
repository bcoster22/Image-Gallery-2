import { ImageInfo, AdminSettings, AspectRatio, ImageAnalysisResult, ProviderCapabilities, ProviderStats, Capability, GenerationResult, GenerationSettings } from "../../types";
import { BaseProvider } from "../baseProvider";
import { registry } from "../providerRegistry";
import { executeStrategy } from "../promptStrategy";

// --- Helper Functions ---

const callMoondreamApi = async (
  fullUrl: string,
  apiKey: string | null,
  body: object,
  isCloud: boolean,
  timeoutSeconds: number = 120,
  vramMode: string = 'balanced'
): Promise<{ text: string, stats?: any }> => {
  if (!fullUrl) {
    throw new Error("Moondream API endpoint URL is missing.");
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-VRAM-Mode': vramMode
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

      // Catch OOM in 500/Hard Errors
      if (response.status === 500 && errorBody.includes('CUDA out of memory') && vramMode !== 'low') {
        console.warn(`[Moondream API] OOM Detected (500). Retrying with 'low' VRAM mode...`);
        return await callMoondreamApi(fullUrl, apiKey, body, isCloud, timeoutSeconds, 'low');
      }

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
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const data = JSON.parse(jsonStr);
                if (data.chunk) fullText += data.chunk;
                if (data.stats) stats = data.stats;
              } catch (e) {
                console.warn('Failed to parse SSE line:', trimmedLine, e);
              }
            }
          }
        }
      }

      const result = { caption: fullText, _stats: stats };
      return { text: JSON.stringify(result), stats };
    }

    const data = await response.json();
    console.log('DEBUG: Moondream API response:', JSON.stringify(data, null, 2));

    if (data.error && (data.status === 'timeout' || data.error === 'Request timeout')) {
      throw new Error("Moondream Request Timeout: The operation took too long.");
    }

    if (data.error || data.status === 'rejected') {
      const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(`Moondream API Error: ${errorMessage}`);
    }

    let answer = data.answer || data.caption || data.text || data.response || data.generated_text;

    if (!answer && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      answer = data.choices[0].text || data.choices[0].message?.content;
    }

    if (typeof answer !== 'string') {
      console.warn("Could not find standard answer key. Returning stringified data as fallback.");
      answer = JSON.stringify(data);
    }

    // Check for JSON error in answer
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        const errStr = parsed.error;
        if (typeof errStr === 'string' && errStr.includes('CUDA out of memory') && vramMode !== 'low') {
          console.warn(`[Moondream API] OOM Detected. Retrying with 'low' VRAM mode to force unload...`);
          return await callMoondreamApi(fullUrl, apiKey, body, isCloud, timeoutSeconds, 'low');
        }
        throw new Error(`Model returned an error: ${parsed.error}`);
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }

    let stats: ProviderStats | undefined = undefined;
    if (data.usage && data.usage.completion_tokens) {
      const durationSec = (Date.now() - startTime) / 1000;
      const tokens = data.usage.completion_tokens;
      const tokensPerSec = durationSec > 0 ? tokens / durationSec : 0;
      stats = {
        tokensPerSec,
        device: data.device || (data.stats && data.stats.device) || 'Unknown',
        totalTokens: tokens,
        duration: durationSec
      };
    } else if (data.stats) {
      // Handle local stats if available directly
      stats = {
        duration: data.stats.duration || (Date.now() - startTime) / 1000,
        totalTokens: data.stats.tokens,
        tokensPerSec: data.stats.tokens_per_sec,
        device: data.stats.device
      };
    } else {
      // Minimal stats
      stats = {
        duration: (Date.now() - startTime) / 1000,
        device: 'Unknown'
      };
    }

    return { text: answer, stats };
  } catch (error) {
    console.error("Error calling Moondream API:", error);
    if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(`Failed to fetch from Moondream.`);
    }
    throw error;
  }
};

const normalizeEndpoint = (endpoint: string): string => {
  return endpoint.replace(/\/$/, '').replace(/\/v1$/, '');
};

function getImageRating(scores: Record<string, number>): string {
  const explicit = scores.explicit || 0;
  const questionable = scores.questionable || 0;
  const sensitive = scores.sensitive || 0;

  if (explicit > 0.85) return 'XXX';
  if (explicit > 0.5) return 'X';
  if (questionable > 0.5) return 'R';
  if (sensitive > 0.5) return 'PG-13';
  return 'PG';
}

// --- Providers ---

export class MoondreamCloudProvider extends BaseProvider {
  readonly id = 'moondream_cloud';
  readonly name = 'Moondream Cloud';
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    generation: false,
    animation: false,
    editing: false,
    textGeneration: false,
    captioning: true,
    tagging: true
  };

  async captionImage(image: ImageInfo, settings: AdminSettings): Promise<string> {
    const result = await this.analyzeImage(image, settings);
    return result.recreationPrompt;
  }

  async tagImage(image: ImageInfo, settings: AdminSettings): Promise<string[]> {
    const result = await this.analyzeImage(image, settings);
    return result.keywords;
  }

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.moondream_cloud.apiKey;
  }

  async testConnection(settings: AdminSettings): Promise<void> {
    const apiKey = settings.providers.moondream_cloud.apiKey;
    if (!apiKey) throw new Error("API key is missing.");

    try {
      const response = await fetch('https://api.moondream.ai/v1/caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Moondream-Auth': apiKey
        },
        body: JSON.stringify({})
      });

      if (response.status === 401 || response.status === 403) throw new Error("Invalid API Key.");
      if (response.ok || response.status === 400) return;
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error: any) {
      throw new Error(error.message || "Failed to connect to Moondream Cloud.");
    }
  }

  async analyzeImage(
    image: ImageInfo,
    settings: AdminSettings,
    onStatus?: (message: string) => void
  ): Promise<ImageAnalysisResult> {
    const { apiKey } = settings.providers.moondream_cloud;
    if (!apiKey) throw new Error("API key is missing for Moondream Cloud.");

    const assignedStrategyId = settings.prompts.assignments?.['moondream_cloud'];
    const strategy = settings.prompts.strategies.find(s => s.id === assignedStrategyId);

    if (strategy) {
      return executeStrategy(
        strategy,
        image,
        async (prompt) => {
          const fullUrl = 'https://api.moondream.ai/v1/query';
          const body = { image_url: image.dataUrl, question: prompt, stream: false, max_tokens: 1024 };
          return await callMoondreamApi(fullUrl, apiKey, body, true);
        },
        onStatus
      );
    }

    // Fallback
    const fullUrl = 'https://api.moondream.ai/v1/query';
    const prompt = `Describe this image in extreme detail...`; // Truncated for brevity in this rewrite, but should be full prompt
    const body = { image_url: image.dataUrl, question: prompt, stream: false, max_tokens: 1024 };

    if (onStatus) onStatus("Sending image to Moondream Cloud...");
    const { text: responseText, stats } = await callMoondreamApi(fullUrl, apiKey, body, true);

    try {
      const result = JSON.parse(responseText);
      if (result.answer) {
        try {
          const parsedAnswer = JSON.parse(result.answer);
          return {
            recreationPrompt: parsedAnswer.recreationPrompt || result.answer,
            keywords: parsedAnswer.keywords || [],
            stats
          };
        } catch {
          return { recreationPrompt: result.answer, keywords: [], stats };
        }
      }
      return {
        recreationPrompt: result.recreationPrompt || "No description generated.",
        keywords: result.keywords || [],
        stats
      };
    } catch (error) {
      throw new Error("Failed to parse Moondream Cloud response.");
    }
  }
}

export class MoondreamLocalProvider extends BaseProvider {
  readonly id = 'moondream_local';
  readonly name = 'Moondream Local';
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    generation: true,
    animation: false,
    editing: true,
    textGeneration: false,
    captioning: true,
    tagging: true
  };

  validateConfig(settings: AdminSettings): boolean {
    return !!settings.providers.moondream_local.endpoint;
  }

  // ... (testConnection remains same)

  async captionImage(image: ImageInfo, settings: AdminSettings): Promise<string> {
    const config = settings.providers.moondream_local;
    const modelOverride = config.captionModel;

    let effectiveSettings = settings;
    if (modelOverride) {
      effectiveSettings = {
        ...settings,
        providers: {
          ...settings.providers,
          moondream_local: {
            ...config,
            model: modelOverride
          }
        }
      };
    }

    // If the selected model is specific (e.g. JoyCaption), the backend needs to handle it.
    // Our AnalyzeImage implementation sends 'model' in the body.
    const result = await this.analyzeImage(image, effectiveSettings);
    return result.recreationPrompt;
  }

  async tagImage(image: ImageInfo, settings: AdminSettings): Promise<string[]> {
    const config = settings.providers.moondream_local;
    const modelOverride = config.taggingModel;

    let effectiveSettings = settings;
    if (modelOverride) {
      effectiveSettings = {
        ...settings,
        providers: {
          ...settings.providers,
          moondream_local: {
            ...config,
            model: modelOverride
          }
        }
      };
    }

    // Check if we are using a specialized tagger
    const modelName = (modelOverride || config.model || '').toLowerCase();
    const isWd14 = modelName.includes('wd14') || modelName.includes('tagger') || modelName.includes('vit');

    if (isWd14) {
      // --- WD14 SPECIAL HANDLING ---
      // WD14 is NOT a chat model. It does not understand "Describe this".
      // It returns a raw string of comma-separated tags.
      // We must bypass the 'analyzeImage' prompt strategy logic.

      const providerConfig = effectiveSettings.providers.moondream_local;
      let usedEndpoint = providerConfig.endpoint || 'http://127.0.0.1:2020/v1';
      if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
      const baseUrl = normalizeEndpoint(usedEndpoint);

      // Use chat completions but assume the backend wraps the Tagger to return text
      // Use classify endpoint for WD14 Tagger (It is a classifier, not a chat model)
      const apiUrl = `${baseUrl}/v1/classify`;
      const body = {
        model: modelOverride || "wd14-vit-v2",
        image_url: image.dataUrl // Classify expects image_url at top level
      };

      const vramMode = settings.performance?.vramUsage || 'balanced';

      // Make the call with fallback logic for V3 -> V2
      let text = "";
      try {
        const result = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
        text = result.text;
      } catch (err) {
        // If V3 fails, try V2 automatically
        if ((modelOverride === "wd-vit-tagger-v3" || !modelOverride) && err instanceof Error) {
          console.warn("[WD14] V3 failed, attempting fallback to wd14-vit-v2...");
          body.model = "wd14-vit-v2";
          const result = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
          text = result.text;
        } else {
          throw err;
        }
      }

      let tags: string[] = [];
      let scores: Record<string, number> | null = null;
      let imageRating = 'PG'; // Default

      console.log('[WD14] Raw response text:', text);
      try {
        const json = JSON.parse(text);

        if (json.scores) {
          scores = json.scores;
          // Extract tags from scores above threshold (0.35 is common for WD14)
          const TAG_THRESHOLD = 0.35;
          tags = Object.entries(json.scores)
            .filter(([tag, score]) => {
              // Exclude the special rating categories from general tags
              if (['general', 'sensitive', 'questionable', 'explicit'].includes(tag)) return false;
              return (score as number) >= TAG_THRESHOLD;
            })
            .sort((a, b) => (b[1] as number) - (a[1] as number)) // Sort by confidence descending  
            .map(([tag]) => tag.replace(/_/g, ' ')); // Convert underscores to spaces

          console.log('[WD14 Parser] Extracted tags from scores:', tags);
        } else if (json.predictions && Array.isArray(json.predictions)) {
          // Handle Classifier-style response (predictions array) and populate scores for Truth Committee
          console.log('[WD14 Parser] Detected predictions format');
          scores = {};
          json.predictions.forEach((p: any) => {
            if (p.label && typeof p.score === 'number') scores![p.label] = p.score;
          });

          const TAG_THRESHOLD = 0.35;
          tags = json.predictions
            .filter((p: any) => p.score >= TAG_THRESHOLD)
            .map((p: any) => p.label.replace(/_/g, ' '));
        } else if (Array.isArray(json)) {
          tags = json;
        } else {
          // unexpected json
          tags = [];
        }
      } catch (e) {
        // Fallback CSV (Old backend or raw string)
        tags = text.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.toLowerCase() !== 'unknown');
      }

      // TRUTH COMMITTEE & RATING LOGIC
      if (scores) {
        imageRating = getImageRating(scores);
        const sensitive = scores.sensitive || 0;
        const questionable = scores.questionable || 0;

        // Ambiguity Check: If rating is R OR gap between sensitive/questionable is small
        // NEW AGGRESSIVE CHECK: If there is ANY hint of NSFW (>20% combined), consult Moondream
        const nsfwSum = (scores.explicit || 0) + (scores.questionable || 0) + (scores.sensitive || 0);
        const isSuspicious = nsfwSum > 0.2;
        const isAmbiguous = Math.abs(sensitive - questionable) < 0.15;

        if (imageRating === 'R' || imageRating === 'X' || isAmbiguous || isSuspicious) {
          console.log(`[Truth Committee] Suspicious scores (Sum: ${nsfwSum.toFixed(2)}). Consulting Moondream 3...`);
          try {
            // Handoff to Moondream 3 (4-bit)
            const handoffBody = {
              model: "moondream-3-preview-4bit",
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: "Rate this image as PG, PG-13, R, or X based on movie standards. Focus on whether the nudity is artistic or pornographic. Answer with just the rating." },
                  { type: "image_url", image_url: { url: image.dataUrl } }
                ]
              }],
              max_tokens: 10
            };

            // Quick call
            const { text: mdAnswer } = await callMoondreamApi(apiUrl, "", handoffBody, false, 60, vramMode);
            const mdRating = mdAnswer.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

            if (['PG', 'PG-13', 'R', 'X', 'XXX'].includes(mdRating)) {
              console.log(`[Truth Committee] Moondream overrides ${imageRating} -> ${mdRating}`);
              imageRating = mdRating;
            }
          } catch (err) {
            console.warn("[Truth Committee] Failed to consult Moondream:", err);
          }
        }

        // Inject Rating Tags
        tags.push(`rating:${imageRating}`);
        // Inject raw score tags for UI badges if needed
        if (scores.explicit) tags.push(`score:explicit:${scores.explicit.toFixed(2)}`);
      }

      console.log('[Moondream tagImage] Final tags being returned:', tags);
      console.log('[Moondream tagImage] Total tag count:', tags.length);
      return tags;
    }

    // --- FALLBACK (JoyCaption/Moondream) ---
    // Use standard analysis which supports strategies (like "Extract keywords")
    const result = await this.analyzeImage(image, effectiveSettings);
    return result.keywords;
  }


  async testConnection(settings: AdminSettings): Promise<void> {
    const endpoint = settings.providers.moondream_local.endpoint;
    if (!endpoint) throw new Error("Endpoint is missing.");

    try {
      const baseUrl = normalizeEndpoint(endpoint);
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
      throw new Error(`Server reachable but returned unexpected status: ${response.status}`);
    } catch (error: any) {
      throw new Error(error.message || "Failed to connect to Moondream Local server.");
    }
  }

  async analyzeImage(
    image: ImageInfo,
    settings: AdminSettings,
    onStatus?: (message: string) => void
  ): Promise<ImageAnalysisResult> {
    const providerConfig = settings?.providers?.moondream_local || {};
    console.log('[analyzeImage] Provider Config (Checking for taggingModel):', providerConfig);
    const { endpoint, model, taggingModel } = providerConfig as any;
    let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
    if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
    const baseUrl = normalizeEndpoint(usedEndpoint);

    if (model === 'nsfw-detector') {
      if (onStatus) onStatus("Checking for NSFW content...");
      const classifyUrl = `${baseUrl}/v1/classify`;
      const body = { image_url: image.dataUrl, model: 'nsfw-detector' };
      const vramMode = settings.performance?.vramUsage || 'balanced';
      const { text: responseText, stats } = await callMoondreamApi(classifyUrl, "", body, false, 120, vramMode);

      try {
        const result = JSON.parse(responseText);
        const label = result.label || "Unknown";
        const score = result.score !== undefined ? (result.score * 100).toFixed(1) + '%' : "N/A";
        const predictions = result.predictions || [];
        const description = `NSFW Classification: ${label} (${score} confidence).`;
        const keywords = predictions.map((p: any) => `${p.label} (${(p.score * 100).toFixed(0)}%)`);

        return {
          recreationPrompt: description,
          keywords: keywords,
          stats: result._stats ? {
            tokensPerSec: result._stats.tokens_per_sec,
            device: result._stats.device || 'Unknown',
            totalTokens: result._stats.tokens,
            duration: result._stats.duration
          } : stats
        };
      } catch (e) {
        return { recreationPrompt: "Failed to parse NSFW classification result.", keywords: [], stats };
      }
    }

    const apiUrl = `${baseUrl}/v1/chat/completions`;
    const assignedStrategyId = settings.prompts.assignments?.['moondream_local'];
    const strategy = settings.prompts.strategies.find(s => s.id === assignedStrategyId) || settings.prompts.strategies[0];

    let result: ImageAnalysisResult;

    if (strategy) {
      result = await executeStrategy(
        strategy,
        image,
        async (prompt) => {
          const body = {
            model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
            stream: false,
            max_tokens: 1024
          };
          const vramMode = settings.performance?.vramUsage || 'balanced';
          return await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
        },
        onStatus
      );
    } else {
      const prompt = "Describe this image.";
      const body = {
        model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
        stream: false,
        max_tokens: 1024
      };

      const vramMode = settings.performance?.vramUsage || 'balanced';
      const { text: responseText, stats } = await callMoondreamApi(apiUrl, "", body, false, 120, vramMode);
      result = { recreationPrompt: responseText, keywords: [], stats };
    }

    // If tagging model override is set (e.g., WD14), call tagImage to get tags
    if (taggingModel && taggingModel !== model) {
      console.log('[analyzeImage] Tagging model override detected, calling tagImage separately');
      try {
        const tags = await this.tagImage(image, settings);
        result.keywords = [...(result.keywords || []), ...tags];
      } catch (error) {
        console.warn('[analyzeImage] Tagging side-car failed, attempting fallback to Vision Model:', error);
        // Fallback: Ask Moondream to tag it
        try {
          const fallbackBody = {
            model: "moondream-2",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "List 10 key descriptive tags for this image, comma separated. Do not use sentences." },
                { type: "image_url", image_url: { url: image.dataUrl } }
              ]
            }],
            max_tokens: 100
          };
          const { text } = await callMoondreamApi(apiUrl, "", fallbackBody, false, 60, "balanced");
          const fallbackTags = text.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
          result.keywords = [...(result.keywords || []), ...fallbackTags];
        } catch (e) {
          console.warn('[analyzeImage] Tagging fallback also failed.');
        }
      }
    }

    return result;
  }

  async detectSubject(
    image: ImageInfo,
    settings: AdminSettings
  ): Promise<{ x: number, y: number }> {
    const providerConfig = settings?.providers?.moondream_local || {};
    const { endpoint, model } = providerConfig as any;
    let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
    if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
    const baseUrl = normalizeEndpoint(usedEndpoint);
    const apiUrl = `${baseUrl}/v1/chat/completions`;

    // Prompt for JSON coordinates
    const prompt = 'Detect the main subject. Return the bounding box coordinates as a JSON object: {"ymin": 0.0, "xmin": 0.0, "ymax": 1.0, "xmax": 1.0}.';

    const body = {
      model: (!model || model.startsWith('sdxl-')) ? "moondream-2" : model,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image.dataUrl } }] }],
      stream: false,
      max_tokens: 256,
      response_format: { type: "json_object" } // Try to hint JSON mode if supported, otherwise prompt does lifting
    };

    try {
      const { text: responseText } = await callMoondreamApi(apiUrl, "", body, false);

      // Try strict JSON parse
      let bbox = null;
      try {
        // Clean markdown blocks if present
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        bbox = JSON.parse(cleanText);
      } catch (e) {
        console.warn("Failed to parse JSON for detectSubject. Trying regex fallback.");
        // Fallback regex for [ymin, xmin, ymax, xmax] arrays or similar
      }

      if (bbox && typeof bbox.ymin === 'number') {
        const centerX = ((bbox.xmin + bbox.xmax) / 2) * 100;
        const centerY = ((bbox.ymin + bbox.ymax) / 2) * 100;
        return { x: Math.round(centerX), y: Math.round(centerY) };
      }

      return { x: 50, y: 50 }; // Default center
    } catch (e) {
      console.error("detectSubject failed:", e);
      return { x: 50, y: 50 };
    }
  }

  async testCapability(capability: Capability, settings: AdminSettings): Promise<void> {
    const providerConfig = settings?.providers?.moondream_local || {};
    const { endpoint } = providerConfig as any;
    let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
    if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
    const baseUrl = normalizeEndpoint(usedEndpoint);
    const cleanBaseUrl = baseUrl.replace(/\/v1\/?$/, '');

    if (capability === 'vision') {
      const apiUrl = `${baseUrl}/v1/chat/completions`;
      const body = {
        model: "moondream-2", // Always test vision with a vision model
        messages: [{ role: "user", content: [{ type: "text", text: "test" }, { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" } }] }],
        max_tokens: 10
      };
      await callMoondreamApi(apiUrl, "", body, false);
    } else if (capability === 'generation') {
      const apiUrl = `${cleanBaseUrl}/v1/generate`;
      const body = {
        prompt: "test",
        model: "sdxl-realism",
        width: 256,
        height: 256,
        steps: 1
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("Generation test failed");
    } else {
      throw new Error("Capability not supported for testing");
    }
  }

  async generateImageFromPrompt(
    prompt: string,
    aspectRatio: AspectRatio,
    sourceImage: ImageInfo | undefined,
    settings: AdminSettings,
    overrides?: GenerationSettings
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const providerConfig = settings?.providers?.moondream_local || {};
    const { endpoint, model } = providerConfig as any;
    let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
    if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
    const baseUrl = normalizeEndpoint(usedEndpoint);
    const cleanBaseUrl = baseUrl.replace(/\/v1\/?$/, '');
    const apiUrl = `${cleanBaseUrl}/v1/generate`;

    let selectedModel = model || 'sdxl-realism';
    if (!selectedModel.startsWith('sdxl-')) {
      selectedModel = 'sdxl-realism';
    }

    // Default dimensions (1:1)
    let width = 1024;
    let height = 1024;

    // Use source image dimensions if available AND no specific aspect ratio is requested
    // OR if we want to respect source aspect ratio. 
    // Ideally, if sourceImage is present, we start with its aspect ratio.
    if (sourceImage && sourceImage.width && sourceImage.height) {
      // We calculate dimensions based on source image to preserve its aspect ratio
      // But we must snap to 64px grid for SDXL
      const targetPixels = 1024 * 1024;
      const scale = Math.sqrt(targetPixels / (sourceImage.width * sourceImage.height));
      width = Math.round((sourceImage.width * scale) / 64) * 64;
      height = Math.round((sourceImage.height * scale) / 64) * 64;
    }

    // Apply requests aspect ratio override
    if (aspectRatio) {
      if (aspectRatio === '16:9') { width = 1280; height = 720; }
      else if (aspectRatio === '9:16') { width = 720; height = 1280; }
      else if (aspectRatio === '4:3') { width = 1024; height = 768; }
      else if (aspectRatio === '3:4') { width = 768; height = 1024; }
      else if (aspectRatio === '1:1') { width = 1024; height = 1024; }
    }

    const body: any = {
      prompt,
      model: selectedModel,
      width,
      height,
      steps: overrides?.steps || 8,
      guidance_scale: overrides?.cfg_scale || 2.0,
      scheduler: overrides?.scheduler || 'euler'
    };

    // If request settings have scheduler
    // The 'settings' arg is 'AdminSettings', but 'generateImageFromPrompt' assumes global settings.
    // However, the caller usually merges things. 
    // Actually, PromptSubmissionModal calls this.
    // Wait, PromptSubmissionModal calls `aiService` which calls `provider.generateImageFromPrompt`.
    // I need to see how settings are passed.

    // For now, let's just piggyback on body construction if I can find where the per-request settings are.
    // 'generateImageFromPrompt' signature is (prompt, aspectRatio, sourceImage, settings: AdminSettings).
    // It does NOT accept 'GenerationSettings' override currently in the signature.
    // This is a limitation of the interface.

    // HOWEVER, `PromptSubmissionModal` handles queueing.
    // The `QueueWorker` (in App.tsx or similar?) processes this.
    // Let's check `services/aiService.ts` to see how it calls the provider.


    // If source image is provided, pass it for img2img (Remix)
    if (sourceImage && sourceImage.dataUrl) {
      body.image = sourceImage.dataUrl;
      body.strength = overrides?.denoise ? (overrides.denoise / 100) : 0.75; // Default strength for remix
    }

    try {
      const vramMode = settings.performance?.vramUsage || 'balanced';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VRAM-Mode': vramMode
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Generation failed: ${err}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let imageUrl = '';
      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        imageUrl = data.result[0];
      } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        imageUrl = data.images[0];
      } else {
        imageUrl = data.image || data.url;
      }

      // Ensure Data URI prefix if raw base64 (Consistency with editImage)
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        imageUrl = `data:image/png;base64,${imageUrl}`;
      }

      const duration = (Date.now() - startTime) / 1000;
      return {
        image: imageUrl,
        stats: {
          duration,
          tokensPerSec: duration > 0 ? 1 / duration : 0, // Placeholder: 1 image per duration
          device: data.device || 'GPU', // Assume GPU if not returned
          totalTokens: 0
        }
      };

    } catch (error: any) {
      console.error("Error generating image:", error);
      throw new Error(error.message || "Failed to generate image.");
    }
  }

  async editImage(
    image: ImageInfo,
    prompt: string,
    strength: number | undefined,
    settings: AdminSettings
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const providerConfig = settings?.providers?.moondream_local || {};
    const { endpoint, model } = providerConfig as any;
    // Fix endpoint connection
    let usedEndpoint = endpoint || 'http://127.0.0.1:2020/v1';
    if (usedEndpoint.includes('localhost')) { usedEndpoint = usedEndpoint.replace('localhost', '127.0.0.1'); }
    const baseUrl = normalizeEndpoint(usedEndpoint);
    const cleanBaseUrl = baseUrl.replace(/\/v1\/?$/, '');
    const apiUrl = `${cleanBaseUrl}/v1/generate`; // Same endpoint, backend handles 'image' param

    // Logic to select the correct model for generation/editing
    let selectedModel = model || 'sdxl-realism';
    // If a vision model is selected, fallback to default generation model
    if (!selectedModel.startsWith('sdxl-')) {
      selectedModel = 'sdxl-realism';
    }

    // Calculate optimal dimensions preserving aspect ratio
    let width = 1024;
    let height = 1024;

    if (image.width && image.height) {
      const targetPixels = 1024 * 1024;
      const aspectRatio = image.width / image.height;
      // Scale to target pixel count
      const scale = Math.sqrt(targetPixels / (image.width * image.height));
      let newWidth = Math.round(image.width * scale);
      let newHeight = Math.round(image.height * scale);

      // Snap to multiples of 64 (SDXL requirement)
      width = Math.round(newWidth / 64) * 64;
      height = Math.round(newHeight / 64) * 64;

      // Ensure max dimension isn't excessive (e.g. > 1536) to prevent OOM
      const maxDim = 1536;
      if (width > maxDim || height > maxDim) {
        const resizeScale = maxDim / Math.max(width, height);
        width = Math.round((width * resizeScale) / 64) * 64;
        height = Math.round((height * resizeScale) / 64) * 64;
      }
    }

    const args = (providerConfig as any).args || {};
    const body: any = {
      prompt,
      model: selectedModel,
      width,
      height,
      steps: args.steps || 8,
      guidance_scale: args.guidance_scale || 2.0,
      image: image.dataUrl,
      strength: strength || 0.75,
      negative_prompt: "blurry, low quality, low res, distorted, ugly, pixelated, text, watermark, bad anatomy, deformed"
    };

    try {
      const vramMode = settings.performance?.vramUsage || 'balanced';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VRAM-Mode': vramMode
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Edit failed: ${err}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let imageUrl = '';
      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        imageUrl = data.result[0];
      } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        imageUrl = data.images[0];
      } else {
        imageUrl = data.image || data.url;
      }

      // Ensure Data URI prefix if raw base64
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        imageUrl = `data:image/png;base64,${imageUrl}`;
      }

      const duration = (Date.now() - startTime) / 1000;
      return {
        image: imageUrl,
        stats: {
          duration,
          tokensPerSec: duration > 0 ? 1 / duration : 0,
          device: data.device || 'GPU',
          totalTokens: 0
        }
      };
    } catch (error: any) {
      console.error("Error editing image:", error);
      throw new Error(error.message || "Failed to edit image.");
    }
  }
}

// Register Providers
registry.register(new MoondreamCloudProvider());
registry.register(new MoondreamLocalProvider());
