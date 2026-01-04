# Mask Front-End Overlay

This front-end handles real-time mask previews directly in the browser. The pipeline keeps GPU-intensive work client-side while the API serves lightweight metadata about available overlays.

## Technology Stack
- **MediaPipe Tasks Vision – FaceLandmarker (JS/WASM)** for 3D facial landmark detection at real-time frame rates.
- **Three.js / WebGL** to render textured mask meshes that follow the detected landmarks.
- **Vite + TypeScript** for rapid development and hot-module reloads.

## High-Level Flow
1. Fetch available mask styles from `GET /mask/styles`.
2. Prompt for camera permissions and initialize `FaceLandmarker` with the WebAssembly graph.
3. On each animation frame:
   - Capture the current `HTMLVideoElement` frame to a `WebGLRenderTarget`.
   - Run landmark inference (`faceLandmarker.detectForVideo`).
   - Update mask mesh transforms (scale, rotation, jaw width) based on landmarks and style metadata.
4. Render the composed scene (video plane + mask meshes) to a `canvas`.
5. Offer UI controls so users can toggle landmarks, adjust opacity, and snapshot results.

## Development Checklist
- Install packages and start Vite:
  ```bash
  npm install
  npm run dev -- --host 0.0.0.0 --port 3000
  ```
- The client fetches templates from `GET /mask/styles`, so make sure the FastAPI service is running on port 8000 (or provide `VITE_API_BASE_URL`).
- The MediaPipe FaceLandmarker WASM binaries stream from jsDelivr and the model loads from Google Cloud Storage (`face_landmarker.task`). Mirror these assets if you require offline or air-gapped environments.
- Mask style metadata comes from `overlay/assets/mask_styles.json`; extend the manifest to add new templates.
- The renderer uses a single `Three.js` `PlaneGeometry` scaled and rotated to match landmarks (`leftJaw`, `rightJaw`, `chin`, `upperLip`). Adjust the math in `src/renderer.ts` if you import bespoke meshes.

## Available Scripts
- `npm run dev` – local development server with hot reload (defaults to port 5173; override with CLI flags).
- `npm run build` – production bundle output to `dist/`.
- `npm run preview` – serve the built assets locally for validation.

## Containerization
The Docker build compiles the static bundle and serves it through Nginx:
```yaml
  mask-web:
    build:
      context: ./client
      args:
        VITE_API_BASE_URL: http://localhost:8000
    image: mask/web:dev
    restart: unless-stopped
    depends_on:
      - mask-api
    ports:
      - "3000:80"
    networks: [mask-net]
```

Run `docker compose up --build mask-web` to rebuild after manifest or code changes. In production, point `VITE_API_BASE_URL` at the public API hostname or proxy `/mask/` requests through your edge server.
