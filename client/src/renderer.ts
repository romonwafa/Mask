import * as THREE from "three";

type Landmark = {
  x: number;
  y: number;
  z?: number;
};

const MAX_LANDMARKS = 478;

export class FaceRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly landmarkPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
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

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_LANDMARKS * 3);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const material = new THREE.PointsMaterial({
      color: 0x48b0f7,
      size: 5.5,
      sizeAttenuation: false,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    this.landmarkPoints = new THREE.Points(geometry, material);
    this.landmarkPoints.visible = false;
    this.landmarkPoints.renderOrder = 10;
    this.scene.add(this.landmarkPoints);

    this.resize(this.width, this.height, this.frameWidth, this.frameHeight);
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

    if (this.frameWidth === 0 || this.frameHeight === 0) {
      this.renderWidth = this.width;
      this.renderHeight = this.height;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const scale = Math.max(
      this.width / this.frameWidth,
      this.height / this.frameHeight,
    );
    this.renderWidth = this.frameWidth * scale;
    this.renderHeight = this.frameHeight * scale;
    this.offsetX = (this.width - this.renderWidth) / 2;
    this.offsetY = (this.height - this.renderHeight) / 2;
  }

  renderFrame(
    landmarks: Landmark[] | undefined,
    showLandmarks: boolean,
  ): void {
    if (!showLandmarks || !landmarks || landmarks.length === 0) {
      this.landmarkPoints.visible = false;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const attribute = this.landmarkPoints.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    const limit = Math.min(landmarks.length, MAX_LANDMARKS);
    for (let i = 0; i < limit; i += 1) {
      const mapped = this.mapPoint(landmarks[i]);
      const index = i * 3;
      positions[index] = mapped.x;
      positions[index + 1] = mapped.y;
      positions[index + 2] = 0;
    }
    attribute.needsUpdate = true;

    this.landmarkPoints.visible = true;
    this.renderer.render(this.scene, this.camera);
  }

  private mapPoint(landmark: Landmark): THREE.Vector2 {
    return new THREE.Vector2(
      this.offsetX + landmark.x * this.renderWidth,
      this.offsetY + landmark.y * this.renderHeight,
    );
  }
}
