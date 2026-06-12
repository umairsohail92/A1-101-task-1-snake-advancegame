/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Volume2, VolumeX, Eye, ShieldAlert, RotateCcw } from 'lucide-react';
import { audioSystem } from '../utils/audio';

interface SettingsOverlayProps {
  onClose: () => void;
  controlType: 'pointer' | 'joystick' | 'keyboard';
  setControlType: (type: 'pointer' | 'joystick' | 'keyboard') => void;
  renderQuality: 'high' | 'low';
  setRenderQuality: (q: 'high' | 'low') => void;
  onResetData: () => void;
}

export default function SettingsOverlay({
  onClose,
  controlType,
  setControlType,
  renderQuality,
  setRenderQuality,
  onResetData,
}: SettingsOverlayProps) {
  const [muted, setMuted] = React.useState(audioSystem.getMuted());

  const handleToggleMute = () => {
    const isMutedNow = audioSystem.toggleMute();
    setMuted(isMutedNow);
  };

  const handleResetConfirm = () => {
    if (window.confirm('Are you absolutely sure you want to reset all game data? This will clear your high score, custom skins, level progress, and coins!')) {
      onResetData();
      onClose();
    }
  };

  return (
    <div id="settings_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        {/* Header decoration */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 px-6">
          <h2 className="text-xl font-bold tracking-wide">Game Settings</h2>
          <button
            id="close_settings_btn"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Sound Controls */}
          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Sound & Theme Action</label>
            <button
              id="toggle_audio_settings"
              onClick={handleToggleMute}
              className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
                muted
                  ? 'border-red-500/30 bg-red-950/10 hover:bg-red-950/20'
                  : 'border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {muted ? (
                  <VolumeX className="text-red-400" size={22} />
                ) : (
                  <Volume2 className="text-emerald-400" size={22} />
                )}
                <div className="text-left">
                  <div className="font-bold">{muted ? 'Muted' : 'Sound Enabled'}</div>
                  <div className="text-xs text-slate-400">Synthesizer game noise, sound effects & music</div>
                </div>
              </div>
              <div className={`h-6 w-11 rounded-full p-0.5 transition-colors ${muted ? 'bg-slate-700' : 'bg-emerald-500'}`}>
                <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${muted ? 'translate-x-0' : 'translate-x-5'}`} />
              </div>
            </button>
          </div>

          {/* Core Controls */}
          <div className="space-y-3">
            <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Control Layout</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="control_pointer_btn"
                onClick={() => setControlType('pointer')}
                className={`rounded-xl border p-3 text-center transition-all ${
                  controlType === 'pointer'
                    ? 'border-teal-500 bg-teal-500/10 font-bold text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Pointer</div>
                <span className="text-[10px] opacity-60">Follows Cursor</span>
              </button>
              <button
                id="control_joystick_btn"
                onClick={() => setControlType('joystick')}
                className={`rounded-xl border p-3 text-center transition-all ${
                  controlType === 'joystick'
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Joystick</div>
                <span className="text-[10px] opacity-60">Virtual stick</span>
              </button>
              <button
                id="control_keyboard_btn"
                onClick={() => setControlType('keyboard')}
                className={`rounded-xl border p-3 text-center transition-all ${
                  controlType === 'keyboard'
                    ? 'border-violet-500 bg-violet-500/10 font-bold text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">WASD Keys</div>
                <span className="text-[10px] opacity-60">Keyboard steer</span>
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="space-y-3">
            <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Rendering Performance</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="quality_high_btn"
                onClick={() => setRenderQuality('high')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  renderQuality === 'high'
                    ? 'border-teal-500 bg-teal-500/10 font-bold text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={16} />
                <span className="text-xs">High Quality</span>
              </button>
              <button
                id="quality_low_btn"
                onClick={() => setRenderQuality('low')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  renderQuality === 'low'
                    ? 'border-yellow-600 bg-yellow-600/10 font-bold text-white'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert size={16} />
                <span className="text-xs">Eco (No grid lines)</span>
              </button>
            </div>
          </div>

          {/* Reset Progress */}
          <div className="border-t border-slate-800 pt-5">
            <button
              id="reset_game_data_btn"
              onClick={handleResetConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-950/10 p-3 text-xs font-semibold text-red-400 transition hover:bg-red-900/20"
            >
              <RotateCcw size={14} />
              Reset All Account Progression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
