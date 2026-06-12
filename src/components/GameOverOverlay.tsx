/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trophy, Swords, Sparkles, RefreshCw, LogOut, Award, Star } from 'lucide-react';

interface GameOverOverlayProps {
  score: number;
  kills: number;
  earnedCoins: number;
  unlockedRankUp: boolean;
  newRank: number;
  onRestart: () => void;
  onGoToMenu: () => void;
}

export default function GameOverOverlay({
  score,
  kills,
  earnedCoins,
  unlockedRankUp,
  newRank,
  onRestart,
  onGoToMenu,
}: GameOverOverlayProps) {
  return (
    <div id="game_over_panel" className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/20 bg-slate-930 text-white shadow-2xl">
        {/* Animated accent gradient strip */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-rose-600"></div>

        {/* Big Game Over Header */}
        <div className="mt-8 flex flex-col items-center justify-center space-y-1 text-center">
          <div className="rounded-2xl border border-red-500/10 bg-red-500/10 p-3.5 text-red-500 shadow-xl">
            <Swords size={28} />
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-wider uppercase text-red-500 sm:text-4xl">WORM DEFEATED</h2>
          <p className="text-xs text-slate-400">Your head crashed into another slithering worm segment!</p>
        </div>

        {/* Score Stats Grid */}
        <div className="mt-6 px-6 sm:px-8">
          <div className="grid grid-cols-2 gap-3">
            
            {/* Score segment */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-inner">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">FINAL WEIGHT</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <Trophy size={18} className="text-yellow-400" />
                <span className="text-2xl font-black text-yellow-400">{score.toLocaleString()}</span>
              </div>
            </div>

            {/* Kills segment */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-inner">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">WORM KILLS</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <Award size={18} className="text-rose-400" />
                <span className="text-2xl font-black text-rose-400">{kills}</span>
              </div>
            </div>

          </div>

          {/* Reward and Ranks Progression */}
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900 p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Gold coins collected:</span>
              <div className="flex items-center gap-1.5 font-black text-yellow-400">
                <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                <span>+{earnedCoins} Coins</span>
              </div>
            </div>

            {unlockedRankUp ? (
              <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 p-3 border border-teal-500/20 text-teal-400">
                <Star size={18} className="text-teal-400 animate-spin" />
                <div className="text-left leading-tight">
                  <div className="text-xs font-black uppercase">Arena Rank Promotion!</div>
                  <div className="text-[10px] text-slate-400">You achieved rank level <span className="text-teal-400 font-bold">{newRank}</span>!</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ranks Progression:</span>
                <span className="font-semibold text-slate-300">Exp gained from slithers</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Actions */}
        <div className="mt-8 flex flex-col gap-2 border-t border-slate-900 bg-slate-950 p-6 leading-relaxed sm:flex-row">
          <button
            id="respawn_game_btn"
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 font-extrabold text-black uppercase shadow-lg shadow-emerald-500/15 transition-all hover:scale-101 hover:shadow-emerald-500/25 cursor-pointer"
          >
            <RefreshCw size={16} className="animate-spin-slow" /> SLITHER AGAIN
          </button>
          
          <button
            id="exit_to_menu_btn"
            onClick={onGoToMenu}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-850 bg-slate-900 px-6 py-3.5 font-bold tracking-wide text-slate-300 transition hover:bg-slate-850 hover:text-white cursor-pointer"
          >
            <LogOut size={16} /> Exit Arena
          </button>
        </div>
      </div>
    </div>
  );
}
