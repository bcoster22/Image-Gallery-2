import requests
import concurrent.futures
import time
import base64

# Configuration
API_URL = "http://localhost:2021/v1/chat/completions"
MODEL = "moondream-2b-int8.mf.gz"
# Larger image (approx 50kb) to simulate realistic load
IMAGE_DATA = "iVBORw0KGgoAAAANSUhEUgAAAyAAAAHgCAIAAAD2uF78AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACYSURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgB9IAAAUvO2s4AAAAASUVORK5CYII="
MAX_CONCURRENCY = 50

def send_request(i):
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{IMAGE_DATA}"}}
                ]
            }
        ],
        "stream": False
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if "error" in data:
                return False, f"API Error: {data['error']}"
            return True, "Success"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)

def benchmark():
    print(f"Starting benchmark on {API_URL}...")
    
    for concurrency in range(1, MAX_CONCURRENCY + 1):
        print(f"\nTesting concurrency level: {concurrency}")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(send_request, i) for i in range(concurrency)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
            
        successes = sum(1 for r in results if r[0])
        failures = sum(1 for r in results if not r[0])
        
        print(f"  Success: {successes}")
        print(f"  Failed:  {failures}")
        
        if failures > 0:
            print("\nFailures detected:")
            for r in results:
                if not r[0]:
                    print(f"  - {r[1]}")
            
            print(f"\n>>> Maximum stable concurrency detected: {concurrency - 1}")
            return concurrency - 1
            
        # Small cooldown between batches
        time.sleep(1)

    print(f"\n>>> Server handled max tested concurrency of {MAX_CONCURRENCY} without errors.")
    return MAX_CONCURRENCY

if __name__ == "__main__":
    benchmark()
