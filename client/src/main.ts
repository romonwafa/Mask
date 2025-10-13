import "./style.css";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import { FACE_LANDMARKER_TASK_URL, FACE_TASKS_WASM_URL } from "./config";
import { OverlayRenderer } from "./renderer";
import { fetchStyles } from "./styles";
import type { BeardStyle } from "./types";

type StatusVariant = "ok" | "error" | "warn";

const APP_TEMPLATE = `
  <div class="app-shell">
    <div class="preview-stage">
      <video id="camera-feed" autoplay playsinline muted></video>
      <canvas id="overlay-canvas"></canvas>
    </div>
    <aside class="sidebar">
      <h1>BeardAI Live Preview</h1>
      <p>Pick a template to preview beard trims in real-time.</p>
      <div id="status-banner" class="status-banner">Initializing…</div>
      <div id="styles-list" class="styles-list"></div>
    </aside>
  </div>
`;

async function initCamera(video: HTMLVideoElement): Promise<void> {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
}

function buildStyleCard(style: BeardStyle, isActive: boolean): HTMLElement {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `style-card${isActive ? " active" : ""}`;
  card.dataset.styleId = style.id;

  const meta = document.createElement("div");
  meta.className = "style-meta";

  const title = document.createElement("span");
  title.textContent = style.name;

  const subtitle = document.createElement("span");
  subtitle.textContent = style.description;

  meta.appendChild(title);
  meta.appendChild(subtitle);

  const swatch = document.createElement("span");
  swatch.className = "style-swatch";
  swatch.style.background = style.color;
  swatch.style.opacity = style.opacity.toString();

  card.appendChild(meta);
  card.appendChild(swatch);
  return card;
}

function setupStyleSelector(
  container: HTMLElement,
  styles: BeardStyle[],
  onSelect: (style: BeardStyle) => void,
): void {
  container.replaceChildren();
  styles.forEach((style, index) => {
    const card = buildStyleCard(style, index === 0);
    card.addEventListener("click", () => {
      const previous = container.querySelector(".style-card.active");
      previous?.classList.remove("active");
      card.classList.add("active");
      onSelect(style);
    });
    container.appendChild(card);
  });
}

function createStatusController(element: HTMLElement) {
  let currentText = "";
  let currentVariant: StatusVariant = "ok";

  return (text: string, variant: StatusVariant = "ok") => {
    if (text === currentText && variant === currentVariant) {
      return;
    }
    currentText = text;
    currentVariant = variant;
    element.textContent = text;
    element.classList.toggle("error", variant === "error");
    element.classList.toggle("warn", variant === "warn");
  };
}

async function bootstrap(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  const root = document.querySelector("#app");
  if (!root) {
    throw new Error("Failed to locate app mount point.");
  }
  root.innerHTML = APP_TEMPLATE;

  const statusEl = root.querySelector("#status-banner") as HTMLElement;
  const stylesEl = root.querySelector("#styles-list") as HTMLElement;
  const video = root.querySelector("#camera-feed") as HTMLVideoElement;
  const canvas = root.querySelector("#overlay-canvas") as HTMLCanvasElement;
  const setStatus = createStatusController(statusEl);

  try {
    setStatus("Loading beard templates…");
    const styles = await fetchStyles();
    if (!styles.length) {
      throw new Error("No beard styles available.");
    }

    let selectedStyle: BeardStyle = styles[0];
    let overlay: OverlayRenderer | null = null;
    let latestLandmarks: NormalizedLandmark[] | undefined;
    let lastDetectionAt = 0;

    setupStyleSelector(stylesEl, styles, (style) => {
      selectedStyle = style;
      setStatus(
        latestLandmarks
          ? `Tracking active – ${style.name}`
          : "Position your face within the frame.",
        latestLandmarks ? "ok" : "warn",
      );
      overlay?.updateOverlay(latestLandmarks, selectedStyle);
    });

    setStatus("Requesting camera access…");
    await initCamera(video);

    overlay = new OverlayRenderer(canvas);
    const initialRect = video.getBoundingClientRect();
    overlay.resize(
      initialRect.width,
      initialRect.height,
      video.videoWidth,
      video.videoHeight,
    );

    setStatus("Loading face landmarker model…");
    const filesetResolver = await FilesetResolver.forVisionTasks(
      FACE_TASKS_WASM_URL,
    );
    const faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_TASK_URL,
        },
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        runningMode: "VIDEO",
      },
    );

    setStatus(`Tracking active – ${selectedStyle.name}`);

    let lastVideoTime = -1;
    let lastRectWidth = 0;
    let lastRectHeight = 0;
    let lastFrameWidth = video.videoWidth;
    let lastFrameHeight = video.videoHeight;

    const renderLoop = () => {
      const currentTime = performance.now();
      if (overlay) {
        const rect = video.getBoundingClientRect();
        if (
          Math.abs(rect.width - lastRectWidth) > 0.5 ||
          Math.abs(rect.height - lastRectHeight) > 0.5 ||
          video.videoWidth !== lastFrameWidth ||
          video.videoHeight !== lastFrameHeight
        ) {
          overlay.resize(
            rect.width,
            rect.height,
            video.videoWidth,
            video.videoHeight,
          );
          lastRectWidth = rect.width;
          lastRectHeight = rect.height;
          lastFrameWidth = video.videoWidth;
          lastFrameHeight = video.videoHeight;
        }
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const results = faceLandmarker.detectForVideo(video, currentTime);
          latestLandmarks = results.faceLandmarks?.[0];
          if (latestLandmarks) {
            lastDetectionAt = currentTime;
          }
        }
        overlay?.updateOverlay(latestLandmarks, selectedStyle);
      } else {
        overlay?.updateOverlay(undefined, selectedStyle);
      }

      if (latestLandmarks) {
        setStatus(`Tracking active – ${selectedStyle.name}`);
      } else if (currentTime - lastDetectionAt > 2000) {
        setStatus("Position your face within the frame.", "warn");
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
    const handleResize = () => {
      if (!overlay) {
        return;
      }
      const rect = video.getBoundingClientRect();
      overlay.resize(
        rect.width,
        rect.height,
        video.videoWidth,
        video.videoHeight,
      );
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Failed to initialize preview.",
      "error",
    );
  }
}

void bootstrap();
