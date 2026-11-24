import { DEFAULT_FIGHTER_APPEARANCE, FIGHTER_PROFILES, FLOOR_Y, getMoveSpec } from './constants';
import {
  BackGearStyle,
  EyeStyle,
  FighterAppearance,
  FighterState,
  HeadgearStyle,
  MoveId,
  WeaponType,
} from './types';

interface PoseAngles {
  torsoLean: number; // rad (+ leans forward toward +X)
  hipDrop: number;   // px downward
  headTilt: number;
  frontShoulder: number;
  frontElbow: number;
  backShoulder: number;
  backElbow: number;
  frontHip: number;
  frontKnee: number;
  backHip: number;
  backKnee: number;
  scaleX: number;
  scaleY: number;
  weaponGlow: number;
  shieldActive: boolean;
  perfectShield: boolean;
  strikeArc: number; // 0..1 during active punch/kick
  arcType: 'punch' | 'kick' | 'uppercut' | 'sweep' | 'ultimate';
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function computeAttackPose(
  pose: PoseAngles,
  f: FighterState,
  moveId: MoveId | null,
  t: number
): void {
  const spec = getMoveSpec(f.id, moveId);
  const activeStart = spec.startup;
  const activeEnd = spec.startup + spec.active;
  const total = activeEnd + spec.recovery;
  const isStartup = t < activeStart;
  const isActive = t >= activeStart && t < activeEnd;
  const recP = isActive || isStartup ? 0 : Math.min(1, (t - activeEnd) / Math.max(1, spec.recovery));
  const startP = Math.min(1, t / Math.max(1, activeStart));

  switch (moveId) {
    case 'crouch_medium_sweep': {
      pose.hipDrop = 54;
      pose.torsoLean = -0.35;
      pose.backHip = 0.75;
      pose.backKnee = -1.65;
      pose.backShoulder = -0.55;
      pose.frontShoulder = 0.65;
      if (isStartup) {
        pose.frontHip = lerp(0.5, -0.2, startP);
        pose.frontKnee = -0.8;
      } else if (isActive) {
        pose.frontHip = 1.56;
        pose.frontKnee = -0.02;
        pose.weaponGlow = 1.0;
        pose.strikeArc = 1;
        pose.arcType = 'sweep';
      } else {
        pose.frontHip = lerp(1.56, 0.5, recP);
        pose.frontKnee = lerp(-0.02, -1.2, recP);
      }
      break;
    }

    case 'crouch_uppercut': {
      if (isStartup) {
        pose.hipDrop = lerp(52, 58, startP);
        pose.torsoLean = 0.32;
        pose.frontShoulder = -0.35;
        pose.frontElbow = 1.5;
        pose.weaponGlow = 0.9;
      } else if (isActive) {
        pose.hipDrop = -16;
        pose.torsoLean = 0.14;
        pose.frontShoulder = 2.68;
        pose.frontElbow = 0.18;
        pose.backShoulder = -0.45;
        pose.frontHip = 0.95;
        pose.frontKnee = -0.85;
        pose.weaponGlow = 1.4;
        pose.strikeArc = 1;
        pose.arcType = 'uppercut';
      } else {
        pose.hipDrop = lerp(-12, 6, recP);
        pose.torsoLean = lerp(0.14, 0.08, recP);
        pose.frontShoulder = lerp(2.68, 0.5, recP);
        pose.frontElbow = lerp(0.18, 1.15, recP);
      }
      break;
    }

    case 'air_light': {
      pose.torsoLean = 0.34;
      pose.frontHip = 1.1;
      pose.frontKnee = -1.35;
      pose.backHip = -0.2;
      pose.backKnee = -1.1;
      if (isStartup) {
        pose.frontShoulder = 0.1;
        pose.frontElbow = 1.5;
      } else if (isActive) {
        pose.frontShoulder = 1.52;
        pose.frontElbow = 0.06;
        pose.weaponGlow = 1.0;
        pose.strikeArc = 1;
        pose.arcType = 'punch';
      } else {
        pose.frontShoulder = lerp(1.52, 0.7, recP);
      }
      break;
    }

    case 'air_medium':
    case 'air_heavy': {
      pose.torsoLean = -0.26;
      pose.backHip = 0.45;
      pose.backKnee = -1.45;
      pose.frontShoulder = 0.85;
      pose.backShoulder = -0.65;
      if (isStartup) {
        pose.frontHip = 1.25;
        pose.frontKnee = -1.3;
      } else if (isActive) {
        pose.frontHip = 1.48;
        pose.frontKnee = -0.04;
        pose.weaponGlow = 1.15;
        pose.strikeArc = 1;
        pose.arcType = 'kick';
      } else {
        pose.frontHip = lerp(1.48, 0.8, recP);
        pose.frontKnee = lerp(-0.04, -1.1, recP);
      }
      break;
    }

    case 'sky_break': {
      pose.torsoLean = 0.58;
      pose.frontShoulder = 0.95;
      pose.frontElbow = 0.15;
      pose.backShoulder = 0.85;
      pose.backElbow = 0.25;
      pose.frontHip = 0.55;
      pose.frontKnee = -0.75;
      pose.weaponGlow = 1.3;
      if (isActive) {
        pose.strikeArc = 1;
        pose.arcType = 'punch';
      }
      break;
    }

    case 'solar_jab_2':
    case 'violet_strike_2':
    case 'titan_smash_2':
    case 'frost_slash_2': {
      if (isStartup) {
        pose.torsoLean = 0.22;
        pose.backShoulder = 0.1;
      } else if (isActive) {
        pose.torsoLean = 0.34;
        pose.backShoulder = 1.58;
        pose.backElbow = 0.04;
        pose.frontShoulder = -0.35;
        pose.weaponGlow = 1.05;
        pose.strikeArc = 1;
        pose.arcType = 'punch';
      } else {
        pose.backShoulder = lerp(1.58, 0.8, recP);
      }
      break;
    }

    case 'violet_strike_3':
    case 'frost_slash_3':
    case 'stand_medium': {
      if (isStartup) {
        pose.torsoLean = -0.1;
        pose.frontHip = 0.8;
        pose.frontKnee = -1.1;
      } else if (isActive) {
        if (f.id === 'vexa' || f.id === 'nyx') {
          pose.torsoLean = -0.18;
          pose.frontHip = 1.5;
          pose.frontKnee = -0.05;
          pose.strikeArc = 1;
          pose.arcType = 'kick';
        } else {
          pose.torsoLean = 0.34;
          pose.frontShoulder = 1.55;
          pose.frontElbow = 0.04;
          pose.strikeArc = 1;
          pose.arcType = 'punch';
        }
        pose.weaponGlow = 1.05;
      } else {
        pose.torsoLean = lerp(0.2, 0.08, recP);
      }
      break;
    }

    case 'photon_rush':
    case 'spiral_kick':
    case 'violet_rush':
    case 'seismic_dash':
    case 'frost_dash':
    case 'glacier_break': {
      const flurry = Math.sin(t * 1.45);
      pose.torsoLean = 0.38;
      pose.hipDrop = 10;
      if (isActive) {
        if (moveId === 'spiral_kick' || moveId === 'frost_dash') {
          pose.torsoLean = -0.2;
          pose.frontHip = 1.52;
          pose.frontKnee = -0.04;
          pose.backHip = -0.45 + 0.3 * flurry;
          pose.arcType = 'kick';
        } else {
          pose.frontShoulder = 1.45 + 0.35 * flurry;
          pose.frontElbow = 0.1;
          pose.backShoulder = 1.45 - 0.35 * flurry;
          pose.backElbow = 0.1;
          pose.arcType = 'punch';
        }
        pose.weaponGlow = 1.25;
        pose.strikeArc = 1;
      } else {
        pose.frontShoulder = lerp(1.3, 0.5, recP);
      }
      break;
    }

    case 'stand_heavy':
    case 'energy_breaker':
    case 'crimson_crush': {
      if (isStartup) {
        pose.torsoLean = lerp(0.08, -0.26, startP);
        pose.hipDrop = lerp(0, 12, startP);
        pose.backShoulder = lerp(0.85, -1.05, startP);
        pose.weaponGlow = 0.85;
      } else if (isActive) {
        if (f.id === 'vexa') {
          pose.torsoLean = -0.22;
          pose.frontHip = 1.54;
          pose.frontKnee = -0.04;
          pose.backHip = -0.35;
          pose.frontShoulder = 0.65;
          pose.backShoulder = -0.55;
          pose.arcType = 'kick';
        } else {
          pose.torsoLean = 0.44;
          pose.hipDrop = 14;
          pose.frontShoulder = 1.62;
          pose.frontElbow = 0.04;
          pose.backShoulder = f.id === 'zane' ? 1.48 : -0.45;
          pose.backElbow = 0.08;
          pose.arcType = 'punch';
        }
        pose.weaponGlow = 1.3;
        pose.strikeArc = 1;
      } else {
        pose.torsoLean = lerp(0.32, 0.08, recP);
        pose.backShoulder = lerp(1.4, 0.85, recP);
      }
      break;
    }

    case 'special_pulse':
    case 'special_vortex':
    case 'special_seismic':
    case 'special_glacial_blade': {
      if (isStartup) {
        pose.hipDrop = lerp(0, 20, startP);
        pose.torsoLean = lerp(0.08, -0.28, startP);
        pose.frontShoulder = -0.3;
        pose.frontElbow = 1.45;
        pose.backShoulder = -0.45;
        pose.backElbow = 1.45;
        pose.weaponGlow = 1.1;
      } else if (isActive) {
        if (f.id === 'kael' || f.id === 'nyx') {
          pose.torsoLean = 0.34;
          pose.hipDrop = 14;
          pose.frontShoulder = 1.54;
          pose.frontElbow = 0.04;
          pose.backShoulder = 1.44;
          pose.backElbow = 0.04;
          pose.arcType = 'punch';
        } else if (f.id === 'zane') {
          pose.torsoLean = 0.48;
          pose.hipDrop = 22;
          pose.frontShoulder = 1.25;
          pose.frontElbow = 0.1;
          pose.backShoulder = 1.18;
          pose.backElbow = 0.1;
          pose.arcType = 'ultimate';
        } else {
          const spin = Math.sin(t * 1.1);
          pose.torsoLean = 0.44;
          pose.hipDrop = 14;
          pose.frontShoulder = 1.45 + 0.35 * spin;
          pose.frontElbow = 0.25;
          pose.backShoulder = -0.9 + 0.4 * spin;
          pose.frontHip = 0.95;
          pose.frontKnee = -0.22;
          pose.arcType = 'kick';
        }
        pose.weaponGlow = 1.35;
        pose.strikeArc = 1;
      } else {
        pose.torsoLean = lerp(0.3, 0.08, recP);
        pose.hipDrop = lerp(14, 0, recP);
      }
      break;
    }

    case 'ultimate_solar_burst':
    case 'ultimate_vortex_blue':
    case 'ultimate_crimson_eruption':
    case 'ultimate_zero_tempest': {
      if (isStartup) {
        pose.hipDrop = lerp(0, 24, startP);
        pose.torsoLean = lerp(0.08, -0.34, startP);
        pose.frontShoulder = 2.4;
        pose.backShoulder = 2.4;
        pose.weaponGlow = 1.6;
      } else if (isActive) {
        pose.torsoLean = 0.38;
        pose.hipDrop = 12;
        pose.frontShoulder = 1.56;
        pose.frontElbow = 0.02;
        pose.backShoulder = 1.52;
        pose.backElbow = 0.02;
        pose.weaponGlow = 1.8;
        pose.strikeArc = 1;
        pose.arcType = 'ultimate';
      } else {
        pose.torsoLean = lerp(0.38, 0.08, recP);
        pose.hipDrop = lerp(12, 0, recP);
      }
      break;
    }

    default: {
      // stand_light
      if (isStartup) {
        pose.torsoLean = lerp(0.08, -0.08, startP);
        pose.frontShoulder = lerp(0.45, -0.3, startP);
        pose.frontElbow = lerp(1.15, 1.5, startP);
      } else if (isActive) {
        pose.torsoLean = 0.28;
        pose.frontShoulder = 1.52;
        pose.frontElbow = 0.05;
        pose.backShoulder = -0.5;
        pose.backElbow = 1.25;
        pose.weaponGlow = 0.95;
        pose.strikeArc = 1;
        pose.arcType = 'punch';
      } else {
        pose.torsoLean = lerp(0.28, 0.08, recP);
        pose.frontShoulder = lerp(1.52, 0.45, recP);
        pose.frontElbow = lerp(0.05, 1.15, recP);
      }
      void total;
      break;
    }
  }
}

function computePose(f: FighterState, timeSec: number): PoseAngles {
  const pose: PoseAngles = {
    torsoLean: 0.1,
    hipDrop: 0,
    headTilt: 0,
    frontShoulder: 0.45,
    frontElbow: 1.15,
    backShoulder: 0.85,
    backElbow: 1.35,
    frontHip: 0.35,
    frontKnee: -0.35,
    backHip: -0.42,
    backKnee: -0.18,
    scaleX: 1,
    scaleY: 1,
    weaponGlow: 0.25,
    shieldActive: false,
    perfectShield: false,
    strikeArc: 0,
    arcType: 'punch',
  };

  const t = f.actionFrame;
  const breath = Math.sin(timeSec * 4.2 + f.slot) * 0.5 + 0.5;

  switch (f.action) {
    case 'idle': {
      pose.hipDrop = breath * 5;
      pose.torsoLean = 0.08 + breath * 0.03;
      pose.frontShoulder = 0.45 + breath * 0.08;
      pose.backShoulder = 0.85 - breath * 0.06;
      if (f.id === 'vexa' || f.id === 'nyx') {
        pose.hipDrop = breath * 7 + 4;
        pose.torsoLean = 0.16;
      } else if (f.id === 'zane') {
        pose.hipDrop = breath * 3;
        pose.torsoLean = 0.05;
        pose.frontShoulder = 0.35 + breath * 0.05;
        pose.backShoulder = 0.72;
      }
      break;
    }

    case 'walk_fwd':
    case 'walk_back': {
      const dir = f.action === 'walk_fwd' ? 1 : -1;
      const stride = Math.sin(f.x * 0.065 * dir);
      const lift = Math.abs(Math.cos(f.x * 0.065 * dir));
      pose.hipDrop = 4 + lift * 4;
      pose.torsoLean = dir > 0 ? 0.2 : -0.05;
      pose.frontHip = 0.05 + stride * 0.5;
      pose.frontKnee = -0.15 - Math.max(0, -stride) * 0.55;
      pose.backHip = -0.05 - stride * 0.5;
      pose.backKnee = -0.15 - Math.max(0, stride) * 0.55;
      pose.frontShoulder = 0.55 - stride * 0.32;
      pose.backShoulder = 0.75 + stride * 0.32;
      break;
    }

    case 'dash_fwd': {
      pose.torsoLean = 0.52;
      pose.hipDrop = 16;
      pose.frontShoulder = 0.9;
      pose.backShoulder = -0.85;
      pose.frontHip = 0.95;
      pose.frontKnee = -0.85;
      pose.backHip = -0.75;
      pose.weaponGlow = 0.9;
      break;
    }

    case 'dash_back': {
      pose.torsoLean = -0.25;
      pose.hipDrop = 14;
      pose.frontShoulder = 1.0;
      pose.backShoulder = -0.5;
      pose.frontHip = 0.75;
      pose.backHip = -0.65;
      pose.weaponGlow = 0.75;
      break;
    }

    case 'jump':
    case 'double_jump': {
      const rising = f.vy < 0;
      pose.scaleX = rising ? 0.92 : 1.06;
      pose.scaleY = rising ? 1.08 : 0.94;
      pose.torsoLean = f.action === 'double_jump' ? 0.35 : rising ? 0.14 : 0.22;
      pose.frontHip = 1.05;
      pose.frontKnee = -1.35;
      pose.backHip = 0.15;
      pose.backKnee = -1.15;
      pose.frontShoulder = f.action === 'double_jump' ? 2.1 : 1.2;
      pose.frontElbow = 0.85;
      pose.backShoulder = -0.45;
      pose.backElbow = 1.1;
      if (f.action === 'double_jump') pose.weaponGlow = 0.9;
      break;
    }

    case 'landing': {
      pose.hipDrop = 22;
      pose.torsoLean = 0.24;
      pose.scaleX = 1.08;
      pose.scaleY = 0.92;
      pose.frontHip = 0.75;
      pose.frontKnee = -1.1;
      pose.backHip = -0.2;
      pose.backKnee = -0.9;
      break;
    }

    case 'air_recovery': {
      const flip = Math.sin(t * 0.45);
      pose.torsoLean = -0.2 + flip * 0.35;
      pose.frontShoulder = 1.1;
      pose.backShoulder = -0.7;
      pose.frontHip = 0.95;
      pose.frontKnee = -1.2;
      pose.weaponGlow = 0.8;
      break;
    }

    case 'crouch':
    case 'crouch_walk': {
      const crawl = f.action === 'crouch_walk' ? Math.sin(f.x * 0.1) * 0.25 : 0;
      pose.hipDrop = 54;
      pose.torsoLean = 0.26;
      pose.frontHip = 1.15 + crawl;
      pose.frontKnee = -1.65;
      pose.backHip = 0.35 - crawl;
      pose.backKnee = -1.45;
      pose.frontShoulder = 0.55;
      pose.frontElbow = 1.3;
      pose.backShoulder = 0.9;
      pose.backElbow = 1.35;
      break;
    }

    case 'block': {
      pose.hipDrop = f.crouching ? 48 : 10;
      pose.torsoLean = -0.06;
      pose.frontShoulder = 1.05;
      pose.frontElbow = 1.45;
      pose.backShoulder = 0.85;
      pose.backElbow = 1.45;
      pose.shieldActive = true;
      pose.perfectShield = f.blockFrames > 0 && f.blockFrames <= 5;
      pose.weaponGlow = pose.perfectShield ? 1.4 : 0.9;
      break;
    }

    case 'guard_break': {
      pose.torsoLean = -0.42;
      pose.headTilt = -0.35;
      pose.hipDrop = 14;
      pose.frontShoulder = -0.75;
      pose.backShoulder = -0.95;
      break;
    }

    case 'charge': {
      const pulse = Math.sin(timeSec * 14) * 0.5 + 0.5;
      pose.hipDrop = 7 + pulse * 3;
      pose.torsoLean = -0.04;
      pose.headTilt = -0.05;
      pose.frontShoulder = 0.16;
      pose.frontElbow = -2.05;
      pose.backShoulder = -0.16;
      pose.backElbow = 2.05;
      pose.frontHip = 0.28;
      pose.frontKnee = -0.25;
      pose.backHip = -0.34;
      pose.backKnee = -0.15;
      pose.weaponGlow = 1.05 + pulse * 0.45;
      break;
    }

    case 'light':
    case 'medium':
    case 'heavy':
    case 'special':
    case 'ultimate': {
      computeAttackPose(pose, f, f.currentMove, t);
      break;
    }

    case 'hitstun': {
      pose.torsoLean = -0.38;
      pose.headTilt = -0.32;
      pose.hipDrop = 10;
      pose.frontShoulder = 0.25;
      pose.backShoulder = -0.75;
      pose.frontHip = 0.25;
      break;
    }

    case 'knockdown': {
      // Rest cleanly on the arena floor plane (hipY = -20) with legs lying horizontally forward
      pose.hipDrop = 54;
      pose.torsoLean = -1.46;
      pose.frontHip = 1.46;
      pose.frontKnee = -0.16;
      pose.backHip = 1.38;
      pose.backKnee = -0.22;
      pose.frontShoulder = -0.85;
      pose.backShoulder = -1.25;
      break;
    }

    case 'stunned': {
      const sway = Math.sin(timeSec * 9) * 0.18;
      pose.torsoLean = sway;
      pose.headTilt = -0.25 + sway;
      pose.hipDrop = 18;
      pose.frontShoulder = 0.2 + sway;
      pose.backShoulder = 0.5 - sway;
      break;
    }

    case 'victory': {
      pose.torsoLean = -0.06;
      pose.frontShoulder = 2.65;
      pose.frontElbow = 0.25;
      pose.backShoulder = -0.35;
      pose.weaponGlow = 1.1;
      break;
    }

    case 'defeat': {
      const p = Math.min(1, t / 20);
      pose.hipDrop = lerp(12, 54, p);
      pose.torsoLean = lerp(-0.3, -1.46, p);
      pose.frontHip = lerp(0.35, 1.46, p);
      pose.frontKnee = lerp(-0.35, -0.16, p);
      pose.backHip = lerp(-0.2, 1.38, p);
      pose.backKnee = lerp(-0.2, -0.22, p);
      pose.frontShoulder = lerp(0.3, -0.85, p);
      pose.backShoulder = lerp(-0.2, -1.25, p);
      break;
    }
  }

  return pose;
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  angle: number,
  len1: number,
  len2: number,
  elbowBend: number,
  w1: number,
  w2: number,
  color1: string,
  color2: string,
  accent: string
): { endX: number; endY: number; angle2: number } {
  const jx = x1 + Math.sin(angle) * len1;
  const jy = y1 + Math.cos(angle) * len1;
  const a2 = angle + elbowBend;
  const ex = jx + Math.sin(a2) * len2;
  const ey = jy + Math.cos(a2) * len2;

  ctx.lineCap = 'round';

  ctx.strokeStyle = '#04060A';
  ctx.lineWidth = w1 + 5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.stroke();

  ctx.lineWidth = w2 + 5;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.strokeStyle = color1;
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.stroke();

  ctx.strokeStyle = color2;
  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(lerp(jx, ex, 0.72), lerp(jy, ey, 0.72));
  ctx.stroke();

  return { endX: ex, endY: ey, angle2: a2 };
}

function drawSupremeWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponType,
  handX: number,
  handY: number,
  armAngle: number,
  weaponColor: string,
  accentColor: string,
  glowIntensity: number
): void {
  if (weapon === 'fists') return;

  ctx.save();
  ctx.translate(handX, handY);
  // Arm vector in drawLimb is (sin(armAngle), cos(armAngle)). Rotate so +X points along forearm!
  ctx.rotate(Math.PI / 2 - armAngle);

  if (glowIntensity > 0.7) {
    ctx.shadowColor = weaponColor;
    ctx.shadowBlur = 10;
  }

  switch (weapon) {
    case 'sword': {
      // Hilt
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-10, -3, 18, 6);
      ctx.fillStyle = accentColor;
      ctx.fillRect(6, -10, 4, 20);
      // Neon Blade
      ctx.fillStyle = '#0B1220';
      ctx.beginPath();
      ctx.moveTo(10, -5);
      ctx.lineTo(64, -3);
      ctx.lineTo(74, 0);
      ctx.lineTo(64, 4);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -1.2, 50, 2.4);
      break;
    }
    case 'axe': {
      // Long shaft
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-14, -3, 66, 6);
      // Heavy double-bitted neon head
      ctx.fillStyle = '#0B1220';
      ctx.beginPath();
      ctx.moveTo(32, -3);
      ctx.lineTo(54, -22);
      ctx.quadraticCurveTo(64, 0, 54, 22);
      ctx.lineTo(32, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.fillRect(42, -16, 4, 32);
      break;
    }
    case 'spear': {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-26, -2.5, 86, 5);
      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.moveTo(58, -8);
      ctx.lineTo(86, 0);
      ctx.lineTo(58, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.fillRect(50, -6, 5, 12);
      break;
    }
    case 'hammer': {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-14, -3.5, 62, 7);
      ctx.fillStyle = '#0B1220';
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(38, -21, 24, 42, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.fillRect(44, -17, 12, 34);
      break;
    }
    case 'scythe': {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-22, -2.5, 78, 5);
      ctx.fillStyle = '#090D16';
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(52, -2);
      ctx.quadraticCurveTo(78, -22, 42, -44);
      ctx.quadraticCurveTo(60, -18, 44, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'daggers': {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-6, -2.5, 14, 5);
      ctx.fillStyle = weaponColor;
      ctx.beginPath();
      ctx.moveTo(8, -4.5);
      ctx.lineTo(40, 0);
      ctx.lineTo(8, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }
    case 'staff': {
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-42, -3.5, 96, 7, 3.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.fillRect(-42, -4.5, 10, 9);
      ctx.fillRect(44, -4.5, 10, 9);
      break;
    }
  }

  ctx.restore();
}

function drawBackGear(
  ctx: CanvasRenderingContext2D,
  style: BackGearStyle,
  fighterId: FighterState['id'],
  shoulderX: number,
  shoulderY: number,
  primary: string,
  secondary: string,
  timeSec: number,
  fighterX: number
): void {
  if (style === 'none') return;
  const wave = Math.sin(timeSec * 7 + fighterX * 0.04) * 12;

  ctx.save();
  if (style === 'cyber_wings') {
    ctx.strokeStyle = primary;
    ctx.fillStyle = `${primary}33`;
    ctx.lineWidth = 2.5;
    for (let w = 0; w < 2; w++) {
      const flap = Math.sin(timeSec * 5 + w) * 6;
      ctx.beginPath();
      ctx.moveTo(shoulderX - 8, shoulderY + 10);
      ctx.lineTo(shoulderX - 58 - w * 10, shoulderY - 22 + w * 24 + flap);
      ctx.lineTo(shoulderX - 38, shoulderY + 18 + w * 14 + flap);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (style === 'cape') {
    ctx.fillStyle = secondary;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 6, shoulderY + 6);
    ctx.quadraticCurveTo(shoulderX - 42, shoulderY + 34 + wave * 0.5, shoulderX - 54, shoulderY + 84 + wave * 0.4);
    ctx.lineTo(shoulderX - 18, shoulderY + 76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'flame_aura') {
    for (let i = 0; i < 4; i++) {
      const fOff = Math.sin(timeSec * 12 + i * 1.7) * 8;
      ctx.strokeStyle = i % 2 === 0 ? primary : secondary;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(shoulderX - 10, shoulderY + 26 - i * 12);
      ctx.quadraticCurveTo(shoulderX - 34 + fOff, shoulderY + 12 - i * 14, shoulderX - 48, shoulderY - 12 - i * 8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 'default' or 'double_sash'
  ctx.strokeStyle = primary;
  ctx.lineWidth = fighterId === 'kael' || fighterId === 'zane' ? 7 : 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(shoulderX - 6, shoulderY + 12);
  ctx.quadraticCurveTo(shoulderX - 36, shoulderY + 26 + wave, shoulderX - 58, shoulderY + 42 - wave * 0.5);
  ctx.stroke();

  if (style === 'double_sash' || fighterId === 'vexa' || fighterId === 'nyx') {
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 6, shoulderY + 16);
    ctx.quadraticCurveTo(shoulderX - 30, shoulderY + 36 - wave, shoulderX - 52, shoulderY + 54 + wave * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeadAndFace(
  ctx: CanvasRenderingContext2D,
  fighterId: FighterState['id'],
  headgear: HeadgearStyle,
  eyeStyle: EyeStyle,
  flashing: boolean,
  skinColor: string,
  primary: string,
  secondary: string,
  timeSec: number
): void {
  // Neck & base head
  ctx.fillStyle = skinColor;
  ctx.fillRect(-5, -2, 10, 14);
  ctx.beginPath();
  ctx.arc(0, -10, 14, 0, Math.PI * 2);
  ctx.fill();

  const hairDark = flashing ? '#FFFFFF' : '#0B0E17';

  // Headgear
  if (headgear === 'default') {
    if (fighterId === 'kael') {
      ctx.fillStyle = hairDark;
      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.lineTo(-18, -24);
      ctx.lineTo(-6, -20);
      ctx.lineTo(2, -29);
      ctx.lineTo(10, -21);
      ctx.lineTo(18, -24);
      ctx.lineTo(13, -10);
      ctx.closePath();
      ctx.fill();
    } else if (fighterId === 'vexa') {
      ctx.fillStyle = flashing ? '#FFFFFF' : '#120D1F';
      ctx.beginPath();
      ctx.arc(-1, -13, 14.5, Math.PI * 0.85, Math.PI * 2.1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-11, -18);
      ctx.quadraticCurveTo(-28, -24, -34, -4);
      ctx.quadraticCurveTo(-22, -8, -11, -12);
      ctx.fill();
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, -16);
      ctx.quadraticCurveTo(-25, -20, -31, -6);
      ctx.stroke();
    } else if (fighterId === 'zane') {
      // Heavy armored helm + crimson crest
      ctx.fillStyle = flashing ? '#FFFFFF' : '#1F2937';
      ctx.beginPath();
      ctx.arc(0, -12, 15.5, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(-8, -24);
      ctx.lineTo(2, -33);
      ctx.lineTo(11, -24);
      ctx.closePath();
      ctx.fill();
    } else {
      // Nyx ninja hood + trailing cryo scarf tail
      ctx.fillStyle = flashing ? '#FFFFFF' : '#0B1718';
      ctx.beginPath();
      ctx.arc(0, -11, 15, Math.PI * 0.72, Math.PI * 2.25);
      ctx.fill();
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3;
      const tailWave = Math.sin(timeSec * 8) * 5;
      ctx.beginPath();
      ctx.moveTo(-12, -16);
      ctx.quadraticCurveTo(-26, -18 + tailWave, -36, -9);
      ctx.stroke();
    }
  } else if (headgear === 'spikes') {
    ctx.fillStyle = hairDark;
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-19, -26);
    ctx.lineTo(-6, -21);
    ctx.lineTo(2, -32);
    ctx.lineTo(10, -22);
    ctx.lineTo(19, -26);
    ctx.lineTo(13, -10);
    ctx.closePath();
    ctx.fill();
  } else if (headgear === 'headband') {
    ctx.fillStyle = primary;
    ctx.fillRect(-15, -20, 30, 6);
    const tail = Math.sin(timeSec * 8) * 4;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -17);
    ctx.lineTo(-32, -12 + tail);
    ctx.stroke();
  } else if (headgear === 'cyber_helm') {
    ctx.fillStyle = flashing ? '#FFFFFF' : '#1E293B';
    ctx.beginPath();
    ctx.arc(0, -11, 16, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = secondary;
    ctx.fillRect(-3, -29, 6, 8);
  } else if (headgear === 'hood') {
    ctx.fillStyle = flashing ? '#FFFFFF' : '#111827';
    ctx.beginPath();
    ctx.arc(-1, -11, 16.5, Math.PI * 0.68, Math.PI * 2.15);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (headgear === 'crown') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(-13, -20);
    ctx.lineTo(-11, -33);
    ctx.lineTo(-4, -24);
    ctx.lineTo(0, -35);
    ctx.lineTo(5, -24);
    ctx.lineTo(12, -33);
    ctx.lineTo(13, -20);
    ctx.closePath();
    ctx.fill();
  } else if (headgear === 'oni_horns') {
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(-6, -21);
    ctx.quadraticCurveTo(-14, -36, -4, -38);
    ctx.quadraticCurveTo(-2, -28, 0, -21);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -21);
    ctx.quadraticCurveTo(14, -36, 17, -34);
    ctx.quadraticCurveTo(12, -26, 9, -20);
    ctx.fill();
  }

  // Face / Eyes
  if (eyeStyle === 'default') {
    ctx.fillStyle = fighterId === 'kael' ? primary : secondary;
    ctx.fillRect(4, -13, 9, 4);
  } else if (eyeStyle === 'visor') {
    ctx.fillStyle = primary;
    ctx.fillRect(1, -15, 14, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, -13, 7, 2);
  } else if (eyeStyle === 'glowing_eyes') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(4, -12, 2.5, 0, Math.PI * 2);
    ctx.arc(10, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (eyeStyle === 'mask') {
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.arc(1, -6, 12, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = primary;
    ctx.fillRect(4, -14, 8, 3.5);
  } else if (eyeStyle === 'cyclops') {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(-1, -16, 15, 8);
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(8, -12, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: FighterState,
  timeSec: number,
  highQuality: boolean,
  appearance?: FighterAppearance
): void {
  const profile = FIGHTER_PROFILES[fighter.id];
  const custom = appearance ?? DEFAULT_FIGHTER_APPEARANCE;

  // 0. Dash / Phantom Step Afterimage Ghosts
  if (fighter.afterimages.length > 0) {
    for (const ghost of fighter.afterimages) {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.scale(ghost.facing, 1);
      ctx.globalAlpha = ghost.alpha * 0.42;
      ctx.fillStyle = custom.primaryColor !== 'default' ? custom.primaryColor : profile.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-22, -148, 44, 146, 14);
      ctx.fill();
      ctx.restore();
    }
  }

  const pose = computePose(fighter, timeSec);
  const bodyScale = profile.bodyBuild === 'heavy' ? 1.08 : 1.0;

  // 1. Ground 2.5D Shadow
  const heightAboveFloor = Math.max(0, FLOOR_Y - fighter.y);
  const shadowScale = Math.max(0.45, 1 - heightAboveFloor / 340);
  ctx.save();
  ctx.translate(fighter.x, FLOOR_Y + 4);
  ctx.scale(shadowScale, shadowScale * 0.28);
  const shadowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 62);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  shadowGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.38)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Character Body Transform
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(fighter.facing * pose.scaleX * bodyScale, pose.scaleY * bodyScale);

  const flashing = fighter.hitFlashFrames > 0;
  const basePrimary = custom.primaryColor !== 'default' ? custom.primaryColor : profile.primaryColor;
  const baseSecondary = custom.secondaryColor !== 'default' ? custom.secondaryColor : profile.secondaryColor;
  const baseSuit = custom.suitColor !== 'default' ? custom.suitColor : '#1A2236';
  const baseSkin =
    custom.skinColor !== 'default'
      ? custom.skinColor
      : fighter.id === 'kael'
      ? '#E8B89A'
      : fighter.id === 'zane'
      ? '#DDA888'
      : '#F2CBB8';
  const baseWeaponCol = custom.weaponColor !== 'default' ? custom.weaponColor : basePrimary;

  const suitDark = flashing ? '#E2F1FF' : baseSuit;
  const suitMid = flashing ? '#FFFFFF' : custom.suitColor !== 'default' ? baseSuit : '#28334F';
  const skinColor = flashing ? '#FFFFFF' : baseSkin;
  const primary = flashing ? '#FFFFFF' : basePrimary;
  const secondary = flashing ? '#E0F7FF' : baseSecondary;
  const weaponColor = flashing ? '#FFFFFF' : baseWeaponCol;

  // Vexa / Nyx / Zane Special & Ultimate Arena Aura Effects
  if ((fighter.action === 'special' || fighter.action === 'ultimate') && fighter.actionFrame >= 6) {
    const isUlt = fighter.action === 'ultimate';
    if (fighter.id === 'vexa' || fighter.id === 'nyx') {
      ctx.save();
      const rings = isUlt ? 5 : 3;
      for (let r = 0; r < rings; r++) {
        const spinAngle = timeSec * 18 + r * 2.1;
        ctx.strokeStyle = r % 2 === 0 ? primary : secondary;
        ctx.lineWidth = (isUlt ? 6 : 4) - r * 0.7;
        ctx.globalAlpha = 0.85 - r * 0.14;
        ctx.beginPath();
        ctx.ellipse(
          18,
          -88 + r * 14,
          (isUlt ? 128 : 72) - r * 10,
          isUlt ? 42 : 26,
          Math.sin(spinAngle) * 0.28,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      ctx.restore();
    } else if (fighter.id === 'zane') {
      ctx.save();
      ctx.strokeStyle = primary;
      ctx.fillStyle = `${primary}33`;
      ctx.lineWidth = isUlt ? 5 : 3;
      ctx.beginPath();
      ctx.ellipse(42, -6, isUlt ? 148 : 96, isUlt ? 24 : 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Kael Solar Burst Ultimate Nova Beam
  if (
    fighter.id === 'kael' &&
    fighter.currentMove === 'ultimate_solar_burst' &&
    fighter.actionFrame >= 14 &&
    fighter.actionFrame <= 28
  ) {
    ctx.save();
    const beamGrad = ctx.createLinearGradient(34, -106, 280, -106);
    beamGrad.addColorStop(0, '#FFFFFF');
    beamGrad.addColorStop(0.35, primary);
    beamGrad.addColorStop(0.8, secondary);
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.ellipse(155, -106, 130, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const hipX = 0;
  const hipY = -74 + pose.hipDrop;

  if (fighter.action === 'charge') {
    ctx.save();
    const pulse = 0.65 + Math.sin(timeSec * 15) * 0.35;
    const pillarGrad = ctx.createLinearGradient(0, -175, 0, 8);
    pillarGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    pillarGrad.addColorStop(0.55, `${primary}44`);
    pillarGrad.addColorStop(1, `rgba(245, 183, 0, ${0.32 * pulse})`);
    ctx.fillStyle = pillarGrad;
    ctx.beginPath();
    ctx.ellipse(0, -82, 46 + pulse * 10, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#F5B700';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.75 * pulse;
    ctx.beginPath();
    ctx.ellipse(0, -4, 48 + pulse * 12, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (highQuality) {
    ctx.save();
    const auraGrad = ctx.createRadialGradient(0, -90 + pose.hipDrop, 6, 0, -90 + pose.hipDrop, 86);
    auraGrad.addColorStop(0, `${primary}2E`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -90 + pose.hipDrop, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Back Leg
  const limbW = profile.bodyBuild === 'heavy' ? 3 : 0;
  const backFoot = drawLimb(
    ctx,
    hipX - 10,
    hipY,
    pose.backHip,
    38,
    38,
    pose.backKnee,
    17 + limbW,
    13 + limbW,
    suitDark,
    suitMid,
    secondary
  );
  ctx.fillStyle = flashing ? '#FFFFFF' : '#090C12';
  ctx.beginPath();
  ctx.ellipse(backFoot.endX + 4, backFoot.endY + 3, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back Arm
  const shoulderX = hipX + Math.sin(pose.torsoLean) * 52;
  const shoulderY = hipY - Math.cos(pose.torsoLean) * 52;

  const backHand = drawLimb(
    ctx,
    shoulderX - 8,
    shoulderY + 6,
    pose.backShoulder,
    30,
    28,
    pose.backElbow,
    13 + limbW,
    11 + limbW,
    suitDark,
    fighter.id === 'vexa' ? skinColor : suitMid,
    primary
  );
  ctx.fillStyle = fighter.id === 'kael' ? secondary : primary;
  ctx.beginPath();
  ctx.arc(backHand.endX, backHand.endY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Dual Daggers off-hand weapon
  if (custom.weapon === 'daggers') {
    drawSupremeWeapon(
      ctx,
      'daggers',
      backHand.endX,
      backHand.endY,
      backHand.angle2,
      weaponColor,
      secondary,
      pose.weaponGlow
    );
  }

  // Flowing Back Gear / Wings / Cape / Sash
  drawBackGear(
    ctx,
    custom.backGear,
    fighter.id,
    shoulderX,
    shoulderY,
    primary,
    secondary,
    timeSec,
    fighter.x
  );

  // Torso
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.torsoLean);

  const torsoW = profile.bodyBuild === 'heavy' ? 27 : 22;
  ctx.fillStyle = flashing ? '#FFFFFF' : '#05070B';
  ctx.beginPath();
  ctx.moveTo(-(torsoW - 4), 4);
  ctx.lineTo(-(torsoW + 2), -56);
  ctx.lineTo(torsoW + 2, -56);
  ctx.lineTo(torsoW - 6, 4);
  ctx.closePath();
  ctx.fill();

  if (flashing) {
    ctx.fillStyle = '#FFFFFF';
  } else {
    const torsoGrad = ctx.createLinearGradient(-torsoW, -54, torsoW, 0);
    torsoGrad.addColorStop(0, suitMid);
    torsoGrad.addColorStop(1, '#0F1522');
    ctx.fillStyle = torsoGrad;
  }
  ctx.beginPath();
  ctx.moveTo(-(torsoW - 7), 2);
  ctx.lineTo(-(torsoW - 1), -53);
  ctx.lineTo(torsoW - 1, -53);
  ctx.lineTo(torsoW - 8, 2);
  ctx.closePath();
  ctx.fill();

  if (fighter.id === 'kael') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(-18, -50);
    ctx.lineTo(-6, -34);
    ctx.lineTo(14, -50);
    ctx.lineTo(18, -42);
    ctx.lineTo(-6, -24);
    ctx.lineTo(-20, -42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(3, -36, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (fighter.id === 'zane') {
    // Heavy Titanium Shoulder Pauldron & Reactor Core
    ctx.fillStyle = secondary;
    ctx.fillRect(-24, -53, 48, 12);
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.roundRect(-8, -38, 18, 14, 3);
    ctx.fill();
  } else if (fighter.id === 'nyx') {
    // Cryo Diagonal Belt + Diamond Core
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-17, -48);
    ctx.lineTo(15, -14);
    ctx.stroke();
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(2, -40);
    ctx.lineTo(8, -32);
    ctx.lineTo(2, -24);
    ctx.lineTo(-4, -32);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-15, -48);
    ctx.lineTo(2, -26);
    ctx.lineTo(17, -48);
    ctx.stroke();

    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.arc(2, -30, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head & Face
  ctx.save();
  ctx.translate(2, -67);
  ctx.rotate(pose.headTilt);
  drawHeadAndFace(
    ctx,
    fighter.id,
    custom.headgear,
    custom.eyeStyle,
    flashing,
    skinColor,
    primary,
    secondary,
    timeSec
  );
  ctx.restore();
  ctx.restore();

  // Front Leg
  const frontFoot = drawLimb(
    ctx,
    hipX + 8,
    hipY + 2,
    pose.frontHip,
    39,
    39,
    pose.frontKnee,
    18 + limbW,
    14 + limbW,
    suitMid,
    flashing ? '#FFFFFF' : custom.suitColor !== 'default' ? suitMid : '#313E5E',
    primary
  );
  ctx.fillStyle = flashing ? '#FFFFFF' : '#0A0D14';
  ctx.beginPath();
  ctx.ellipse(frontFoot.endX + 5, frontFoot.endY + 3, 15, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = primary;
  ctx.fillRect(frontFoot.endX - 6, frontFoot.endY + 6, 20, 2.5);

  // Front Arm
  const frontHand = drawLimb(
    ctx,
    shoulderX + 6,
    shoulderY + 5,
    pose.frontShoulder,
    31,
    29,
    pose.frontElbow,
    14 + limbW,
    12 + limbW,
    suitMid,
    fighter.id === 'vexa' ? skinColor : flashing ? '#FFFFFF' : custom.suitColor !== 'default' ? suitMid : '#313E5E',
    fighter.id === 'kael' ? secondary : primary
  );

  ctx.fillStyle = fighter.id === 'kael' ? secondary : primary;
  ctx.beginPath();
  ctx.arc(frontHand.endX, frontHand.endY, 9, 0, Math.PI * 2);
  ctx.fill();

  // Supreme Duelist Primary Weapon in Front Hand
  drawSupremeWeapon(
    ctx,
    custom.weapon,
    frontHand.endX,
    frontHand.endY,
    frontHand.angle2,
    weaponColor,
    secondary,
    pose.weaponGlow
  );

  if (highQuality && pose.weaponGlow > 0.5) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, pose.weaponGlow * 0.45);
    ctx.fillStyle = primary;
    const useBackHandGlow =
      fighter.currentMove === 'stand_heavy' ||
      fighter.currentMove === 'energy_breaker' ||
      fighter.currentMove === 'solar_jab_2';
    if (!useBackHandGlow) {
      ctx.beginPath();
      ctx.arc(frontHand.endX, frontHand.endY, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (
      useBackHandGlow ||
      fighter.action === 'ultimate' ||
      fighter.action === 'special'
    ) {
      ctx.beginPath();
      ctx.arc(backHand.endX, backHand.endY, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Distinct Strike Slash Arcs (accented by equipped weapon color if armed)
  if (pose.strikeArc > 0) {
    ctx.save();
    ctx.strokeStyle = custom.weapon !== 'fists' ? weaponColor : fighter.id === 'kael' ? secondary : primary;
    const weaponRadiusBoost = custom.weapon !== 'fists' ? 16 : 0;
    ctx.lineWidth = fighter.action === 'heavy' || fighter.action === 'ultimate' ? 8 : 5;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    if (pose.arcType === 'sweep') {
      ctx.arc(38, -22, 68 + weaponRadiusBoost * 0.5, -0.35, 0.32);
    } else if (pose.arcType === 'uppercut') {
      ctx.arc(32, -118, 66 + weaponRadiusBoost, -1.65, 0.15);
    } else if (pose.arcType === 'kick') {
      ctx.arc(36, -108, 64, -0.9, 0.65);
    } else if (pose.arcType === 'ultimate') {
      ctx.arc(46, -104, 108 + weaponRadiusBoost, -1.0, 1.0);
    } else {
      ctx.arc(32, -106, (fighter.action === 'light' ? 48 : 62) + weaponRadiusBoost, -0.7, 0.75);
    }
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Guard Shield (Brighter cyan/white when Perfect Guard!)
  if (pose.shieldActive) {
    ctx.save();
    ctx.strokeStyle = pose.perfectShield ? '#FFFFFF' : '#00A8FF';
    ctx.fillStyle = pose.perfectShield ? 'rgba(0, 229, 255, 0.34)' : 'rgba(0, 168, 255, 0.16)';
    ctx.lineWidth = pose.perfectShield ? 5 : 3;
    ctx.beginPath();
    ctx.arc(28, fighter.crouching ? -64 : -96, 56, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  // Stunned / Guard Break Orbiting Stars
  if (fighter.action === 'stunned' || fighter.action === 'guard_break') {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const ang = timeSec * 7 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * 28;
      const sy = -168 + Math.sin(ang) * 8;
      ctx.fillStyle = fighter.action === 'guard_break' ? '#EF4444' : '#F5B700';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}
