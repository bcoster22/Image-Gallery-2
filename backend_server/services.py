
import json
import io
import requests
import torch
import numpy as np
import gc
from backend_server.monitoring import model_memory_tracker

try:
    from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig, AutoTokenizer, AutoModelForImageClassification, AutoImageProcessor
    from PIL import Image
    from fastapi.concurrency import run_in_threadpool
except ImportError:
    print("Warning: Transformers/BitsAndBytes/PIL not found. Advanced models will fail.")

from moondream_station.core.inference_service import InferenceService as BaseInferenceService

class TrackedInferenceService(BaseInferenceService):
    def start(self, model_id: str):
        print(f"[Debug] Attempting to start model: {model_id}")
        result = super().start(model_id)
        print(f"[Debug] Start result for {model_id}: {result}")
        if result:
             # Track the model load
             try:
                 model_info = self.manifest_manager.get_models().get(model_id)
                 if model_info:
                     model_memory_tracker.track_model_load(model_id, model_info.name)
                     print(f"[ModelTracker] Tracked model load: {model_id} ({model_info.name})")
             except Exception as e:
                 print(f"[ModelTracker] Warning: Failed to track model load: {e}")
        return result

class AdvancedModelService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.tokenizer = None
        self.current_model_id = None
        self.labels = None
        self.bnb_config = None
        
    def download_image(self, url):
        try:
            if url.startswith("data:"):
                from base64 import b64decode
                header, encoded = url.split(",", 1)
                data = b64decode(encoded)
                with io.BytesIO(data) as buffer:
                    return Image.open(buffer).convert("RGB").copy()  # .copy() to detach from buffer
            elif url.startswith("http"):
                with requests.get(url, stream=True) as response:
                    return Image.open(response.raw).convert("RGB").copy()
        except Exception as e:
            print(f"Error downloading image: {e}")
        return None

    def start(self, model_id):
        if self.current_model_id == model_id and self.model is not None:
             return True
             
        # Proper Unload with CPU offload
        if self.model is not None:
             try:
                 # Move to CPU first to release VRAM
                 if hasattr(self.model, 'cpu'):
                     self.model.cpu()
             except: pass
             
             # Delete references in order
             if hasattr(self, 'processor') and self.processor is not None:
                 del self.processor
                 self.processor = None
                 
             if hasattr(self, 'tokenizer') and self.tokenizer is not None:
                 del self.tokenizer
                 self.tokenizer = None
                 
             if hasattr(self, 'labels') and self.labels is not None:
                 del self.labels
                 self.labels = None
             
             del self.model
             self.model = None
             
             # Aggressive cleanup
             gc.collect()
             gc.collect() # Double collect
             
             if torch.cuda.is_available():
                 torch.cuda.empty_cache()
                 torch.cuda.ipc_collect()
                 torch.cuda.synchronize()  # Ensure all CUDA operations complete
             
             # TRACKER UPDATE: Record manual unload
             try:
                 model_memory_tracker.track_model_unload(self.current_model_id)
             except: pass

             # Broadcast unload event
             try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "INFO", 
                     "message": f"[Backend] Unloaded model to free VRAM.",
                     "source": "AdvancedModelService"
                 }, timeout=1)
             except: pass
        
        print(f"[Advanced] Loading {model_id}...")
        
        # Clean up old quantization config if it exists
        if hasattr(self, 'bnb_config'):
            del self.bnb_config
            
        # 4-Bit Config
        self.bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )
        
        try:
            if "wd-vit-tagger-v3" in model_id:
                # WD14 V3 Loading
                repo = "SmilingWolf/wd-vit-tagger-v3"
                self.model = AutoModelForImageClassification.from_pretrained(repo, trust_remote_code=True)
                self.processor = AutoImageProcessor.from_pretrained(repo, trust_remote_code=True)
                self.model.to("cuda")
                self.labels = self.model.config.id2label

            elif "moondream" in model_id:
                try:
                    print("[Advanced] Attempting to load Moondream 3 (4-bit)...")
                    model_name = "alecccdd/moondream3-preview-4bit"
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name, trust_remote_code=True, quantization_config=self.bnb_config, device_map="auto"
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    print("[Advanced] Moondream 3 loaded successfully.")
                except Exception as e:
                    print(f"[Advanced] Failed to load Moondream 3 ({e}). Falling back to Moondream 2.")
                    model_name = "vikhyatk/moondream2"
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name, trust_remote_code=True, quantization_config=self.bnb_config, device_map="auto"
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    print("[Advanced] Moondream 2 loaded as fallback.")
                
            elif "florence" in model_id:
                model_name = "microsoft/Florence-2-large"
                self.model = AutoModelForCausalLM.from_pretrained(
                    model_name, trust_remote_code=True, quantization_config=self.bnb_config, device_map="auto"
                )
                self.processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
                
            self.current_model_id = model_id
            print(f"[Advanced] Loaded {model_id} successfully.")
            try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "INFO", 
                     "message": f"Successfully loaded model: {model_id}",
                     "source": "AdvancedModelService"
                 }, timeout=1)
            except: pass
            
            model_memory_tracker.track_model_load(model_id, model_id)
                
            return True
        except Exception as e:
            print(f"[Advanced] Failed to load {model_id}: {e}")
            try:
                 requests.post("http://localhost:3001/log", json={
                     "level": "ERROR", 
                     "message": f"Failed to load model {model_id}: {str(e)}",
                     "source": "AdvancedModelService"
                 }, timeout=1)
            except: pass
            return False

    def run(self, model_id, prompt, image_url):
        image = self.download_image(image_url)
        if not image: raise Exception("Failed to load image")
        
        try:
            if "wd-vit-tagger-v3" in model_id:
                # WD14 Logic - Extract Tags AND Scores
                inputs = self.processor(images=image, return_tensors="pt").to("cuda")
                with torch.no_grad():
                    outputs = self.model(**inputs)
                
                logits = outputs.logits[0]
                probs = torch.sigmoid(logits).cpu().numpy()
                
                # Format results
                results = { "tags": [], "scores": {} }
                
                # Extract
                for i, score in enumerate(probs):
                    label = self.labels[i]
                    
                    # Check for Rating tags
                    if label.startswith("rating:"):
                        # rating:general, rating:explicit, etc.
                        clean_name = label.replace("rating:", "")
                        results["scores"][clean_name] = float(score)
                    
                    # Standard tags (threshold 0.35)
                    elif score > 0.35:
                         # Escape special chars if needed
                         results["tags"].append(label)
                         
                return json.dumps(results)

            elif "moondream" in model_id:
                enc_image = self.model.encode_image(image)
                return self.model.answer_question(enc_image, prompt, self.tokenizer)

            elif "florence" in model_id:
                 task_prompt = "<MORE_DETAILED_CAPTION>"
                 if "tag" in prompt.lower(): task_prompt = "<OD>" 
                 inputs = self.processor(text=task_prompt, images=image, return_tensors="pt").to("cuda")
                 generated_ids = self.model.generate(
                      input_ids=inputs["input_ids"],
                      pixel_values=inputs["pixel_values"],
                      max_new_tokens=1024,
                      do_sample=False,
                      num_beams=3
                 )
                 generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
                 parsed = self.processor.post_process_generation(generated_text, task=task_prompt, image_size=(image.width, image.height))
                 return parsed.get(task_prompt, str(parsed))
                 
            return "Model not supported"
        finally:
            # CRITICAL: Close PIL image to free RAM
            if image:
                try:
                    image.close()
                except:
                    pass
