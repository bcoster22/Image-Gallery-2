
import { ImageInfo, AdminSettings, AspectRatio } from "../../types";

const NOT_IMPLEMENTED_ERROR = "This ComfyUI function is not yet implemented. Please check your workflow configuration.";

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
  throw new Error(NOT_IMPLEMENTED_ERROR);
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
