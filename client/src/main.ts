import "./style.css";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import {
  FACE_LANDMARKER_TASK_URL,
  FACE_TASKS_WASM_URL,
} from "./config";
import { FaceRenderer } from "./renderer";

type StatusVariant = "ok" | "error" | "warn";

const APP_TEMPLATE = `
  <div class="app-shell">
    <div class="preview-stage">
      <video id="camera-feed" autoplay playsinline muted></video>
      <canvas id="overlay-canvas"></canvas>
    </div>
    <aside class="sidebar">
      <h1>Mask Preview</h1>
      <p>Mirror your camera feed and toggle landmarks while fitting virtual masks.</p>
      <div id="status-banner" class="status-banner">Initializing…</div>
      <div class="controls-row">
        <button id="toggle-landmarks" class="ghost-button" type="button">
          Hide landmarks
        </button>
      </div>
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
  const video = root.querySelector("#camera-feed") as HTMLVideoElement;
  const canvas = root.querySelector("#overlay-canvas") as HTMLCanvasElement;
  const toggleLandmarksButton = root.querySelector(
    "#toggle-landmarks",
  ) as HTMLButtonElement;
  const setStatus = createStatusController(statusEl);

  try {
    let renderer: FaceRenderer | null = null;
    let latestLandmarks: NormalizedLandmark[] | undefined;
    let lastDetectionAt = 0;
    let showLandmarks = true;

    const updateToggleLabel = () => {
      toggleLandmarksButton.textContent = showLandmarks
        ? "Hide landmarks"
        : "Show landmarks";
      toggleLandmarksButton.setAttribute(
        "aria-pressed",
        showLandmarks ? "true" : "false",
      );
    };
    updateToggleLabel();

    setStatus("Requesting camera access…");
    await initCamera(video);

    renderer = new FaceRenderer(canvas);
    // expose for debugging
    // @ts-expect-error debug
    window.__faceRenderer = renderer;
    const initialRect = video.getBoundingClientRect();
    renderer.resize(
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

    setStatus("Mask preview active – landmarks visible.");

    let lastVideoTime = -1;
    let lastRectWidth = 0;
    let lastRectHeight = 0;
    let lastFrameWidth = video.videoWidth;
    let lastFrameHeight = video.videoHeight;

    toggleLandmarksButton.addEventListener("click", () => {
      showLandmarks = !showLandmarks;
      updateToggleLabel();
      renderer?.renderFrame(latestLandmarks, showLandmarks);
    });

    const renderLoop = () => {
      const currentTime = performance.now();
      if (renderer) {
        const rect = video.getBoundingClientRect();
        if (
          Math.abs(rect.width - lastRectWidth) > 0.5 ||
          Math.abs(rect.height - lastRectHeight) > 0.5 ||
          video.videoWidth !== lastFrameWidth ||
          video.videoHeight !== lastFrameHeight
        ) {
          renderer.resize(
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
        renderer?.renderFrame(latestLandmarks, showLandmarks);
      } else {
        renderer?.renderFrame(undefined, showLandmarks);
      }

      if (latestLandmarks) {
        setStatus("Mask preview active – landmarks visible.");
      } else if (currentTime - lastDetectionAt > 2000) {
        setStatus("Position your face within the frame.", "warn");
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
    const handleResize = () => {
      if (!renderer) {
        return;
      }
      const rect = video.getBoundingClientRect();
      renderer.resize(
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
