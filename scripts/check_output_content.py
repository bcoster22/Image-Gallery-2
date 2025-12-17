
import requests
import base64
import os

# Config
API_URL = "http://localhost:2020/v1/chat/completions"
IMAGE_PATH = "scripts/test_outputs/enhanced_test_output.png"

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def describe_image():
    if not os.path.exists(IMAGE_PATH):
        print("Error: Image not found")
        return

    base64_image = encode_image(IMAGE_PATH)

    payload = {
        "model": "moondream-2",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image briefly."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ],
        "max_tokens": 100
    }

    try:
        response = requests.post(API_URL, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            result = response.json()
            description = result['choices'][0]['message']['content']
            print(f"Vision Analysis of Output: {description}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    describe_image()
