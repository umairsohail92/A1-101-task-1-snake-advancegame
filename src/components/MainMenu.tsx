/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Sparkles, Settings, Trophy, Sword, Coins, Star, HelpCircle, CheckCircle2 } from 'lucide-react';
import { PlayerStats, GameQuest, HighScore, WormSkin } from '../types';
import { audioSystem } from '../utils/audio';

interface MainMenuProps {
  stats: PlayerStats;
  quests: GameQuest[];
  leaderboard: HighScore[];
  skins: WormSkin[];
  activeSkinId: string;
  onStartGame: () => void;
  onOpenWardrobe: () => void;
  onOpenSettings: () => void;
  onClaimReward: (questId: string) => void;
}

export default function MainMenu({
  stats,
  quests,
  leaderboard,
  skins,
  activeSkinId,
  onStartGame,
  onOpenWardrobe,
  onOpenSettings,
  onClaimReward,
}: MainMenuProps) {
  const currentSkin = skins.find((s) => s.id === activeSkinId) || skins[0];

  // Quick sound test and start BGM on first interaction
  const handlePlayClick = () => {
    audioSystem.playCollectPotion();
    audioSystem.startMusic();
    onStartGame();
  };

  const handleClaim = (quest: GameQuest) => {
    if (quest.completed && quest.current >= quest.target) {
      onClaimReward(quest.id);
      audioSystem.playQuestComplete();
    }
  };

  return (
    <div id="main_menu_panel" className="relative flex min-h-screen flex-col items-center justify-between bg-slate-950 px-4 py-8 text-white select-none overflow-x-hidden md:px-8">
      
      {/* Background radial soft light blobs for immersive feel */}
      <div className="absolute top-[10%] left-[10%] h-96 w-96 rounded-full bg-teal-500/10 blur-[80px]" />
      <div className="absolute bottom-[20%] right-[10%] h-96 w-96 rounded-full bg-indigo-500/10 blur-[80px]" />

      {/* Header Bar */}
      <div className="relative z-10 flex w-full max-w-6xl items-center justify-between">
        
        {/* Logo and Name */}
        <div id="game_logo" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-indigo-600 shadow-lg shadow-teal-500/20">
            <Sword size={20} className="text-white transform -rotate-45" />
          </div>
          <div className="text-left leading-none">
            <span className="text-sm font-black tracking-widest text-teal-400 uppercase">Worms Zone</span>
            <h1 className="text-lg font-extrabold tracking-tight text-white leading-tight">Slither Arena</h1>
          </div>
        </div>

        {/* Stats Summary Panel */}
        <div className="flex items-center gap-3">
          
          {/* Experience level bar */}
          <div className="hidden items-center gap-2 rounded-2xl bg-slate-900/85 px-4 py-1.5 border border-slate-800/80 sm:flex">
            <Star className="text-amber-400" size={16} />
            <div className="text-left text-xs leading-none">
              <div className="font-extrabold">Rank {stats.rankLevel}</div>
              <div className="mt-1 h-1 w-20 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
                  style={{ width: `${Math.min(100, (stats.rankExp / 100) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Golden Coins display */}
          <div className="flex items-center gap-2 rounded-2xl bg-yellow-400/10 px-4 py-1.5 border border-yellow-400/20">
            <Coins className="text-yellow-400" size={16} />
            <span className="font-black text-yellow-400 text-sm">{stats.goldCoins}</span>
          </div>

          {/* Quick Settings Gear Icon */}
          <button
            id="settings_toggle_btn"
            onClick={onOpenSettings}
            className="rounded-xl border border-slate-800 bg-slate-900/85 p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Settings size={18} />
          </button>

        </div>
      </div>

      {/* Main Grid Content */}
      <div className="relative z-10 my-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-12">
        
        {/* Left Aspect: Arena Quests / Daily Missions Board */}
        <div className="col-span-12 rounded-3xl border border-slate-900 bg-slate-900/30 p-5 md:col-span-4 flex flex-col justify-between backdrop-blur-md">
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase">Daily Arena Quests</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Slay bots and grow massive to claim coins</p>
            
            <div className="mt-4 space-y-3">
              {quests.map((quest) => {
                const percent = Math.min(100, (quest.current / quest.target) * 100);
                const isReady = quest.current >= quest.target;
                
                return (
                  <div key={quest.id} className="rounded-2xl border border-slate-850 bg-slate-900/60 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold leading-snug">{quest.description}</p>
                      {quest.completed ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-0.5 shrink-0">
                          <Coins size={10} /> +{quest.rewardCoins}
                        </span>
                      )}
                    </div>

                    {!quest.completed && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{quest.current} / {quest.target}</span>
                          <span>{Math.floor(percent)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${isReady ? 'from-emerald-400 to-teal-500' : 'from-indigo-400 to-indigo-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Claim action */}
                        {isReady && !quest.completed && (
                          <button
                            id={`claim_quest_btn_${quest.id}`}
                            onClick={() => handleClaim(quest)}
                            className="mt-1.5 w-full py-1 text-center font-extrabold text-[10px] uppercase tracking-wide bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-lg transition hover:scale-101 active:scale-99"
                          >
                            CLAIM COINS
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brief controls hint below quests */}
          <div className="mt-4 rounded-xl bg-slate-900 p-3 border border-slate-850 flex items-center gap-2">
            <HelpCircle size={14} className="text-slate-500 shrink-0" />
            <span className="text-[9px] text-slate-400 leading-tight">
              <strong>Controls Warning:</strong> Drag cursor or touch screen to slide. <strong>Hold spacebar</strong> or double tap to activate fast <strong>Speed Boost</strong>.
            </span>
          </div>
        </div>

        {/* Center Aspect: Big Shiny PLAY Button & Worm Skin Canvas Preview */}
        <div className="col-span-12 flex flex-col items-center justify-center space-y-6 md:col-span-4">
          
          {/* Avatar Area shortcuts to wardrobe */}
          <div className="group relative cursor-pointer" onClick={onOpenWardrobe}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500/20 to-indigo-505/20 blur-xl group-hover:blur-2xl transition" />
            
            {/* The actual worm cosmetic display avatar */}
            <div className="relative flex flex-col items-center justify-center border border-slate-800 bg-slate-900 rounded-3xl p-6 px-10 shadow-xl transition-transform duration-300 hover:scale-105 active:scale-98">
              {/* Animated sparkles */}
              <Sparkles size={16} className="absolute top-3 right-3 text-yellow-400 animate-bounce" />
              
              {/* Dynamic preview pattern box */}
              <div className="h-14 w-14 rounded-full border-2 border-dashed border-teal-500/30 p-1 mb-3 flex items-center justify-center">
                <div
                  className="h-full w-full rounded-full shadow-inner border border-black/10"
                  style={{
                    background: currentSkin.type === 'rainbow'
                      ? 'radial-gradient(circle, #f43f5e, #eab308, #10b981, #3b82f6)'
                      : currentSkin.colors[0]
                  }}
                />
              </div>

              <div className="text-center leading-none">
                <span className="text-[9px] tracking-wider text-slate-500 uppercase font-black">ACTIVE SKIN</span>
                <div className="text-xs font-black mt-1 capitalize text-teal-400">{currentSkin.name}</div>
                <div className="mt-2 text-[10px] text-slate-400 underline font-semibold">Change Skins & Face</div>
              </div>
            </div>
          </div>

          {/* Main Play CTA Button */}
          <button
            id="play_game_main_btn"
            onClick={handlePlayClick}
            className="group relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-teal-400 via-teal-500 to-indigo-600 p-0.5 text-black shadow-2xl transition-all duration-310 hover:scale-110 active:scale-95 cursor-pointer shadow-teal-500/20"
          >
            {/* Glow ring */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-teal-400 to-indigo-600 opacity-25 blur-md group-hover:opacity-40 transition" />
            
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-300 group-hover:bg-transparent group-hover:text-black">
              <Play size={26} fill="currentColor" className="text-teal-400 transform translate-x-0.5 group-hover:text-black transition-colors" />
              <span className="mt-1 text-xs font-black tracking-widest uppercase">PLAY</span>
            </div>
          </button>

          {/* Top Score stats banner */}
          <div className="text-center leading-normal">
            <span className="text-[10px] tracking-widest text-slate-500 font-bold uppercase">HIGH RECORD</span>
            <div className="text-lg font-black text-yellow-400 mt-0.5">{(stats.highestScore || 0).toLocaleString()}</div>
          </div>

        </div>

        {/* Right Aspect: Top 10 Arena High Scores Leaderboard */}
        <div className="col-span-12 rounded-3xl border border-slate-900 bg-slate-900/30 p-5 md:col-span-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-900/80 pb-2">
            <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-400" /> Giant Leaderboard
            </h3>
            <span className="text-[9px] text-slate-500">Live stats</span>
          </div>

          <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {leaderboard.map((leader, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-xl p-2 px-3 transition border ${
                    leader.isPlayer
                      ? 'border-teal-500/30 bg-teal-950/20 text-teal-400 font-black'
                      : 'border-slate-850 bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black flex h-5 w-5 items-center justify-center rounded-md ${
                        isFirst
                          ? 'bg-yellow-400 text-black'
                          : isSecond
                          ? 'bg-slate-300 text-black'
                          : isThird
                          ? 'bg-amber-600 text-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-xs truncate max-w-[110px]">{leader.name}</span>
                  </div>
                  <span className="text-xs font-bold leading-none">{leader.score.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-[10px] text-slate-600 font-medium">
        Worms Zone Slither Arena Clone • Made in React Canvas with 60FPS physics
      </div>
    </div>
  );
}
