import torch
import os
import sys

print(f"Python: {sys.version}")
print(f"Torch: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"CUDA Version: {torch.version.cuda}")
print(f"Device Count: {torch.cuda.device_count()}")
print(f"Environment: {os.environ.get('CUDA_VISIBLE_DEVICES', 'Not Set')}")

try:
    import pynvml
    pynvml.nvmlInit()
    driver = pynvml.nvmlSystemGetDriverVersion()
    # Handle bytes vs str
    if isinstance(driver, bytes):
        driver = driver.decode()
    print(f"Nvidia Driver: {driver}")
except Exception as e:
    print(f"NVML Error: {e}")

try:
    torch.cuda.init()
except Exception as e:
    print(f"Init Error: {e}")
