try:
    import pynvml
except ImportError:
    pynvml = None

class HardwareMonitor:
    def __init__(self):
        self.nvidia_available = False
        if pynvml:
            try:
                pynvml.nvmlInit()
                self.nvidia_available = True
            except Exception:
                pass

    def get_environment_status(self):
        has_gpu = self.nvidia_available
        gpu_name = "CPU Mode"
        vram_total = 0
        vram_free = 0
        
        if self.nvidia_available:
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                gpu_name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(gpu_name, bytes):
                    gpu_name = gpu_name.decode('utf-8')
                
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                vram_total = mem_info.total
                vram_free = mem_info.free
            except Exception:
                 self.nvidia_available = False
                 gpu_name = "GPU Error"

        return {
            "gpu_available": has_gpu,
            "gpu_name": gpu_name,
            "vram_total_mb": vram_total / 1024 / 1024,
            "vram_free_mb": vram_free / 1024 / 1024
        }
        
    def get_gpus(self):
         gpus = []
         if self.nvidia_available:
             try:
                 count = pynvml.nvmlDeviceGetCount()
                 for i in range(count):
                     handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                     name = pynvml.nvmlDeviceGetName(handle)
                     if isinstance(name, bytes): name = name.decode('utf-8')
                     
                     mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                     util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                     
                     gpus.append({
                         "id": i,
                         "name": name,
                         "vram_total_mb": mem.total / 1024 / 1024,
                         "vram_used_mb": mem.used / 1024 / 1024,
                         "vram_free_mb": mem.free / 1024 / 1024,
                         "gpu_utilization": util.gpu,
                         "memory_utilization": util.memory,
                         "temperature": pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                     })
             except: pass
         return gpus

# Global monitor instance
hw_monitor = HardwareMonitor()
