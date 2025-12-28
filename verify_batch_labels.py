import requests
import base64
from PIL import Image
import io
import json
import time

# Create dummy image
def create_dummy_image(color):
    img = Image.new('RGB', (512, 512), color=color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')

images = [
    create_dummy_image('red'),
    create_dummy_image('green'),
    create_dummy_image('blue'),
    create_dummy_image('white')
]

payload = {
    "images": images
}

print("Sending batch request with 4 images...")
start = time.time()
try:
    response = requests.post("http://localhost:2020/vision/batch-caption", json=payload)
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
print(f"Duration: {time.time() - start:.3f}")
