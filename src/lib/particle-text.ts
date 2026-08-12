/**
 * Framework-agnostic particle-morph engine.
 *
 * Shared by two screens that both need "points converge into a shape":
 * - Home §01 mounts `ParticleField` directly — anonymous dust converging into "REMAKE".
 * - Home §04 imports `sampleTextPoints` + `lerp`/`easeOutCubic` and drives real member-card
 *   DOM elements toward the sampled points itself (see ScreenWhoMakes.astro), since that
 *   screen needs visible card content, not anonymous dots.
 *
 * Driven externally by a 0..1 `progress` value (typically a GSAP ScrollTrigger onUpdate).
 */

export interface Point {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface SampleTextOptions {
  fontFamily?: string;
  fontWeight?: string | number;
  sampleSize?: number; // offscreen render height in px
  gridStep?: number; // px spacing between sampled points
  maxPoints?: number; // hard cap; thinned evenly if exceeded
}

/**
 * Rasterizes `text` offscreen and returns a point cloud (normalized 0..1) shaped like it.
 * Consumers scale the points to their own canvas/container size.
 */
export function sampleTextPoints(text: string, options: SampleTextOptions = {}): Point[] {
  const {
    fontFamily = '"Bricolage Grotesque", sans-serif',
    fontWeight = 800,
    sampleSize = 400,
    gridStep = 4,
    maxPoints = 2200,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = sampleSize * 3;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  let fontSize = sampleSize;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > canvas.width * 0.92 && fontSize > 8) {
    fontSize -= 4;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const points: Point[] = [];
  for (let y = 0; y < height; y += gridStep) {
    for (let x = 0; x < width; x += gridStep) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 128) points.push({ x: x / width, y: y / height });
    }
  }

  if (points.length <= maxPoints) return points;

  const thinned: Point[] = [];
  const stride = points.length / maxPoints;
  for (let i = 0; i < maxPoints; i++) thinned.push(points[Math.floor(i * stride)]);
  return thinned;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function clamp01(n: number): number {
  return Math.min(Math.max(n, 0), 1);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves a CSS custom property (e.g. a colour token) on `el` to a concrete colour string. */
export function resolveColor(el: HTMLElement): string {
  return getComputedStyle(el).color;
}

interface DustParticle {
  scatterX: number;
  scatterY: number;
  targetX: number;
  targetY: number;
  delay: number; // staggers convergence so particles don't snap in lockstep
  size: number;
}

export interface ParticleFieldOptions {
  color?: string;
  particleCount?: number;
}

/**
 * Canvas-rendered dust field that scatters/converges into a target text shape.
 * Drive with `field.render(progress)` (0 = scattered, 1 = formed), or call
 * `field.renderStatic()` once for prefers-reduced-motion / no-JS users.
 */
export class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private particles: DustParticle[] = [];
  private width = 0;
  private height = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(
    private canvas: HTMLCanvasElement,
    private text: string,
    private options: ParticleFieldOptions = {}
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ParticleField: canvas 2d context unavailable");
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.build();
  }

  private build(): void {
    const isMobile = this.width < 640;
    const count = this.options.particleCount ?? (isMobile ? 500 : 1400);
    const points = sampleTextPoints(this.text, { maxPoints: count });

    this.particles = points.map((p) => ({
      targetX: p.x * this.width,
      targetY: p.y * this.height,
      scatterX: Math.random() * this.width,
      scatterY: Math.random() * this.height,
      delay: Math.random() * 0.35,
      size: Math.random() * 1.6 + 0.8,
    }));
  }

  /** progress: 0 = fully scattered, 1 = fully formed */
  render(progress: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.options.color ?? "#000";

    for (const particle of this.particles) {
      const span = 1 - particle.delay;
      const local = span > 0 ? clamp01((progress - particle.delay) / span) : progress;
      const eased = easeOutCubic(local);
      const x = lerp(particle.scatterX, particle.targetX, eased);
      const y = lerp(particle.scatterY, particle.targetY, eased);
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Skip straight to the fully-formed shape — used for reduced motion / no-JS. */
  renderStatic(): void {
    this.render(1);
  }
}
