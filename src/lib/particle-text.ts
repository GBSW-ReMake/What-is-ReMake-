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
  aspectRatio?: number; // width / height of the sampling canvas; pass the real container's aspect ratio to avoid stretching the letterforms
  gridStep?: number; // px spacing between sampled points
  maxPoints?: number; // hard cap; thinned evenly if exceeded
}

export interface SampleTextResult {
  points: Point[];
  /** computed font-size as a fraction of the sample canvas height (0..1) — multiply by a real container's height to get a matching real px font-size */
  fontSizeRatio: number;
}

/**
 * Rasterizes `text` offscreen and returns a point cloud (normalized 0..1) shaped like it.
 * Consumers scale the points to their own canvas/container size.
 */
export function sampleTextPoints(text: string, options: SampleTextOptions = {}): SampleTextResult {
  const {
    fontFamily = '"Bricolage Grotesque", sans-serif',
    fontWeight = 800,
    sampleSize = 400,
    aspectRatio = 3,
    gridStep = 4,
    maxPoints = 2200,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sampleSize * aspectRatio));
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { points: [], fontSizeRatio: 0 };

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

  const fontSizeRatio = fontSize / sampleSize;

  if (points.length <= maxPoints) return { points, fontSizeRatio };

  const thinned: Point[] = [];
  const stride = points.length / maxPoints;
  for (let i = 0; i < maxPoints; i++) thinned.push(points[Math.floor(i * stride)]);
  return { points: thinned, fontSizeRatio };
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
  clusterX: number;
  clusterY: number;
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
  private fontSizeRatio = 0;

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

  /** progress where the gathered mass finishes forming and starts resolving into the shape */
  private static readonly GATHER_SPLIT = 0.45;

  private build(): void {
    const isMobile = this.width < 640;
    const count = this.options.particleCount ?? (isMobile ? 500 : 1400);
    const aspectRatio = this.height > 0 ? this.width / this.height : 3;
    const { points, fontSizeRatio } = sampleTextPoints(this.text, { maxPoints: count, aspectRatio });
    this.fontSizeRatio = fontSizeRatio;

    const clusterCx = this.width / 2;
    const clusterCy = this.height / 2;
    const clusterRadius = Math.min(this.width, this.height) * 0.08;

    this.particles = points.map((p) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * clusterRadius;
      return {
        targetX: p.x * this.width,
        targetY: p.y * this.height,
        scatterX: Math.random() * this.width,
        scatterY: Math.random() * this.height,
        clusterX: clusterCx + Math.cos(angle) * radius,
        clusterY: clusterCy + Math.sin(angle) * radius,
        delay: Math.random() * 0.35,
        size: Math.random() * 1.8 + 1.2,
      };
    });
  }

  /**
   * progress: 0 = fully scattered, 1 = fully formed.
   * Two phases: 0..GATHER_SPLIT dust gathers into a mass at the shape's center,
   * GATHER_SPLIT..1 the mass resolves outward into the target shape.
   */
  render(progress: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = this.options.color ?? "#000";

    const split = ParticleField.GATHER_SPLIT;

    for (const particle of this.particles) {
      let x: number;
      let y: number;

      if (progress <= split) {
        const phaseProgress = split > 0 ? progress / split : 1;
        const span = 1 - particle.delay;
        const local = span > 0 ? clamp01((phaseProgress - particle.delay) / span) : phaseProgress;
        const eased = easeOutCubic(local);
        x = lerp(particle.scatterX, particle.clusterX, eased);
        y = lerp(particle.scatterY, particle.clusterY, eased);
      } else {
        const phaseProgress = split < 1 ? (progress - split) / (1 - split) : 1;
        const span = 1 - particle.delay;
        const local = span > 0 ? clamp01((phaseProgress - particle.delay) / span) : phaseProgress;
        const eased = easeOutCubic(local);
        x = lerp(particle.clusterX, particle.targetX, eased);
        y = lerp(particle.clusterY, particle.targetY, eased);
      }

      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Skip straight to the fully-formed shape — used for reduced motion / no-JS. */
  renderStatic(): void {
    this.render(1);
  }

  /** Real px font-size that would render this field's text at the same visual size as the formed dots — use to size a matching real-text crossfade element. */
  getMatchingFontSize(): number {
    return this.fontSizeRatio * this.height;
  }
}
