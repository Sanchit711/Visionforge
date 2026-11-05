import os
import platform
import psutil
import torch
import ultralytics
import cv2
from typing import Dict, Any, List
from app.schemas.schemas import HardwareTelemetryOut

def get_hardware_telemetry() -> HardwareTelemetryOut:
    # CPU
    cpu_count = psutil.cpu_count(logical=True) or 1
    cpu_percent = psutil.cpu_percent(interval=None)

    # RAM
    vmem = psutil.virtual_memory()
    ram_total_gb = round(vmem.total / (1024 ** 3), 2)
    ram_used_gb = round(vmem.used / (1024 ** 3), 2)
    ram_free_gb = round(vmem.available / (1024 ** 3), 2)
    ram_percent = vmem.percent

    # Disk
    disk = psutil.disk_usage(os.getcwd())
    disk_total_gb = round(disk.total / (1024 ** 3), 2)
    disk_free_gb = round(disk.free / (1024 ** 3), 2)
    disk_percent = disk.percent

    # CUDA / GPU
    cuda_available = torch.cuda.is_available()
    gpu_count = torch.cuda.device_count() if cuda_available else 0
    gpu_devices: List[Dict[str, Any]] = []

    if cuda_available:
        for i in range(gpu_count):
            props = torch.cuda.get_device_properties(i)
            mem_total_mb = round(props.total_memory / (1024 ** 2))
            mem_alloc_mb = round(torch.cuda.memory_allocated(i) / (1024 ** 2))
            gpu_devices.append({
                "index": i,
                "name": props.name,
                "vram_total_mb": mem_total_mb,
                "vram_used_mb": mem_alloc_mb,
                "vram_free_mb": max(0, mem_total_mb - mem_alloc_mb),
                "compute_capability": f"{props.major}.{props.minor}",
            })

    return HardwareTelemetryOut(
        cpu_count=cpu_count,
        cpu_percent=cpu_percent,
        ram_total_gb=ram_total_gb,
        ram_used_gb=ram_used_gb,
        ram_free_gb=ram_free_gb,
        ram_percent=ram_percent,
        disk_total_gb=disk_total_gb,
        disk_free_gb=disk_free_gb,
        disk_percent=disk_percent,
        cuda_available=cuda_available,
        gpu_count=gpu_count,
        gpu_devices=gpu_devices,
        pytorch_version=torch.__version__,
        ultralytics_version=ultralytics.__version__,
        opencv_version=cv2.__version__,
        platform_system=f"{platform.system()} {platform.release()} ({platform.machine()})",
        python_version=platform.python_version(),
    )

def estimate_training_vram(batch_size: int, img_size: int) -> float:
    # Conservative baseline: 640x640 at batch 16 requires ~2.5 GB
    scale = (img_size / 640.0) ** 2
    estimated_gb = (batch_size * scale * 0.15) + 1.2
    return round(estimated_gb, 2)
