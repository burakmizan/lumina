"""
FastAPI dependency injection.

get_db          — yields AsyncIOMotorDatabase
get_current_user — validates JWT from Authorization header, returns user dict
require_permission(key) — returns a dependency that enforces a specific permission
"""

from fastapi import Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.auth import decode_access_token


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


async def get_current_user(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header[7:]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token")

    from services.user_service import UserService
    user = await UserService(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_permission(permission: str):
    """
    Dependency factory.  Usage:
        _user: dict = Depends(require_permission("settings.edit"))
    Returns 403 if the user's role does not grant the requested permission.
    """
    async def _check(
        request: Request,
        db: AsyncIOMotorDatabase = Depends(get_db),
    ) -> dict:
        user = await get_current_user(request, db)
        from services.user_service import UserService
        perms = await UserService(db).get_role_permissions(user.get("role", ""))
        if not perms.get(permission, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission}' required",
            )
        return user

    return _check
