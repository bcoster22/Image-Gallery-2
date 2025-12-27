"""
Dynamic Model Discovery
Scans local directories to automatically discover available models.
"""
import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
from backend import paths, config

logger = logging.getLogger(__name__)

def scan_checkpoints_directory() -> List[Dict]:
    """Scan checkpoints directory for SafeTensors models."""
    models = []
    
    if not os.path.exists(paths.CHECKPOINTS_DIR):
        return models
    
    for filename in os.listdir(paths.CHECKPOINTS_DIR):
        if not filename.endswith('.safetensors'):
            continue
            
        # Extract model ID from filename
        model_id = filename.replace('.safetensors', '')
        full_path = os.path.join(paths.CHECKPOINTS_DIR, filename)
        
        models.append({
            'id': model_id,
            'format': 'safetensors',
            'path': full_path,
            'size_bytes': os.path.getsize(full_path)
        })
    
    return models


def scan_diffusers_directory() -> List[Dict]:
    """Scan diffusers directory for Diffusers format models."""
    models = []
    
    # Construct diffusers directory path
    diffusers_dir = os.path.join(paths.MODELS_ROOT, 'diffusers')
    
    if not os.path.exists(diffusers_dir):
        logger.warning(f"Diffusers directory not found: {diffusers_dir}")
        return models
    
    logger.info(f"Scanning diffusers directory: {diffusers_dir}")
    
    for model_name in os.listdir(diffusers_dir):
        model_path = os.path.join(diffusers_dir, model_name)
        
        if not os.path.isdir(model_path):
            continue
        
        # Check if it's a valid diffusers model
        # Look for common diffusers files (unet, vae, text_encoder dirs or model_index.json)
        contents = os.listdir(model_path)
        has_diffusers_structure = (
            'model_index.json' in contents or
            'unet' in contents or 
            'vae' in contents or
            'text_encoder' in contents
        )
        
        if not has_diffusers_structure:
            logger.debug(f"Skipping {model_name}: not a diffusers model")
            continue
        
        # Calculate directory size
        total_size = sum(
            os.path.getsize(os.path.join(dirpath, fname))
            for dirpath, _, filenames in os.walk(model_path)
            for fname in filenames
        )
        
        models.append({
            'id': f"{model_name}-diffusers",
            'base_id': model_name,
            'format': 'diffusers',
            'path': model_path,
            'size_bytes': total_size
        })
    
    return models


def get_model_metadata(model_id: str) -> Optional[Dict]:
    """Get metadata from config for a model ID."""
    # Try exact match first
    if model_id in config.SDXL_MODELS:
        return config.SDXL_MODELS[model_id]
    
    # Try without -diffusers suffix
    base_id = model_id.replace('-diffusers', '')
    if base_id in config.SDXL_MODELS:
        meta = config.SDXL_MODELS[base_id].copy()
        # Modify name to indicate format
        if model_id.endswith('-diffusers'):
            meta['name'] = f"{meta['name']} (Diffusers)"
        return meta
    
    # Try fuzzy matching (e.g., juggernaut-xl-lightning -> juggernaut-xl)
    for config_id in config.SDXL_MODELS.keys():
        if config_id in model_id or model_id in config_id:
            return config.SDXL_MODELS[config_id]
    
    return None


def generate_fallback_metadata(model_id: str, format_type: str) -> Dict:
    """Generate basic metadata for models not in config."""
    # Clean up the model_id for display name
    name = model_id.replace('-', ' ').replace('_', ' ').title()
    if format_type == 'diffusers':
        name = f"{name.replace(' Diffusers', '')} (Diffusers)"
    
    return {
        'name': name,
        'description': f'Auto-discovered {format_type} model',
        'tier': 'standard',
        'best_for': 'General purpose',
        'scheduler': 'dpm_pp_2m_karras',
        'optimal_steps': 30,
        'cfg_range': [5.0, 7.0],
        'keywords': ['auto-discovered']
    }


def discover_all_models() -> List[Dict]:
    """
    Discover all available generation models from directories.
    Returns a unified list with metadata enrichment from config.
    """
    all_models = []
    seen_base_ids = set()
    
    # Scan both directories
    safetensors_models = scan_checkpoints_directory()
    diffusers_models = scan_diffusers_directory()
    
    logger.info(f"Discovered {len(safetensors_models)} SafeTensors models")
    logger.info(f"Discovered {len(diffusers_models)} Diffusers models")
    
    # Process SafeTensors models
    for model in safetensors_models:
        model_id = model['id']
        seen_base_ids.add(model_id)
        
        # Get metadata from config or generate fallback
        metadata = get_model_metadata(model_id)
        if metadata is None:
            metadata = generate_fallback_metadata(model_id, 'safetensors')
        
        all_models.append({
            'id': model_id,
            'name': metadata['name'],
            'description': metadata['description'],
            'type': 'generation',
            'tier': metadata.get('tier', 'standard'),
            'best_for': metadata.get('best_for', ''),
            'is_downloaded': True,
            'size_bytes': model['size_bytes'],
            'format': 'safetensors',
            'scheduler': metadata.get('scheduler'),
            'optimal_steps': metadata.get('optimal_steps'),
            'cfg_range': metadata.get('cfg_range'),
            'keywords': metadata.get('keywords', [])
        })
    
    # Process Diffusers models
    for model in diffusers_models:
        model_id = model['id']
        base_id = model['base_id']
        
        # Get metadata
        metadata = get_model_metadata(model_id)
        if metadata is None:
            metadata = generate_fallback_metadata(model_id, 'diffusers')
        
        all_models.append({
            'id': model_id,
            'name': metadata['name'],
            'description': metadata['description'],
            'type': 'generation',
            'tier': metadata.get('tier', 'standard'),
            'best_for': metadata.get('best_for', ''),
            'is_downloaded': True,
            'size_bytes': model['size_bytes'],
            'format': 'diffusers',
            'scheduler': metadata.get('scheduler'),
            'optimal_steps': metadata.get('optimal_steps'),
            'cfg_range': metadata.get('cfg_range'),
            'keywords': metadata.get('keywords', [])
        })
    
    return all_models
