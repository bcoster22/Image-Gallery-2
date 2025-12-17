
import requests
import base64
import os
import glob

API_URL = "http://localhost:2020/v1/chat/completions"
SEARCH_Pattern = "scripts/test_outputs/actions/*.png"

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def describe_image(image_path):
    base64_image = encode_image(image_path)
    payload = {
        "model": "moondream-2",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image briefly. mentions if it is an eye close up or a person."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ],
        "max_tokens": 60
    }

    try:
        response = requests.post(API_URL, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            result = response.json()
            description = result['choices'][0]['message']['content']
            print(f"File: {os.path.basename(image_path)}")
            print(f"Description: {description}")
            print("-" * 20)
        else:
            print(f"Error for {image_path}: {response.status_code}")
    except Exception as e:
        print(f"Exception for {image_path}: {e}")

if __name__ == "__main__":
    files = glob.glob(SEARCH_Pattern)
    print(f"Found {len(files)} images to verify...")
    for f in sorted(files):
        describe_image(f)
