from __future__ import annotations

from fastapi import APIRouter

from overlay.mask import list_public_styles

router = APIRouter(prefix="/mask", tags=["mask"])


@router.get("/styles")
def list_mask_styles() -> dict[str, list[dict[str, str | float | None]]]:
    return {"styles": list_public_styles()}
