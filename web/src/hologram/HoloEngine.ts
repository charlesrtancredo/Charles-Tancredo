import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { AssistantState } from '../state/types';
import {
  coreFragment,
  coreVertex,
  particleFragment,
  particleVertex,
  ringFragment,
  ringVertex,
} from './shaders';
import { STATE_PARAMS, cloneParams, lerpParams, type VisualParams } from './states';

export interface HoloEngineOptions {
  onCoreTap?: () => void;
  onFps?: (fps: number) => void;
  /** Nível de áudio real (0..1) a cada quadro; `null` usa envelope simulado. */
  getLevel?: () => number | null;
}

interface RingSpec {
  inner: number;
  outer: number;
  segments: number;
  fill: number;
  arc: number;
  speed: number;
  opacity: number;
  tilt?: [number, number];
  accent?: boolean;
}

/** Raio do conteúdo que deve caber na região do núcleo (unidades do mundo). */
const FIT_RADIUS = 3.05;

const RINGS: RingSpec[] = [
  { inner: 1.72, outer: 1.745, segments: 1, fill: 1, arc: 1, speed: 0, opacity: 0.45 },
  { inner: 1.82, outer: 1.93, segments: 72, fill: 0.42, arc: 1, speed: 0.018, opacity: 0.55 },
  { inner: 2.04, outer: 2.1, segments: 3, fill: 0.78, arc: 1, speed: -0.035, opacity: 0.9 },
  { inner: 2.22, outer: 2.235, segments: 1, fill: 1, arc: 1, speed: 0, opacity: 0.28 },
  { inner: 2.33, outer: 2.47, segments: 140, fill: 0.18, arc: 0.62, speed: 0.012, opacity: 0.7 },
  { inner: 2.55, outer: 2.585, segments: 5, fill: 0.86, arc: 1, speed: -0.016, opacity: 0.6, accent: true },
  { inner: 2.74, outer: 2.755, segments: 1, fill: 1, arc: 0.32, speed: 0.05, opacity: 0.9 },
  { inner: 2.86, outer: 2.92, segments: 240, fill: 0.28, arc: 1, speed: -0.006, opacity: 0.32 },
  { inner: 1.96, outer: 1.99, segments: 2, fill: 0.62, arc: 1, speed: 0.06, opacity: 0.55, tilt: [1.15, 0.35] },
  { inner: 2.12, outer: 2.14, segments: 4, fill: 0.7, arc: 1, speed: -0.045, opacity: 0.45, tilt: [-0.9, 0.8], accent: true },
];

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.12, 'rgba(190,245,255,0.85)');
  grd.addColorStop(0.35, 'rgba(60,180,255,0.28)');
  grd.addColorStop(0.7, 'rgba(20,90,255,0.06)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class HoloEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private lastFrame = performance.now();
  private raf = 0;
  private disposed = false;

  private rig = new THREE.Group();
  private tiltGroup = new THREE.Group();
  private ringGroup = new THREE.Group();
  private gyros: THREE.Group[] = [];
  private coreMat: THREE.ShaderMaterial;
  private nucleus: THREE.Mesh;
  private shell: THREE.LineSegments;
  private shell2: THREE.LineSegments;
  private glow: THREE.Sprite;
  private ringMats: { mat: THREE.ShaderMaterial; spec: RingSpec; rot: number }[] = [];
  private particleMat: THREE.ShaderMaterial;
  private waves: { line: THREE.LineLoop; pos: Float32Array; phase: number; base: number }[] = [];
  private rays: { geo: THREE.BufferGeometry; colors: Float32Array; seeds: Float32Array };
  private grid: THREE.Group;
  private hitSphere: THREE.Mesh;
  private shock: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; t: number }[] = [];

  private state: AssistantState = 'idle';
  private params: VisualParams = cloneParams(STATE_PARAMS.idle);
  private level = 0;
  private time = 0;

  // Interação
  private dragging = false;
  private pointerId: number | null = null;
  private downAt = { x: 0, y: 0, t: 0 };
  private last = { x: 0, y: 0 };
  private rotVel = { x: 0, y: 0 };
  private userRot = { x: 0, y: 0 };
  private parallax = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();

  private focus = { x: 0, y: 0, w: 1, h: 1 };
  private size = { w: 1, h: 1 };
  private fps = { frames: 0, acc: 0 };
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: HoloEngineOptions = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x01060c, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 0, 10);

    this.scene.fog = new THREE.FogExp2(0x01060c, 0.035);
    this.scene.add(this.rig);
    this.rig.add(this.tiltGroup);

    // --- Núcleo deformável ---
    this.coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.05 },
        uFreq: { value: 1.6 },
        uLevel: { value: 0 },
        uColor: { value: new THREE.Color() },
        uAccent: { value: new THREE.Color() },
        uIntensity: { value: 1 },
        uAccentMix: { value: 0.8 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 40), this.coreMat);
    this.tiltGroup.add(core);

    // Núcleo interno brilhante
    this.nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.26, 6),
      new THREE.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.tiltGroup.add(this.nucleus);

    // Halo
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeGlowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    this.glow.scale.setScalar(3.4);
    this.rig.add(this.glow);

    // Cascas geodésicas em wireframe
    const lineMat = (opacity: number) =>
      new THREE.LineBasicMaterial({ color: 0x48c8ff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    this.shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.32, 1)), lineMat(0.32));
    this.shell2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5, 0)), lineMat(0.16));
    this.tiltGroup.add(this.shell, this.shell2);

    // Anéis concêntricos
    this.rig.add(this.ringGroup);
    for (const spec of RINGS) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uColor: { value: new THREE.Color(0x46d6ff) },
          uRot: { value: Math.random() },
          uSegments: { value: spec.segments },
          uFill: { value: spec.fill },
          uArc: { value: spec.arc },
          uOpacity: { value: spec.opacity },
          uInner: { value: spec.inner },
          uOuter: { value: spec.outer },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(spec.inner, spec.outer, 256, 1), mat);
      if (spec.tilt) mesh.rotation.set(spec.tilt[0], spec.tilt[1], 0);
      this.ringGroup.add(mesh);
      this.ringMats.push({ mat, spec, rot: mat.uniforms.uRot.value });
    }

    // Marcadores de escala (ticks) no anel externo
    {
      const ticks: number[] = [];
      const n = 120;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const long = i % 10 === 0;
        const r0 = 3.0;
        const r1 = long ? 3.16 : 3.06;
        ticks.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
      const t = new THREE.LineSegments(g, lineMat(0.35));
      this.ringGroup.add(t);
    }

    // Arcos giroscópicos
    for (let i = 0; i < 3; i++) {
      const grp = new THREE.Group();
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(1.62 + i * 0.09, 0.006, 6, 220, Math.PI * (1.1 + i * 0.25)),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffc46b : 0x6fe3ff, transparent: true, opacity: i === 1 ? 0.5 : 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      grp.add(arc);
      grp.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.tiltGroup.add(grp);
      this.gyros.push(grp);
    }

    // Partículas
    {
      const isSmall = Math.min(window.innerWidth, window.innerHeight) < 600;
      const N = isSmall ? 2200 : 3600;
      const pos = new Float32Array(N * 3);
      const speed = new Float32Array(N);
      const sizes = new Float32Array(N);
      const seeds = new Float32Array(N);
      const v = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const kind = Math.random();
        if (kind < 0.55) {
          // casca esférica
          v.randomDirection().multiplyScalar(1.4 + Math.pow(Math.random(), 1.6) * 2.4);
        } else if (kind < 0.9) {
          // disco orbital (galáxia) levemente inclinado
          const r = 1.9 + Math.random() * 2.2;
          const a = Math.random() * Math.PI * 2;
          v.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.12, Math.sin(a) * r);
          v.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.32);
        } else {
          // poeira distante
          v.randomDirection().multiplyScalar(4 + Math.random() * 6);
        }
        pos.set([v.x, v.y, v.z], i * 3);
        speed[i] = (0.04 + Math.random() * 0.16) * (Math.random() < 0.15 ? -1 : 1);
        sizes[i] = 0.8 + Math.pow(Math.random(), 3) * 3.2;
        seeds[i] = Math.random();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      this.particleMat = new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        uniforms: {
          uTime: { value: 0 },
          uSpin: { value: 1 },
          uSwirl: { value: 0 },
          uLevel: { value: 0 },
          uScale: { value: 1 },
          uPixelRatio: { value: this.renderer.getPixelRatio() },
          uColor: { value: new THREE.Color() },
          uAccent: { value: new THREE.Color() },
          uAccentMix: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.rig.add(new THREE.Points(g, this.particleMat));
    }

    // Ondas circulares (voz)
    for (let k = 0; k < 2; k++) {
      const n = 256;
      const pos = new Float32Array(n * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.LineLoop(
        g,
        new THREE.LineBasicMaterial({ color: k === 0 ? 0x8ff4ff : 0x2a8dff, transparent: true, opacity: k === 0 ? 0.9 : 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      this.ringGroup.add(line);
      this.waves.push({ line, pos, phase: k * 1.7, base: k === 0 ? 1.56 : 1.62 });
    }

    // Raios de dados radiais
    {
      const n = 64;
      const pos = new Float32Array(n * 6);
      const colors = new Float32Array(n * 6);
      const seeds = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
        const r0 = 3.28;
        const r1 = r0 + 0.08 + Math.random() * 0.5;
        pos.set([Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0], i * 6);
        seeds[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const lines = new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      this.ringGroup.add(lines);
      this.rays = { geo, colors, seeds };
    }

    // Grade polar no "chão" — projeção holográfica
    {
      this.grid = new THREE.Group();
      const polar = new THREE.PolarGridHelper(7, 24, 9, 96, 0x0f5f8f, 0x0f5f8f);
      const m = polar.material as THREE.LineBasicMaterial;
      m.transparent = true;
      m.opacity = 0.28;
      m.blending = THREE.AdditiveBlending;
      m.depthWrite = false;
      this.grid.add(polar);
      this.grid.position.y = -3.6;
      this.scene.add(this.grid);

      // Feixe de projeção
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 2.2, 3.2, 48, 1, true),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(0x1aa8ff) } },
          vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
          fragmentShader: `uniform vec3 uColor; varying float vY; void main(){ float a = pow(1.0 - vY, 2.5) * 0.045; gl_FragColor = vec4(uColor * a, 1.0);} `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      beam.position.y = -2.0;
      this.scene.add(beam);
    }

    // Ondas de choque disparadas na troca de estado
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uColor: { value: new THREE.Color(0x8ff4ff) },
          uRot: { value: 0 },
          uSegments: { value: i === 0 ? 1 : 48 },
          uFill: { value: i === 0 ? 1 : 0.55 },
          uArc: { value: 1 },
          uOpacity: { value: 0 },
          uInner: { value: 0.96 },
          uOuter: { value: 1.0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 192, 1), mat);
      mesh.visible = false;
      this.ringGroup.add(mesh);
      this.shock.push({ mesh, mat, t: 1 });
    }

    // Esfera invisível para detectar toque no núcleo
    this.hitSphere = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
    this.rig.add(this.hitSphere);

    // Pós-processamento
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.12);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.bindEvents();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------- API pública ----------

  setState(state: AssistantState) {
    if (state === this.state) return;
    this.state = state;
    // Dispara as ondas de choque (a segunda com leve atraso).
    this.shock.forEach((s, i) => (s.t = -i * 0.12));
  }

  /** Define a região da tela (px CSS) onde o núcleo deve ficar centralizado. */
  setFocus(rect: { x: number; y: number; w: number; h: number }) {
    this.focus = rect;
    this.applyCamera();
  }

  resize(w: number, h: number) {
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.bloom.resolution.set((w * pr) / 2, (h * pr) / 2);
    this.particleMat.uniforms.uPixelRatio.value = pr;
    this.applyCamera();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbindEvents();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }

  // ---------- Internos ----------

  private applyCamera() {
    const { w, h } = this.size;
    const f = this.focus;
    this.camera.aspect = w / h;
    // Distância para que FIT_RADIUS ocupe metade da menor dimensão da região de foco.
    const half = Math.max(40, Math.min(f.w, f.h) / 2);
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = (FIT_RADIUS * h) / (2 * Math.tan(vfov / 2) * half);
    this.camera.position.z = THREE.MathUtils.clamp(dist, 6, 40);
    // Desloca o frustum para centralizar o núcleo na região de foco.
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    this.camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
    this.camera.updateProjectionMatrix();
    this.grid.position.y = -Math.min(3.6, 1.2 + half / 120);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.dragging = false;
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.last = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    this.parallax.x = nx;
    this.parallax.y = ny;
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6) this.dragging = true;
    if (this.dragging) {
      this.rotVel.y = dx * 0.006;
      this.rotVel.x = dy * 0.006;
      this.userRot.y += this.rotVel.y;
      this.userRot.x = THREE.MathUtils.clamp(this.userRot.x + this.rotVel.x, -1.1, 1.1);
    }
    this.last = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    const quick = performance.now() - this.downAt.t < 450;
    if (!this.dragging && quick && this.hitTest(e.clientX, e.clientY)) {
      this.opts.onCoreTap?.();
    }
    this.dragging = false;
  };

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
    } else if (!this.disposed) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  };

  private bindEvents() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private unbindEvents() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private hitTest(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.hitSphere, false).length > 0;
  }

  /** Envelope de "voz" simulado enquanto não há áudio real conectado. */
  private simulatedLevel(t: number) {
    if (this.state === 'speaking') {
      const syll = Math.max(0, Math.sin(t * 11.0) * 0.5 + Math.sin(t * 6.3 + 1.2) * 0.35 + Math.sin(t * 2.1) * 0.3);
      const gate = Math.sin(t * 1.3) > -0.75 ? 1 : 0.15;
      return Math.min(1, syll * gate * 1.1);
    }
    if (this.state === 'listening') {
      return 0.25 + 0.3 * Math.max(0, Math.sin(t * 7.7) * Math.sin(t * 2.9 + 0.5)) + 0.08 * Math.sin(t * 23.0);
    }
    if (this.state === 'thinking') return 0.15 + 0.1 * Math.sin(t * 5);
    return 0.04 + 0.03 * Math.sin(t * 1.7);
  }

  private loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const nowMs = performance.now();
    const dt = Math.min((nowMs - this.lastFrame) / 1000, 0.05);
    this.lastFrame = nowMs;
    const speedK = this.reducedMotion ? 0.35 : 1;
    this.time += dt * speedK;
    const t = this.time;

    // FPS
    this.fps.frames++;
    this.fps.acc += dt;
    if (this.fps.acc >= 1) {
      this.opts.onFps?.(Math.round(this.fps.frames / this.fps.acc));
      this.fps.frames = 0;
      this.fps.acc = 0;
    }

    // Interpolação suave entre estados
    const p = this.params;
    lerpParams(p, STATE_PARAMS[this.state], 1 - Math.exp(-dt * 3.2));

    const real = this.opts.getLevel?.();
    const targetLevel = real != null ? Math.min(1, real) * 0.85 : this.simulatedLevel(t);
    this.level += (targetLevel - this.level) * (1 - Math.exp(-dt * 14));
    const lvl = this.level;

    const pulse = 1 + Math.sin(t * Math.PI * 2 * p.pulseRate) * p.pulseDepth;

    // Núcleo
    const cu = this.coreMat.uniforms;
    cu.uTime.value = t;
    cu.uAmp.value = p.coreAmp;
    cu.uFreq.value = p.coreFreq;
    cu.uLevel.value = lvl * (this.state === 'speaking' || this.state === 'listening' ? 1 : 0.3);
    (cu.uColor.value as THREE.Color).setRGB(...p.color);
    (cu.uAccent.value as THREE.Color).setRGB(...p.accent);
    cu.uIntensity.value = p.coreIntensity * (1 + lvl * 0.18);
    cu.uAccentMix.value = p.accentMix;

    const coreScale = pulse * (1 + lvl * 0.08 * p.wave);
    this.tiltGroup.scale.setScalar(coreScale);
    this.nucleus.scale.setScalar(0.8 + lvl * 0.45 + Math.sin(t * 3) * 0.04);
    (this.nucleus.material as THREE.MeshBasicMaterial).color.setRGB(0.75 + p.color[0] * 0.25, 0.95, 1);

    this.shell.rotation.y += dt * 0.18 * p.spin;
    this.shell.rotation.x += dt * 0.07 * p.spin;
    this.shell2.rotation.y -= dt * 0.11 * p.spin;
    this.shell2.rotation.z += dt * 0.05 * p.spin;
    (this.shell.material as THREE.LineBasicMaterial).color.setRGB(...p.color);

    this.gyros.forEach((g, i) => {
      g.rotation.x += dt * (0.25 + i * 0.12) * p.spin * (i % 2 ? -1 : 1);
      g.rotation.y += dt * (0.18 + i * 0.07) * p.spin;
    });

    // Halo
    const gm = this.glow.material as THREE.SpriteMaterial;
    gm.opacity = p.glow * (0.3 + lvl * 0.16);
    gm.color.setRGB(...p.color);
    this.glow.scale.setScalar(3.3 * pulse + lvl * 0.9);

    // Anéis
    this.ringGroup.scale.setScalar(this.ringGroup.scale.x + (p.ringScale - this.ringGroup.scale.x) * 0.08);
    for (const r of this.ringMats) {
      r.rot += r.spec.speed * dt * p.ringSpeed;
      const u = r.mat.uniforms;
      u.uRot.value = r.rot;
      u.uOpacity.value = r.spec.opacity * p.ringOpacity;
      const c = u.uColor.value as THREE.Color;
      if (r.spec.accent) c.setRGB(...p.color).lerp(new THREE.Color(...p.accent), 0.5 * p.accentMix);
      else c.setRGB(...p.color);
    }

    // Ondas de choque
    for (const s of this.shock) {
      if (s.t >= 1) {
        s.mesh.visible = false;
        continue;
      }
      s.t += dt * 0.9;
      const k = Math.max(0, s.t);
      s.mesh.visible = s.t > 0;
      s.mesh.scale.setScalar(1.3 + k * 2.4);
      s.mat.uniforms.uOpacity.value = Math.pow(1 - k, 2) * 0.9;
      s.mat.uniforms.uRot.value += dt * 0.2;
      (s.mat.uniforms.uColor.value as THREE.Color).setRGB(...p.color).lerp(new THREE.Color(1, 1, 1), 0.3);
    }

    // Ondas circulares
    for (const w of this.waves) {
      const n = w.pos.length / 3;
      const amp = 0.02 + lvl * 0.28 * p.wave;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d =
          Math.sin(a * 6 + t * 4.0 + w.phase) * 0.5 +
          Math.sin(a * 13 - t * 6.5 + w.phase * 2) * 0.3 +
          Math.sin(a * 27 + t * 9.0) * 0.2;
        const r = w.base + d * amp;
        w.pos[i * 3] = Math.cos(a) * r;
        w.pos[i * 3 + 1] = Math.sin(a) * r;
        w.pos[i * 3 + 2] = 0;
      }
      w.line.geometry.attributes.position.needsUpdate = true;
      (w.line.material as THREE.LineBasicMaterial).opacity = 0.25 + Math.min(1, p.wave) * 0.65;
    }

    // Raios de dados
    {
      const { colors, seeds, geo } = this.rays;
      const n = seeds.length;
      const busy = this.state === 'thinking' ? 1 : this.state === 'idle' ? 0.35 : 0.6;
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const flick = Math.max(0, Math.sin(t * (1 + s * 4) * (1 + busy * 2) + s * 50));
        const v = flick * flick * (0.25 + busy * 0.75);
        for (let k = 0; k < 2; k++) {
          const o = (i * 2 + k) * 3;
          const fade = k === 0 ? 1 : 0.15;
          colors[o] = p.color[0] * v * fade;
          colors[o + 1] = p.color[1] * v * fade;
          colors[o + 2] = p.color[2] * v * fade;
        }
      }
      geo.attributes.color.needsUpdate = true;
    }

    // Partículas
    const pu = this.particleMat.uniforms;
    pu.uTime.value = t;
    pu.uSpin.value = p.spin;
    pu.uSwirl.value = p.swirl;
    pu.uLevel.value = this.state === 'speaking' ? lvl : lvl * 0.3;
    pu.uScale.value = p.particleScale;
    (pu.uColor.value as THREE.Color).setRGB(...p.color);
    (pu.uAccent.value as THREE.Color).setRGB(...p.accent);
    pu.uAccentMix.value = p.accentMix * (this.state === 'thinking' ? 1 : 0.4);

    // Rotação do conjunto: automática + arraste com inércia + paralaxe
    if (!this.dragging) {
      this.rotVel.x *= 0.94;
      this.rotVel.y *= 0.94;
      this.userRot.y += this.rotVel.y;
      this.userRot.x = THREE.MathUtils.clamp(this.userRot.x + this.rotVel.x, -1.1, 1.1);
      // retorno elástico da inclinação
      this.userRot.x *= 0.985;
    }
    this.userRot.y += dt * p.rigSpin;
    this.rig.rotation.y = this.userRot.y * 0.6 + this.parallax.x * 0.12;
    this.rig.rotation.x = this.userRot.x * 0.6 + this.parallax.y * 0.08;
    this.ringGroup.rotation.y = -this.rig.rotation.y * 0.65; // anéis permanecem quase frontais
    this.ringGroup.rotation.x = -this.rig.rotation.x * 0.5;
    this.tiltGroup.rotation.y += dt * 0.12 * p.spin;

    this.grid.rotation.y += dt * 0.03 * p.spin;

    this.bloom.strength = p.bloom * (0.6 + lvl * 0.12);
    this.composer.render();
  }
}
