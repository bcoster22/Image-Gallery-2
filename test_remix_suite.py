#!/usr/bin/env python3
"""
Comprehensive test suite for SDXL Remix and model switching
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:2020"

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_model_list():
    """Test 1: List available models"""
    print_header("TEST 1: List Available Models")
    try:
        resp = requests.get(f"{BASE_URL}/v1/models/list", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            models = data.get("models", [])
            print(f"✅ SUCCESS - Found {len(models)} models")
            for model in models[:5]:
                print(f"   - {model}")
            return True
        else:
            print(f"❌ FAILED - Status {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAILED - {e}")
        return False

def test_switch_to_sdxl():
    """Test 2: Switch to SDXL model"""
    print_header("TEST 2: Switch to SDXL Model")
    try:
        resp = requests.post(
            f"{BASE_URL}/v1/models/switch",
            json={"model": "sdxl-realism"},
            timeout=120
        )
        if resp.status_code == 200:
            data = resp.json()
            vram = data.get("vram_mb", 0)
            print(f"✅ SUCCESS - SDXL loaded")
            print(f"   VRAM: {vram} MB")
            return True
        else:
            print(f"❌ FAILED - Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ FAILED - {e}")
        return False

def test_sdxl_generation():
    """Test 3: Generate image with SDXL"""
    print_header("TEST 3: SDXL Image Generation")
    try:
        start = time.time()
        resp = requests.post(
            f"{BASE_URL}/v1/images/generate",
            json={
                "model": "sdxl-realism",
                "prompt": "Beautiful landscape with mountains at sunset",
                "steps": 6,
                "width": 512,
                "height": 512
            },
            timeout=60
        )
        duration = time.time() - start
        
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("result", [])
            if result and len(result) > 0 and len(result[0]) > 100:
                print(f"✅ SUCCESS - Generated in {duration:.2f}s")
                print(f"   Image size: {len(result[0])} chars (base64)")
                return True
            else:
                print(f"❌ FAILED - No image data in response")
                print(f"   Response: {json.dumps(data, indent=2)[:200]}")
                return False
        else:
            print(f"❌ FAILED - Status {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ FAILED - {e}")
        return False

def test_switch_to_moondream():
    """Test 4: Switch to Moondream model"""
    print_header("TEST 4: Switch to Moondream Model")
    try:
        resp = requests.post(
            f"{BASE_URL}/v1/models/switch",
            json={"model": "moondream-2"},
            timeout=60
        )
        if resp.status_code == 200:
            data = resp.json()
            vram = data.get("vram_mb", 0)
            print(f"✅ SUCCESS - Moondream loaded")
            print(f"   VRAM: {vram} MB")
            return True
        else:
            print(f"❌ FAILED - Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ FAILED - {e}")
        return False

def test_switch_back_to_sdxl():
    """Test 5: Switch back to SDXL (memory management test)"""
    print_header("TEST 5: Switch Back to SDXL (Round-trip)")
    try:
        resp = requests.post(
            f"{BASE_URL}/v1/models/switch",
            json={"model": "sdxl-realism"},
            timeout=120
        )
        if resp.status_code == 200:
            data = resp.json()
            vram = data.get("vram_mb", 0)
            print(f"✅ SUCCESS - SDXL reloaded")
            print(f"   VRAM: {vram} MB")
            return True
        else:
            print(f"❌ FAILED - Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ FAILED - {e}")
        return False

def test_rapid_generation():
    """Test 6: Rapid-fire generation (stress test)"""
    print_header("TEST 6: Rapid Generation (3 images)")
    prompts = [
        "A cat sitting on a windowsill",
        "Modern city skyline at night",
        "Desert landscape with cacti"
    ]
    
    results = []
    for i, prompt in enumerate(prompts, 1):
        try:
            print(f"  [{i}/3] Generating: '{prompt[:30]}...'")
            start = time.time()
            resp = requests.post(
                f"{BASE_URL}/v1/images/generate",
                json={
                    "model": "sdxl-realism",
                    "prompt": prompt,
                    "steps": 4,
                    "width": 512,
                    "height": 512
                },
                timeout=30
            )
            duration = time.time() - start
            
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("result", [])
                if result and len(result[0]) > 100:
                    print(f"    ✅ OK ({duration:.1f}s)")
                    results.append(True)
                else:
                    print(f"    ❌ No image")
                    results.append(False)
            else:
                print(f"    ❌ HTTP {resp.status_code}")
                results.append(False)
        except Exception as e:
            print(f"    ❌ {e}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    if success_rate == 100:
        print(f"\n✅ SUCCESS - All generations completed ({success_rate:.0f}%)")
        return True
    elif success_rate >= 66:
        print(f"\n⚠️  PARTIAL - {success_rate:.0f}% success rate")
        return True
    else:
        print(f"\n❌ FAILED - Only {success_rate:.0f}% success rate")
        return False

def main():
    print("\n" + "🧪"*30)
    print("  SDXL REMIX & MODEL TESTING SUITE")
    print("🧪"*30)
    
    tests = [
        ("Model List", test_model_list),
        ("Switch to SDXL", test_switch_to_sdxl),
        ("SDXL Generation", test_sdxl_generation),
        ("Switch to Moondream", test_switch_to_moondream),
        ("Switch Back to SDXL", test_switch_back_to_sdxl),
        ("Rapid Generation", test_rapid_generation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            time.sleep(1)  # Brief pause between tests
        except KeyboardInterrupt:
            print("\n\n⚠️  Tests interrupted by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ UNEXPECTED ERROR in {name}: {e}")
            results.append((name, False))
    
    # Final Summary
    print_header("FINAL RESULTS")
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")
    
    print(f"\n  Score: {passed}/{total} ({passed/total*100:.0f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    elif passed >= total * 0.8:
        print("\n⚠️  MOSTLY PASSED (some failures)")
        return 1
    else:
        print("\n❌ MULTIPLE FAILURES DETECTED")
        return 2

if __name__ == "__main__":
    sys.exit(main())
