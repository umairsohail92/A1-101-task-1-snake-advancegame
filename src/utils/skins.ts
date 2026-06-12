/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WormSkin } from '../types';

export const INITIAL_SKINS: WormSkin[] = [
  {
    id: 'basic_orange',
    name: 'Glutton Orange',
    type: 'solid',
    colors: ['#f97316'],
    eyeStyle: 'cute',
    mouthStyle: 'smile',
    unlocked: true,
    cost: 0,
  },
  {
    id: 'neon_candy',
    name: 'Neon Stripes',
    type: 'stripes',
    colors: ['#ec4899', '#3b82f6'],
    eyeStyle: 'cool',
    mouthStyle: 'smile',
    unlocked: true,
    cost: 0,
  },
  {
    id: 'zebra',
    name: 'Zebra Venom',
    type: 'stripes',
    colors: ['#0f172a', '#f8fafc'],
    eyeStyle: 'angry',
    mouthStyle: 'neutral',
    unlocked: false,
    cost: 150,
  },
  {
    id: 'checkerboard',
    name: 'Grand Prix Checker',
    type: 'checker',
    colors: ['#ef4444', '#f8fafc'],
    eyeStyle: 'cool',
    mouthStyle: 'tongue',
    unlocked: false,
    cost: 300,
  },
  {
    id: 'rainbow_dash',
    name: 'Voracious Rainbow',
    type: 'rainbow',
    colors: ['#ff0000', '#ffd700', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
    eyeStyle: 'funny',
    mouthStyle: 'open',
    unlocked: false,
    cost: 500,
  },
  {
    id: 'toxic_slimy',
    name: 'Toxic Dotted',
    type: 'points',
    colors: ['#22c55e', '#a855f7'],
    eyeStyle: 'angry',
    mouthStyle: 'neutral',
    unlocked: false,
    cost: 250,
  },
  {
    id: 'bumblebee',
    name: 'Busy Bee',
    type: 'stripes',
    colors: ['#eab308', '#18181b'],
    eyeStyle: 'cute',
    mouthStyle: 'smile',
    unlocked: false,
    cost: 200,
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold Star',
    type: 'points',
    colors: ['#d97706', '#fef08a'],
    eyeStyle: 'goggle',
    mouthStyle: 'smile',
    unlocked: false,
    cost: 1000,
  }
];

export const EYE_STYLES: { id: WormSkin['eyeStyle']; name: string }[] = [
  { id: 'cute', name: 'Cute Anime' },
  { id: 'cool', name: 'Cool Shades' },
  { id: 'angry', name: 'Angry Glow' },
  { id: 'goggle', name: 'Goggles' },
  { id: 'funny', name: 'Dolly Goofy' },
];

export const MOUTH_STYLES: { id: WormSkin['mouthStyle']; name: string }[] = [
  { id: 'smile', name: 'Smiling Lip' },
  { id: 'neutral', name: 'Neutral bar' },
  { id: 'open', name: 'Hungry Open' },
  { id: 'tongue', name: 'Yummy Tongue' },
];

/**
 * Draws a skin segment pattern on the Canvas Context
 */
export function drawSegmentPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  skin: WormSkin,
  segmentIdx: number,
  totalSegments: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  const colors = skin.colors;

  switch (skin.type) {
    case 'solid':
      ctx.fillStyle = colors[0];
      ctx.fill();
      break;

    case 'stripes': {
      // Alternate colors along segment index
      const colorIdx = Math.floor(segmentIdx / 3) % colors.length;
      ctx.fillStyle = colors[colorIdx];
      ctx.fill();
      break;
    }

    case 'checker': {
      // Split circle in half or check quadrant
      const colorIdx1 = Math.floor(segmentIdx / 4) % colors.length;
      const colorIdx2 = (colorIdx1 + 1) % colors.length;
      
      ctx.fillStyle = colorIdx1 % 2 === 0 ? colors[0] : colors[1];
      ctx.fill();

      // Add a decorative concentric circle of alternate color
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = colorIdx1 % 2 === 0 ? colors[1] : colors[0];
      ctx.fill();
      break;
    }

    case 'points': {
      // Solid base of color 0, with small circles or dots/bands of color 1
      ctx.fillStyle = colors[0];
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = colors[1] || '#ffffff';
      ctx.fill();
      break;
    }

    case 'rainbow': {
      // Rainbow based on segment relative percentage or index
      const step = (segmentIdx * (360 / Math.max(30, totalSegments))) % 360;
      ctx.fillStyle = `hsl(${step}, 90%, 55%)`;
      ctx.fill();
      break;
    }

    default:
      ctx.fillStyle = '#ff7f00';
      ctx.fill();
  }

  // Draw a subtle overlay gradient shadow or glossy highlighting to give 3D depth to segments!
  // This matches Worms Zone's beautiful glossy 3D ball-like bodies
  const glossyGrad = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    radius * 0.1,
    x,
    y,
    radius
  );
  glossyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  glossyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  glossyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = glossyGrad;
  ctx.fill();

  ctx.restore();

  // Add stroke for individual ball border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * Draws the cute customizable eyes and mouth on top of the head
 */
export function drawWormFace(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  radius: number,
  angle: number,
  skin: WormSkin
) {
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(angle);

  // Draw eyeballs relative to the head looking forward (which is to the right because angle 0 is +X)
  const eyeOffsetRatioX = 0.35;
  const eyeOffsetRatioY = 0.45;
  const eyeRadius = radius * 0.3;

  const leftEyeX = radius * eyeOffsetRatioX;
  const leftEyeY = -radius * eyeOffsetRatioY;

  const rightEyeX = radius * eyeOffsetRatioX;
  const rightEyeY = radius * eyeOffsetRatioY;

  // Render Left & Right Eyes
  [leftEyeY, rightEyeY].forEach((eyeY) => {
    ctx.save();
    ctx.translate(leftEyeX, eyeY);

    if (skin.eyeStyle === 'cute') {
      // White eyeball
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Big black pupil
      ctx.beginPath();
      ctx.arc(eyeRadius * 0.2, 0, eyeRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Shiny catchlight sparkle
      ctx.beginPath();
      ctx.arc(eyeRadius * 0.3, -eyeRadius * 0.2, eyeRadius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (skin.eyeStyle === 'cool') {
      // Cool black sunglasses
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeRadius * 1.3, eyeRadius * 0.8, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Sunglasses glare line
      ctx.beginPath();
      ctx.moveTo(-eyeRadius, -eyeRadius * 0.3);
      ctx.lineTo(eyeRadius, eyeRadius * 0.3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (skin.eyeStyle === 'angry') {
      // Red angry glowing horizontal eye look
      ctx.beginPath();
      ctx.moveTo(-eyeRadius * 1.2, -eyeRadius * 0.2);
      ctx.lineTo(eyeRadius * 1.2, -eyeRadius * 0.8);
      ctx.lineTo(eyeRadius, eyeRadius);
      ctx.lineTo(-eyeRadius, eyeRadius);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vertical pupil
      ctx.beginPath();
      ctx.ellipse(0, eyeRadius * 0.1, eyeRadius * 0.2, eyeRadius * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else if (skin.eyeStyle === 'goggle') {
      // Swimming-goggle styled gold eye frame
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
    } else if (skin.eyeStyle === 'funny') {
      // Goofy googly eyes looking at slightly different angles
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mismatched pupil position
      ctx.beginPath();
      const pullX = eyeY < 0 ? eyeRadius * 0.5 : -eyeRadius * 0.4;
      const pullY = eyeY < 0 ? -eyeRadius * 0.3 : eyeRadius * 0.3;
      ctx.arc(pullX, pullY, eyeRadius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    ctx.restore();
  });

  // Render Mouth
  const mouthX = radius * 0.65;
  const mouthY = 0;
  const mouthRadius = radius * 0.3;

  ctx.save();
  ctx.translate(mouthX, mouthY);

  if (skin.mouthStyle === 'smile') {
    ctx.beginPath();
    ctx.arc(0, 0, mouthRadius, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (skin.mouthStyle === 'neutral') {
    ctx.beginPath();
    ctx.moveTo(-mouthRadius, 0);
    ctx.lineTo(mouthRadius, 0);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (skin.mouthStyle === 'open') {
    // Round hungry red mouth
    ctx.beginPath();
    ctx.arc(0, 0, mouthRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Funny tooth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-mouthRadius * 0.4, -mouthRadius * 0.9, mouthRadius * 0.8, mouthRadius * 0.4);
  } else if (skin.mouthStyle === 'tongue') {
    // Slurpping pink tongue hanging out
    ctx.beginPath();
    ctx.ellipse(0, mouthRadius * 0.5, mouthRadius * 0.7, mouthRadius * 1.2, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fdba74';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, mouthRadius, 0, Math.PI);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}
