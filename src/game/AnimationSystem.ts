import { FIGHTER_PROFILES, FLOOR_Y } from './constants';
import { FighterState } from './types';

interface PoseAngles {
  torsoLean: number; // rad
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
  strikeArc: number; // 0..1 during active punch/kick
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
    strikeArc: 0,
  };

  const t = f.actionFrame;
  const breath = Math.sin(timeSec * 4.2 + f.slot) * 0.5 + 0.5;
  const spec =
    f.action === 'light' || f.action === 'heavy' || f.action === 'special'
      ? FIGHTER_PROFILES[f.id].attacks[f.action]
      : null;

  switch (f.action) {
    case 'idle': {
      pose.hipDrop = breath * 5;
      pose.torsoLean = 0.08 + breath * 0.03;
      pose.frontShoulder = 0.45 + breath * 0.08;
      pose.backShoulder = 0.85 - breath * 0.06;
      if (f.id === 'vexa') {
        pose.hipDrop = breath * 7 + 4;
        pose.torsoLean = 0.16;
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

    case 'jump': {
      const rising = f.vy < 0;
      pose.scaleX = rising ? 0.92 : 1.06;
      pose.scaleY = rising ? 1.08 : 0.94;
      pose.torsoLean = rising ? 0.14 : 0.22;
      pose.frontHip = 1.05;
      pose.frontKnee = -1.35;
      pose.backHip = 0.15;
      pose.backKnee = -1.15;
      pose.frontShoulder = 1.2;
      pose.frontElbow = 0.85;
      pose.backShoulder = -0.45;
      pose.backElbow = 1.1;
      break;
    }

    case 'crouch': {
      pose.hipDrop = 54;
      pose.torsoLean = 0.26;
      pose.frontHip = 1.15;
      pose.frontKnee = -1.65;
      pose.backHip = 0.35;
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
      pose.weaponGlow = 0.9;
      break;
    }

    case 'light': {
      if (!spec) break;
      if (t < spec.startup) {
        const p = t / spec.startup;
        pose.torsoLean = lerp(0.08, -0.08, p);
        pose.frontShoulder = lerp(0.45, -0.3, p);
        pose.frontElbow = lerp(1.15, 1.5, p);
      } else if (t < spec.startup + spec.active) {
        pose.torsoLean = 0.28;
        pose.frontShoulder = 1.52;
        pose.frontElbow = 0.05;
        pose.backShoulder = -0.5;
        pose.backElbow = 1.25;
        pose.weaponGlow = 0.95;
        pose.strikeArc = 1;
      } else {
        const p = Math.min(1, (t - spec.startup - spec.active) / spec.recovery);
        pose.torsoLean = lerp(0.28, 0.08, p);
        pose.frontShoulder = lerp(1.52, 0.45, p);
        pose.frontElbow = lerp(0.05, 1.15, p);
      }
      break;
    }

    case 'heavy': {
      if (!spec) break;
      if (t < spec.startup) {
        const p = t / spec.startup;
        pose.torsoLean = lerp(0.08, -0.24, p);
        pose.hipDrop = lerp(0, 12, p);
        pose.backShoulder = lerp(0.85, -1.05, p);
        pose.weaponGlow = 0.65;
      } else if (t < spec.startup + spec.active) {
        if (f.id === 'vexa') {
          // Agile high kick forward (+X)
          pose.torsoLean = -0.22;
          pose.frontHip = 1.52;
          pose.frontKnee = -0.06;
          pose.backHip = -0.35;
          pose.frontShoulder = 0.65;
          pose.backShoulder = -0.55;
          pose.weaponGlow = 1;
          pose.strikeArc = 1;
        } else {
          // Heavy energy hook punch forward (+X)
          pose.torsoLean = 0.4;
          pose.hipDrop = 10;
          pose.backShoulder = 1.55;
          pose.backElbow = 0.06;
          pose.frontShoulder = -0.45;
          pose.weaponGlow = 1;
          pose.strikeArc = 1;
        }
      } else {
        const p = Math.min(1, (t - spec.startup - spec.active) / spec.recovery);
        pose.torsoLean = lerp(0.32, 0.08, p);
        pose.backShoulder = lerp(1.4, 0.85, p);
      }
      break;
    }

    case 'special': {
      if (!spec) break;
      if (t < spec.startup) {
        const p = t / spec.startup;
        pose.hipDrop = lerp(0, 20, p);
        pose.torsoLean = lerp(0.08, -0.28, p);
        pose.frontShoulder = -0.3;
        pose.frontElbow = 1.45;
        pose.backShoulder = -0.45;
        pose.backElbow = 1.45;
        pose.weaponGlow = 1;
      } else if (t < spec.startup + spec.active) {
        if (f.id === 'kael') {
          // Pulso Solar double-palm beam stance aimed forward (+X)
          pose.torsoLean = 0.34;
          pose.hipDrop = 14;
          pose.frontShoulder = 1.54;
          pose.frontElbow = 0.04;
          pose.backShoulder = 1.44;
          pose.backElbow = 0.04;
          pose.weaponGlow = 1.3;
          pose.strikeArc = 1;
        } else {
          // Vórtice Azul spinning spiral dash forward (+X)
          const spin = Math.sin(t * 1.1);
          pose.torsoLean = 0.46;
          pose.hipDrop = 16;
          pose.frontShoulder = 1.45 + 0.35 * spin;
          pose.frontElbow = 0.25;
          pose.backShoulder = -0.9 + 0.4 * spin;
          pose.frontHip = 0.95;
          pose.frontKnee = -0.22;
          pose.weaponGlow = 1.3;
          pose.strikeArc = 1;
        }
      } else {
        const p = Math.min(1, (t - spec.startup - spec.active) / spec.recovery);
        pose.torsoLean = lerp(0.3, 0.08, p);
        pose.hipDrop = lerp(14, 0, p);
      }
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
      const p = Math.min(1, t / 24);
      pose.hipDrop = lerp(12, 118, p);
      pose.torsoLean = lerp(-0.3, -1.42, p);
      pose.frontHip = lerp(0.2, -0.2, p);
      pose.frontKnee = lerp(-0.4, -0.1, p);
      pose.backKnee = -0.1;
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
): { endX: number; endY: number } {
  const jx = x1 + Math.sin(angle) * len1;
  const jy = y1 + Math.cos(angle) * len1;
  const a2 = angle + elbowBend;
  const ex = jx + Math.sin(a2) * len2;
  const ey = jy + Math.cos(a2) * len2;

  ctx.lineCap = 'round';

  // Outer silhouette shadow for 2.5D depth
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

  // Inner upper segment
  ctx.strokeStyle = color1;
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.stroke();

  // Inner lower segment
  ctx.strokeStyle = color2;
  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Subtle rim highlight / armor band
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(lerp(jx, ex, 0.72), lerp(jy, ey, 0.72));
  ctx.stroke();

  return { endX: ex, endY: ey };
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: FighterState,
  timeSec: number,
  highQuality: boolean
): void {
  const profile = FIGHTER_PROFILES[fighter.id];
  const pose = computePose(fighter, timeSec);
  const isKael = fighter.id === 'kael';

  // 1. Ground 2.5D Shadow (scales & softens with altitude)
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
  ctx.scale(fighter.facing * pose.scaleX, pose.scaleY);

  // Vexa Vórtice Azul energy cyclone aura
  if (fighter.action === 'special' && fighter.id === 'vexa' && fighter.actionFrame >= 6) {
    ctx.save();
    for (let r = 0; r < 3; r++) {
      const spinAngle = timeSec * 18 + r * 2.1;
      ctx.strokeStyle = r % 2 === 0 ? '#A855F7' : '#38BDF8';
      ctx.lineWidth = 4 - r;
      ctx.globalAlpha = 0.78 - r * 0.18;
      ctx.beginPath();
      ctx.ellipse(12, -88 + r * 14, 72 - r * 10, 26, Math.sin(spinAngle) * 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Pelvis anchor
  const hipX = 0;
  const hipY = -74 + pose.hipDrop;

  // Colors (flash bright white-cyan directly on fighter limbs & torso on hit impact)
  const flashing = fighter.hitFlashFrames > 0;
  const suitDark = flashing ? '#E2F1FF' : '#1A2236';
  const suitMid = flashing ? '#FFFFFF' : '#28334F';
  const skinColor = flashing ? '#FFFFFF' : isKael ? '#E8B89A' : '#F2CBB8';
  const primary = flashing ? '#FFFFFF' : profile.primaryColor;
  const secondary = flashing ? '#E0F7FF' : profile.secondaryColor;

  // Soft radial backlight behind fighter (no hard oval edge)
  if (highQuality) {
    ctx.save();
    const auraGrad = ctx.createRadialGradient(0, -90 + pose.hipDrop, 6, 0, -90 + pose.hipDrop, 86);
    auraGrad.addColorStop(0, isKael ? 'rgba(0, 229, 255, 0.16)' : 'rgba(168, 85, 247, 0.18)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -90 + pose.hipDrop, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Back Leg
  const backFoot = drawLimb(
    ctx,
    hipX - 10,
    hipY,
    pose.backHip,
    38,
    38,
    pose.backKnee,
    17,
    13,
    suitDark,
    suitMid,
    secondary
  );
  // Back Boot
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
    13,
    11,
    suitDark,
    isKael ? suitMid : skinColor,
    primary
  );
  // Back Gauntlet
  ctx.fillStyle = isKael ? secondary : primary;
  ctx.beginPath();
  ctx.arc(backHand.endX, backHand.endY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Flowing Energy Sash / Ribbons (secondary motion)
  const wave = Math.sin(timeSec * 7 + fighter.x * 0.04) * 12;
  ctx.save();
  ctx.strokeStyle = primary;
  ctx.lineWidth = isKael ? 7 : 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(shoulderX - 6, shoulderY + 12);
  ctx.quadraticCurveTo(shoulderX - 36, shoulderY + 26 + wave, shoulderX - 58, shoulderY + 42 - wave * 0.5);
  ctx.stroke();
  if (!isKael) {
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 6, shoulderY + 16);
    ctx.quadraticCurveTo(shoulderX - 30, shoulderY + 36 - wave, shoulderX - 52, shoulderY + 54 + wave * 0.4);
    ctx.stroke();
  }
  ctx.restore();

  // Torso (2.5D layered chest armor + glowing core)
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.torsoLean);

  // Outer torso silhouette
  ctx.fillStyle = flashing ? '#FFFFFF' : '#05070B';
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.lineTo(-24, -56);
  ctx.lineTo(24, -56);
  ctx.lineTo(16, 4);
  ctx.closePath();
  ctx.fill();

  // Inner suit torso
  if (flashing) {
    ctx.fillStyle = '#FFFFFF';
  } else {
    const torsoGrad = ctx.createLinearGradient(-20, -54, 20, 0);
    torsoGrad.addColorStop(0, '#2A354F');
    torsoGrad.addColorStop(1, '#0F1522');
    ctx.fillStyle = torsoGrad;
  }
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.lineTo(-21, -53);
  ctx.lineTo(21, -53);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fill();

  // Character-distinct chest armor & trim
  if (isKael) {
    // Gold & Cyan Core Plate
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

    // Glowing Cyan Chest Reactor
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(3, -36, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Vexa Violet & Electric Blue V-harness
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

  // Head & Hair / Visor
  ctx.save();
  ctx.translate(2, -67);
  ctx.rotate(pose.headTilt);

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(-5, -2, 10, 14);

  // Head silhouette
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -10, 14, 0, Math.PI * 2);
  ctx.fill();

  if (isKael) {
    // Spiky dark hair + cyan energy headband/visor
    ctx.fillStyle = flashing ? '#FFFFFF' : '#0B0E17';
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

    // Glowing Cyan Eye/Visor
    ctx.fillStyle = primary;
    ctx.fillRect(4, -13, 9, 4);
  } else {
    // Sleek cyber-ponytail + violet eye mark
    ctx.fillStyle = flashing ? '#FFFFFF' : '#120D1F';
    ctx.beginPath();
    ctx.arc(-1, -13, 14.5, Math.PI * 0.85, Math.PI * 2.1);
    ctx.fill();
    // High ponytail
    ctx.beginPath();
    ctx.moveTo(-11, -18);
    ctx.quadraticCurveTo(-28, -24, -34, -4);
    ctx.quadraticCurveTo(-22, -8, -11, -12);
    ctx.fill();
    // Violet glow stripe
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.quadraticCurveTo(-25, -20, -31, -6);
    ctx.stroke();

    ctx.fillStyle = secondary;
    ctx.fillRect(4, -13, 8, 3.5);
  }
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
    18,
    14,
    suitMid,
    flashing ? '#FFFFFF' : '#313E5E',
    primary
  );
  // Front Boot with energy sole
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
    14,
    12,
    suitMid,
    isKael ? (flashing ? '#FFFFFF' : '#313E5E') : skinColor,
    isKael ? secondary : primary
  );

  // Front Gauntlet + Energy Aura
  ctx.fillStyle = isKael ? secondary : primary;
  ctx.beginPath();
  ctx.arc(frontHand.endX, frontHand.endY, 9, 0, Math.PI * 2);
  ctx.fill();

  if (highQuality && pose.weaponGlow > 0.5) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, pose.weaponGlow * 0.45);
    ctx.fillStyle = primary;
    const glowOnBackHand = isKael && (fighter.action === 'heavy' || fighter.action === 'special');
    if (!(isKael && fighter.action === 'heavy')) {
      ctx.beginPath();
      ctx.arc(frontHand.endX, frontHand.endY, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (glowOnBackHand) {
      ctx.beginPath();
      ctx.arc(backHand.endX, backHand.endY, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Strike Slash Arc Effect on active attacks
  if (pose.strikeArc > 0) {
    ctx.save();
    ctx.strokeStyle = isKael ? secondary : primary;
    ctx.lineWidth = fighter.action === 'heavy' ? 8 : 5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    if (fighter.action === 'heavy' && !isKael) {
      ctx.arc(36, -108, 62, -0.9, 0.65);
    } else {
      ctx.arc(32, -106, fighter.action === 'light' ? 48 : 66, -0.7, 0.75);
    }
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Shield Hex Barrier on Block
  if (pose.shieldActive) {
    ctx.save();
    ctx.strokeStyle = '#00A8FF';
    ctx.fillStyle = 'rgba(0, 168, 255, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(28, -96, 56, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  // Stunned Orbiting Rings
  if (fighter.action === 'stunned') {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const ang = timeSec * 7 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * 28;
      const sy = -168 + Math.sin(ang) * 8;
      ctx.fillStyle = '#F5B700';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}
