import requests
import base64
import json
import io
from PIL import Image, ImageDraw

def create_test_image():
    # Create a simple RGB image
    img = Image.new('RGB', (100, 100), color = 'red')
    d = ImageDraw.Draw(img)
    d.text((10,10), "Hello", fill=(255,255,0))
    
    # Save to buffer
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def test_connection(port):
    url = f"http://localhost:{port}/v1/caption"
    print(f"Testing connection to {url}...")
    
    try:
        # Create base64 image
        img_b64 = create_test_image()
        data_url = f"data:image/jpeg;base64,{img_b64}"
        
        payload = {
            "image_url": data_url,
            "stream": False
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=240)
        
        if response.status_code == 200:
            print(f"SUCCESS: Connected to Moondream on port {port}")
            print("Response:", response.json())
            return True
        else:
            print(f"FAILURE: Server returned status {response.status_code}")
            print("Response:", response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"FAILURE: Could not connect to localhost:{port}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Starting Moondream Station Test...")
    
    # Try default port 2024
    if not test_connection(2024):
        print("\nRetrying with port 2021 (alternative)...")
        test_connection(2021)
