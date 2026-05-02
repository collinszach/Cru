import logging
from typing import AsyncGenerator

import redis.asyncio as aioredis

from app.config import get_settings

_log = logging.getLogger(__name__)

_redis_pool: aioredis.ConnectionPool | None = None


def _get_pool() -> aioredis.ConnectionPool:
    global _redis_pool
    if _redis_pool is None:
        settings = get_settings()
        _redis_pool = aioredis.ConnectionPool.from_url(
            settings.redis_url,
            max_connections=10,
            decode_responses=True,
        )
    return _redis_pool


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    client: aioredis.Redis = aioredis.Redis(connection_pool=_get_pool())
    try:
        yield client
    finally:
        await client.aclose()


async def get_redis_or_none() -> AsyncGenerator[aioredis.Redis | None, None]:
    """
    Yields a Redis client, or None if Redis is unreachable.
    Callers must handle None — the map still works without the cache, just slower.
    """
    try:
        client: aioredis.Redis = aioredis.Redis(connection_pool=_get_pool())
        await client.ping()
        try:
            yield client
        finally:
            await client.aclose()
    except Exception as exc:
        _log.warning("Redis unavailable, continuing without cache: %s", exc)
        yield None
