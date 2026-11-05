import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.dataset_service import dataset_service

res = dataset_service.create_dataset_version(
    project_id='34ab26f3-2778-4618-a7d4-cfae4bf561da',
    version_name='v1.0',
    description='Verified dataset with 122 package annotations for YOLO Master Training',
    train_ratio=0.75,
    val_ratio=0.20,
    test_ratio=0.05,
    prevent_video_leakage=False  # single continuous CCTV sequence
)
print("Successfully created dataset version:")
for k, v in res.items():
    print(f"  {k}: {v}")
