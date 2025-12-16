#!/usr/bin/env python3
"""
Test image generation through the moondream-station SDXL backend
This simulates what the frontend should be doing
"""
import requests
import json
import base64
import sys

# Test 1: Verify SDXL is loaded
print("=" * 60)
print("TEST 1: Verify SDXL Model Status")
print("=" * 60)

try:
    resp = requests.get("http://localhost:2020/v1/models/list")
    if resp.status_code == 200:
        print("✅ Server responding")
    else:
        print(f"❌ Server error: {resp.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"❌ Cannot connect to server: {e}")
    sys.exit(1)

# Test 2: Generate an image
print("\n" + "=" * 60)
print("TEST 2: Generate Image with SDXL")
print("=" * 60)

payload = {
    "model": "sdxl-realism",
    "prompt": "A beautiful sunset over mountains, photorealistic, detailed",
    "steps": 6,
    "width": 512,
    "height": 512,
    "cfg_scale": 2.0
}

print(f"Prompt: {payload['prompt']}")
print(f"Steps: {payload['steps']}")
print(f"Size: {payload['width']}x{payload['height']}")
print("\nGenerating...")

try:
    resp = requests.post(
        "http://localhost:2020/v1/images/generate",
        json=payload,
        timeout=60
    )
    
    if resp.status_code == 200:
        data = resp.json()
        
        if "result" in data and len(data["result"]) > 0:
            base64_img = data["result"][0]
            
            # Decode and save
            img_bytes = base64.b64decode(base64_img)
            output_file = "antigravity_generated_image.png"
            
            with open(output_file, "wb") as f:
                f.write(img_bytes)
            
            print(f"✅ SUCCESS!")
            print(f"   Image size: {len(img_bytes):,} bytes")
            print(f"   Saved to: {output_file}")
            print(f"\n   You can view it with: xdg-open {output_file}")
            sys.exit(0)
        else:
            print(f"❌ FAILED - No image in response")
            print(f"   Response: {json.dumps(data, indent=2)[:500]}")
            sys.exit(1)
    else:
        print(f"❌ FAILED - HTTP {resp.status_code}")
        print(f"   Response: {resp.text[:500]}")
        sys.exit(1)
        
except requests.exceptions.Timeout:
    print("❌ FAILED - Request timed out after 60 seconds")
    sys.exit(1)
except Exception as e:
    print(f"❌ FAILED - {type(e).__name__}: {e}")
    sys.exit(1)
