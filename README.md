# Mask

Mask is a prototype overlay assistant made up of a FastAPI back end, a worker loop, and a WebGL front end. The API exposes configuration for mask styles, while the browser client runs MediaPipe Tasks Vision (FaceLandmarker JS/WASM) and Three.js to render real-time mask overlays from a webcam feed.

## Project Structure

- `api/` – FastAPI application, routes, and requirements.
- `client/` – Vite + TypeScript front end that streams camera frames, tracks landmarks, and renders overlays.
- `overlay/` – Shared mask style manifest and utilities.
- `overlay/assets/textures/` – Transparent PNG masks referenced in the manifest; exposed at `/static/...` by the API.
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

Rebuild the web image when updating client code or mask styles:

```bash
docker compose build mask-web
docker compose up -d mask-web
```

## Next Steps

- Expand the texture catalog (`overlay/assets/textures/`) and wire new files into `overlay/assets/mask_styles.json` via the `texture` field.
- Optionally offload landmark detection to the GPU worker and stream overlays back via WebRTC.
- Expand the manifest (`overlay/assets/mask_styles.json`) with more templates and metadata for fitting recommendations.

For collaboration tips, branching strategy, and testing expectations, refer to `AGENTS.md`.
