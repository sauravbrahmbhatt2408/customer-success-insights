from fastapi import APIRouter

from app.cache import dashboard_key, get_cached, set_cached
from app.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardOut
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
async def get_dashboard(user: CurrentUser, db: DbSession) -> DashboardOut:
    key = dashboard_key(user)
    cached = await get_cached(key)
    if cached:
        return DashboardOut.model_validate_json(cached)

    dashboard = await build_dashboard(db, user)
    await set_cached(key, dashboard.model_dump_json())
    return dashboard
