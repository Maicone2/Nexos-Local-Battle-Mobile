import { drawFighter } from './AnimationSystem';
import { getActiveHitbox, getHurtbox } from './CollisionSystem';
import { ARENA_HEIGHT, ARENA_WIDTH, FIGHTER_PROFILES, FLOOR_Y, STAGES } from './constants';
import {
  CombatEvent,
  FighterAppearance,
  FighterId,
  GraphicsQuality,
  MatchState,
  StageId,
} from './types';

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
  kind: 'spark' | 'ring' | 'dust' | 'plus';
}

const POOL_SIZE = 200;

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
      if (ev.type === 'hit' || ev.type === 'medium_hit' || ev.type === 'heavy_hit' || ev.type === 'ultimate') {
        const base =
          ev.type === 'ultimate' ? 32 : ev.type === 'heavy_hit' ? 22 : ev.type === 'medium_hit' ? 14 : 10;
        const count = Math.round(base * mult);
        const primary = FIGHTER_PROFILES[ev.fighterId].primaryColor;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / Math.max(1, count) + (i % 3) * 0.25;
          const spd = (ev.type === 'ultimate' ? 7 : ev.type === 'heavy_hit' ? 5 : 3) + (i % 5) * 1.4;
          this.spawnParticle(
            ev.x,
            ev.y,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd - 1.5,
            ev.type === 'ultimate' ? 6 : ev.type === 'heavy_hit' ? 4.5 : 3,
            16 + (i % 8),
            i % 3 === 0 ? '#FFFFFF' : primary,
            'spark'
          );
        }
        const ringRadius = ev.type === 'ultimate' ? 120 : ev.type === 'heavy_hit' ? 78 : 44;
        this.spawnParticle(ev.x, ev.y, 0, 0, ringRadius, 14, '#FFFFFF', 'ring');
      } else if (ev.type === 'block' || ev.type === 'perfect_guard') {
        const isPerfect = ev.type === 'perfect_guard';
        const count = Math.round((isPerfect ? 18 : 9) * mult);
        const col = isPerfect ? '#00E5FF' : '#00A8FF';
        for (let i = 0; i < count; i++) {
          const ang = -Math.PI * 0.5 + (i - count / 2) * 0.32;
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 5.6, Math.sin(ang) * 4.8, 3.5, 16, col, 'spark');
        }
        this.spawnParticle(ev.x, ev.y, 0, 0, isPerfect ? 72 : 48, 14, isPerfect ? '#FFFFFF' : col, 'ring');
      } else if (ev.type === 'guard_break' || ev.type === 'wall_bounce') {
        const col = ev.type === 'guard_break' ? '#EF4444' : '#38BDF8';
        this.spawnParticle(ev.x, ev.y, 0, 0, 96, 18, col, 'ring');
        for (let i = 0; i < Math.round(14 * mult); i++) {
          const ang = (Math.PI * 2 * i) / 14;
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 6.5, Math.sin(ang) * 6.5, 4, 18, col, 'spark');
        }
      } else if (ev.type === 'special') {
        const color = FIGHTER_PROFILES[ev.fighterId].primaryColor;
        const count = Math.round(16 * mult);
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / Math.max(1, count);
          this.spawnParticle(ev.x, ev.y, Math.cos(ang) * 6, Math.sin(ang) * 6, 4, 20, color, 'spark');
        }
        this.spawnParticle(ev.x, ev.y, 0, 0, 92, 18, color, 'ring');
      } else if (ev.type === 'charge') {
        const primary = FIGHTER_PROFILES[ev.fighterId].primaryColor;
        const perSide = Math.max(1, Math.round(2 * mult));
        for (let i = 0; i < perSide; i++) {
          const jitterY = ((ev.x + i * 17) % 40) - 10;
          const jitterX = 36 + (i % 3) * 14;
          this.spawnParticle(
            ev.x - jitterX,
            ev.y + 34 - jitterY,
            -0.25,
            -2.1 - i * 0.35,
            8 + (i % 2) * 2,
            26,
            i % 2 === 0 ? '#4ADE80' : '#00E5FF',
            'plus'
          );
          this.spawnParticle(
            ev.x + jitterX,
            ev.y + 26 - jitterY,
            0.25,
            -2.2 - i * 0.35,
            8 + (i % 2) * 2,
            26,
            i % 2 === 0 ? '#F5B700' : primary,
            'plus'
          );
        }
        this.spawnParticle(ev.x, ev.y + 10, 0, 0, 56, 14, primary, 'ring');
      } else if (ev.type === 'jump' || ev.type === 'dash') {
        for (let i = 0; i < Math.round(6 * mult); i++) {
          this.spawnParticle(ev.x + (i - 3) * 8, FLOOR_Y, (i - 3) * 1.4, -1.2, 5, 16, 'rgba(200,220,255,0.45)', 'dust');
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
    quality: GraphicsQuality,
    showHitboxes = false,
    customizations?: { p1?: FighterAppearance; p2?: FighterAppearance }
  ): void {
    ctx.save();

    const scaleX = canvasWidth / ARENA_WIDTH;
    const scaleY = canvasHeight / ARENA_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvasWidth - ARENA_WIDTH * scale) / 2;
    const offsetY = (canvasHeight - ARENA_HEIGHT * scale) / 2;

    const shakeMag = state.cameraShake * 0.9;
    const shakeX = shakeMag > 0.2 ? Math.sin(timeSec * 67) * shakeMag : 0;
    const shakeY = shakeMag > 0.2 ? Math.cos(timeSec * 53) * shakeMag * 0.7 : 0;

    const midX = (state.p1.x + state.p2.x) * 0.5;
    const parallaxX = (ARENA_WIDTH * 0.5 - midX) * 0.08;

    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(scale, scale);

    this.drawStageBackdrop(ctx, state.stage, parallaxX, timeSec, quality);
    this.drawArenaFloor(ctx, state.stage, parallaxX, quality);

    if (quality !== 'low') {
      this.drawSpotlights(ctx, state, timeSec);
    }

    drawFighter(ctx, state.p1, timeSec, quality === 'high', customizations?.p1);
    drawFighter(ctx, state.p2, timeSec, quality === 'high', customizations?.p2);

    for (const proj of state.projectiles) {
      this.drawProjectile(
        ctx,
        proj.fighterId,
        proj.x,
        proj.y,
        proj.radius,
        proj.vx >= 0 ? 1 : -1,
        timeSec
      );
    }

    this.updateAndDrawParticles(ctx);

    if (showHitboxes) {
      this.drawDebugBoxes(ctx, state);
    }

    this.drawCallouts(ctx, state);
    this.drawPhaseBanner(ctx, state);

    ctx.restore();
  }

  private drawDebugBoxes(ctx: CanvasRenderingContext2D, state: MatchState): void {
    ctx.save();
    for (const f of [state.p1, state.p2]) {
      const hurt = getHurtbox(f);
      ctx.strokeStyle = '#00E5FF';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.fillRect(hurt.x, hurt.y, hurt.width, hurt.height);
      ctx.strokeRect(hurt.x, hurt.y, hurt.width, hurt.height);

      const hit = getActiveHitbox(f);
      if (hit) {
        ctx.strokeStyle = '#EF4444';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.lineWidth = 2.5;
        ctx.fillRect(hit.x, hit.y, hit.width, hit.height);
        ctx.strokeRect(hit.x, hit.y, hit.width, hit.height);
      }
    }
    ctx.restore();
  }

  private drawCallouts(ctx: CanvasRenderingContext2D, state: MatchState): void {
    if (state.callouts.length === 0) return;
    ctx.save();
    ctx.font = '800 22px "Barlow Condensed", sans-serif';
    let p1Idx = 0;
    let p2Idx = 0;

    for (const c of state.callouts) {
      const alpha = Math.min(1, c.framesLeft / 12);
      ctx.globalAlpha = alpha;
      if (c.slot === 1) {
        ctx.textAlign = 'left';
        const y = 212 + p1Idx * 28;
        p1Idx++;
        ctx.strokeStyle = '#07090D';
        ctx.lineWidth = 5;
        ctx.strokeText(c.text, 64, y);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, 64, y);
      } else {
        ctx.textAlign = 'right';
        const y = 212 + p2Idx * 28;
        p2Idx++;
        ctx.strokeStyle = '#07090D';
        ctx.lineWidth = 5;
        ctx.strokeText(c.text, ARENA_WIDTH - 64, y);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, ARENA_WIDTH - 64, y);
      }
    }
    ctx.restore();
  }

  private drawStageBackdrop(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    parallaxX: number,
    timeSec: number,
    quality: GraphicsQuality
  ): void {
    const stageMeta = STAGES[stageId] ?? STAGES.orbital_arena;
    const img = this.stageImages[stageId];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(img, -460 + parallaxX * 0.45, -180, ARENA_WIDTH + 920, ARENA_HEIGHT + 360);
      ctx.fillStyle = 'rgba(7, 9, 13, 0.34)';
      ctx.fillRect(-460, -180, ARENA_WIDTH + 920, ARENA_HEIGHT + 360);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, -180, 0, ARENA_HEIGHT + 180);
      grad.addColorStop(0, '#06080E');
      grad.addColorStop(0.7, '#0F172A');
      grad.addColorStop(1, '#07090D');
      ctx.fillStyle = grad;
      ctx.fillRect(-460, -180, ARENA_WIDTH + 920, ARENA_HEIGHT + 360);
    }

    if (quality !== 'low') {
      const pulse = 0.08 + Math.sin(timeSec * 1.6) * 0.03;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = stageMeta.ambientHue;
      ctx.fillRect(240 + parallaxX * 0.6, 80, 14, 480);
      ctx.fillRect(1026 + parallaxX * 0.6, 80, 14, 480);
      ctx.restore();
    }
  }

  private drawArenaFloor(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    parallaxX: number,
    quality: GraphicsQuality
  ): void {
    const stageMeta = STAGES[stageId] ?? STAGES.orbital_arena;
    const floorTop = FLOOR_Y - 24;
    const floorGrad = ctx.createLinearGradient(0, floorTop, 0, ARENA_HEIGHT + 180);
    floorGrad.addColorStop(0, 'rgba(13, 18, 29, 0.92)');
    floorGrad.addColorStop(0.25, '#090D16');
    floorGrad.addColorStop(1, '#04060A');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(-460, floorTop, ARENA_WIDTH + 920, ARENA_HEIGHT - floorTop + 200);

    ctx.strokeStyle = stageMeta.ambientHue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-460, floorTop);
    ctx.lineTo(ARENA_WIDTH + 460, floorTop);
    ctx.stroke();

    if (quality !== 'low') {
      ctx.save();
      ctx.strokeStyle = stageMeta.floorGlow;
      ctx.lineWidth = 1.2;

      const vanishX = ARENA_WIDTH * 0.5 + parallaxX * 0.4;
      for (let i = -12; i <= 12; i++) {
        const topX = vanishX + i * 95;
        const botX = vanishX + i * 210;
        ctx.beginPath();
        ctx.moveTo(topX, floorTop);
        ctx.lineTo(botX, ARENA_HEIGHT + 120);
        ctx.stroke();
      }

      const rows = [floorTop + 22, floorTop + 56, floorTop + 104];
      for (const y of rows) {
        ctx.beginPath();
        ctx.moveTo(-460, y);
        ctx.lineTo(ARENA_WIDTH + 460, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawSpotlights(ctx: CanvasRenderingContext2D, state: MatchState, timeSec: number): void {
    const stageMeta = STAGES[state.stage] ?? STAGES.orbital_arena;
    ctx.save();
    for (const f of [state.p1, state.p2]) {
      const grad = ctx.createLinearGradient(f.x, 40, f.x, FLOOR_Y);
      grad.addColorStop(0, 'rgba(0, 168, 255, 0)');
      grad.addColorStop(0.7, 'rgba(0, 168, 255, 0.045)');
      grad.addColorStop(1, stageMeta.floorGlow.replace('0.35', '0.1'));
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
    fighterId: FighterId,
    x: number,
    y: number,
    radius: number,
    dir: 1 | -1,
    timeSec: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);

    if (fighterId === 'nyx') {
      // Cryogenic spinning ice-blade shuriken
      ctx.rotate(timeSec * 16);
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 1.35);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.45, '#10B981');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E0F2FE';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(radius * 1.05, 0);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 1.45);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.35, '#00E5FF');
    grad.addColorStop(0.7, 'rgba(245, 183, 0, 0.7)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(10, -radius * 0.55);
    ctx.lineTo(-radius * 2.4, 0);
    ctx.lineTo(10, radius * 0.55);
    ctx.closePath();
    ctx.fill();

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
      } else if (p.kind === 'plus') {
        p.x += p.vx;
        p.y += p.vy;
        const size = p.radius * (0.85 + Math.sin(progress * Math.PI) * 0.35);
        const arm = Math.max(2.5, size * 0.32);
        ctx.globalAlpha = Math.min(1, alpha * 1.25);
        ctx.fillStyle = '#07090D';
        ctx.fillRect(p.x - size - 1.5, p.y - arm / 2 - 1.5, size * 2 + 3, arm + 3);
        ctx.fillRect(p.x - arm / 2 - 1.5, p.y - size - 1.5, arm + 3, size * 2 + 3);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - size, p.y - arm / 2, size * 2, arm);
        ctx.fillRect(p.x - arm / 2, p.y - size, arm, size * 2);
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
        sub =
          state.mode === 'combo_trials'
            ? 'COMBO TRIALS'
            : state.mode === 'training'
            ? 'MODO DE TREINO'
            : state.mode === 'vs_cpu'
            ? 'VERSUS CPU'
            : state.mode === 'local2p'
            ? 'VERSUS 1V1 LOCAL'
            : 'ARENA LAN';
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

    ctx.fillStyle = 'rgba(7, 9, 13, 0.72)';
    ctx.fillRect(-460, 258, ARENA_WIDTH + 920, 114);
    ctx.fillStyle = '#00A8FF';
    ctx.fillRect(-460, 258, ARENA_WIDTH + 920, 3);
    ctx.fillRect(-460, 369, ARENA_WIDTH + 920, 3);

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
