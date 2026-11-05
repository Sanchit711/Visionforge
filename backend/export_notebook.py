import os
import sys
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.colab_service import colab_service

nb = colab_service.generate_colab_notebook(
    project_name='SVG',
    project_id='34ab26f3-2778-4618-a7d4-cfae4bf561da',
    dataset_version_id='961aaff0-f21e-4731-ad32-778dcf14d619',
    dataset_name='v1.0',
    model_default='yolo26l.pt',
    epochs=50,
    batch_size=4,
    img_size=640,
    optimizer='AdamW',
    learning_rate=0.001,
    server_ip='192.168.0.38',
    server_port=8000
)

out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'VisionForge_YOLO_Master_Colab.ipynb')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=2)

print(f"Generated notebook at {out_path} ({os.path.getsize(out_path)} bytes)")
