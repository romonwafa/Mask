export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

export const FACE_TASKS_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm";

export const FACE_LANDMARKER_TASK_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
