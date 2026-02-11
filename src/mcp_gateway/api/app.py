import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from mcp_gateway.config import get_settings
from mcp_gateway.minio_client import ensure_bucket_exists
from mcp_gateway.seed import seed_admin_user
from mcp_gateway.api.routes.api_keys import router as api_keys_router
from mcp_gateway.api.routes.auth import router as auth_router
from mcp_gateway.api.routes.documents import router as documents_router
from mcp_gateway.api.routes.jobs import router as jobs_router
from mcp_gateway.api.routes.search import router as search_router
from mcp_gateway.api.routes.system import router as system_router
from mcp_gateway.api.routes.uploads import router as uploads_router
from mcp_gateway.api.routes.users import router as users_router

logger = logging.getLogger(__name__)

# Create MCP app + session manager at module level so we can wire lifespan
from mcp_gateway.mcp_server import create_mcp_app  # noqa: E402

_mcp_asgi, _mcp_session_manager = create_mcp_app()


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

    # Start MCP session manager (required for Streamable HTTP transport)
    if _mcp_session_manager is not None:
        async with _mcp_session_manager.run():
            yield
    else:
        yield

    logger.info("Shutting down mcp-gateway API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Local Knowledge Appliance",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(system_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(users_router, prefix="/api")
    app.include_router(api_keys_router, prefix="/api")
    app.include_router(uploads_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(search_router, prefix="/api")

    # Mount MCP Streamable HTTP endpoint
    app.mount("/mcp", _mcp_asgi)

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
