import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Text, text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column

from mcp_gateway.models.base import Base, uuid_pk, created_at
from mcp_gateway.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid_pk]
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        ENUM(UserRole, name="user_role", create_type=False),
        nullable=False,
        server_default="user",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true"),
    )
    created_at: Mapped[created_at]
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
