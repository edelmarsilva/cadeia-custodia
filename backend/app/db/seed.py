"""Seed inicial — cria admin se o banco estiver vazio."""
import asyncio
import logging

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal, create_tables
from app.models.user_model import User

logger = logging.getLogger(__name__)
settings = get_settings()


async def seed_admin() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.deleted_at.is_(None)))
        if result.scalars().first() is not None:
            return  # Já existe ao menos um usuário

        admin = User(
            username=settings.ADMIN_USERNAME,
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name=settings.ADMIN_FULL_NAME,
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info(f"✅ Admin seed criado: {settings.ADMIN_USERNAME}")


async def run_seed() -> None:
    await create_tables()
    await seed_admin()
