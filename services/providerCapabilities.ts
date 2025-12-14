
import React from 'react';
import { AiProvider, Capability, ProviderCapabilities } from "../types";
import { SparklesIcon, VideoCameraIcon, WandIcon, SearchIcon } from '../components/icons';

export const providerCapabilities: Record<AiProvider, ProviderCapabilities> = {
  gemini: {
    vision: true,
    generation: true,
    animation: true,
    editing: true,
    textGeneration: true,
  },
  openai: {
    vision: false,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
  },
  grok: {
    vision: true,
    generation: true,
    animation: false,
    editing: false,
    textGeneration: true,
  },
  moondream_cloud: {
    vision: true,
    generation: false,
    animation: false,
    editing: false,
    textGeneration: false,
  },
  moondream_local: {
    vision: true,
    generation: true,
    animation: false,
    editing: true,
    textGeneration: false,
  },
  comfyui: {
    vision: false,
    generation: true,
    animation: true,
    editing: true,
    textGeneration: false,
  },
};

export const capabilityDetails: Record<Capability | AiProvider, { name: string; description?: string; icon: React.FC<any> }> = {
  // Capabilities
  vision: {
    name: 'Image Analysis & Search',
    description: 'Analyzes images to generate keywords and descriptions for searching.',
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
