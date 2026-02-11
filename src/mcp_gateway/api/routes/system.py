import logging
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from mcp_gateway.db import get_session
from mcp_gateway.minio_client import get_minio_client
from mcp_gateway.redis import get_async_redis

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])


@router.get("/system/health")
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Check connectivity to Postgres, Redis, and MinIO."""
    checks: dict[str, Any] = {}

    # PostgreSQL
    try:
        result = await session.execute(text("SELECT 1"))
        result.scalar()
        checks["postgres"] = "ok"
    except Exception as e:
        logger.error("Postgres health check failed: %s", e)
        checks["postgres"] = f"error: {e}"

    # Redis
    try:
        redis = get_async_redis()
        await redis.ping()
        await redis.aclose()
        checks["redis"] = "ok"
    except Exception as e:
        logger.error("Redis health check failed: %s", e)
        checks["redis"] = f"error: {e}"

    # MinIO
    try:
        client = get_minio_client()
        client.bucket_exists("originals")
        checks["minio"] = "ok"
    except Exception as e:
        logger.error("MinIO health check failed: %s", e)
        checks["minio"] = f"error: {e}"

    overall = all(v == "ok" for v in checks.values())
    return {
        "status": "healthy" if overall else "degraded",
        "checks": checks,
    }
