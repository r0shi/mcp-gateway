import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from mcp_gateway.config import get_settings
from mcp_gateway.minio_client import ensure_bucket_exists
from mcp_gateway.seed import seed_admin_user
from mcp_gateway.api.routes.system import router as system_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    logger.info("Starting mcp-gateway API")

    # Ensure MinIO bucket exists
    ensure_bucket_exists()

    # Seed admin user if needed
    await seed_admin_user()

    yield

    logger.info("Shutting down mcp-gateway API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Local Knowledge Appliance",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(system_router, prefix="/api")
    return app


app = create_app()


def main():
    """Entry point for mcp-gateway-api script."""
    uvicorn.run(
        "mcp_gateway.api.app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
