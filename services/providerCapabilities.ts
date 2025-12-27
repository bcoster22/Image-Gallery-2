
import React from 'react';
import { AiProvider, Capability, ProviderCapabilities } from "../types";
import { SparklesIcon, VideoCameraIcon, SparklesIcon as WandIcon, MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline';

export const providerCapabilities: Record<AiProvider, ProviderCapabilities> = {
  gemini: {
    vision: true,
    generation: true,
    animation: true,
    editing: true,
    textGeneration: true,
    captioning: true,
    tagging: true,
  },
  openai: {
    vision: false,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
    captioning: true,
    tagging: false,
  },
  grok: {
    vision: true,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
    captioning: true,
    tagging: false,
  },
  moondream_cloud: {
    vision: true,
    generation: false,
    animation: false,
    editing: false,
    textGeneration: false,
    captioning: true,
    tagging: true,
  },
  moondream_local: {
    vision: true,
    generation: true,
    animation: false,
    editing: true,
    textGeneration: false,
    captioning: true,
    tagging: true,
  },
  comfyui: {
    vision: false,
    generation: true,
    animation: true,
    editing: true,
    textGeneration: false,
    captioning: false,
    tagging: false,
  },
};

export const capabilityDetails: Record<Capability | AiProvider, { name: string; description?: string; icon: React.FC<any> }> = {
  // Capabilities
  vision: {
    name: 'Image Analysis & Search',
    description: 'Analyzes images to generate keywords and descriptions for searching.',
    icon: SearchIcon
  },
  captioning: {
    name: 'Image Captioning',
    description: 'Generates detailed natural language descriptions of images (e.g. for Alt text or detailed analysis).',
    icon: SearchIcon
  },
  tagging: {
    name: 'Image Tagging',
    description: 'Extracts specific keywords and tags from images (e.g. for organizing and searching).',
    icon: SearchIcon
  },
  generation: {
    name: 'Image Generation',
    description: 'Creates new images from text prompts.',
    icon: SparklesIcon
  },
  animation: {
    name: 'Video Animation',
    description: 'Animates static images or creates videos from text prompts.',
    icon: VideoCameraIcon
  },
  editing: {
    name: 'Image Editing & Upscaling',
    description: 'Modifies or enhances existing images based on prompts.',
    icon: WandIcon
  },
  textGeneration: {
    name: 'Text Generation',
    description: 'Generates or refines text for prompts and keywords.',
    icon: SparklesIcon
  },
  // Providers (for name lookup)
  gemini: { name: 'Google Gemini', icon: () => null },
  openai: { name: 'OpenAI', icon: () => null },
  grok: { name: 'Grok', icon: () => null },
  moondream_cloud: { name: 'Moondream Cloud', icon: () => null },
  moondream_local: { name: 'Moondream Local', icon: () => null },
  comfyui: { name: 'ComfyUI', icon: () => null },
};
