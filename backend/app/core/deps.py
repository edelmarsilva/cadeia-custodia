from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

security = HTTPBearer()


class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTODY = "custody"
    EXPERT = "expert"
    ANALYST = "analyst"
    AUDITOR = "auditor"


ROLE_HIERARCHY: dict[UserRole, set[UserRole]] = {
    UserRole.ADMIN: {UserRole.ADMIN, UserRole.CUSTODY, UserRole.EXPERT, UserRole.ANALYST, UserRole.AUDITOR},
    UserRole.CUSTODY: {UserRole.CUSTODY},
    UserRole.EXPERT: {UserRole.EXPERT},
    UserRole.ANALYST: {UserRole.ANALYST},
    UserRole.AUDITOR: {UserRole.AUDITOR},
}


async def get_current_user_payload(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def require_roles(*roles: UserRole):
    """Factory de dependência que exige um dos roles listados."""

    async def _check(
        payload: Annotated[dict, Depends(get_current_user_payload)],
    ) -> dict:
        user_role = payload.get("role")
        allowed = {r.value for r in roles}
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente para esta ação.",
            )
        return payload

    return _check


# Dependências prontas para uso nos endpoints
CurrentUser = Annotated[dict, Depends(get_current_user_payload)]
AdminOnly = Annotated[dict, Depends(require_roles(UserRole.ADMIN))]
CustodyOrAdmin = Annotated[dict, Depends(require_roles(UserRole.ADMIN, UserRole.CUSTODY))]
ExpertOrAdmin = Annotated[dict, Depends(require_roles(UserRole.ADMIN, UserRole.EXPERT))]
AuditOrAdmin = Annotated[dict, Depends(require_roles(UserRole.ADMIN, UserRole.AUDITOR))]
# Geração de laudos: perito, analista e admin
ExpertOrAnalystOrAdmin = Annotated[
    dict, Depends(require_roles(UserRole.ADMIN, UserRole.EXPERT, UserRole.ANALYST))
]
