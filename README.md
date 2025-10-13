# BeardAI

BeardAI is a prototype grooming assistant made up of a FastAPI back end, a worker loop, and a WebGL front end. The API exposes configuration for beard styles, while the browser client runs MediaPipe Tasks Vision (FaceLandmarker JS/WASM) and Three.js to render real-time beard overlays from a webcam feed.

## Project Structure

- `api/` – FastAPI application, routes, and requirements.
- `client/` – Vite + TypeScript front end that streams camera frames, tracks landmarks, and renders overlays.
- `overlay/` – Shared beard style manifest and utilities.
- `tests/` – Pytest suite covering API routing and style helpers.
- `worker/` – Lightweight background heartbeat process.
- `docker-compose.yml` – Orchestrates API, worker, Redis, and the web container.

See `AGENTS.md` for repository conventions and detailed development guidelines.

## Local Development

1. **Dependencies**
   - Python 3.11+
   - Node 18+
   - Docker (optional for containerized runs)

2. **Back End**
   ```bash
   pip install -r api/requirements.txt
   uvicorn api.app:app --reload
   ```

3. **Front End**
   ```bash
   cd client
   npm install
   npm run dev -- --host 0.0.0.0 --port 3000
   ```
   Set `VITE_API_BASE_URL` if the API runs on a different host/port.

4. **Tests**
   ```bash
   pytest
   npm run build   # Validates front-end build
   ```

## Docker Compose

Build and launch the full stack:

```bash
docker compose up --build
```

This exposes:
- API at `http://localhost:8000`
- Front end at `http://localhost:3000`
- Redis (internal network)

Rebuild the web image when updating client code or beard styles:

```bash
docker compose build beardai-web
docker compose up -d beardai-web
```

## Next Steps

- Replace the placeholder beard mesh with textured assets.
- Optionally offload landmark detection to the GPU worker and stream overlays back via WebRTC.
- Expand the manifest (`overlay/assets/beard_styles.json`) with more templates and metadata for trimming recommendations.

For collaboration tips, branching strategy, and testing expectations, refer to `AGENTS.md`.
