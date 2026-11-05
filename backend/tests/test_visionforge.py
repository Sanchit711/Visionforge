import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
aurelix_site = Path(r"C:\Users\Sanchit\Projects\Aurelix Annotate\.venv\Lib\site-packages")
if aurelix_site.exists():
    sys.path.insert(0, str(aurelix_site))

from app.main import app
from app.config import settings
from app.database import init_db
from app.services.runtime_service import runtime_service

init_db()
runtime_service.initialize_default_runtimes()

client = TestClient(app)

def test_system_telemetry():
    response = client.get("/api/v1/system/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert "cpu_count" in data
    assert "ram_total_gb" in data
    assert "disk_free_gb" in data
    assert "opencv_version" in data
    assert "pytorch_version" in data
    assert "ultralytics_version" in data
    assert data["cpu_count"] > 0
    assert data["ram_total_gb"] > 0

def test_system_overview():
    response = client.get("/api/v1/system/overview")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "telemetry" in data
    assert "recent_projects" in data
    assert "recent_experiments" in data

def test_system_integrations():
    response = client.get("/api/v1/system/integrations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    ids = [item["id"] for item in data]
    assert "opencv_video" in ids
    assert "ultralytics_yolo" in ids
    assert "google_colab" in ids

def test_project_lifecycle():
    # 1. Create project
    proj_payload = {
        "name": f"Test Project VisionForge {os.urandom(4).hex()}",
        "description": "Integration test project",
        "task_type": "detection",
        "classes": [
            {"id": 0, "name": "person", "color": "#3b82f6", "hotkey": "1"},
            {"id": 1, "name": "car", "color": "#10b981", "hotkey": "2"},
        ]
    }
    create_res = client.post("/api/v1/projects", json=proj_payload)
    assert create_res.status_code == 200
    proj_data = create_res.json()
    project_id = proj_data["id"]
    assert proj_data["name"] == proj_payload["name"]

    # 2. Get project details
    get_res = client.get(f"/api/v1/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # 3. Get workflow timeline
    timeline_res = client.get(f"/api/v1/projects/{project_id}/workflow-timeline")
    assert timeline_res.status_code == 200
    assert len(timeline_res.json()["stages"]) == 7

    # 4. Generate synthetic video in project
    vid_res = client.post("/api/v1/videos/generate-synthetic", data={
        "project_id": project_id,
        "name": "synth_test.mp4",
        "num_frames": 40,
        "fps": 20,
    })
    assert vid_res.status_code == 200
    vid_data = vid_res.json()
    video_id = vid_data["id"]
    assert vid_data["width"] == 640
    assert vid_data["height"] == 480
    assert vid_data["total_frames"] == 40

    # 5. Extract frames from video
    extract_res = client.post("/api/v1/frames/extract", json={
        "video_id": video_id,
        "mode": "interval_frame",
        "interval_value": 10,
        "min_sharpness": 5.0,
        "deduplicate": True,
        "use_crop": False,
    })
    assert extract_res.status_code == 200
    assert "job_id" in extract_res.json()

    # Allow brief extraction
    import time
    frames = []
    for _ in range(10):
        frames_res = client.get(f"/api/v1/frames?project_id={project_id}")
        if frames_res.status_code == 200:
            frames = frames_res.json()
            if len(frames) >= 1:
                break
        time.sleep(0.5)

    # 6. List extracted frames
    assert len(frames) >= 1
    sample_frame_id = frames[0]["id"]

    # 7. Create manual annotation on frame
    ann_res = client.post("/api/v1/annotations", json={
        "frame_id": sample_frame_id,
        "class_id": 0,
        "class_name": "person",
        "annotation_type": "bbox",
        "coordinates": [0.1, 0.2, 0.3, 0.4],
        "confidence": 1.0,
        "source": "manual",
    })
    assert ann_res.status_code == 200
    ann_data = ann_res.json()
    assert ann_data["class_name"] == "person"

    # 8. Test AI Assist (SAM adapter)
    sam_res = client.post("/api/v1/annotations/ai-assist", json={
        "frame_id": sample_frame_id,
        "provider": "sam2",
    })
    assert sam_res.status_code == 200
    assert sam_res.json()["predictions_count"] >= 1

    # 9. Test Dataset Quality Summary
    quality_res = client.get(f"/api/v1/datasets/quality-summary?project_id={project_id}")
    assert quality_res.status_code == 200
    q_data = quality_res.json()
    assert q_data["total_images"] >= 1
    assert q_data["total_annotations"] >= 1

    # 10. Create Frozen Dataset Version with video leakage prevention
    ds_ver_res = client.post(f"/api/v1/datasets/versions?project_id={project_id}", json={
        "version_name": "v1.0",
        "description": "Initial test version",
        "train_ratio": 0.8,
        "val_ratio": 0.2,
        "test_ratio": 0.0,
        "prevent_video_leakage": True,
    })
    assert ds_ver_res.status_code == 200
    ds_ver = ds_ver_res.json()
    assert ds_ver["version_name"] == "v1.0"
    assert ds_ver["total_images"] >= 1
    assert os.path.exists(ds_ver["yaml_path"])
    assert os.path.exists(ds_ver["zip_export_path"])

    # 11. Test Model Compatibility Safeguard
    compat_res = client.post(f"/api/v1/training/check-compatibility?model_name_or_path=yolov8n.pt&dataset_version_id={ds_ver['id']}")
    assert compat_res.status_code == 200
    assert "compatible" in compat_res.json()
    assert "recommendation" in compat_res.json()

    # 12. Clean up project
    del_res = client.delete(f"/api/v1/projects/{project_id}")
    assert del_res.status_code == 200

def test_compute_runtimes_and_colab():
    # List runtimes
    runtimes_res = client.get("/api/v1/runtimes")
    assert runtimes_res.status_code == 200
    runtimes = runtimes_res.json()
    assert len(runtimes) >= 2
    local_rt = [r for r in runtimes if r["provider"] == "local"][0]

    # Test local runtime connection
    test_res = client.post(f"/api/v1/runtimes/{local_rt['id']}/test")
    assert test_res.status_code == 200
    assert test_res.json()["success"] is True

    # Generate Google Colab training notebook
    colab_res = client.post("/api/v1/runtimes/colab/generate-notebook?project_id=demo_proj&dataset_version_name=v1.0&experiment_name=exp_test")
    assert colab_res.status_code == 200
    colab_data = colab_res.json()
    assert "notebook_path" in colab_data
    assert os.path.exists(colab_data["notebook_path"])

def test_sam2_integration():
    # 1. Test SAM 2 models catalog
    models_res = client.get("/api/v1/annotations/sam/models")
    assert models_res.status_code == 200
    models = models_res.json()
    assert len(models) >= 2
    model_ids = [m["model_id"] for m in models]
    assert "sam2.1_t" in model_ids
    assert "sam2_t" in model_ids

    # Verify at least one SAM model is marked downloaded
    downloaded_models = [m for m in models if m["is_downloaded"]]
    assert len(downloaded_models) >= 1

    # 2. Test download endpoint with existing model
    dl_res = client.post("/api/v1/annotations/sam/download", json={"model_name": "sam2.1_t.pt"})
    assert dl_res.status_code == 200
    assert dl_res.json()["status"] in ["already_downloaded", "downloaded"]

    # 3. Test interactive SAM 2 segmentation with point prompt and box prompt
    # First create a lightweight test project & frame
    proj_res = client.post("/api/v1/projects", json={
        "name": f"SAM2 Test {os.urandom(3).hex()}",
        "classes": [{"id": 0, "name": "target_obj", "color": "#6366f1"}]
    })
    assert proj_res.status_code == 200
    p_id = proj_res.json()["id"]

    vid_res = client.post("/api/v1/videos/generate-synthetic", data={
        "project_id": p_id,
        "name": "sam_test_vid.mp4",
        "num_frames": 10,
        "fps": 10,
    })
    assert vid_res.status_code == 200
    v_id = vid_res.json()["id"]

    client.post("/api/v1/frames/extract", json={
        "video_id": v_id,
        "mode": "interval_frame",
        "interval_value": 5,
        "deduplicate": False,
        "use_crop": False,
    })

    import time
    frames = []
    for _ in range(10):
        frames_res = client.get(f"/api/v1/frames?project_id={p_id}")
        if frames_res.status_code == 200:
            frames = frames_res.json()
            if len(frames) >= 1:
                break
        time.sleep(0.5)

    assert len(frames) >= 1
    test_frame_id = frames[0]["id"]

    # Point prompt segmentation
    sam_pt_res = client.post("/api/v1/annotations/sam/segment", json={
        "frame_id": test_frame_id,
        "model_name": "sam2.1_t.pt",
        "point_prompts": [[0.5, 0.5]],
        "point_labels": [1],
        "class_id": 0,
        "class_name": "target_obj",
    })
    assert sam_pt_res.status_code == 200
    pt_data = sam_pt_res.json()
    assert pt_data["provider"] == "sam2"
    assert pt_data["predictions_count"] >= 1
    assert pt_data["predictions"][0]["annotation_type"] == "polygon"

    # Box prompt segmentation
    sam_box_res = client.post("/api/v1/annotations/sam/segment", json={
        "frame_id": test_frame_id,
        "model_name": "sam2.1_t.pt",
        "box_prompt": [0.2, 0.2, 0.5, 0.5],
        "class_id": 0,
        "class_name": "target_obj",
    })
    assert sam_box_res.status_code == 200
    box_data = sam_box_res.json()
    assert box_data["predictions_count"] >= 1
    assert box_data["predictions"][0]["annotation_type"] == "polygon"

    # Clean up
    client.delete(f"/api/v1/projects/{p_id}")


def test_tenants_and_users_lifecycle():
    # 1. List tenants
    tenants_res = client.get("/api/v1/tenants")
    assert tenants_res.status_code == 200
    tenants = tenants_res.json()
    assert len(tenants) >= 1
    default_tenant = tenants[0]
    assert "slug" in default_tenant
    assert "user_count" in default_tenant

    # 2. Create a new tenant workspace
    t_name = f"Test Workspace {os.urandom(3).hex()}"
    create_t_res = client.post("/api/v1/tenants", json={"name": t_name, "plan": "enterprise"})
    assert create_t_res.status_code == 200
    new_tenant = create_t_res.json()
    assert new_tenant["name"] == t_name
    assert new_tenant["user_count"] == 1  # auto-created admin

    # 3. Add user to new tenant
    user_email = f"user_{os.urandom(3).hex()}@testworkspace.local"
    add_u_res = client.post(f"/api/v1/tenants/{new_tenant['id']}/users", json={
        "tenant_id": new_tenant["id"],
        "name": "Jane Annotator",
        "email": user_email,
        "role": "annotator",
    })
    assert add_u_res.status_code == 200
    user_data = add_u_res.json()
    assert user_data["name"] == "Jane Annotator"
    assert user_data["role"] == "annotator"

    # 4. Check /api/v1/users/me
    me_res = client.get("/api/v1/users/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] in ["admin", "annotator", "reviewer"]

    # 5. Create project associated with the new tenant
    p_res = client.post("/api/v1/projects", json={
        "name": f"Tenant Project {os.urandom(3).hex()}",
        "tenant_id": new_tenant["id"],
        "created_by_user_id": user_data["id"],
        "classes": [{"id": 0, "name": "box", "color": "#3b82f6"}]
    })
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["tenant_id"] == new_tenant["id"]

    # 6. Filter projects by tenant_id
    filtered_res = client.get(f"/api/v1/projects?tenant_id={new_tenant['id']}")
    assert filtered_res.status_code == 200
    filtered_list = filtered_res.json()
    assert len(filtered_list) == 1
    assert filtered_list[0]["id"] == p_data["id"]

    # Clean up project
    client.delete(f"/api/v1/projects/{p_data['id']}")

def test_auth_and_workspaces_lifecycle():
    with TestClient(app) as client:
        # 1. Login with seeded admin
        login_res = client.post("/api/v1/auth/login", json={
            "email": "sanchit@visionforge.ai",
            "password": "password123"
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "token" in login_data
        assert login_data["user"]["role"] == "admin"
        token = login_data["token"]

        # 2. Check /api/v1/auth/me with Bearer token
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["user"]["email"] == "sanchit@visionforge.ai"

        # 3. Check /api/v1/auth/roles (RBAC matrix)
        roles_res = client.get("/api/v1/auth/roles")
        assert roles_res.status_code == 200
        roles = roles_res.json()
        assert "admin" in roles
        assert "reviewer" in roles
        assert "annotator" in roles
        assert "engineer" in roles

        # 4. List Workspaces
        ws_res = client.get("/api/v1/workspaces")
        assert ws_res.status_code == 200
        workspaces = ws_res.json()
        assert len(workspaces) >= 1

        # 5. Create Shared Team Workspace
        create_ws_res = client.post("/api/v1/workspaces", json={
            "name": f"Test Conveyor Lab {os.urandom(3).hex()}",
            "description": "Shared conveyor team workspace",
            "is_shared": True
        })
        assert create_ws_res.status_code == 200
        ws_obj = create_ws_res.json()
        assert ws_obj["is_shared"] is True

        # 6. Delete created workspace
        del_ws_res = client.delete(f"/api/v1/workspaces/{ws_obj['id']}")
        assert del_ws_res.status_code == 200


