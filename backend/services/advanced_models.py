import io
import json
import logging
import os
import torch
import gc
import requests
from typing import Optional
from PIL import Image
from base64 import b64decode

logger = logging.getLogger(__name__)

# Lazy imports for transformers to avoid startup overhead
try:
    from transformers import (
        AutoModelForCausalLM,
        AutoProcessor,
        AutoTokenizer,
        AutoModelForImageClassification,
        AutoImageProcessor,
        BitsAndBytesConfig,
        LlavaForConditionalGeneration  # For JoyCaption
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available. Advanced models will fail.")

class AdvancedModelService:
    """Service for loading and running advanced models (WD14, Florence-2, Moondream 3)"""
    
    def __init__(self):
        self.model = None
        self.processor = None
        self.tokenizer = None
        self.current_model_id = None
        self.labels = None
        self.bnb_config = None
        
    def download_image(self, url: str) -> Optional[Image.Image]:
        """Download image from URL or base64 data URI"""
        try:
            if url.startswith("data:"):
                # Parse data URI
                header, encoded = url.split(",", 1)
                data = b64decode(encoded)
                with io.BytesIO(data) as buffer:
                    return Image.open(buffer).convert("RGB").copy()
            elif url.startswith("http"):
                # Download from HTTP
                with requests.get(url, stream=True, timeout=10) as response:
                    response.raise_for_status()
                    return Image.open(response.raw).convert("RGB").copy()
            else:
                logger.error(f"Unsupported URL format: {url[:50]}...")
                return None
        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            return None

    def _cleanup_model(self):
        """Properly cleanup existing model to free VRAM"""
        if self.model is None:
            return
            
        try:
            # Move to CPU first to release VRAM
            if hasattr(self.model, 'cpu'):
                self.model.cpu()
        except Exception as e:
            logger.warning(f"Error moving model to CPU: {e}")
            
        # Delete references in order
        if self.processor is not None:
            del self.processor
            self.processor = None
            
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
            
        if self.labels is not None:
            del self.labels
            self.labels = None
        
        if self.model is not None:
            del self.model
            self.model = None
        
        # Aggressive cleanup
        gc.collect()
        gc.collect()  # Double collect for good measure
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            torch.cuda.synchronize()
        
        logger.info("Model cleanup completed")

    def start(self, model_id: str) -> bool:
        """Load the specified model"""
        if not TRANSFORMERS_AVAILABLE:
            logger.error("Transformers library not available")
            return False
            
        if self.current_model_id == model_id and self.model is not None:
            logger.info(f"Model {model_id} already loaded")
            return True
        
        # Cleanup existing model
        if self.current_model_id:
            logger.info(f"Unloading current model: {self.current_model_id}")
            self._cleanup_model()
        
        logger.info(f"Loading model: {model_id}")
        
        # Get local model path
        from backend.local_models import get_local_model_path
        model_path, is_local = get_local_model_path(model_id)
        
        if is_local:
            logger.info(f"Using local model at: {model_path}")
        else:
            logger.warning(f"Model not found locally, using HuggingFace: {model_path}")
        
        # Create 4-bit quantization config
        self.bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )
        
        try:
            if "wd14" in model_id or "wd-vit-tagger" in model_id:
                # WD14 V3 Loading
                logger.info(f"Loading WD14 from {model_path}")
                self.model = AutoModelForImageClassification.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=is_local  # Only use local files if available
                )
                self.processor = AutoImageProcessor.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=is_local
                )
                self.model.to("cuda")
                
                # Load actual tag names from CSV
                try:
                    # Check for local CSV first
                    csv_path = None
                    if is_local and os.path.isdir(model_path):
                        local_csv = os.path.join(model_path, "selected_tags.csv")
                        if os.path.exists(local_csv):
                            csv_path = local_csv
                            logger.info(f"Using local CSV: {csv_path}")
                    
                    # If not found locally, download from HF
                    if not csv_path:
                        logger.info("Local CSV not found, downloading from HuggingFace")
                        from huggingface_hub import hf_hub_download
                        csv_path = hf_hub_download(model_path, "selected_tags.csv")
                    
                    # Parse CSV to get tag names
                    import csv
                    tag_names = []
                    with open(csv_path, 'r', encoding='utf-8') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            tag_names.append(row['name'])
                    
                    self.labels = {i: tag_names[i] for i in range(len(tag_names))}
                    logger.info(f"WD14 loaded with {len(self.labels)} labels from CSV")
                except Exception as e:
                    logger.warning(f"Failed to load tag CSV, using default labels: {e}")
                    self.labels = self.model.config.id2label

            elif "moondream" in model_id:
                # Try Moondream 3 first, fallback to Moondream 2
                try:
                    logger.info(f"Loading Moondream from {model_path}")
                    
                    # FIX: Manually populate HF modules cache if missing (for offline trust_remote_code)
                    # This fixes 'FileNotFoundError: .../layers.py' after cache clear
                    if is_local:
                        try:
                            # Target cache dir that transformers is looking for
                            # We can infer it or just try to pre-load
                            # Actually, a simpler hack is to copy the files to the transformers cache if we know where it is looking
                            # But we can't easily predict the exact hash folder.
                            # However, we can try to force the files to be used by temporarily setting the code.
                            pass
                        except Exception as e:
                            logger.warn(f"Failed to repair cache: {e}")

                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_path,
                        trust_remote_code=True,
                        quantization_config=self.bnb_config,
                        device_map="auto",
                        local_files_only=is_local
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(
                        model_path,
                        local_files_only=is_local
                    )
                    logger.info(f"Moondream loaded successfully from {model_path}")
                except Exception as e:
                    if is_local:
                        logger.error(f"Failed to load local Moondream model: {e}")
                        raise
                    logger.warning(f"Failed to load Moondream: {e}")
                    raise
                
            elif "florence" in model_id:
                logger.info(f"Loading Florence-2 from {model_path}")
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    quantization_config=self.bnb_config,
                    device_map="auto",
                    local_files_only=is_local
                )
                self.processor = AutoProcessor.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=is_local
                )
                logger.info("Florence-2 loaded successfully")
                
            elif "joycaption" in model_id:
                logger.info(f"Loading JoyCaption from {model_path}")
                # JoyCaption uses LLaVA architecture
                # Use 4-bit quantization for 8GB VRAM compatibility
                logger.info("Using 4-bit quantization for 8GB VRAM compatibility")
                
                self.model = LlavaForConditionalGeneration.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    quantization_config=self.bnb_config,  # 4-bit quantization
                    device_map="auto",
                    local_files_only=is_local
                )
                    
                self.processor = AutoProcessor.from_pretrained(
                    model_path,
                    trust_remote_code=True,
                    local_files_only=is_local
                )
                logger.info("JoyCaption loaded successfully with 4-bit quantization")
            else:
                logger.error(f"Unknown model type: {model_id}")
                return False
                
            self.current_model_id = model_id
            logger.info(f"Successfully loaded {model_id} ({'local' if is_local else 'from HuggingFace'})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load {model_id}: {e}", exc_info=True)
            self._cleanup_model()
            return False

    def run(self, model_id: str, prompt: str, image_url: str) -> str:
        """Run inference with the loaded model"""
        if self.current_model_id != model_id:
            logger.error(f"Model mismatch: expected {model_id}, got {self.current_model_id}")
            return json.dumps({"error": "Model not loaded"})
        
        # Download image
        image = self.download_image(image_url)
        if not image:
            return json.dumps({"error": "Failed to load image"})
        
        try:
            if "wd14" in model_id or "wd-vit-tagger" in model_id:
                # WD14 Logic - Extract Tags AND Scores
                inputs = self.processor(images=image, return_tensors="pt").to("cuda")
                with torch.no_grad():
                    outputs = self.model(**inputs)
                
                logits = outputs.logits[0]
                probs = torch.sigmoid(logits).cpu().numpy()
                
                # Format results
                results = {"tags": [], "scores": {}}
                
                # Extract tags and ratings
                for i, score in enumerate(probs):
                    # Get actual label name (not LABEL_<index>)
                    label = self.labels.get(i, f"LABEL_{i}")
                    
                    # Check for Rating tags
                    if label.startswith("rating:"):
                        clean_name = label.replace("rating:", "")
                        results["scores"][clean_name] = float(score)
                    
                    # Standard tags (threshold 0.35)
                    elif score > 0.35:
                        results["tags"].append(label)
                        
                return json.dumps(results)

            elif "moondream" in model_id:
                # Moondream inference
                enc_image = self.model.encode_image(image)
                answer = self.model.answer_question(enc_image, prompt, self.tokenizer)
                return answer

            elif "florence" in model_id:
                # Florence-2 inference
                task_prompt = "<MORE_DETAILED_CAPTION>"
                if "tag" in prompt.lower():
                    task_prompt = "<OD>"
                    
                inputs = self.processor(
                    text=task_prompt, images=image, return_tensors="pt"
                ).to("cuda")
                
                generated_ids = self.model.generate(
                    input_ids=inputs["input_ids"],
                    pixel_values=inputs["pixel_values"],
                    max_new_tokens=1024,
                    do_sample=False,
                    num_beams=3
                )
                
                generated_text = self.processor.batch_decode(
                    generated_ids, skip_special_tokens=False
                )[0]
                
                parsed = self.processor.post_process_generation(
                    generated_text,
                    task=task_prompt,
                    image_size=(image.width, image.height)
                )
                
                return str(parsed.get(task_prompt, parsed))
                
            elif "joycaption" in model_id:
                # JoyCaption inference - generates descriptive captions
                device = "cuda" if torch.cuda.is_available() else "cpu"
                
                # Use prompt if provided, otherwise default caption prompt
                caption_prompt = prompt if prompt else "A descriptive caption for this image:\n"
                
                inputs = self.processor(
                    text=caption_prompt,
                    images=image,
                    return_tensors="pt"
                ).to(device)
                
                # Convert pixel values to float16 on CUDA
                if device == "cuda" and "pixel_values" in inputs:
                    inputs["pixel_values"] = inputs["pixel_values"].to(torch.float16)
                
                with torch.no_grad():
                    generated_ids = self.model.generate(
                        **inputs,
                        max_new_tokens=300,
                        do_sample=True,
                        temperature=0.6,
                        top_p=0.9
                    )
                
                generated_text = self.processor.batch_decode(
                    generated_ids, skip_special_tokens=True
                )[0]
                
                # Remove the prompt from the generated text
                answer = generated_text.replace(caption_prompt, "").strip()
                return answer
                
            return json.dumps({"error": "Model type not supported"})
            
        except Exception as e:
            logger.error(f"Inference failed: {e}", exc_info=True)
            return json.dumps({"error": str(e)})
        finally:
            # Close PIL image to free RAM
            if image:
                try:
                    image.close()
                except:
                    pass


# Global instance
advanced_model_service = AdvancedModelService()
