# Repository Guidelines

## Project Structure & Module Organization
The `api/` package holds the FastAPI service (`api/app.py`) and its dependencies (`api/requirements.txt`). Shared configuration lives in the repository root as `config.py`, and the lightweight worker loop is in `worker/worker.py`. Docker assets (`api/Dockerfile`, `docker-compose.yml`) expect all Python code to import from the repository root, so keep shared modules alongside `config.py`. When adding automated checks, prefer a top-level `tests/` directory mirroring the package layout (`tests/api/test_health.py`, etc.) so both the API and worker remain covered.

## Build, Test, and Development Commands
Run the API locally with `uvicorn api.app:app --reload` from the project root. Use `docker compose up --build` to recreate the full stack (API, worker, Redis) using the provided Dockerfile. Execute background tasks by running `python worker/worker.py`, which reuses the shared settings. Once tests exist, run `pytest` from the root; keep the suite fast enough for pre-commit checks.

## Coding Style & Naming Conventions
All Python code is type-annotated and uses four-space indentation; keep docstrings concise and factual (`"""Explain in one sentence."""`). Module names stay snake_case, while class names use CapWords (`Settings`). Shared configuration should expose accessors that return cached objects; reuse `get_settings()` instead of re-instantiating `Settings`. Imports are grouped standard-library, third-party, then local, matching existing files.

## Testing Guidelines
Add tests with `pytest` and HTTP-focused tests with `fastapi.testclient.TestClient`. Name tests after behavior (`test_health_endpoint_returns_env`). When touching worker code, add integration-style assertions that patch or bound the loop to prevent long sleeps. Keep fixtures in `tests/conftest.py` and ensure they isolate environment variables so `get_settings()` can be reloaded. Target at least basic coverage for new routes and worker behaviors before opening a pull request.

## Commit & Pull Request Guidelines
Write commit subject lines in the imperative mood (`Add worker heartbeat logging`) and keep them under 72 characters. Each commit should encapsulate a single logical change. Pull requests must describe the change, note any config updates (.env keys, Docker settings), and include testing evidence (`pytest`, curl output) or a rationale for omitted tests. Link related issues and add screenshots or logs when altering observable behavior.

## Environment & Configuration Tips
Populate `.env` with `API_SECRET_KEY` and optional database credentials before starting services; the `Settings` model maps directly to these variables. Use `docker compose config` to validate changes, and never commit secrets. When switching environments, restart the stack so the cached settings in `get_settings()` pick up the new values.

## Beard Overlay Preview
List the available beard templates with `GET /beard/styles`; the manifest lives in `overlay/assets/beard_styles.json` and exposes color/fit parameters. Real-time overlays happen client-side using MediaPipe Tasks Vision FaceLandmarker (JS/WASM) plus Three.js/WebGL; the API only supplies metadata so browsers can load styles and tune their rendering. Extend the manifest as you add new free templates and rebuild the front-end bundle to pick them up.

## Front-End (client/)
Run `npm install` then `npm run dev -- --host 0.0.0.0 --port 3000` for local preview. The build embeds `VITE_API_BASE_URL` (default `window.location.origin`), so set it when bundling if the API lives on another host. The Docker service `beardai-web` builds the static bundle and serves it through Nginx on port 3000; update `docker-compose.yml` if you need a different port or API endpoint.
