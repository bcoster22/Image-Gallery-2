import requests
import time
import subprocess
import json
import re

API_URL = "http://127.0.0.1:2020"
LOG_FILE = "/tmp/moondream_debug_gen_7.log"

def get_models():
    try:
        response = requests.get(f"{API_URL}/v1/models")
        if response.status_code == 200:
            data = response.json()
            print(f"DEBUG: API Response Type: {type(data)}")
            if isinstance(data, dict) and 'models' in data:
                return data['models'] # Handle wrapped format
            if isinstance(data, dict) and 'data' in data:
                return data['data'] # Handle other wrapped format
            return data
        return []
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []

def test_model(model_id):
    print(f"\nTesting model: {model_id}...")
    
    # 1. Get current log size to read only new appended logs
    try:
        with open(LOG_FILE, 'r') as f:
            f.seek(0, 2)
            start_pos = f.tell()
    except FileNotFoundError:
        start_pos = 0

    # 2. Send Generation Request
    payload = {
        "prompt": "Test generation for source verification",
        "model": model_id,
        "width": 512,
        "height": 512,
        "steps": 4 # fast test
    }
    
    try:
        start_time = time.time()
        response = requests.post(f"{API_URL}/v1/generate", json=payload, timeout=60)
        duration = time.time() - start_time
        status = response.status_code
        print(f"Status: {status}, Time: {duration:.2f}s")
    except Exception as e:
        print(f"Request failed: {e}")
        status = 500

    # 3. Read new logs
    log_content = ""
    try:
        with open(LOG_FILE, 'r') as f:
            f.seek(start_pos)
            log_content = f.read()
    except Exception as e:
        print(f"Error reading logs: {e}")

    # 4. Analyze resolution in logs
    source = "Unknown"
    resolution_path = "N/A"
    
    # Check for [SDXL] Resolved ... messages
    match = re.search(r"\[SDXL\] Resolved .* \((Exact|Fuzzy|Manual)\) to: (.+)", log_content)
    if match:
        method = match.group(1)
        path = match.group(2).strip()
        resolution_path = path
        if "/home/" in path or "/" in path: # Check if it looks like a local file path
            source = f"Local ({method})"
        else:
            source = f"Remote/Unknown ({method})"
            
    elif "RunDiffusion/Juggernaut-XL-Lightning" in model_id and "SDXL Model loaded successfully" in log_content:
         # Special case for default if it was already loaded
         source = "Local (Cached/Default)"
    
    return {
        "id": model_id,
        "status": status,
        "source": source,
        "path": resolution_path
    }

def main():
    print("Fetching models...")
    models = get_models()
    print(f"Found {len(models)} models.")
    
    results = []
    
    for model in models:
        # Only test generation models (or those that might be)
        if model.get('type') == 'generation' or 'sdxl' in model.get('id', '').lower():
            res = test_model(model['id'])
            results.append(res)
            print("Cooling down for 5 seconds...")
            time.sleep(5)
        else:
            print(f"Skipping non-generation model: {model['id']}")
            
    # Output Report
    print("\n\n" + "="*60)
    print(f"{'Model ID':<40} | {'Status':<8} | {'Source':<20}")
    print("-" * 60)
    for r in results:
        print(f"{r['id']:<40} | {r['status']:<8} | {r['source']:<20}")
    print("="*60)
    
    # Also save to markdown
    md_table = "| Model ID | Status | Source | Path |\n|---|---|---|---|\n"
    for r in results:
        md_table += f"| `{r['id']}` | {r['status']} | **{r['source']}** | `{r['path']}` |\n"
        
    print("\nMarkdown Table:")
    print(md_table)

if __name__ == "__main__":
    main()
