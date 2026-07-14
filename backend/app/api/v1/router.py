from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    custody,
    deployment_teams,
    devices,
    integrity,
    media,
    operations,
    report_generation,
    report_templates,
    statistics,
    target_media,
    targets,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(operations.router)
api_router.include_router(targets.router)
api_router.include_router(devices.router)
api_router.include_router(custody.router)
api_router.include_router(media.router)
api_router.include_router(integrity.router)
api_router.include_router(report_templates.router)
api_router.include_router(report_generation.router)
api_router.include_router(deployment_teams.router)
api_router.include_router(target_media.router)
api_router.include_router(statistics.router)

