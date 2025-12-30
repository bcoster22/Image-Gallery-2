import requests
import time
import re

API_URL = "http://127.0.0.1:2020"
LOG_FILE = "/tmp/moondream_debug_gen_recovery_3.log"
TARGET_MODEL = "checkpoint/dreamshaper-xl"

def test_single_model():
    print(f"Testing single model: {TARGET_MODEL}...")
    
    # 1. Get log position
    try:
        with open(LOG_FILE, 'r') as f:
            f.seek(0, 2)
            start_pos = f.tell()
    except FileNotFoundError:
        start_pos = 0

    # 2. Generate
    payload = {
        "prompt": "Test single checkpoint resolution",
        "model": TARGET_MODEL,
        "width": 512,
        "height": 512,
        "steps": 4
    }
    
    try:
        start_time = time.time()
        response = requests.post(f"{API_URL}/v1/generate", json=payload, timeout=60)
        duration = time.time() - start_time
        print(f"Status: {response.status_code}, Time: {duration:.2f}s")
    except Exception as e:
        print(f"Request failed: {e}")
        return

    # 3. Analyze Logs
    try:
        with open(LOG_FILE, 'r') as f:
            f.seek(start_pos)
            log_content = f.read()
            
        print("\nLog Analysis:")
        if f"Resolved {TARGET_MODEL}" in log_content:
            print("SUCCESS: Resolution message found.")
            match = re.search(r"\[SDXL\] Resolved .* \((.+)\) to: (.+)", log_content)
            if match:
                print(f"Method: {match.group(1)}")
                print(f"Path: {match.group(2)}")
        else:
            print("FAILURE: No resolution message found in new logs.")
            print("Tail of logs:")
            print(log_content[-500:])

    except Exception as e:
        print(f"Log analysis failed: {e}")

if __name__ == "__main__":
    time.sleep(2) # brief wait for server to settle
    test_single_model()
