import os
import torch
import base64
import io
from PIL import Image
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image, EulerDiscreteScheduler, PipelineQuantizationConfig, AutoencoderKL
import logging

# Global instance
BACKEND = None

class SDXLBackend:
    def __init__(self, config):
        self.config = config
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger = logging.getLogger("sdxl_backend")
        
        # Default models (can be overridden by manifest args)
        self.model_id = config.get("model_id", "RunDiffusion/Juggernaut-XL-Lightning")
        self.use_4bit = config.get("use_4bit", True)
        self.compile = config.get("compile", False) # Optional torch.compile
        
        # Pipeline storage
        self.pipeline = None
        self.img2img_pipeline = None
        self._models_dir = os.environ.get("MOONDREAM_MODELS_DIR", os.path.expanduser("~/.moondream-station/models"))

    def initialize(self):
        """
        Load the SDXL model with 4-bit quantization for 8GB VRAM compatibility.
        """
        try:
            self.logger.info(f"Initializing SDXL Backend with model: {self.model_id}")
            self.logger.info(f"4-bit Quantization: {self.use_4bit}")

            # 4-bit Config using PipelineQuantizationConfig
            quantization_config = None
            # Disabled 4-bit quantization due to accelerate hook conflicts
            # Using fp16 instead with sequential CPU offload for VRAM management
            quantization_config = None

            # Load Pipeline
            self.pipeline = AutoPipelineForText2Image.from_pretrained(
                self.model_id,
                torch_dtype=torch.float16,
                cache_dir=os.path.join(self._models_dir, "models")
            )

            # Optimizations for SDXL Lightning
            self.pipeline.scheduler = EulerDiscreteScheduler.from_config(
                self.pipeline.scheduler.config, 
                timestep_spacing="trailing"
            )
            
            # Initialize Image-to-Image pipeline sharing components
            try:
                self.img2img_pipeline = AutoPipelineForImage2Image.from_pipe(self.pipeline)
                self.img2img_pipeline.enable_sequential_cpu_offload()
            except Exception as e:
                self.logger.warning(f"Failed to init img2img pipeline: {e}")
                self.img2img_pipeline = None

            # Fix for "Casting a quantized model to new dtype is unsupported"
            # We explicitly load VAE in float32 to avoid quantization issues
            # The VAE is small enough to fit in VRAM alongside 4-bit UNet
            try:
                self.logger.info("Reloading VAE in float16 to fix quantization casting...")
                vae = AutoencoderKL.from_pretrained(
                    self.model_id, 
                    subfolder="vae", 
                    torch_dtype=torch.float16,
                    cache_dir=os.path.join(self._models_dir, "models")
                )
                self.pipeline.vae = vae
                if self.img2img_pipeline:
                    self.img2img_pipeline.vae = vae
            except Exception as e:
                self.logger.warning(f"Could not reload VAE: {e}")

            self.pipeline.enable_sequential_cpu_offload()

            self.logger.info("SDXL Model loaded successfully.")
            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize SDXL backend: {e}")
            import traceback
            traceback.print_exc()
            return False

    def generate_image(self, prompt, negative_prompt="", steps=4, guidance_scale=1.5, width=1024, height=1024, num_images=1, image=None, strength=0.75, **kwargs):
        """
        Generate an image using the loaded pipeline. Supports txt2img and img2img.
        """
        if not self.pipeline:
            raise RuntimeError("Pipeline not initialized")
            
        try:
            target_pipeline = self.pipeline
            pipeline_kwargs = {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "num_inference_steps": int(steps),
                "guidance_scale": float(guidance_scale),
                "num_images_per_prompt": int(num_images),
                "width": int(width),
                "height": int(height)
            }

            # Handle Image-to-Image
            if image:
                if not self.img2img_pipeline:
                    raise RuntimeError("Img2Img pipeline failed to initialize")
                
                self.logger.info(f"Generating Image-to-Image: '{prompt}'")
                
                # Decode base64 image
                if "," in image:
                    image = image.split(",")[1]
                try:
                    image_data = base64.b64decode(image)
                    pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
                    pil_image = pil_image.resize((int(width), int(height))) # Resize input to target
                    
                    target_pipeline = self.img2img_pipeline
                    pipeline_kwargs["image"] = pil_image
                    pipeline_kwargs["strength"] = float(strength)
                    # Remove width/height for img2img as it uses input image size (or we resized it)
                    # Some pipelines warn if these are passed, but resize handles it.
                except Exception as img_err:
                    self.logger.error(f"Failed to process input image: {img_err}")
                    raise img_err
            else:
                self.logger.info(f"Generating Text-to-Image: '{prompt}'")

            with torch.inference_mode():
                images = target_pipeline(**pipeline_kwargs).images

            # Convert to base64
            results = []
            for img in images:
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                results.append(img_str)

            return results

        except Exception as e:
            self.logger.error(f"Generation failed: {e}")
            if "out of memory" in str(e).lower():
                 # Attempt cleanup
                 torch.cuda.empty_cache()
            raise e


    def unload(self):
        """
        Unload models and free VRAM.
        """
        self.logger.info("Unloading SDXL Backend...")
        del self.pipeline
        del self.img2img_pipeline
        self.pipeline = None
        self.img2img_pipeline = None
        
        import gc
        gc.collect()
        torch.cuda.empty_cache()
        self.logger.info("SDXL Backend unloaded.")

# Module-level interface

MODEL_MAP = {
    "sdxl-realism": "RunDiffusion/Juggernaut-XL-Lightning",
    "sdxl-anime": "cagliostrolab/animagine-xl-3.1",
    "sdxl-base": "stabilityai/stable-diffusion-xl-base-1.0",
}

def init_backend(model_id=None, **kwargs):
    global BACKEND
    config = kwargs.copy()
    if model_id:
        config['model_id'] = MODEL_MAP.get(model_id, model_id)
    
    BACKEND = SDXLBackend(config)
    return BACKEND.initialize()

def generate(prompt, **kwargs):
    if not BACKEND:
        return {"error": "Backend not initialized"}
    return BACKEND.generate_image(prompt, **kwargs)

def images(**kwargs):
    if not BACKEND:
        return {"error": "Backend not initialized"}
    return BACKEND.generate_image(**kwargs)

def unload_backend():
    global BACKEND
    if BACKEND:
        BACKEND.unload()
        BACKEND = None
        return True
    return False
