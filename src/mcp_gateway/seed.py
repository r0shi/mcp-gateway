"""Seed initial admin user on first startup."""

import asyncio
import logging

from passlib.hash import bcrypt
from sqlalchemy import select

from mcp_gateway.config import get_settings
from mcp_gateway.db import async_session_factory
from mcp_gateway.models import User
from mcp_gateway.models.enums import UserRole

logger = logging.getLogger(__name__)


async def seed_admin_user() -> None:
    """Create the initial admin user if none exists."""
    settings = get_settings()

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == settings.admin_email)
        )
        existing = result.scalar_one_or_none()

        if existing is not None:
            logger.info("Admin user already exists: %s", settings.admin_email)
            return

        admin = User(
            email=settings.admin_email,
            password_hash=bcrypt.hash(settings.admin_password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info("Created initial admin user: %s", settings.admin_email)


def main():
    """CLI entry point for seeding."""
    asyncio.run(seed_admin_user())
