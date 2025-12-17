
import requests
import base64
import os
import json
import time

API_BASE = "http://localhost:2020/v1"
INPUT_IMAGE = "scripts/debug/test_input.png" # Ensure this exists or use check
OUTPUT_DIR = "scripts/test_outputs/actions"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def encode_image(path):
    if not os.path.exists(path):
        # Fallback to creating a dummy image if missing
        from PIL import Image
        img = Image.new('RGB', (512, 512), color='red')
        img.save(path)
        print(f"Created dummy input at {path}")
    
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def test_remix(image_b64):
    print("\n--- Testing Action: Remix (Recreate) ---")
    url = f"{API_BASE}/generate"
    payload = {
        "prompt": "A cyberpunk version of this image, neon lights, futuristic city",
        "image": image_b64,
        "model": "sdxl-realism",
        "steps": 20, # Low steps for speed
        "width": 512, # Low res for speed
        "height": 512,
        "strength": 0.75,
        "guidance_scale": 7.5
    }
    
    start = time.time()
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            data = response.json()
            image_data = data.get('images', [None])[0] or data.get('image') or data.get('url')
            if image_data:
                # Decode and save
                 # Remove data:image/png;base64, if present
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]
                
                with open(f"{OUTPUT_DIR}/remix_result.png", "wb") as f:
                    f.write(base64.b64decode(image_data))
                print(f"✅ Success! Saved to {OUTPUT_DIR}/remix_result.png ({time.time()-start:.2f}s)")
                return True
            else:
                 print(f"❌ Failed: No image in response. Data: {data}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    return False

def test_enhance(image_b64):
    print("\n--- Testing Action: Enhance (Upscale) ---")
    url = f"{API_BASE}/generate"
    # Enhance uses lower strength to preserve details
    payload = {
        "prompt": "Professional quality, enhanced details, sharp focus, 4k",
        "image": image_b64,
        "model": "sdxl-realism",
        "steps": 20,
        "width": 512, # Keeping same as input for this test, normally would upscale
        "height": 512,
        "strength": 0.3, # Low strength for enhancement
        "guidance_scale": 7.0
    }
    
    start = time.time()
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            data = response.json()
            image_data = data.get('images', [None])[0] or data.get('image') or data.get('url')
            if image_data:
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]
                with open(f"{OUTPUT_DIR}/enhance_result.png", "wb") as f:
                    f.write(base64.b64decode(image_data))
                print(f"✅ Success! Saved to {OUTPUT_DIR}/enhance_result.png ({time.time()-start:.2f}s)")
                return True
            else:
                 print(f"❌ Failed: No image in response. Data: {data}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    return False

def test_caption(image_b64):
    print("\n--- Testing Action: Regenerate Caption ---")
    url = f"{API_BASE}/chat/completions"
    payload = {
        "model": "moondream-2",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
                ]
            }
        ],
        "max_tokens": 100
    }
    
    start = time.time()
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            data = response.json()
            caption = data.get('choices', [{}])[0].get('message', {}).get('content')
            if caption:
                print(f"✅ Success! Caption: {caption[:50]}... ({time.time()-start:.2f}s)")
                return True
            else:
                print(f"❌ Failed: No caption. Data: {data}")
        else:
             print(f"❌ Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    return False

def test_sketch(image_b64):
    print("\n--- Testing Action: Pencil Sketch (Remix) ---")
    url = f"{API_BASE}/generate"
    payload = {
        "prompt": "Charcoal sketch, pencil drawing, monochrome, rough lines",
        "image": image_b64,
        "model": "sdxl-realism",
        "steps": 20,
        "width": 512,
        "height": 512,
        "strength": 0.65,
        "guidance_scale": 7.5
    }
    
    start = time.time()
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            data = response.json()
            image_data = data.get('images', [None])[0] or data.get('image') or data.get('url')
            if image_data:
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]
                with open(f"{OUTPUT_DIR}/sketch_result.png", "wb") as f:
                    f.write(base64.b64decode(image_data))
                print(f"✅ Success! Saved to {OUTPUT_DIR}/sketch_result.png ({time.time()-start:.2f}s)")
                return True
    except: pass
    return False

def check_outputs():
    # Simple heuristic to check if it's an eye (file size or basic variance, but visual check is best)
    # We will just rely on the user checking the files, or I can run the vision model on them check_output_content.py style
    pass

if __name__ == "__main__":
    b64 = encode_image(INPUT_IMAGE)
    
    results = {
        "remix": test_remix(b64),
        "sketch": test_sketch(b64),
        "enhance": test_enhance(b64),
        "caption": test_caption(b64)
    }
    
    print("\n\n=== SUMMARY ===")
    for action, outcome in results.items():
        print(f"{action.upper()}: {'PASS' if outcome else 'FAIL'}")

