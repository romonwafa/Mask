from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import Settings, get_settings
from .routes.beard import router as beard_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ASSETS_DIR = Path(__file__).resolve().parent.parent / "overlay" / "assets"
app.mount("/static", StaticFiles(directory=str(ASSETS_DIR)), name="static")


@app.on_event("startup")
async def set_app_state() -> None:
    """Ensure settings are loaded once during startup."""
    app.state.settings = get_settings()


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {"status": "ok", "env": settings.env}


app.include_router(beard_router)
