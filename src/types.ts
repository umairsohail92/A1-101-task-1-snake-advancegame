/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type PotionType = 'magnet' | 'radar' | 'boost' | 'multiplier' | 'zoom';

export interface PotionEffect {
  type: PotionType;
  durationLeft: number; // in milliseconds or seconds
  maxDuration: number;
}

export interface WormSkin {
  id: string;
  name: string;
  type: 'solid' | 'stripes' | 'checker' | 'rainbow' | 'points';
  colors: string[];
  eyeStyle: 'cute' | 'angry' | 'cool' | 'goggle' | 'funny';
  mouthStyle: 'smile' | 'open' | 'tongue' | 'neutral';
  unlocked: boolean;
  cost: number;
}

export interface Worm {
  id: string;
  name: string;
  isBot: boolean;
  segments: Point[]; // elements represent segments, head is segments[0]
  angle: number; // current movement direction in radians
  targetAngle: number; // desired direction
  speed: number;
  baseSpeed: number;
  width: number; // thickness of worm
  points: number; // current score / length indicators
  kills: number;
  isBoosting: boolean;
  activePotions: { [key in PotionType]?: PotionEffect };
  skin: WormSkin;
  isDead: boolean;
  deathTimer?: number; // visual decay or explosion effect timer
}

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  type: 'cheese' | 'apple' | 'burger' | 'candy' | 'cake' | 'carrot' | 'grape' | 'potion';
  potionType?: PotionType;
  points: number;
  radius: number;
  color?: string; // specific potion or candy color
  attractedToWormId?: string; // for magnet pulls
  attractedSpeed?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface GameQuest {
  id: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  rewardCoins: number;
  type: 'eat_food' | 'kill_worms' | 'reach_length' | 'use_potions';
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
  isPlayer: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalKills: number;
  highestScore: number;
  totalFoodEaten: number;
  goldCoins: number;
  rankLevel: number;
  rankExp: number;
  unlockedSkins: string[];
  activeSkinId: string;
}
