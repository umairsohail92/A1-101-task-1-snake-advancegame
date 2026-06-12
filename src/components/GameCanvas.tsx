/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, ShieldAlert, Award, Compass, RefreshCw, Zap, Volume2, VolumeX, Eye, ArrowLeft } from 'lucide-react';
import { Worm, Point, FoodItem, Particle, PlayerStats, GameQuest, HighScore, PotionType } from '../types';
import { drawSegmentPattern, drawWormFace } from '../utils/skins';
import { audioSystem } from '../utils/audio';

interface GameCanvasProps {
  playerStats: PlayerStats;
  activeSkinId: string;
  skins: any[];
  quality: 'high' | 'low';
  controlType: 'pointer' | 'joystick' | 'keyboard';
  onGameFinished: (finalScore: number, kills: number, collectedCoins: number) => void;
  onExit: () => void;
}

// Arena circular constraints
const ARENA_RADIUS = 2000;
const INITIAL_BOT_COUNT = 15;
const FOOD_TARGET = 350;
const POTION_TARGET = 15;

export default function GameCanvas({
  playerStats,
  activeSkinId,
  skins,
  quality,
  controlType,
  onGameFinished,
  onExit,
}: GameCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  
  // Game state refs to prevent React state trigger speed-loss on 60FPS rendering
  const stateRef = React.useRef<{
    player: Worm;
    bots: Worm[];
    foods: FoodItem[];
    potions: FoodItem[];
    particles: Particle[];
    camera: Point;
    cameraZoom: number;
    arenaWidth: number;
    arenaHeight: number;
    isKeys: { [key: string]: boolean };
    mousePos: Point;
    joystickStart: Point | null;
    joystickCurrent: Point | null;
    isJoystickActive: boolean;
    playerKills: number;
    playerScore: number;
    gameTime: number;
    playerTrail: Point[]; // trail coords history to place segments
    botsTrails: { [botId: string]: Point[] };
    muted: boolean;
    radarTimer: number;
    windowSize: { width: number; height: number };
    controlType: 'pointer' | 'joystick' | 'keyboard';
    quality: 'high' | 'low';
  }>({
    player: null as any,
    bots: [],
    foods: [],
    potions: [],
    particles: [],
    camera: { x: ARENA_RADIUS, y: ARENA_RADIUS },
    cameraZoom: 1.0,
    arenaWidth: ARENA_RADIUS * 2,
    arenaHeight: ARENA_RADIUS * 2,
    isKeys: {},
    mousePos: { x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 }, // initialize pointing forward
    joystickStart: null,
    joystickCurrent: null,
    isJoystickActive: false,
    playerKills: 0,
    playerScore: 0,
    gameTime: 0,
    playerTrail: [],
    botsTrails: {},
    muted: audioSystem.getMuted(),
    radarTimer: 0,
    windowSize: { width: window.innerWidth, height: window.innerHeight },
    controlType,
    quality,
  });

  // Keep stateRef in sync with props
  React.useEffect(() => {
    stateRef.current.controlType = controlType;
  }, [controlType]);

  React.useEffect(() => {
    stateRef.current.quality = quality;
  }, [quality]);

  const [hudScore, setHudScore] = React.useState(0);
  const [hudKills, setHudKills] = React.useState(0);
  const [hudLeaderboard, setHudLeaderboard] = React.useState<{ name: string; score: number; isPlayer: boolean }[]>([]);
  const [activePotionsList, setActivePotionsList] = React.useState<{ type: PotionType; duration: number; max: number }[]>([]);
  const [localMuted, setLocalMuted] = React.useState(audioSystem.getMuted());

  // Screen size adjustment listener
  React.useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stateRef.current.windowSize = { width: window.innerWidth, height: window.innerHeight };
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up Keyboard, mouse/pointer coordinates & touch joystick handlers
  React.useEffect(() => {
    const state = stateRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      state.isKeys[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.key) return;
      state.isKeys[e.key.toLowerCase()] = false;
    };

    // Capture pointermove for unified desktop mouse + hybrid touchscreen/mobile move coordinates
    const handlePointerMove = (e: PointerEvent) => {
      state.mousePos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore clicks on buttons to avoid boosting while clicking Exit, Mute, etc.
      const target = e.target as HTMLElement;
      if (target && (target.closest('button') || target.closest('a') || target.tagName === 'BUTTON')) {
        return;
      }
      if (state.player) {
        state.player.isBoosting = true;
      }
    };

    const handlePointerUp = () => {
      if (state.player) {
        state.player.isBoosting = false;
      }
    };

    // Keyboard and Pointer listeners
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // Toggle local mute
  const handleToggleMute = () => {
    const m = audioSystem.toggleMute();
    setLocalMuted(m);
    stateRef.current.muted = m;
  };

  // Generate individual bot details
  const createBot = (id: string, name: string, score: number): Worm => {
    const botSkin = skins[Math.floor(Math.random() * skins.length)];
    
    // Pick starting spawn points relative to arena center
    const angle = Math.random() * Math.PI * 2;
    const radialRatio = 0.2 + Math.random() * 0.6; // spawn away from player center
    const spawnX = ARENA_RADIUS + Math.cos(angle) * (ARENA_RADIUS * radialRatio);
    const spawnY = ARENA_RADIUS + Math.sin(angle) * (ARENA_RADIUS * radialRatio);

    const segmentCount = Math.floor(10 + score / 85);
    const width = 16 + Math.min(24, Math.floor(score / 450));

    // Fill segments stretching straight backward from spawn head
    const bAngle = Math.random() * Math.PI * 2;
    const segments: Point[] = [];
    for (let i = 0; i < segmentCount; i++) {
      segments.push({
        x: spawnX - Math.cos(bAngle) * i * (width * 0.45),
        y: spawnY - Math.sin(bAngle) * i * (width * 0.45),
      });
    }

    return {
      id,
      name,
      isBot: true,
      segments,
      angle: bAngle,
      targetAngle: bAngle,
      speed:  1.6,
      baseSpeed: 1.6,
      width,
      points: score,
      kills: 0,
      isBoosting: false,
      activePotions: {},
      skin: botSkin,
      isDead: false,
    };
  };

  // Setup core structures and initiate ticker
  React.useEffect(() => {
    const state = stateRef.current;
    
    // Build active player structure
    const playerSkinObj = skins.find((s) => s.id === activeSkinId) || skins[0];
    state.player = {
      id: 'player_active',
      name: 'You (Worm Champion)',
      isBot: false,
      segments: Array.from({ length: 15 }, (_, idx) => ({
        x: ARENA_RADIUS,
        y: ARENA_RADIUS + idx * 8,
      })),
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      speed: 1.8,
      baseSpeed: 1.8,
      width: 18,
      points: 100,
      kills: 0,
      isBoosting: false,
      activePotions: {},
      skin: playerSkinObj,
      isDead: false,
    };

    // Pre-initialize trail array
    state.playerTrail = [];
    for (let idx = 0; idx < 1000; idx++) {
      state.playerTrail.push({ x: ARENA_RADIUS, y: ARENA_RADIUS + idx * 4 });
    }

    // Spawn 15 smart bots with random starting score ranges (similar to Worms Zone)
    const botNames = [
      'SlitherSlayer', 'GluttonWorm', 'SweetTooth', 'VenomViper', 'Spitzer',
      'CandyCatcher', 'TurboSnake', 'MegaCrawl', 'GrizzlyGuzzler', 'CheeseCrusher',
      'DonutDemon', 'SpikeWorm', 'ChubbyCrawl', 'SwiftTail', 'GreedyGrower'
    ];
    
    state.bots = botNames.map((name, index) => {
      const score = Math.floor(100 + Math.random() * 2500);
      const bot = createBot(`bot_${index}`, name, score);
      
      // Populate bot trajectory history trail
      const botTrailList: Point[] = [];
      const botSegments = bot.segments;
      // Interpolate trails back
      for (let s = 0; s < 500; s++) {
        botTrailList.push({ ...botSegments[Math.min(botSegments.length - 1, Math.floor(s / 4))] });
      }
      state.botsTrails[bot.id] = botTrailList;
      return bot;
    });

    // Populate food scatters inside arena circle
    state.foods = [];
    const foodTypes: FoodItem['type'][] = ['cheese', 'apple', 'burger', 'candy', 'cake', 'carrot', 'grape'];
    
    for (let f = 0; f < FOOD_TARGET; f++) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = Math.random() * (ARENA_RADIUS - 40);
      const fx = ARENA_RADIUS + Math.cos(rAngle) * rDist;
      const fy = ARENA_RADIUS + Math.sin(rAngle) * rDist;
      
      const type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
      // Burgers and cakes have higher weight and size
      const points = (type === 'burger' || type === 'cake') ? 15 + Math.floor(Math.random() * 15) : 3 + Math.floor(Math.random() * 4);
      
      state.foods.push({
        id: `food_${f}_${Date.now()}`,
        x: fx,
        y: fy,
        type,
        points,
        radius: (type === 'burger' || type === 'cake') ? 14 : 7,
      });
    }

    // Populate potions
    state.potions = [];
    const potionTypes: PotionType[] = ['magnet', 'radar', 'boost', 'multiplier', 'zoom'];
    for (let p = 0; p < POTION_TARGET; p++) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = Math.random() * (ARENA_RADIUS - 80);
      state.potions.push({
        id: `potion_${p}_${Date.now()}`,
        x: ARENA_RADIUS + Math.cos(rAngle) * rDist,
        y: ARENA_RADIUS + Math.sin(rAngle) * rDist,
        type: 'potion',
        potionType: potionTypes[Math.floor(Math.random() * potionTypes.length)],
        points: 25,
        radius: 12,
      });
    }

    state.particles = [];
    state.camera = { x: ARENA_RADIUS, y: ARENA_RADIUS };
    state.playerKills = 0;
    state.playerScore = 100;
    
    // Core RAF Loop
    let lastTime = 0;
    let animFrameId: number;

    const gameTick = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min(100, timestamp - lastTime) / 1000;
      lastTime = timestamp;

      updateGame(dt);
      renderGame();

      animFrameId = requestAnimationFrame(gameTick);
    };

    animFrameId = requestAnimationFrame(gameTick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeSkinId]);

  // Main mathematical updater for game segments and AI logic
  const updateGame = (dt: number) => {
    const state = stateRef.current;
    if (state.player.isDead) return;

    const { controlType, quality } = state;

    state.gameTime += dt;
    state.radarTimer += dt;

    // --- 1. PLAYER POSITION UPDATE ---
    const player = state.player;
    
    // Hybrid keyboard checks: If any keyboard movement keys are pressed, we prioritize keyboard steering instantly.
    let isKeyboardMoving = false;
    let kdx = 0;
    let kdy = 0;
    if (state.isKeys['a'] || state.isKeys['arrowleft']) kdx = -1;
    if (state.isKeys['d'] || state.isKeys['arrowright']) kdx = 1;
    if (state.isKeys['w'] || state.isKeys['arrowup']) kdy = -1;
    if (state.isKeys['s'] || state.isKeys['arrowdown']) kdy = 1;

    if (kdx !== 0 || kdy !== 0) {
      isKeyboardMoving = true;
    }

    if (isKeyboardMoving || controlType === 'keyboard') {
      if (kdx !== 0 || kdy !== 0) {
        player.targetAngle = Math.atan2(kdy, kdx);
      }
    } else if (controlType === 'joystick' && state.isJoystickActive && state.joystickStart && state.joystickCurrent) {
      const dx = state.joystickCurrent.x - state.joystickStart.x;
      const dy = state.joystickCurrent.y - state.joystickStart.y;
      if (Math.hypot(dx, dy) > 8) {
        player.targetAngle = Math.atan2(dy, dx);
      }
    } else {
      // DEFAULT POINTER CONTROL: Steering towards mouse relative to player head screen center
      const screenCenterX = state.windowSize.width / 2;
      const screenCenterY = state.windowSize.height / 2;

      const dx = state.mousePos.x - screenCenterX;
      const dy = state.mousePos.y - screenCenterY;
      
      if (Math.hypot(dx, dy) > 12) {
        player.targetAngle = Math.atan2(dy, dx);
      }
    }

    // Smoothly turn angle towards target angle
    let angleDiff = player.targetAngle - player.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    
    // Turn step
    const turnRate = 5 * dt; // turning responsiveness
    player.angle += Math.max(-turnRate, Math.min(turnRate, angleDiff));

    // Handle user activation of boost. Boosting costs 0.05 score per tick and spawns trails of tiny food!
    let speedMult = 1.0;
    
    // Check if player keys has spacebar down or left click booster activated
    const hasBoostActived = state.isKeys[' '] || player.isBoosting;
    
    if (hasBoostActived && player.points > 80) {
      speedMult = 2.0;

      // Spawn wind-booster particles
      if (Math.random() < 0.2) {
        audioSystem.playBoost();
        state.particles.push({
          x: player.segments[0].x - Math.cos(player.angle) * player.width,
          y: player.segments[0].y - Math.sin(player.angle) * player.width,
          vx: -Math.cos(player.angle) * 12 + (Math.random() - 0.5) * 5,
          vy: -Math.sin(player.angle) * 12 + (Math.random() - 0.5) * 5,
          size: 4 + Math.random() * 4,
          color: 'rgba(255, 255, 255, 0.45)',
          alpha: 1.0,
          life: 0,
          maxLife: 30,
        });
      }

      // Lose some points (digestion tax) as boost trail of food
      if (Math.random() < 0.08) {
        player.points = Math.max(80, player.points - 1);
        // Spawn a low value candy food behind
        const tailIdx = player.segments.length - 1;
        state.foods.push({
          id: `food_boost_${Date.now()}_${Math.random()}`,
          x: player.segments[tailIdx].x + (Math.random() - 0.5) * 18,
          y: player.segments[tailIdx].y + (Math.random() - 0.5) * 18,
          type: 'candy',
          points: 1,
          radius: 5,
          color: 'hsla(' + Math.floor(Math.random() * 360) + ', 80%, 65%, 0.85)',
        });
      }
    }

    // Apply speed modifiers
    let finalSpeed = player.baseSpeed * speedMult;
    if (player.activePotions['boost']) {
      finalSpeed *= 1.4; // boost potion overlay multiplier
    }
    player.speed = finalSpeed;

    // Step head forward
    const pHead = player.segments[0];
    pHead.x += Math.cos(player.angle) * player.speed * 60 * dt;
    pHead.y += Math.sin(player.angle) * player.speed * 60 * dt;

    // Verify circular boundary impact - player dies instantly if they step out!
    const distFromCenter = Math.hypot(pHead.x - ARENA_RADIUS, pHead.y - ARENA_RADIUS);
    if (distFromCenter >= ARENA_RADIUS) {
      killWorm(player);
      return;
    }

    // Save player path history to trail array
    state.playerTrail.unshift({ x: pHead.x, y: pHead.y });
    if (state.playerTrail.length > 3000) {
      state.playerTrail.pop();
    }

    // Re-space player segments along trail smooth historical checkpoints
    updateWormWidthAndSegmentsCount(player);
    const spacingRatio = player.width * 0.45;
    let trailIndex = 0;
    
    for (let s = 1; s < player.segments.length; s++) {
      let accumDist = 0;
      let targetPlace: Point | null = null;
      const prevSegPos = player.segments[s - 1];

      while (trailIndex < state.playerTrail.length) {
        const checkPoint = state.playerTrail[trailIndex];
        accumDist = Math.hypot(checkPoint.x - prevSegPos.x, checkPoint.y - prevSegPos.y);
        
        if (accumDist >= spacingRatio) {
          targetPlace = checkPoint;
          break;
        }
        trailIndex++;
      }

      if (targetPlace) {
        player.segments[s] = { ...targetPlace };
      } else {
        // Fallback fallback
        player.segments[s] = { ...player.segments[s - 1] };
      }
    }

    // --- 2. BOTS UPDATE (THINKING AI AND COLLISIONS) ---
    state.bots.forEach((bot) => {
      if (bot.isDead) return;

      const bHead = bot.segments[0];

      // Smart Bot AI trajectory steering:
      // A bot checks if a dangerous worm body segment is right in front of its nose.
      // If so, it chooses a safe evasive target.
      // Otherwise, it wanders towards the closest food!
      let evasivedx = 0;
      let evasivedy = 0;
      let dangerDetected = false;

      // Obstacle detection radius
      const alertDistRange = bot.width * 4;

      // Scan all other worms segments
      const allOtherWorms = [player, ...state.bots.filter(b => b.id !== bot.id)];
      
      for (const other of allOtherWorms) {
        if (other.isDead) continue;
        
        // Scan other segments
        for (let i = 0; i < other.segments.length; i++) {
          // If other is player, let bot be extra smart to avoid head-to-head collisions or trap moves
          const otherSeg = other.segments[i];
          const distance = Math.hypot(bHead.x - otherSeg.x, bHead.y - otherSeg.y);
          
          if (distance < alertDistRange) {
            // Find vector away from risk segment
            evasivedx += bHead.x - otherSeg.x;
            evasivedy += bHead.y - otherSeg.y;
            dangerDetected = true;
          }
        }
      }

      // Check boundary alert
      const botDistFromCenter = Math.hypot(bHead.x - ARENA_RADIUS, bHead.y - ARENA_RADIUS);
      if (botDistFromCenter > ARENA_RADIUS - bot.width * 5) {
        // Steer hard back towards arena center
        evasivedx += ARENA_RADIUS - bHead.x;
        evasivedy += ARENA_RADIUS - bHead.y;
        dangerDetected = true;
      }

      if (dangerDetected) {
        // Evade! Combine avoid vector
        bot.targetAngle = Math.atan2(evasivedy, evasivedx);
        // Occasionally boost during evasion!
        if (Math.random() < 0.1 && bot.points > 120) {
          bot.isBoosting = true;
        } else {
          bot.isBoosting = false;
        }
      } else {
        // Normal state: chase high value foods
        bot.isBoosting = false;
        
        // Find closest food
        let bestFood: FoodItem | null = null;
        let minFDist = 450; // food search radius

        state.foods.forEach((food) => {
          const fd = Math.hypot(bHead.x - food.x, bHead.y - food.y);
          if (fd < minFDist) {
            minFDist = fd;
            bestFood = food;
          }
        });

        // Search potions too
        state.potions.forEach((potion) => {
          const pd = Math.hypot(bHead.x - potion.x, bHead.y - potion.y);
          if (pd < minFDist) {
            minFDist = pd;
            bestFood = potion;
          }
        });

        if (bestFood) {
          // Point tail towards delicious delicacies
          bot.targetAngle = Math.atan2((bestFood as any).y - bHead.y, (bestFood as any).x - bHead.x);
        } else {
          // Just random gentle wander
          if (Math.random() < 0.02) {
            bot.targetAngle += (Math.random() - 0.5) * 1.5;
          }
        }
      }

      // Interpolate steering direction
      let botDiff = bot.targetAngle - bot.angle;
      while (botDiff < -Math.PI) botDiff += Math.PI * 2;
      while (botDiff > Math.PI) botDiff -= Math.PI * 2;
      bot.angle += Math.max(-4 * dt, Math.min(4 * dt, botDiff));

      // Bot speed mechanics
      const botSpeedMult = bot.isBoosting ? 1.8 : 1.0;
      bot.speed = bot.baseSpeed * botSpeedMult;

      // Move bot head
      bHead.x += Math.cos(bot.angle) * bot.speed * 60 * dt;
      bHead.y += Math.sin(bot.angle) * bot.speed * 60 * dt;

      // Verify boundary crash
      if (Math.hypot(bHead.x - ARENA_RADIUS, bHead.y - ARENA_RADIUS) >= ARENA_RADIUS) {
        killWorm(bot);
        return;
      }

      // Update bot trail queue
      const trail = state.botsTrails[bot.id] || [];
      trail.unshift({ x: bHead.x, y: bHead.y });
      if (trail.length > 2000) {
        trail.pop();
      }
      state.botsTrails[bot.id] = trail;

      // Redraw segments of bot
      updateWormWidthAndSegmentsCount(bot);
      const bSpacing = bot.width * 0.45;
      let bTrailIdx = 0;

      for (let s = 1; s < bot.segments.length; s++) {
        let bAccumDist = 0;
        let bTargetPlace: Point | null = null;
        const bPrevSeg = bot.segments[s - 1];

        while (bTrailIdx < trail.length) {
          const checkP = trail[bTrailIdx];
          bAccumDist = Math.hypot(checkP.x - bPrevSeg.x, checkP.y - bPrevSeg.y);
          if (bAccumDist >= bSpacing) {
            bTargetPlace = checkP;
            break;
          }
          bTrailIdx++;
        }

        if (bTargetPlace) {
          bot.segments[s] = { ...bTargetPlace };
        } else {
          bot.segments[s] = { ...bot.segments[s - 1] };
        }
      }
    });

    // --- 3. HANDLE CRITICAL COLLISIONS BETWEEN WORMS ---
    // If ANY worm's head crashes into another worm's body segments, that worm dies.
    const activeWorms = [player, ...state.bots];
    
    activeWorms.forEach((victim) => {
      if (victim.isDead) return;
      const vHead = victim.segments[0];

      // Avoid self body collisions (except first few segments near head)
      for (const obstacle of activeWorms) {
        if (obstacle.isDead) continue;

        // Determine starting check segment based on relationship (avoid self head collide)
        const isSelf = obstacle.id === victim.id;
        const startingSegmentIndex = isSelf ? 7 : 0;

        for (let s = startingSegmentIndex; s < obstacle.segments.length; s++) {
          const seg = obstacle.segments[s];
          const reachDistance = (victim.width / 2) + (obstacle.width / 2);
          
          if (Math.hypot(vHead.x - seg.x, vHead.y - seg.y) < reachDistance * 0.85) {
            // Target dead segment! Record who gets the kill credit
            if (!isSelf) {
              obstacle.kills += 1;
              if (obstacle.id === player.id) {
                state.playerKills += 1;
              }
            }
            killWorm(victim);
            break;
          }
        }
      }
    });

    // --- 4. FOOD CONSUMPTION LOGIC (MAGNET AND MAGNET PULL CODES) ---
    // Potions: "magnet" potion doubles the player pull radius!
    const playerHasMagnet = player.activePotions['magnet'];
    const playerPullRange = playerHasMagnet ? player.width * 9 : player.width * 3.5;

    // Player food digests
    const playerHead = player.segments[0];

    // Process foods check
    state.foods.forEach((food) => {
      // If food is attracted to a worm, steer it closer
      if (food.attractedToWormId) {
        const eater = activeWorms.find((w) => w.id === food.attractedToWormId);
        if (eater && !eater.isDead) {
          const eHead = eater.segments[0];
          const angle = Math.atan2(eHead.y - food.y, eHead.x - food.x);
          const pullSpeed = food.attractedSpeed || 8;
          food.x += Math.cos(angle) * pullSpeed;
          food.y += Math.sin(angle) * pullSpeed;
          food.attractedSpeed = pullSpeed + 0.8; // accelerate pull

          // Absorbed check
          if (Math.hypot(eHead.x - food.x, eHead.y - food.y) < eater.width * 0.6) {
            absorbFood(eater, food);
          }
        } else {
          // release attraction
          food.attractedToWormId = undefined;
        }
        return;
      }

      // Check if player pulls food
      const pFd = Math.hypot(playerHead.x - food.x, playerHead.y - food.y);
      if (pFd < playerPullRange) {
        food.attractedToWormId = player.id;
        food.attractedSpeed = 4;
        return;
      }

      // Check if Bots pull food
      for (const bot of state.bots) {
        if (bot.isDead) continue;
        const bHead = bot.segments[0];
        const bFd = Math.hypot(bHead.x - food.x, bHead.y - food.y);
        const botPullRange = bot.width * 3.0;

        if (bFd < botPullRange) {
          food.attractedToWormId = bot.id;
          food.attractedSpeed = 4;
          return;
        }

        // Catch absorb fallback if extremely close
        if (bFd < bot.width * 0.5) {
          absorbFood(bot, food);
          break;
        }
      }

      // Catch direct player absorb
      if (pFd < player.width * 0.5) {
        absorbFood(player, food);
      }
    });

    // Clean consumed foods
    state.foods = state.foods.filter((f) => f.radius > 0);

    // Repopulate standard food if it falls under target count
    while (state.foods.length < FOOD_TARGET) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = Math.random() * (ARENA_RADIUS - 40);
      const fx = ARENA_RADIUS + Math.cos(rAngle) * rDist;
      const fy = ARENA_RADIUS + Math.sin(rAngle) * rDist;
      const foodTypes: FoodItem['type'][] = ['cheese', 'apple', 'burger', 'candy', 'cake', 'carrot', 'grape'];
      const type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
      const points = (type === 'burger' || type === 'cake') ? 15 + Math.floor(Math.random() * 15) : 3 + Math.floor(Math.random() * 4);
      
      state.foods.push({
        id: `food_repl_${Date.now()}_${Math.random()}`,
        x: fx,
        y: fy,
        type,
        points,
        radius: (type === 'burger' || type === 'cake') ? 14 : 7,
      });
    }

    // --- 5. POTIONS CONSUMPTION ---
    state.potions.forEach((potion) => {
      if (potion.radius === 0) return;
      
      const pDist = Math.hypot(playerHead.x - potion.x, playerHead.y - potion.y);
      // Magnet affect on potion too!
      const potPullRange = playerPullRange;

      if (pDist < potPullRange && !potion.attractedToWormId) {
        potion.attractedToWormId = player.id;
        potion.attractedSpeed = 4;
      }

      if (potion.attractedToWormId === player.id) {
        const pAngle = Math.atan2(playerHead.y - potion.y, playerHead.x - potion.x);
        potion.x += Math.cos(pAngle) * (potion.attractedSpeed || 4);
        potion.attractedSpeed = (potion.attractedSpeed || 4) + 0.5;

        if (pDist < player.width * 0.6) {
          consumePotion(player, potion.potionType || 'magnet');
          potion.radius = 0; // consumed mark
        }
        return;
      }

      // Bots collect potions too!
      for (const bot of state.bots) {
        if (bot.isDead) continue;
        const bHead = bot.segments[0];
        const bDist = Math.hypot(bHead.x - potion.x, bHead.y - potion.y);

        if (bDist < bot.width * 0.7) {
          consumePotion(bot, potion.potionType || 'magnet');
          potion.radius = 0;
          break;
        }
      }
    });

    state.potions = state.potions.filter((p) => p.radius > 0);

    // Repopulate potion if below target
    while (state.potions.length < POTION_TARGET) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = Math.random() * (ARENA_RADIUS - 80);
      const potionTypes: PotionType[] = ['magnet', 'radar', 'boost', 'multiplier', 'zoom'];
      state.potions.push({
        id: `potion_${Date.now()}_${Math.random()}`,
        x: ARENA_RADIUS + Math.cos(rAngle) * rDist,
        y: ARENA_RADIUS + Math.sin(rAngle) * rDist,
        type: 'potion',
        potionType: potionTypes[Math.floor(Math.random() * potionTypes.length)],
        points: 25,
        radius: 12,
      });
    }

    // --- 6. PARTICLES PHYSICS UPDATER ---
    state.particles.forEach((part) => {
      part.x += part.vx;
      part.y += part.vy;
      part.vx *= 0.95; // friction
      part.vy *= 0.95;
      part.life++;
      part.alpha = 1.0 - (part.life / part.maxLife);
    });

    state.particles = state.particles.filter((p) => p.life < p.maxLife);

    // --- 7. POTIONS DURATION DECREASE ---
    const decActivePotions = (worm: Worm) => {
      const counts: typeof activePotionsList = [];
      Object.keys(worm.activePotions).forEach((k) => {
        const type = k as PotionType;
        const pot = worm.activePotions[type];
        if (pot) {
          pot.durationLeft -= dt * 1000;
          if (pot.durationLeft <= 0) {
            delete worm.activePotions[type];
            if (worm.id === player.id && type === 'zoom') {
              // restore smooth zoom
              state.cameraZoom = 1.0;
            }
          } else if (worm.id === player.id) {
            counts.push({
              type,
              duration: pot.durationLeft,
              max: pot.maxDuration,
            });
          }
        }
      });
      if (worm.id === player.id) {
        setActivePotionsList(counts);
      }
    };
    decActivePotions(player);
    state.bots.forEach((b) => decActivePotions(b));

    // --- 8. SMOOTH CAMERA INTERPOLATION ---
    // The camera smoothly tracks player coordinates
    const targetCamX = playerHead.x;
    const targetCamY = playerHead.y;

    state.camera.x += (targetCamX - state.camera.x) * 6 * dt;
    state.camera.y += (targetCamY - state.camera.y) * 6 * dt;

    // Dynamic zoom scale: worm becomes much larger, camera zooms out!
    // Potion Zoom also adds 0.3 zoom out benefit.
    const scoreFactor = Math.min(0.55, player.points / 30000);
    const potionZoomFactor = player.activePotions['zoom'] ? 0.35 : 0;
    const targetZoom = Math.max(0.40, 1.0 - scoreFactor - potionZoomFactor);
    
    state.cameraZoom += (targetZoom - state.cameraZoom) * 2 * dt;

    // Push basic stats to HUD periodically (avoid React lags inside 60fps raf loops)
    if (Math.random() < 0.15) {
      setHudScore(player.points);
      setHudKills(state.playerKills);
      state.playerScore = player.points;

      // Update Top 10 Live Leaderboard
      const ranks = [player, ...state.bots].map((item) => ({
        name: item.name,
        score: item.points,
        isPlayer: !item.isBot,
      })).sort((a,b) => b.score - a.score).slice(0, 8);
      setHudLeaderboard(ranks);
    }
  };

  // Perform calculations on worm width, sizes, segments additions based on score progression
  const updateWormWidthAndSegmentsCount = (worm: Worm) => {
    // Basic Worms zone growth: Segments count = 12 + points / 70. Max segments 250
    const targetSegments = Math.min(200, Math.floor(12 + worm.points / 60));
    worm.width = Math.min(50, 16 + Math.floor(worm.points / 400));
    
    // Smoothly grow/shrink segments list
    if (worm.segments.length < targetSegments) {
      const lastSeg = worm.segments[worm.segments.length - 1] || worm.segments[0];
      worm.segments.push({ ...lastSeg });
    } else if (worm.segments.length > targetSegments) {
      worm.segments.pop();
    }
  };

  // Food digestion trigger
  const absorbFood = (worm: Worm, food: FoodItem) => {
    food.radius = 0; // flag destroyed

    let ptsAwarded = food.points;
    if (worm.activePotions['multiplier']) {
      ptsAwarded *= 3; // 3x multiplier
    }

    worm.points += ptsAwarded;

    // Trigger feedback sound and eat particle sparkles only for player
    if (worm.id === 'player_active') {
      audioSystem.playEat();

      // Spawn colorful particle sparkles
      for (let i = 0; i < 4; i++) {
        stateRef.current.particles.push({
          x: food.x,
          y: food.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          size: 3 + Math.random() * 3,
          color: food.color || '#4ade80',
          alpha: 1.0,
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }
    }
  };

  // Activate potion durations
  const consumePotion = (worm: Worm, type: PotionType) => {
    audioSystem.playCollectPotion();
    
    const maxDuration = 25000; // 25 seconds duration
    worm.activePotions[type] = {
      type,
      durationLeft: maxDuration,
      maxDuration,
    };
  };

  // Perform worm death and turn segments into dead heap delicacies!
  const killWorm = (deadWorm: Worm) => {
    const state = stateRef.current;
    deadWorm.isDead = true;

    // Trigger synthetic explosion sound
    audioSystem.playExplosion();

    // Create massive burst of sparkles
    deadWorm.segments.forEach((seg, index) => {
      if (index % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          state.particles.push({
            x: seg.x + (Math.random() - 0.5) * 15,
            y: seg.y + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: 4 + Math.random() * 5,
            color: deadWorm.skin.colors[Math.floor(Math.random() * deadWorm.skin.colors.length)],
            alpha: 1.0,
            life: 0,
            maxLife: 35 + Math.random() * 20,
          });
        }
      }

      // Decompose segments into massive high quality delicacies!
      // This is the absolute hallmark of Slither/Wormsio gaming - reaping dead giants!
      if (index % 3 === 0) {
        const rOffset = (Math.random() - 0.5) * 20;
        const foodTypes: FoodItem['type'][] = ['burger', 'candy', 'cake', 'cheese', 'apple'];
        const pType = foodTypes[Math.floor(Math.random() * foodTypes.length)];

        state.foods.push({
          id: `food_death_${deadWorm.id}_${index}_${Date.now()}`,
          x: seg.x + Math.sin(index) * rOffset,
          y: seg.y + Math.cos(index) * rOffset,
          type: pType,
          points: pType === 'burger' || pType === 'cake' ? 12 : 5,
          radius: pType === 'burger' || pType === 'cake' ? 11 : 6,
          color: 'hsla(' + Math.floor(Math.random() * 360) + ', 85%, 60%, 1.0)',
        });
      }
    });

    if (!deadWorm.isBot) {
      // Player Died is terminal! Wait 1.5 seconds for dramatic death explosion view, then exit
      setTimeout(() => {
        // Calculate accrued gold coins: score / 85 + kills * 15
        const baseCoins = Math.floor(state.player.points / 75);
        const killCoins = state.playerKills * 20;
        const totalAwarded = baseCoins + killCoins;
        
        onGameFinished(state.player.points, state.playerKills, totalAwarded);
      }, 1500);
    } else {
      // Bot died, remove from list and replace with a fresh wandering bot immediately!
      state.bots = state.bots.filter((b) => b.id !== deadWorm.id);
      delete state.botsTrails[deadWorm.id];

      setTimeout(() => {
        if (state.player && !state.player.isDead && state.bots.length < INITIAL_BOT_COUNT) {
          const freshBotName = 'CrawlBot_' + Math.floor(Math.random() * 100);
          const freshBot = createBot(freshBotName, freshBotName, Math.floor(100 + Math.random() * 1000));
          
          // Seed segments trail
          const trailsList: Point[] = [];
          for (let s = 0; s < 500; s++) {
            trailsList.push({ ...freshBot.segments[0] });
          }
          state.botsTrails[freshBot.id] = trailsList;
          state.bots.push(freshBot);
        }
      }, 3000);
    }
  };

  // Canvas drawing instructions
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const player = state.player;

    // Clear Canvas
    ctx.fillStyle = '#0f172a'; // clean slate charcoal
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply camera scaling and camera offsets
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(state.cameraZoom, state.cameraZoom);
    ctx.translate(-state.camera.x, -state.camera.y);

    // --- 1. DRAW FIELD GRID LINES (ONLY IN HIGH QUALITY) ---
    if (quality === 'high') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Draw subtle tile checkerboards
      const gridSize = 120;
      const startX = Math.max(0, Math.floor((state.camera.x - canvas.width / state.cameraZoom / 2) / gridSize) * gridSize);
      const endX = Math.min(ARENA_RADIUS * 2, Math.floor((state.camera.x + canvas.width / state.cameraZoom / 2) / gridSize) * gridSize + gridSize);
      const startY = Math.max(0, Math.floor((state.camera.y - canvas.height / state.cameraZoom / 2) / gridSize) * gridSize);
      const endY = Math.min(ARENA_RADIUS * 2, Math.floor((state.camera.y + canvas.height / state.cameraZoom / 2) / gridSize) * gridSize + gridSize);

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    // --- 2. DRAW THE PHYSICAL ARENA BOUNDARY WALL ---
    ctx.beginPath();
    ctx.arc(ARENA_RADIUS, ARENA_RADIUS, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 18;
    ctx.stroke();

    // Red striped hazard borders
    ctx.beginPath();
    ctx.arc(ARENA_RADIUS, ARENA_RADIUS, ARENA_RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // --- 3. DRAW POTIONS ---
    state.potions.forEach((potion) => {
      const type = potion.potionType || 'magnet';
      let fillStyle = '#3b82f6'; // blue magnet
      if (type === 'boost') fillStyle = '#22c55e'; // green boost
      if (type === 'radar') fillStyle = '#eab308'; // yellow map
      if (type === 'multiplier') fillStyle = '#ef4444'; // red score
      if (type === 'zoom') fillStyle = '#a855f7'; // purple view

      // Outer sparkle glow aura
      ctx.beginPath();
      ctx.arc(potion.x, potion.y, potion.radius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle + '22';
      ctx.fill();

      // Potion flask beaker cylinder
      ctx.beginPath();
      ctx.arc(potion.x, potion.y, potion.radius, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle + 'aa';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner liquid cork neck
      ctx.beginPath();
      ctx.arc(potion.x, potion.y, potion.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // --- 4. DRAW DELICACIES (FOOD) ---
    state.foods.forEach((food) => {
      // Draw procedural custom foods which matches cartoon delicacies in Worms Zone!
      ctx.save();
      ctx.translate(food.x, food.y);

      // Shadow overlay
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';

      switch (food.type) {
        case 'cheese':
          // Draw cheese yellow triangle
          ctx.beginPath();
          ctx.moveTo(-food.radius, food.radius);
          ctx.lineTo(food.radius, food.radius);
          ctx.lineTo(0, -food.radius);
          ctx.closePath();
          ctx.fillStyle = '#facc15';
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Draw holes
          ctx.beginPath();
          ctx.arc(-food.radius * 0.25, food.radius * 0.5, food.radius * 0.15, 0, Math.PI * 2);
          ctx.arc(food.radius * 0.3, food.radius * 0.3, food.radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = '#b45309'; // darker orange holes
          ctx.fill();
          break;

        case 'apple':
          // Draw red apple circle with tiny brown branch
          ctx.beginPath();
          ctx.arc(0, 0, food.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Stem
          ctx.beginPath();
          ctx.moveTo(0, -food.radius);
          ctx.lineTo(food.radius * 0.3, -food.radius * 1.4);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          break;

        case 'burger':
          // Multi layered patty sandwich
          const r = food.radius;
          ctx.fillStyle = '#fbbf24'; // Bun top
          ctx.beginPath();
          ctx.arc(0, -r * 0.2, r, Math.PI, 0);
          ctx.fill();
          // Meat patty
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-r, -r * 0.1, r * 2, r * 0.35);
          // Lettuce
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-r * 0.9, r * 0.2, r * 1.8, r * 0.15);
          // Bun bottom
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-r, r * 0.35, r * 2, r * 0.35);
          break;

        case 'candy':
          // Shiny wrapped sweet
          const cr = food.radius;
          ctx.fillStyle = food.color || '#ec4899';
          ctx.beginPath();
          ctx.arc(0, 0, cr * 0.7, 0, Math.PI * 2);
          ctx.fill();
          // Bow ties
          ctx.beginPath();
          ctx.moveTo(-cr * 0.6, 0);
          ctx.lineTo(-cr * 1.25, -cr * 0.5);
          ctx.lineTo(-cr * 1.25, cr * 0.5);
          ctx.closePath();
          ctx.moveTo(cr * 0.6, 0);
          ctx.lineTo(cr * 1.25, -cr * 0.5);
          ctx.lineTo(cr * 1.25, cr * 0.5);
          ctx.closePath();
          ctx.fillStyle = food.color || '#ec4899';
          ctx.fill();
          break;

        case 'cake':
          // Triangular slice of chocolate pink cake
          const cSize = food.radius;
          ctx.beginPath();
          ctx.moveTo(-cSize, cSize);
          ctx.lineTo(cSize, cSize * 0.6);
          ctx.lineTo(0, -cSize);
          ctx.closePath();
          ctx.fillStyle = '#fda4af'; // sweet pink icing
          ctx.fill();
          // layers
          ctx.fillStyle = '#78350f'; // cake sponge
          ctx.fillRect(-cSize * 0.6, cSize * 0.5, cSize * 1.2, cSize * 0.2);
          break;

        case 'carrot':
          // Orange taper carrot
          const carrotR = food.radius;
          ctx.beginPath();
          ctx.moveTo(-carrotR, -carrotR * 0.3);
          ctx.lineTo(carrotR, 0);
          ctx.lineTo(-carrotR, carrotR * 0.3);
          ctx.closePath();
          ctx.fillStyle = '#f97316';
          ctx.fill();
          break;

        case 'grape':
          // Little cute purple bubbles
          ctx.beginPath();
          ctx.arc(-food.radius * 0.3, food.radius * 0.2, food.radius * 0.7, 0, Math.PI * 2);
          ctx.arc(food.radius * 0.3, -food.radius * 0.2, food.radius * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = '#a855f7';
          ctx.fill();
          break;

        default:
          ctx.beginPath();
          ctx.arc(0, 0, food.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
      }

      ctx.restore();
    });

    // --- 5. DRAW BOTS ---
    state.bots.forEach((bot) => {
      if (bot.isDead) return;

      // Draw segments back-to-front
      const segments = bot.segments;
      for (let s = segments.length - 1; s >= 0; s--) {
        const seg = segments[s];
        const segRadius = (bot.width / 2) * (1 - s * 0.0018); // slight tail taper

        drawSegmentPattern(ctx, seg.x, seg.y, segRadius, bot.skin, s, segments.length);
      }

      // Draw bot face eyes mouth
      const head = segments[0];
      const headRadius = bot.width / 2;
      drawWormFace(ctx, head.x, head.y, headRadius, bot.angle, bot.skin);

      // Bot Name plates floating overhead
      ctx.font = 'black 11px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(bot.name, head.x, head.y - bot.width - 2);
    });

    // --- 6. DRAW REAL PLAYER WORM ---
    if (!player.isDead) {
      // Draw player segments back to head
      const sList = player.segments;
      for (let s = sList.length - 1; s >= 0; s--) {
        const seg = sList[s];
        const radius = (player.width / 2) * (1 - s * 0.0018);
        
        drawSegmentPattern(ctx, seg.x, seg.y, radius, player.skin, s, sList.length);
      }

      // Draw active player customizable faces
      const head = sList[0];
      const headRadius = player.width / 2;
      drawWormFace(ctx, head.x, head.y, headRadius, player.angle, player.skin);

      // Glow indicators if speed sneakers potion is active!
      if (player.activePotions['boost']) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, headRadius * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // --- 7. DRAW PARTICLES ---
    state.particles.forEach((part) => {
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fillStyle = part.color;
      ctx.globalAlpha = part.alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0; // reset
    });

    ctx.restore(); // restore camera offsets

    // --- 8. HUD LAYOUTS AT EDGES (POTIONS RADAR SEARCH POINTERS) ---
    // YELLOW RADAR POTION EFFECT:
    // Pointers showing massive delicacies/dead corpse food clusters or other potions on the edges of the screen
    if (player.activePotions['radar'] && !player.isDead) {
      const pHead = player.segments[0];

      // Scan standard potions coordinates relative to player head
      state.potions.forEach((potion) => {
        const dx = potion.x - pHead.x;
        const dy = potion.y - pHead.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 450) {
          // Beyond screen view, draw radar pointing arrow
          const angle = Math.atan2(dy, dx);
          const screenW = state.windowSize.width;
          const screenH = state.windowSize.height;

          const edgeX = screenW / 2 + Math.cos(angle) * (screenW * 0.35);
          const edgeY = screenH / 2 + Math.sin(angle) * (screenH * 0.35);

          ctx.beginPath();
          ctx.arc(edgeX, edgeY, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#eab308'; // glowing yellow radar cross
          ctx.fill();

          // Radar label
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.fillText('POT', edgeX, edgeY + 3);
        }
      });
    }

    // --- 9. MOBILE VIRTUAL JOYSTICK OVERLAYS ---
    if (controlType === 'joystick' && state.isJoystickActive && state.joystickStart && state.joystickCurrent) {
      const js = state.joystickStart;
      const jc = state.joystickCurrent;

      // Outer ring
      ctx.beginPath();
      ctx.arc(js.x, js.y, 55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner knob steer drag offset
      const dx = jc.x - js.x;
      const dy = jc.y - js.y;
      const dist = Math.hypot(dx, dy);
      const maxLimit = 40;
      
      const knobX = js.x + (dist > maxLimit ? (dx / dist) * maxLimit : dx);
      const knobY = js.y + (dist > maxLimit ? (dy / dist) * maxLimit : dy);

      ctx.beginPath();
      ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 184, 166, 0.75)'; // glowing teal knob
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Touch joystick listeners targeting mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore touch starting on top of interactive buttons
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('a') || target.tagName === 'BUTTON')) {
      return;
    }

    const state = stateRef.current;
    const { controlType } = state;
    const touch = e.touches[0];
    if (!touch) return;

    if (controlType === 'joystick') {
      state.joystickStart = { x: touch.clientX, y: touch.clientY };
      state.joystickCurrent = { x: touch.clientX, y: touch.clientY };
      state.isJoystickActive = true;
    } else if (controlType === 'pointer') {
      state.mousePos = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const state = stateRef.current;
    const { controlType } = state;
    const touch = e.touches[0];
    if (!touch) return;

    // Ignore joystick drag if it wasn't activated on the playing field
    if (controlType === 'joystick') {
      if (state.isJoystickActive) {
        state.joystickCurrent = { x: touch.clientX, y: touch.clientY };
      }
    } else if (controlType === 'pointer') {
      state.mousePos = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    const state = stateRef.current;
    state.isJoystickActive = false;
    state.joystickStart = null;
    state.joystickCurrent = null;
  };

  return (
    <div
      id="arena_viewport_overlay"
      className="relative h-screen w-screen overflow-hidden select-none touch-none bg-slate-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* High Performance 60FPS Game Render Frame in full size */}
      <canvas
        id="arena_rendering_canvas"
        ref={canvasRef}
        className="absolute inset-0 block cursor-crosshair outline-hidden h-full w-full"
      />

      {/* Mini Top Left Bar: Active score, kills, exit button */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-4">
        <button
          id="exit_current_match_btn"
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 px-4 text-xs font-black tracking-wide text-red-400 hover:text-white hover:bg-red-900/40 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Exit Match
        </button>

        {/* Live Weight Score Display */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-2">
          <div className="text-left leading-none">
            <span className="text-[9px] tracking-widest text-slate-500 font-bold uppercase">Weight Score</span>
            <div className="text-lg font-black text-yellow-400 mt-0.5">{hudScore.toLocaleString()}</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="text-left leading-none">
            <span className="text-[9px] tracking-widest text-slate-500 font-bold uppercase">Kills</span>
            <div className="text-lg font-black text-rose-500 mt-0.5">{hudKills}</div>
          </div>
        </div>
      </div>

      {/* Mini Top Right Bar: Active Top 8 live match scoreboard */}
      <div id="live_match_scoreboard" className="absolute top-4 right-4 z-20 w-52 rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-xl hidden sm:block">
        <div className="flex items-center gap-1 border-b border-slate-800/80 pb-1.5 mb-2">
          <Trophy size={13} className="text-yellow-400" />
          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Match Scoreboard</span>
        </div>
        <div className="space-y-1.5">
          {hudLeaderboard.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between text-[11px] leading-tight ${
                item.isPlayer ? 'text-teal-400 font-extrabold' : 'text-slate-350'
              }`}
            >
              <span className="truncate max-w-[110px]">
                {index + 1}. {item.isPlayer ? 'You' : item.name}
              </span>
              <span className="font-bold">{item.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Left Panel: Active potions duration sliders */}
      {activePotionsList.length > 0 && (
        <div id="active_potions_status_bar" className="absolute bottom-6 left-6 z-20 space-y-2 w-48 rounded-xl bg-slate-900/90 border border-slate-800 p-3">
          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Active Potion Boosts</div>
          {activePotionsList.map((item) => {
            const pct = (item.duration / item.max) * 100;
            let barColor = '#4299e1'; // blue zoom
            if (item.type === 'boost') barColor = '#48bb78';
            if (item.type === 'radar') barColor = '#ecc94b';
            if (item.type === 'multiplier') barColor = '#f56565';
            if (item.type === 'zoom') barColor = '#9f7aea';

            return (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] capitalize font-bold text-slate-300">
                  <span>{item.type === 'multiplier' ? '3x Multiplier' : item.type + ' potion'}</span>
                  <span>{Math.ceil(item.duration / 1000)}s</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Right Floating Board: Sound Mute and Boost Indicator warning */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
        {/* Quick audio toggle */}
        <button
          id="canvas_sound_toggle_btn"
          onClick={handleToggleMute}
          className="self-end rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-slate-300 hover:text-white hover:bg-slate-850 transition cursor-pointer"
        >
          {localMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-teal-400" />}
        </button>

        {/* Mobile Speed boost trigger button */}
        <button
          id="mobile_speed_boost_trigger_btn"
          onTouchStart={() => { stateRef.current.player.isBoosting = true; }}
          onTouchEnd={() => { stateRef.current.player.isBoosting = false; }}
          onMouseDown={() => { stateRef.current.player.isBoosting = true; }}
          onMouseUp={() => { stateRef.current.player.isBoosting = false; }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-black shadow-lg shadow-teal-500/30 transition transform hover:scale-105 active:scale-95 select-none active:shadow-inner"
        >
          <Zap size={26} className="text-black fill-black" />
        </button>
      </div>
    </div>
  );
}
