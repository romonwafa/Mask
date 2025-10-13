import sys
import time
from pathlib import Path

# Ensure repository root is importable when running via `python worker/worker.py`.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config import get_settings


def heartbeat() -> None:
    """Emit a heartbeat while pulling configuration from the shared settings."""
    settings = get_settings()
    while True:
        print(f"worker alive (env={settings.env} redis={settings.redis_url})")
        time.sleep(30)


if __name__ == "__main__":
    heartbeat()
