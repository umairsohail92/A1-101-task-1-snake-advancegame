/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Coins, ArrowLeft, Check, Lock } from 'lucide-react';
import { WormSkin } from '../types';
import { EYE_STYLES, MOUTH_STYLES } from '../utils/skins';
import { audioSystem } from '../utils/audio';

interface WardrobeProps {
  skins: WormSkin[];
  activeSkinId: string;
  goldCoins: number;
  onSelectSkin: (id: string) => void;
  onBuySkin: (id: string, cost: number) => void;
  onUpdateSkinFace: (eyeStyle: WormSkin['eyeStyle'], mouthStyle: WormSkin['mouthStyle']) => void;
  onClose: () => void;
}

export default function Wardrobe({
  skins,
  activeSkinId,
  goldCoins,
  onSelectSkin,
  onBuySkin,
  onUpdateSkinFace,
  onClose,
}: WardrobeProps) {
  const activeSkin = skins.find((s) => s.id === activeSkinId) || skins[0];

  const [selectedSkinId, setSelectedSkinId] = React.useState(activeSkinId);
  const [selectedEye, setSelectedEye] = React.useState<WormSkin['eyeStyle']>(activeSkin.eyeStyle);
  const [selectedMouth, setSelectedMouth] = React.useState<WormSkin['mouthStyle']>(activeSkin.mouthStyle);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const selectedSkinObject = skins.find((s) => s.id === selectedSkinId) || skins[0];

  // Draw smooth snake preview in canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const draw = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create a wavy preview of segment circles mimicking the worm's slither
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const segmentsCount = 14;
      const baseRadius = 24;

      // Draw shadow
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';

      // Draw worm from tail to head
      for (let i = segmentsCount - 1; i >= 0; i--) {
        // Wave offset based on index and time
        const wave = Math.sin(time - i * 0.4) * 22;
        const x = centerX - (i - segmentsCount / 2) * 24;
        const y = centerY + wave;

        const currentRadius = baseRadius * (1 - (i * 0.018)); // Slightly narrower tail

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.clip();

        // Pattern colouring
        ctx.shadowBlur = 0; // Disable shadow on clip
        const colors = selectedSkinObject.colors;

        if (selectedSkinObject.type === 'solid') {
          ctx.fillStyle = colors[0];
          ctx.fill();
        } else if (selectedSkinObject.type === 'stripes') {
          const colorIdx = Math.floor(i / 2) % colors.length;
          ctx.fillStyle = colors[colorIdx];
          ctx.fill();
        } else if (selectedSkinObject.type === 'checker') {
          ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, currentRadius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? colors[1] : colors[0];
          ctx.fill();
        } else if (selectedSkinObject.type === 'points') {
          ctx.fillStyle = colors[0];
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, currentRadius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = colors[1] || '#ffffff';
          ctx.fill();
        } else if (selectedSkinObject.type === 'rainbow') {
          const step = (i * (360 / segmentsCount)) % 360;
          ctx.fillStyle = `hsl(${step}, 90%, 55%)`;
          ctx.fill();
        }

        // Beautiful glossy highlight
        const glossyGrad = ctx.createRadialGradient(
          x - currentRadius * 0.3,
          y - currentRadius * 0.3,
          currentRadius * 0.1,
          x,
          y,
          currentRadius
        );
        glossyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        glossyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        glossyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = glossyGrad;
        ctx.fill();

        ctx.restore();

        // Segment outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw eyes & mouth on head segment (first segment, which has index 0)
      const headX = centerX - (0 - segmentsCount / 2) * 24;
      const headY = centerY + Math.sin(time - 0 * 0.4) * 22;
      const headRadius = baseRadius;

      ctx.save();
      ctx.translate(headX, headY);
      // Face rotates facing right (looking up and down based on wave direction)
      const nextY = centerY + Math.sin(time - 1 * 0.4) * 22;
      const faceAngle = Math.atan2(headY - nextY, 24);
      ctx.rotate(faceAngle);

      const eyeRadius = headRadius * 0.3;
      const leftEyeX = headRadius * 0.35;
      const leftEyeY = -headRadius * 0.45;
      const rightEyeX = headRadius * 0.35;
      const rightEyeY = headRadius * 0.45;

      // Draw Eyes
      [leftEyeY, rightEyeY].forEach((eY) => {
        ctx.save();
        ctx.translate(leftEyeX, eY);

        if (selectedEye === 'cute') {
          ctx.beginPath();
          ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(eyeRadius * 0.2, 0, eyeRadius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#111827';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(eyeRadius * 0.3, -eyeRadius * 0.2, eyeRadius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        } else if (selectedEye === 'cool') {
          ctx.beginPath();
          ctx.ellipse(0, 0, eyeRadius * 1.3, eyeRadius * 0.8, -0.1, 0, Math.PI * 2);
          ctx.fillStyle = '#18181b';
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (selectedEye === 'angry') {
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
        } else if (selectedEye === 'goggle') {
          ctx.beginPath();
          ctx.arc(0, 0, eyeRadius * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#312e81';
          ctx.fill();
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, eyeRadius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        } else if (selectedEye === 'funny') {
          ctx.beginPath();
          ctx.arc(0, 0, eyeRadius * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(eY < 0 ? eyeRadius * 0.4 : -eyeRadius * 0.4, 0, eyeRadius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Mouth
      const mouthX = headRadius * 0.6;
      ctx.save();
      ctx.translate(mouthX, 0);

      if (selectedMouth === 'smile') {
        ctx.beginPath();
        ctx.arc(0, 0, headRadius * 0.3, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (selectedMouth === 'neutral') {
        ctx.beginPath();
        ctx.moveTo(-headRadius * 0.25, 0);
        ctx.lineTo(headRadius * 0.25, 0);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (selectedMouth === 'open') {
        ctx.beginPath();
        ctx.arc(0, 0, headRadius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (selectedMouth === 'tongue') {
        ctx.beginPath();
        ctx.ellipse(0, headRadius * 0.15, headRadius * 0.2, headRadius * 0.35, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fca5a5';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, headRadius * 0.25, 0, Math.PI);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore();

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [selectedSkinId, selectedEye, selectedMouth, skins]);

  // Handle skin lock unlocking
  const handlePurchase = () => {
    if (selectedSkinObject.unlocked) return;
    if (goldCoins >= selectedSkinObject.cost) {
      onBuySkin(selectedSkinId, selectedSkinObject.cost);
      audioSystem.playQuestComplete();
    } else {
      alert('Not enough gold coins! Slither in the game arena to collect more candy coins.');
    }
  };

  // Select skin to apply
  const handleSelect = () => {
    if (!selectedSkinObject.unlocked) return;
    onSelectSkin(selectedSkinId);
    onUpdateSkinFace(selectedEye, selectedMouth);
    audioSystem.playCollectPotion();
    onClose();
  };

  return (
    <div id="wardrobe_panel" className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white md:p-6 lg:p-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-slate-950 p-4 px-6 md:rounded-t-2xl">
        <button
          id="wardrobe_back_btn"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold tracking-wide text-slate-300 transition hover:bg-slate-850 hover:text-white"
        >
          <ArrowLeft size={16} /> Close Wardrobe
        </button>

        <h1 className="flex items-center gap-2 text-xl font-black tracking-wide uppercase text-yellow-400">
          <Sparkles size={20} className="text-yellow-400" /> Worm Wardrobe
        </h1>

        <div className="flex items-center gap-2 rounded-2xl bg-yellow-400/10 px-4 py-2 border border-yellow-400/20">
          <Coins size={18} className="text-yellow-400" />
          <span className="font-extrabold text-yellow-400 text-lg">{goldCoins}</span>
        </div>
      </div>

      {/* Main Wardrobe Grid */}
      <div className="flex flex-1 flex-col overflow-hidden leading-relaxed md:grid md:grid-cols-12 md:gap-6 md:p-4">
        
        {/* Left Column: Instant 60FPS Render Preview */}
        <div className="col-span-12 flex flex-col items-center justify-center bg-slate-90030 p-6 md:col-span-5 md:rounded-2xl border border-slate-900/50">
          <span className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Interactive Worm Render</span>
          <canvas
            id="wardrobe_preview_canvas"
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950 p-4 shadow-inner shadow-black/80"
          />

          <div className="mt-6 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold">{selectedSkinObject.name}</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xs capitalize">
              Style: <strong className="text-teal-400">{selectedSkinObject.type}</strong> skin pattern • custom glossy reflections
            </p>

            {/* Actions Panel */}
            <div className="mt-6 w-full space-y-3">
              {selectedSkinObject.unlocked ? (
                <button
                  id="apply_skin_btn"
                  onClick={handleSelect}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 font-extrabold tracking-wider text-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-102 hover:shadow-emerald-500/40 active:scale-98"
                >
                  <Check size={18} /> EQUIP SKIN & FACE
                </button>
              ) : (
                <button
                  id="unlock_skin_btn"
                  onClick={handlePurchase}
                  disabled={goldCoins < selectedSkinObject.cost}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-extrabold tracking-wider transition-all shadow-lg active:scale-98 ${
                    goldCoins >= selectedSkinObject.cost
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-yellow-500/25 hover:scale-102 hover:shadow-yellow-500/40'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Lock size={16} /> UNLOCK FOR {selectedSkinObject.cost} COINS
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Choices of Skins, Eyewears & Mouth Expressions */}
        <div className="col-span-12 flex flex-col overflow-y-auto p-4 md:col-span-7 bg-slate-900/10 md:rounded-2xl border border-slate-900/30">
          
          {/* Section 1: Choose Worm Skin Patterns */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold tracking-wider text-slate-400 uppercase">1. Skin Body Patterns</h4>
              <span className="text-xs text-slate-500">{skins.filter(s => s.unlocked).length} / {skins.length} Unlocked</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {skins.map((skin) => {
                const isSelected = skin.id === selectedSkinId;
                const isEquipped = skin.id === activeSkinId;

                return (
                  <button
                    id={`skin_item_${skin.id}`}
                    key={skin.id}
                    onClick={() => {
                      setSelectedSkinId(skin.id);
                      audioSystem.playBoost();
                    }}
                    className={`relative flex flex-col items-center justify-between rounded-xl border p-3.5 transition-all outline-hidden ${
                      isSelected
                        ? 'border-teal-500 bg-teal-950/20 ring-1 ring-teal-500/30'
                        : 'border-slate-850 bg-slate-900 hover:border-slate-750 hover:bg-slate-850'
                    }`}
                  >
                    {/* Tiny representation icon */}
                    <div className="flex h-7 w-full items-center justify-center gap-0.5 rounded-md bg-slate-950 px-1 overflow-hidden">
                      {skin.colors.map((c, idx) => (
                        <div
                          key={idx}
                          role="img"
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{
                            background: skin.type === 'rainbow'
                              ? 'linear-gradient(to right, red, orange, yellow, green, blue, purple)'
                              : c
                          }}
                        />
                      ))}
                    </div>

                    <div className="mt-3 text-center">
                      <div className="text-xs font-black truncate max-w-[100px]">{skin.name}</div>
                      {isEquipped ? (
                        <span className="mt-0.5 inline-block rounded-sm bg-teal-500/20 px-1.5 py-0.5 text-[8px] font-bold text-teal-400 uppercase">Equipped</span>
                      ) : skin.unlocked ? (
                        <span className="mt-0.5 inline-block text-[9px] text-slate-400 font-semibold">Ready</span>
                      ) : (
                        <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] font-bold text-yellow-500">
                          <Coins size={10} /> {skin.cost}
                        </span>
                      )}
                    </div>

                    {/* Unlocked / Locked tag badge */}
                    {!skin.unlocked && (
                      <div className="absolute top-1.5 right-1.5 text-xs text-slate-500">
                        <Lock size={12} className="text-slate-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Choose Eyewears & Expressions */}
          <div className="grid grid-cols-1 gap-6 border-t border-slate-900 pt-6 sm:grid-cols-2">
            
            {/* Eyes Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold tracking-wider text-slate-400 uppercase">2. Eyewear & Focus Eye</h4>
              <div className="flex flex-col gap-2">
                {EYE_STYLES.map((eye) => (
                  <button
                    id={`eye_style_${eye.id}`}
                    key={eye.id}
                    onClick={() => {
                      setSelectedEye(eye.id);
                      audioSystem.playEat();
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all outline-hidden ${
                      selectedEye === eye.id
                        ? 'border-teal-550 bg-teal-950/20 text-white'
                        : 'border-slate-850 bg-slate-900 text-slate-350 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">{eye.name}</span>
                    <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center p-0.5">
                      {selectedEye === eye.id && <div className="h-2 w-2 rounded-full bg-teal-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mouth Expressions Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold tracking-wider text-slate-400 uppercase">3. Mouth Expression</h4>
              <div className="flex flex-col gap-2">
                {MOUTH_STYLES.map((mouth) => (
                  <button
                    id={`mouth_style_${mouth.id}`}
                    key={mouth.id}
                    onClick={() => {
                      setSelectedMouth(mouth.id);
                      audioSystem.playEat();
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all outline-hidden ${
                      selectedMouth === mouth.id
                        ? 'border-indigo-550 bg-indigo-950/20 text-white'
                        : 'border-slate-850 bg-slate-900 text-slate-350 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">{mouth.name}</span>
                    <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center p-0.5">
                      {selectedMouth === mouth.id && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
