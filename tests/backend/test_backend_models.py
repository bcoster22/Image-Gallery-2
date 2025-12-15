
import requests
import json
import os

BASE_URL = "http://localhost:2021"

def test_vlm():
    print("Testing VLM (Moondream)...")
    try:
        with open('test_vlm.json', 'r') as f:
            payload = json.load(f)
        
        # Ensure payload matches what the server expects for /v1/chat/completions
        # The file test_vlm.json likely contains the body for the request
        # But let's check if it needs adjustment. 
        # The app sends: { model: "moondream-2", messages: [...], stream: false, max_tokens: 1024 }
        
        url = f"{BASE_URL}/v1/chat/completions"
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload, timeout=300)
        
        print(f"Status Code: {response.status_code}")
        if response.ok:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
            
    except Exception as e:
        print(f"VLM Test Failed: {e}")

def test_nsfw():
    print("\nTesting NSFW Detector...")
    try:
        with open('test_nsfw.json', 'r') as f:
            payload = json.load(f)
            
        url = f"{BASE_URL}/v1/classify"
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload, timeout=60)
        
        print(f"Status Code: {response.status_code}")
        if response.ok:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
            
    except Exception as e:
        print(f"NSFW Test Failed: {e}")

if __name__ == "__main__":
    test_vlm()
    test_nsfw()
