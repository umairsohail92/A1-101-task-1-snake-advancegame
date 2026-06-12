/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import Wardrobe from './components/Wardrobe';
import SettingsOverlay from './components/SettingsOverlay';
import GameOverOverlay from './components/GameOverOverlay';
import { PlayerStats, GameQuest, HighScore, WormSkin } from './types';
import { INITIAL_SKINS } from './utils/skins';
import { audioSystem } from './utils/audio';

// Default initial high scores to display
const DEFAULT_LEADERBOARD: HighScore[] = [
  { name: 'SlitherViper★', score: 38400, date: '2026-05-10', isPlayer: false },
  { name: 'VoraciousWorm', score: 25900, date: '2026-06-01', isPlayer: false },
  { name: 'CandyBinge', score: 18250, date: '2026-06-11', isPlayer: false },
  { name: 'GrizzlyGlutton', score: 14700, date: '2026-06-05', isPlayer: false },
  { name: 'TurboCrawl', score: 10500, date: '2026-06-09', isPlayer: false },
  { name: 'MegaSnake99', score: 8200, date: '2026-06-07', isPlayer: false },
  { name: 'CheeseDemon', score: 6400, date: '2026-06-02', isPlayer: false },
  { name: 'DonutLover', score: 4500, date: '2026-06-10', isPlayer: false },
];

const DEFAULT_QUESTS: GameQuest[] = [
  {
    id: 'quest_delicacies',
    description: 'Grow massive: Accumulate total delicacies eaten',
    target: 5000,
    current: 0,
    completed: false,
    rewardCoins: 150,
    type: 'eat_food',
  },
  {
    id: 'quest_kills',
    description: 'Slay competitor bots in the slither arena',
    target: 15,
    current: 0,
    completed: false,
    rewardCoins: 250,
    type: 'kill_worms',
  },
  {
    id: 'quest_weight',
    description: 'Achieve a singular heavy weight of 2,500',
    target: 2500,
    current: 0,
    completed: false,
    rewardCoins: 400,
    type: 'reach_length',
  },
];

export default function App() {
  const [view, setView] = React.useState<'menu' | 'playing'>('menu');
  const [showWardrobe, setShowWardrobe] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  
  // Game Over view details
  const [gameOverStats, setGameOverStats] = React.useState<{
    score: number;
    kills: number;
    earnedCoins: number;
    unlockedRankUp: boolean;
    newRank: number;
  } | null>(null);

  // Persistence State
  const [stats, setStats] = React.useState<PlayerStats>({
    gamesPlayed: 0,
    totalKills: 0,
    highestScore: 0,
    totalFoodEaten: 0,
    goldCoins: 250, // Give some sweet starting coins for fun wardrobe tests!
    rankLevel: 1,
    rankExp: 0,
    unlockedSkins: ['basic_orange', 'neon_candy'],
    activeSkinId: 'basic_orange',
  });

  const [quests, setQuests] = React.useState<GameQuest[]>(DEFAULT_QUESTS);
  const [leaderboard, setLeaderboard] = React.useState<HighScore[]>(DEFAULT_LEADERBOARD);
  const [skins, setSkins] = React.useState<WormSkin[]>(INITIAL_SKINS);

  // Settings configs
  const [controlType, setControlType] = React.useState<'pointer' | 'joystick' | 'keyboard'>('pointer');
  const [quality, setQuality] = React.useState<'high' | 'low'>('high');

  // Load from LocalStorage on mount
  React.useEffect(() => {
    try {
      const savedStats = localStorage.getItem('worms_zone_player_stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }

      const savedQuests = localStorage.getItem('worms_zone_quests');
      if (savedQuests) {
        setQuests(JSON.parse(savedQuests));
      }

      const savedLeader = localStorage.getItem('worms_zone_leaderboard');
      if (savedLeader) {
        setLeaderboard(JSON.parse(savedLeader));
      }

      const savedQuality = localStorage.getItem('worms_zone_quality');
      if (savedQuality) {
        setQuality(savedQuality as 'high' | 'low');
      }

      const savedControl = localStorage.getItem('worms_zone_controls');
      if (savedControl) {
        setControlType(savedControl as 'pointer' | 'joystick' | 'keyboard');
      }
    } catch (e) {
      console.warn('LocalStorage load failure', e);
    }
  }, []);

  // Save updates helper
  const saveStatsUpdate = (updatedStats: PlayerStats) => {
    setStats(updatedStats);
    localStorage.setItem('worms_zone_player_stats', JSON.stringify(updatedStats));
  };

  const saveQuestsUpdate = (updatedQuests: GameQuest[]) => {
    setQuests(updatedQuests);
    localStorage.setItem('worms_zone_quests', JSON.stringify(updatedQuests));
  };

  const saveLeaderboardUpdate = (updatedLeader: HighScore[]) => {
    setLeaderboard(updatedLeader);
    localStorage.setItem('worms_zone_leaderboard', JSON.stringify(updatedLeader));
  };

  // Synced skins configuration
  const currentSkinsList = skins.map((sk) => ({
    ...sk,
    unlocked: stats.unlockedSkins.includes(sk.id),
  }));

  const handleSelectSkin = (skinId: string) => {
    const updated = {
      ...stats,
      activeSkinId: skinId,
    };
    saveStatsUpdate(updated);
  };

  const handleBuySkin = (skinId: string, cost: number) => {
    if (stats.goldCoins >= cost) {
      const updated = {
        ...stats,
        goldCoins: stats.goldCoins - cost,
        unlockedSkins: [...stats.unlockedSkins, skinId],
        activeSkinId: skinId,
      };
      saveStatsUpdate(updated);
    }
  };

  const handleUpdateSkinFace = (eyeStyle: WormSkin['eyeStyle'], mouthStyle: WormSkin['mouthStyle']) => {
    // Update local skin properties in state
    setSkins((prev) =>
      prev.map((sk) =>
        sk.id === stats.activeSkinId ? { ...sk, eyeStyle, mouthStyle } : sk
      )
    );
  };

  // Claim finished quest rewards
  const handleClaimReward = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const newStats = {
      ...stats,
      goldCoins: stats.goldCoins + quest.rewardCoins,
    };

    const newQuests = quests.map((q) =>
      q.id === questId ? { ...q, completed: true } : q
    );

    saveStatsUpdate(newStats);
    saveQuestsUpdate(newQuests);
  };

  // Reset progress from settings
  const handleResetAllData = () => {
    localStorage.removeItem('worms_zone_player_stats');
    localStorage.removeItem('worms_zone_quests');
    localStorage.removeItem('worms_zone_leaderboard');
    localStorage.removeItem('worms_zone_quality');
    localStorage.removeItem('worms_zone_controls');
    
    setStats({
      gamesPlayed: 0,
      totalKills: 0,
      highestScore: 0,
      totalFoodEaten: 0,
      goldCoins: 250,
      rankLevel: 1,
      rankExp: 0,
      unlockedSkins: ['basic_orange', 'neon_candy'],
      activeSkinId: 'basic_orange',
    });
    setQuests(DEFAULT_QUESTS);
    setLeaderboard(DEFAULT_LEADERBOARD);
    setControlType('pointer');
    setQuality('high');
    audioSystem.playExplosion();
  };

  // Match complete logic
  const handleMatchFinished = (finalScore: number, finalKills: number, collectedCoins: number) => {
    setView('menu');

    // Experience calculation: score / 15
    const expGain = Math.floor(finalScore / 15);
    let newExp = stats.rankExp + expGain;
    let currentLevel = stats.rankLevel;
    let unlockedRankUp = false;

    // level bounds (150 exp per level)
    const expLevelBound = 150;
    while (newExp >= expLevelBound) {
      newExp -= expLevelBound;
      currentLevel += 1;
      unlockedRankUp = true;
    }

    // High score check
    const isNewHigh = finalScore > stats.highestScore;
    const recordsScore = isNewHigh ? finalScore : stats.highestScore;

    // Increment progression metrics
    const updatedStats: PlayerStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      totalKills: stats.totalKills + finalKills,
      totalFoodEaten: stats.totalFoodEaten + finalScore,
      highestScore: recordsScore,
      goldCoins: stats.goldCoins + collectedCoins,
      rankLevel: currentLevel,
      rankExp: newExp,
    };

    saveStatsUpdate(updatedStats);

    // Update Leaderboard if player is in top metrics
    let leaderboardList = [...leaderboard];
    const isWorthy = finalScore > 0 && (leaderboardList.length < 8 || finalScore > leaderboardList[leaderboardList.length - 1].score);
    
    if (isWorthy) {
      leaderboardList.push({
        name: 'You ★',
        score: finalScore,
        date: new Date().toISOString().split('T')[0],
        isPlayer: true,
      });
      // Sort and trim
      leaderboardList = leaderboardList
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      saveLeaderboardUpdate(leaderboardList);
    }

    // Update quest counts
    const updatedQuests = quests.map((q) => {
      if (q.completed) return q;
      
      let nextVal = q.current;
      if (q.type === 'eat_food') {
        nextVal += finalScore;
      } else if (q.type === 'kill_worms') {
        nextVal += finalKills;
      } else if (q.type === 'reach_length') {
        nextVal = Math.max(q.current, finalScore);
      }

      return {
        ...q,
        current: nextVal,
      };
    });
    saveQuestsUpdate(updatedQuests);

    // Save final screen display state inputs
    setGameOverStats({
      score: finalScore,
      kills: finalKills,
      earnedCoins: collectedCoins,
      unlockedRankUp: unlockedRankUp,
      newRank: currentLevel,
    });
  };

  return (
    <div id="full_game_app_container" className="h-screen w-screen bg-slate-950 font-sans select-none">
      
      {/* 1. Main Menu Mode */}
      {view === 'menu' && (
        <MainMenu
          stats={stats}
          quests={quests}
          leaderboard={leaderboard}
          skins={currentSkinsList}
          activeSkinId={stats.activeSkinId}
          onStartGame={() => setView('playing')}
          onOpenWardrobe={() => setShowWardrobe(true)}
          onOpenSettings={() => setShowSettings(true)}
          onClaimReward={handleClaimReward}
        />
      )}

      {/* 2. Active Game Mode (Canvas) */}
      {view === 'playing' && (
        <GameCanvas
          playerStats={stats}
          activeSkinId={stats.activeSkinId}
          skins={currentSkinsList}
          quality={quality}
          controlType={controlType}
          onGameFinished={handleMatchFinished}
          onExit={() => setView('menu')}
        />
      )}

      {/* Wardrobe Modal overlay */}
      {showWardrobe && (
        <Wardrobe
          skins={currentSkinsList}
          activeSkinId={stats.activeSkinId}
          goldCoins={stats.goldCoins}
          onSelectSkin={handleSelectSkin}
          onBuySkin={handleBuySkin}
          onUpdateSkinFace={handleUpdateSkinFace}
          onClose={() => setShowWardrobe(false)}
        />
      )}

      {/* Settings Modal overlay */}
      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          controlType={controlType}
          setControlType={(type) => {
            setControlType(type);
            localStorage.setItem('worms_zone_controls', type);
          }}
          renderQuality={quality}
          setRenderQuality={(q) => {
            setQuality(q);
            localStorage.setItem('worms_zone_quality', q);
          }}
          onResetData={handleResetAllData}
        />
      )}

      {/* Game Over modal prompt */}
      {gameOverStats && (
        <GameOverOverlay
          score={gameOverStats.score}
          kills={gameOverStats.kills}
          earnedCoins={gameOverStats.earnedCoins}
          unlockedRankUp={gameOverStats.unlockedRankUp}
          newRank={gameOverStats.newRank}
          onRestart={() => {
            setGameOverStats(null);
            setView('playing');
          }}
          onGoToMenu={() => {
            setGameOverStats(null);
            setView('menu');
          }}
        />
      )}
    </div>
  );
}
