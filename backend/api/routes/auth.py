"""
Backend authentication routes.

POST /api/v1/auth/login  — returns JWT access token
GET  /api/v1/auth/me     — returns current user (validates Bearer token)
POST /api/v1/auth/seed-admin — seeds the initial admin user from env vars
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.dependencies import get_db, get_current_user
from core.auth import create_access_token
from models.user import LoginRequest, TokenResponse, UserCreate
from services.user_service import UserService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = UserService(db)

    # Auto-seed admin user on first login if users collection is empty
    admin_username = os.environ.get("LUMINA_USERNAME", "admin")
    admin_password = os.environ.get("LUMINA_PASSWORD", "lumina2026")
    admin_email = os.environ.get("LUMINA_ADMIN_EMAIL", "admin@lumina.local")
    await svc.seed_admin_user(admin_username, admin_password, admin_email)

    user = await svc.authenticate(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(user["id"], user["role"])
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/seed-admin", status_code=status.HTTP_200_OK)
async def seed_admin(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Explicitly seed the admin user (idempotent — safe to call multiple times)."""
    svc = UserService(db)
    admin_username = os.environ.get("LUMINA_USERNAME", "admin")
    admin_password = os.environ.get("LUMINA_PASSWORD", "lumina2024")
    admin_email = os.environ.get("LUMINA_ADMIN_EMAIL", "admin@lumina.local")
    await svc.seed_system_roles()
    await svc.seed_admin_user(admin_username, admin_password, admin_email)
    return {"message": "Admin user and system roles seeded successfully"}
