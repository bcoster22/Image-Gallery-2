
import sys
import os
import unittest.mock as mock

# Add path to find the module
# Adjust this based on where the package is
sys.path.append(os.path.expanduser("~/.moondream-station/moondream-station"))

# Mock pynvml if not present
sys.modules['pynvml'] = mock.Mock()
sys.modules['pynvml'].nvmlDeviceGetHandleByIndex.return_value = "handle"
sys.modules['pynvml'].nvmlDeviceGetTemperature.return_value = 55
sys.modules['pynvml'].nvmlDeviceGetTemperatureThreshold.return_value = 90

# Import the new module
try:
    from moondream_station.core.system_diagnostics import SystemDiagnostician
    print("Successfully imported SystemDiagnostician")
except ImportError as e:
    print(f"Failed to import: {e}")
    sys.exit(1)

# Test instantiation
try:
    # Use current dir as config root just for test
    diag = SystemDiagnostician(os.getcwd())
    print("Successfully instantiated SystemDiagnostician")
    
    # Run checks (mocking dependencies where needed)
    # We can pass nvidia_available=True to test that path
    results = diag.run_all_checks(nvidia_available=True)
    print(f"Ran {len(results)} checks")
    for r in results:
        print(f"- {r['id']}: {r['status']}")
        
    print("Verification Passed!")
except Exception as e:
    print(f"Verification Failed: {e}")
    sys.exit(1)
