from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from core.config import settings

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> str:
    if not api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing API key")
    # TODO: Validate against a stored key registry or env variable in production
    return api_key
