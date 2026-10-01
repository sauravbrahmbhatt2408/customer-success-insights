import logging
import uuid

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.config import settings
from app.models import Role, User

logger = logging.getLogger(__name__)

DASHBOARD_TTL_SECONDS = 300
DASHBOARD_ALL_KEY = "dashboard:all"

redis = Redis.from_url(
    settings.redis_url, decode_responses=True, socket_timeout=1, socket_connect_timeout=1
)


def dashboard_key(user: User) -> str:
    # The scope is part of the key, so a csm can never be served org-wide numbers.
    if user.role == Role.CSM:
        return f"dashboard:user:{user.id}"
    return DASHBOARD_ALL_KEY


async def get_cached(key: str) -> str | None:
    try:
        return await redis.get(key)
    except RedisError:
        logger.warning("Redis unavailable, reading %s from the database", key)
        return None


async def set_cached(key: str, value: str) -> None:
    try:
        await redis.set(key, value, ex=DASHBOARD_TTL_SECONDS)
    except RedisError:
        logger.warning("Redis unavailable, could not cache %s", key)


async def clear_dashboard_cache(*owner_ids: uuid.UUID | None) -> None:
    keys = {DASHBOARD_ALL_KEY} | {f"dashboard:user:{i}" for i in owner_ids if i}
    try:
        await redis.delete(*keys)
    except RedisError:
        logger.warning("Redis unavailable, could not clear dashboard cache")
