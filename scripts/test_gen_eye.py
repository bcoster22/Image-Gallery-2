import requests
import base64
import json
import os

ENDPOINT = "http://127.0.0.1:2020/v1/generate"
# Model ID matching the one in local_manifest.json for "SDXL Realism"
MODEL_ID = "sdxl-realism" 

payload = {
    "prompt": "an eye close up, macro photography, highly detailed iris",
    "negative_prompt": "cartoon, drawing, anime, blur",
    "model": MODEL_ID,
    "steps": 30,
    "guidance_scale": 6.5,
    "width": 1024,
    "height": 1024,
    "num_images": 1
}

print(f"Sending request to {ENDPOINT} with model {MODEL_ID}...")
try:
    response = requests.post(ENDPOINT, json=payload, headers={"Content-Type": "application/json"}, timeout=120)
    response.raise_for_status()
    
    data = response.json()
    # Expecting {"images": ["base64..."]} or directly list or dict
    # Moondream backend/SDXL backend usually returns specific format.
    # Looking at backend.py: returns plain list of strings [img_str] if success? 
    # Or wrapped?
    # standard wrappers usually return {"data": [{"b64_json": "..."}]} or similar.
    # But backend.py `return results`. A list.
    # Uvicorn/FastAPI usually wraps it.
    
    images = []
    if isinstance(data, list):
        images = data
    elif isinstance(data, dict) and "images" in data:
        images = data["images"]
    elif isinstance(data, dict) and "data" in data:
        # OpenAI format check
        if isinstance(data["data"], list) and "b64_json" in data["data"][0]:
            images = [d["b64_json"] for d in data["data"]]
        else:
            images = data["data"]
            
    if images:
        print(f"Received {len(images)} image(s).")
        for i, img_b64 in enumerate(images):
            # clean if necessary
            if "," in img_b64:
                img_b64 = img_b64.split(",")[1]
            
            with open(f"test_eye_gen_{i}.png", "wb") as f:
                f.write(base64.b64decode(img_b64))
            print(f"Saved test_eye_gen_{i}.png")
    else:
        print("No images found in response:", data)

except Exception as e:
    print("Error:", e)
    if hasattr(e, 'response') and e.response:
        print("Response text:", e.response.text)
