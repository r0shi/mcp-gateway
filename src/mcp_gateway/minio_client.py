import logging

from minio import Minio

from mcp_gateway.config import get_settings

logger = logging.getLogger(__name__)


def get_minio_client() -> Minio:
    """Create a MinIO client."""
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


def ensure_bucket_exists() -> None:
    """Create the originals bucket if it doesn't exist."""
    settings = get_settings()
    client = get_minio_client()
    bucket = settings.minio_bucket
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info("Created MinIO bucket: %s", bucket)
    else:
        logger.info("MinIO bucket already exists: %s", bucket)
