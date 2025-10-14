import * as THREE from "three";

import type { BeardStyle } from "./types";

type Landmark = {
  x: number;
  y: number;
  z?: number;
};

const LANDMARK_INDICES = {
  leftJaw: 234,
  rightJaw: 454,
  chin: 152,
  upperLip: 13,
  lowerLip: 14,
};

function distance(a: THREE.Vector2, b: THREE.Vector2): number {
  return a.clone().sub(b).length();
}

export class OverlayRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly beardMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly landmarkPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly textureLoader: THREE.TextureLoader;
  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly pendingTextures = new Map<string, Promise<THREE.Texture>>();
  private width = 1280;
  private height = 720;
  private frameWidth = 1280;
  private frameHeight = 720;
  private renderWidth = 1280;
  private renderHeight = 720;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, this.width, this.height, 0, -10, 10);
    this.camera.position.z = 5;

    this.textureLoader = new THREE.TextureLoader();

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beardMesh = new THREE.Mesh(geometry, material);
    this.beardMesh.visible = false;
    this.beardMesh.renderOrder = 5;
    this.scene.add(this.beardMesh);

    const landmarkGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(478 * 3);
    landmarkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const landmarkMaterial = new THREE.PointsMaterial({
      color: 0x48b0f7,
      size: 6,
      sizeAttenuation: false,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    this.landmarkPoints = new THREE.Points(landmarkGeometry, landmarkMaterial);
    this.landmarkPoints.visible = false;
    this.landmarkPoints.renderOrder = 10;
    this.scene.add(this.landmarkPoints);

    this.resize(this.width, this.height, this.frameWidth, this.frameHeight);
  }

  debugState(): Record<string, unknown> {
    return {
      width: this.width,
      height: this.height,
      renderWidth: this.renderWidth,
      renderHeight: this.renderHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      meshVisible: this.beardMesh.visible,
      meshPosition: this.beardMesh.position.clone(),
      meshScale: this.beardMesh.scale.clone(),
      meshRotation: this.beardMesh.rotation.z,
      meshOpacity: this.beardMesh.material.opacity,
      hasTexture: Boolean(this.beardMesh.material.map),
      textureSrc: this.beardMesh.material.map?.image?.src ?? null,
    };
  }

  resize(
    containerWidth: number,
    containerHeight: number,
    frameWidth: number,
    frameHeight: number,
  ): void {
    this.width = Math.max(containerWidth, 1);
    this.height = Math.max(containerHeight, 1);
    if (frameWidth > 0 && frameHeight > 0) {
      this.frameWidth = frameWidth;
      this.frameHeight = frameHeight;
    }

    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = 0;
    this.camera.bottom = this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height, false);
    this.renderer.domElement.style.width = `${this.width}px`;
    this.renderer.domElement.style.height = `${this.height}px`;

    const frameAspect = this.frameWidth / this.frameHeight;
    const containerAspect = this.width / this.height;

    if (!Number.isFinite(frameAspect) || !Number.isFinite(containerAspect)) {
      this.renderWidth = this.width;
      this.renderHeight = this.height;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    if (containerAspect > frameAspect) {
      this.renderHeight = this.height;
      this.renderWidth = this.height * frameAspect;
      this.offsetX = (this.width - this.renderWidth) / 2;
      this.offsetY = 0;
    } else {
      this.renderWidth = this.width;
      this.renderHeight = this.width / frameAspect;
      this.offsetX = 0;
      this.offsetY = (this.height - this.renderHeight) / 2;
    }
  }

  private mapPoint(landmark: Landmark): THREE.Vector2 {
    return new THREE.Vector2(
      this.offsetX + landmark.x * this.renderWidth,
      this.offsetY + landmark.y * this.renderHeight,
    );
  }

  updateOverlay(
    landmarks: Landmark[] | undefined,
    style: BeardStyle | null,
  ): void {
    if (!landmarks || !style) {
      this.beardMesh.visible = false;
      this.landmarkPoints.visible = false;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const required = [
      landmarks[LANDMARK_INDICES.leftJaw],
      landmarks[LANDMARK_INDICES.rightJaw],
      landmarks[LANDMARK_INDICES.chin],
      landmarks[LANDMARK_INDICES.upperLip],
      landmarks[LANDMARK_INDICES.lowerLip],
    ];
    if (required.some((landmark) => landmark === undefined)) {
      this.beardMesh.visible = false;
      this.landmarkPoints.visible = false;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.landmarkPoints.visible = false;

    const left = this.mapPoint(landmarks[LANDMARK_INDICES.leftJaw]);
    const right = this.mapPoint(landmarks[LANDMARK_INDICES.rightJaw]);
    const chin = this.mapPoint(landmarks[LANDMARK_INDICES.chin]);
    const upperLip = this.mapPoint(landmarks[LANDMARK_INDICES.upperLip]);
    const lowerLip = this.mapPoint(landmarks[LANDMARK_INDICES.lowerLip]);

    const jawWidth = Math.max(distance(left, right), 32);
    const baseHeight = Math.max(chin.y - upperLip.y, 24);
    const mouthClearance = (lowerLip.y - upperLip.y) * style.mouth_clearance_ratio;

    const scaledWidth = jawWidth * style.jaw_width_scale;
    const fallbackHeight =
      baseHeight * (1 + style.chin_extension_ratio) + mouthClearance;

    const midJaw = left.clone().add(right).multiplyScalar(0.5);
    const rotation = Math.atan2(right.y - left.y, right.x - left.x);
    const verticalOffset =
      (style.chin_extension_ratio - style.upper_trim_ratio) * baseHeight * 0.35;

    const centerX = midJaw.x;
    const centerY =
      upperLip.y +
      baseHeight * 0.55 +
      mouthClearance * 0.4 +
      verticalOffset;

    const texture = this.getTexture(style);
    let scaledHeight = fallbackHeight;
    const currentTexture =
      texture ?? (this.beardMesh.material.map as THREE.Texture | null);
    const currentImage =
      currentTexture &&
      (currentTexture as THREE.Texture & {
        image?: { width: number; height: number };
      }).image;
    if (currentImage && currentImage.width > 0 && currentImage.height > 0) {
      const aspect = currentImage.height / currentImage.width;
      const textureHeight = scaledWidth * aspect;
      scaledHeight = Math.max(textureHeight, fallbackHeight);
    }

    this.beardMesh.visible = true;
    this.beardMesh.scale.set(scaledWidth, scaledHeight, 1);
    this.beardMesh.position.set(centerX, centerY + scaledHeight * 0.1, 0);
    this.beardMesh.rotation.z = rotation;
    if (texture) {
      if (this.beardMesh.material.map !== texture) {
        console.log("Beard texture applied", style.id, texture.source?.data?.src ?? style.texture);
        this.beardMesh.material.map = texture;
        this.beardMesh.material.needsUpdate = true;
      }
      this.beardMesh.material.color.set(0xffffff);
      this.beardMesh.material.opacity = Math.max(Math.min(style.opacity, 1), 0.05);
    } else {
      if (this.beardMesh.material.map) {
        console.log("Beard texture cleared", style.id);
        this.beardMesh.material.map = null;
        this.beardMesh.material.needsUpdate = true;
      }
      this.beardMesh.material.color.set(style.color || 0xff0000);
      this.beardMesh.material.opacity = Math.max(Math.min(style.opacity, 1), 0.05);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private getTexture(style: BeardStyle): THREE.Texture | null {
    if (!style.texture) {
      return null;
    }

    const key = style.texture;
    const cached = this.textureCache.get(key);
    if (cached) {
      return cached;
    }

    if (!this.pendingTextures.has(key)) {
      const promise = new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(
          key,
          (texture) => {
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            this.textureCache.set(key, texture);
            this.pendingTextures.delete(key);
            resolve(texture);
          },
          undefined,
          (error) => {
            console.error(`Failed to load texture for style ${style.id}`, error);
            this.pendingTextures.delete(key);
            reject(error);
          },
        );
      });
      this.pendingTextures.set(key, promise);
      promise
        .then((texture) => {
          if (this.beardMesh.material.map !== texture) {
            this.beardMesh.material.map = texture;
            this.beardMesh.material.needsUpdate = true;
          }
        })
        .catch(() => {
          /* handled above */
        });
    }

    return null;
  }
}
