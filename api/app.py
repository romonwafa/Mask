from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.on_event("startup")
async def set_app_state() -> None:
    """Ensure settings are loaded once during startup."""
    app.state.settings = get_settings()


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {"status": "ok", "env": settings.env}


app.include_router(beard_router)
