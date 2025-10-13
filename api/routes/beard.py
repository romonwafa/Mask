from __future__ import annotations

from fastapi import APIRouter

from overlay.beard import list_public_styles

router = APIRouter(prefix="/beard", tags=["beard"])


@router.get("/styles")
def list_beard_styles() -> dict[str, list[dict[str, str | float]]]:
    return {"styles": list_public_styles()}
