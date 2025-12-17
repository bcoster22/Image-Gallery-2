
import os
import sys
import base64
import requests
from PIL import Image
from io import BytesIO

# Configuration
TEST_IMAGE_PATH = "scripts/debug/test_input.png"
URL = "http://localhost:2020/v1/generate"
OUTPUT_DIR = "scripts/test_outputs"

# Ensure output dir
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_enhance():
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"Error: {TEST_IMAGE_PATH} not found.")
        return

    print("Encoding test image...")
    encoded_image = encode_image(TEST_IMAGE_PATH)
    
    payload = {
        "prompt": "Enhance this image, make it high resolution, 8k, detailed",
        "image": f"data:image/png;base64,{encoded_image}",
        "width": 1024,
        "height": 1024,
        "steps": 6,
        "strength": 0.65, # Testing a stronger strength to see if it changes the output
        "model": "sdxl-realism" 
    }
    
    print(f"Sending request to {URL}...")
    try:
        response = requests.post(URL, json=payload, headers={"X-VRAM-Mode": "balanced"})
        
        if response.status_code == 200:
            data = response.json()
            if "images" in data and len(data["images"]) > 0:
                print("Success! Saving output...")
                img_data = base64.b64decode(data["images"][0])
                output_path = os.path.join(OUTPUT_DIR, "enhanced_test_output.png")
                with open(output_path, "wb") as f:
                    f.write(img_data)
                print(f"Saved to {output_path}")
            else:
                print("Error: No images returned in response.")
                print(data)
        else:
            print(f"Request failed with status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Request exception: {e}")

if __name__ == "__main__":
    test_enhance()
