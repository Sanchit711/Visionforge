from fastapi import APIRouter
from app.api.v1.endpoints import (
    files,
    auth,
    tenants,
    workspaces,
    users,
    projects,
    videos,
    frames,
    annotations,
    datasets,
    training,
    models,
    runtimes,
    validation,
    system,
    kaggle,
)

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["System & Telemetry"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Access"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Organization Tenants"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces (Shared & Private)"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Access"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(videos.router, prefix="/videos", tags=["Video Lab"])
api_router.include_router(frames.router, prefix="/frames", tags=["Frame Studio"])
api_router.include_router(annotations.router, prefix="/annotations", tags=["AI Annotation Studio"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(training.router, prefix="/training", tags=["Training Control Center"])
api_router.include_router(kaggle.router, prefix="/kaggle", tags=["Kaggle Cloud Accelerator"])
api_router.include_router(models.router, prefix="/models", tags=["Model Registry"])
api_router.include_router(runtimes.router, prefix="/runtimes", tags=["Compute Runtimes"])
api_router.include_router(validation.router, prefix="/validation", tags=["Validation & Inference"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
