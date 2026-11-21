import { drawFighter } from './AnimationSystem';
import { ARENA_HEIGHT, ARENA_WIDTH, FIGHTER_PROFILES, FLOOR_Y, STAGES } from './constants';
import { CombatEvent, GraphicsQuality, MatchState, StageId } from './types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'spark' | 'ring' | 'dust';
}

const POOL_SIZE = 160;

export class GameRenderer {
  private stageImages: Partial<Record<StageId, HTMLImageElement>> = {};
  private particles: Particle[] = [];
  private poolCursor = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 3,
        life: 0,
        maxLife: 1,
        color: '#00A8FF',
        kind: 'spark',
      });
    }
    this.preloadStages();
  }

  private preloadStages(): void {
    if (typeof Image === 'undefined') return;
    (Object.keys(STAGES) as StageId[]).forEach((id) => {
      const img = new Image();
      img.src = STAGES[id].imagePath;
      this.stageImages[id] = img;
    });
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    maxLife: number,
    color: string,
    kind: Particle['kind'] = 'spark'
  ): void {
    const p = this.particles[this.poolCursor];
    this.poolCursor = (this.poolCursor + 1) % POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.radius = radius;
    p.life = 0;
    p.maxLife = maxLife;
    p.color = color;
    p.kind = kind;
  }

  ingestEvents(events: CombatEvent[], quality: GraphicsQuality): void {
    const mult = quality === 'high' ? 1 : quality === 'medium' ? 0.65 : 0.35;

    for (const ev of events) {
      if (ev.type === 'hit' || ev.type === 'heavy_hit') {
        const count = Math.round((ev.type === 'heavy_hit' ? 22 : 10) * mult);
        const primary = FIGHTER_PROFILES[ev.fighterId].primaryColor;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / Math.max(1, count) + (i % 3) * 0.25;
          const spd = (ev.type === 'heavy_hit' ? 5 : 3) + (i % 5) * 1.4;
          this.spawnParticle(
            ev.x,
            ev.y,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd - 1.5,
            ev.type === 'heavy_hit' ? 4.5 : 3,
            16 + (i % 8),
            i % 3 === 0 ? '#FFFFFF' : primary,
            'spark'
          );
        }
        this.spawnParticle(ev.x, ev.y, 0, 0, ev.type === 'heavy_hit' ? 78 : 42, 14, '#FFFFFF', 'ring');
      } else if (ev.type === 'block') {
        const count = Math.round(9 * mult);
        for (let i = 0; i < count; i++) {
          const ang = -Math.PI * 0.5 + (i - count / 2) * 0.32;
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 5.2, Math.sin(ang) * 4.5, 3, 14, '#00A8FF', 'spark');
        }
        this.spawnParticle(ev.x, ev.y, 0, 0, 48, 12, '#00A8FF', 'ring');
      } else if (ev.type === 'special') {
        const color = FIGHTER_PROFILES[ev.fighterId].primaryColor;
        const count = Math.round(16 * mult);
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / Math.max(1, count);
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 6, Math.sin(ang) * 6, 4, 20, color, 'spark');
        }
        this.spawnParticle(ev.x, ev.y, 0, 0, 92, 18, color, 'ring');
      } else if (ev.type === 'jump') {
        for (let i = 0; i < Math.round(6 * mult); i++) {
          this.spawnParticle(ev.x + (i - 3) * 8, FLOOR_Y, (i - 3) * 1.2, -1.2, 5, 16, 'rgba(200,220,255,0.45)', 'dust');
        }
      } else if (ev.type === 'ko') {
        const count = Math.round(28 * mult);
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / Math.max(1, count);
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 8.5, Math.sin(ang) * 8.5, 5, 28, '#00A8FF', 'spark');
        }
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    state: MatchState,
    timeSec: number,
    quality: GraphicsQuality
  ): void {
    ctx.save();

    // Scale virtual 1280x720 stage cleanly to fill viewport (cover or contain with letterbox match)
    const scaleX = canvasWidth / ARENA_WIDTH;
    const scaleY = canvasHeight / ARENA_HEIGHT;
    const scale = Math.max(scaleX, scaleY);
    const offsetX = (canvasWidth - ARENA_WIDTH * scale) / 2;
    const offsetY = (canvasHeight - ARENA_HEIGHT * scale) / 2;

    // Camera Shake (trauma^2)
    const shakeMag = state.cameraShake * 0.9;
    const shakeX = shakeMag > 0.2 ? Math.sin(timeSec * 67) * shakeMag : 0;
    const shakeY = shakeMag > 0.2 ? Math.cos(timeSec * 53) * shakeMag * 0.7 : 0;

    // Subtle dynamic camera tracking based on fighters midpoint
    const midX = (state.p1.x + state.p2.x) * 0.5;
    const parallaxX = (ARENA_WIDTH * 0.5 - midX) * 0.08;

    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(scale, scale);

    // 1. Background Stage Artwork or Procedural Fallback
    this.drawStageBackdrop(ctx, state.stage, parallaxX, timeSec, quality);

    // 2. 2.5D Perspective Arena Floor
    this.drawArenaFloor(ctx, state.stage, parallaxX, quality);

    // 3. Overhead Dynamic Lighting Cones
    if (quality !== 'low') {
      this.drawSpotlights(ctx, state, timeSec);
    }

    // 4. Fighters
    drawFighter(ctx, state.p1, timeSec, quality === 'high');
    drawFighter(ctx, state.p2, timeSec, quality === 'high');

    // 5. Projectiles (Pulso Solar)
    for (const proj of state.projectiles) {
      this.drawProjectile(ctx, proj.x, proj.y, proj.radius, proj.vx >= 0 ? 1 : -1, timeSec);
    }

    // 6. Pooled Particles
    this.updateAndDrawParticles(ctx);

    // 7. Canvas Round / Fight / KO Callout Banner
    this.drawPhaseBanner(ctx, state);

    ctx.restore();
  }

  private drawStageBackdrop(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    parallaxX: number,
    timeSec: number,
    quality: GraphicsQuality
  ): void {
    const img = this.stageImages[stageId];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(img, -48 + parallaxX * 0.45, -20, ARENA_WIDTH + 96, ARENA_HEIGHT + 20);
      // Dark atmospheric scrim so fighters pop clearly against background
      ctx.fillStyle = 'rgba(7, 9, 13, 0.34)';
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
      grad.addColorStop(0, '#06080E');
      grad.addColorStop(0.7, '#0F172A');
      grad.addColorStop(1, '#07090D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    }

    // Animated ambient light pillars
    if (quality !== 'low') {
      const pulse = 0.08 + Math.sin(timeSec * 1.6) * 0.03;
      ctx.fillStyle =
        stageId === 'orbital_arena'
          ? `rgba(0, 168, 255, ${pulse})`
          : `rgba(168, 85, 247, ${pulse})`;
      ctx.fillRect(240 + parallaxX * 0.6, 80, 14, 480);
      ctx.fillRect(1026 + parallaxX * 0.6, 80, 14, 480);
    }
  }

  private drawArenaFloor(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    parallaxX: number,
    quality: GraphicsQuality
  ): void {
    const floorTop = FLOOR_Y - 24;
    const floorGrad = ctx.createLinearGradient(0, floorTop, 0, ARENA_HEIGHT);
    floorGrad.addColorStop(0, 'rgba(13, 18, 29, 0.92)');
    floorGrad.addColorStop(0.25, '#090D16');
    floorGrad.addColorStop(1, '#04060A');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorTop, ARENA_WIDTH, ARENA_HEIGHT - floorTop);

    // Horizon Energy Line
    ctx.strokeStyle = stageId === 'orbital_arena' ? '#00A8FF' : '#A855F7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, floorTop);
    ctx.lineTo(ARENA_WIDTH, floorTop);
    ctx.stroke();

    // 2.5D Perspective Floor Grid Lines
    if (quality !== 'low') {
      ctx.save();
      ctx.strokeStyle =
        stageId === 'orbital_arena'
          ? 'rgba(0, 168, 255, 0.18)'
          : 'rgba(168, 85, 247, 0.18)';
      ctx.lineWidth = 1.2;

      const vanishX = ARENA_WIDTH * 0.5 + parallaxX * 0.4;
      for (let i = -8; i <= 8; i++) {
        const topX = vanishX + i * 95;
        const botX = vanishX + i * 210;
        ctx.beginPath();
        ctx.moveTo(topX, floorTop);
        ctx.lineTo(botX, ARENA_HEIGHT);
        ctx.stroke();
      }

      // Horizontal depth lines
      const rows = [floorTop + 22, floorTop + 56, floorTop + 104];
      for (const y of rows) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawSpotlights(ctx: CanvasRenderingContext2D, state: MatchState, timeSec: number): void {
    ctx.save();
    for (const f of [state.p1, state.p2]) {
      const grad = ctx.createLinearGradient(f.x, 40, f.x, FLOOR_Y);
      grad.addColorStop(0, 'rgba(0, 168, 255, 0)');
      grad.addColorStop(0.7, 'rgba(0, 168, 255, 0.045)');
      grad.addColorStop(1, 'rgba(0, 168, 255, 0.09)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(f.x - 24, 40);
      ctx.lineTo(f.x + 24, 40);
      ctx.lineTo(f.x + 110 + Math.sin(timeSec * 2 + f.slot) * 8, FLOOR_Y);
      ctx.lineTo(f.x - 110 + Math.sin(timeSec * 2 + f.slot) * 8, FLOOR_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawProjectile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    dir: 1 | -1,
    timeSec: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);

    // Outer Gold-Cyan Solar Halo
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 1.45);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.35, '#00E5FF');
    grad.addColorStop(0.7, 'rgba(245, 183, 0, 0.7)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Trailing energy tail
    ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(10, -radius * 0.55);
    ctx.lineTo(-radius * 2.4, 0);
    ctx.lineTo(10, radius * 0.55);
    ctx.closePath();
    ctx.fill();

    // Spinning solar ring
    ctx.strokeStyle = '#F5B700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.9, radius * 0.52, timeSec * 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life++;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.lineWidth = 4 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (0.25 + progress * 0.85), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.kind === 'spark' ? 0.18 : -0.04;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.kind === 'dust' ? 1 + progress : 1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawPhaseBanner(ctx: CanvasRenderingContext2D, state: MatchState): void {
    let label = '';
    let sub = '';

    if (state.phase === 'intro') {
      if (state.phaseTimer > 22) {
        label = `RONDA ${state.roundNumber}`;
        sub = state.mode === 'training' ? 'MODO DE TREINO' : 'PREPARAR';
      } else {
        label = 'LUTEM!';
      }
    } else if (state.phase === 'ko') {
      label = state.timerSeconds === 0 ? 'TEMPO ESGOTADO!' : 'K.O.!';
    }

    if (!label) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Crisp horizontal speed bar behind banner
    ctx.fillStyle = 'rgba(7, 9, 13, 0.72)';
    ctx.fillRect(0, 258, ARENA_WIDTH, 114);
    ctx.fillStyle = '#00A8FF';
    ctx.fillRect(0, 258, ARENA_WIDTH, 3);
    ctx.fillRect(0, 369, ARENA_WIDTH, 3);

    ctx.font = '800 76px "Barlow Condensed", sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#07090D';
    ctx.strokeText(label, ARENA_WIDTH / 2, 314);
    ctx.fillStyle = label === 'K.O.!' ? '#F5B700' : '#F4F7FB';
    ctx.fillText(label, ARENA_WIDTH / 2, 314);

    if (sub) {
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#00A8FF';
      ctx.fillText(sub, ARENA_WIDTH / 2, 350);
    }
    ctx.restore();
  }
}
