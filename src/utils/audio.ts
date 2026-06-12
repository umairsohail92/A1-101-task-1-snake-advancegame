/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private bgmLvl: GainNode | null = null;
  private musicPlaying: boolean = false;
  private musicTimeout: any = null;

  constructor() {
    // Load mute preference from storage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('worms_zone_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('worms_zone_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playEat() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      // Pitch sweep up for satisfying swallow sound
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  public playExplosion() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      
      // Synthesize noise-burst like explosion
      const duration = 0.4;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(10, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);

      // Add a low frequency sub bass drop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  public playCollectPotion() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Synthesize a sparkling arpeggio chime
      const frequencies = [330, 440, 554, 660, 880];
      const duration = 0.5;

      frequencies.forEach((freq, idx) => {
        const time = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.0, now);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.18);
      });
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  public playQuestComplete() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const scale = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      
      scale.forEach((freq, index) => {
        const toneTime = now + index * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, toneTime);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.setValueAtTime(0.15, toneTime);
        gain.gain.exponentialRampToValueAtTime(0.01, toneTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(toneTime);
        osc.stop(toneTime + 0.3);
      });
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  public playBoost() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  public startMusic() {
    this.initContext();
    if (!this.ctx || this.isMuted || this.musicPlaying) return;

    try {
      this.musicPlaying = true;
      this.bgmLvl = this.ctx.createGain();
      this.bgmLvl.gain.setValueAtTime(0.03, this.ctx.currentTime); // very low ambient background music
      this.bgmLvl.connect(this.ctx.destination);

      this.playMusicSequence();
    } catch (e) {
      console.warn('Music failed to start', e);
    }
  }

  private playMusicSequence() {
    if (!this.ctx || this.isMuted || !this.musicPlaying || !this.bgmLvl) return;

    try {
      const now = this.ctx.currentTime;
      
      // Let's create a cute chiptune arpeggiator or gentle looping chord pad
      // We will define a list of pleasant chords
      // Am (A3, C4, E4), F (F3, A3, C4), C (C3, E3, G3), G (G3, B3, D4)
      const chords = [
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63], // F
        [130.81, 164.81, 196.00], // C
        [196.00, 246.94, 293.66], // G
      ];

      let chordIdx = 0;
      const chordDuration = 4.0; // 4 seconds per chord

      const scheduleNextChord = () => {
        if (!this.musicPlaying || !this.ctx || !this.bgmLvl) return;
        const baseTime = this.ctx.currentTime;
        const currentChord = chords[chordIdx];

        currentChord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const oscGain = this.ctx!.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, baseTime);
          
          oscGain.gain.setValueAtTime(0.0, baseTime);
          oscGain.gain.linearRampToValueAtTime(0.4, baseTime + 0.5); // fade in
          oscGain.gain.setValueAtTime(0.4, baseTime + chordDuration - 0.5);
          oscGain.gain.linearRampToValueAtTime(0.01, baseTime + chordDuration); // fade out

          osc.connect(oscGain);
          oscGain.connect(this.bgmLvl!);
          
          osc.start(baseTime);
          osc.stop(baseTime + chordDuration);
          
          this.bgmOscs.push({ osc, gain: oscGain });
        });

        // Add a gentle rhythmic melody note on top
        const melodyNotes = [
          [329.63, 392.00, 440.00, 523.25], // high C, A, G, E
          [349.23, 440.00, 523.25, 587.33],
          [261.63, 329.63, 392.00, 440.00],
          [293.66, 392.00, 440.00, 493.88],
        ][chordIdx];

        melodyNotes.forEach((freq, noteIdx) => {
          const noteTime = baseTime + noteIdx * 1.0;
          const mOsc = this.ctx!.createOscillator();
          const mGain = this.ctx!.createGain();

          mOsc.type = 'triangle';
          mOsc.frequency.setValueAtTime(freq, noteTime);

          mGain.gain.setValueAtTime(0.0, noteTime);
          mGain.gain.linearRampToValueAtTime(0.12, noteTime + 0.1);
          mGain.gain.setValueAtTime(0.12, noteTime + 0.4);
          mGain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.8);

          mOsc.connect(mGain);
          mGain.connect(this.bgmLvl!);

          mOsc.start(noteTime);
          mOsc.stop(noteTime + 0.9);

          this.bgmOscs.push({ osc: mOsc, gain: mGain });
        });

        chordIdx = (chordIdx + 1) % chords.length;
        this.musicTimeout = setTimeout(scheduleNextChord, chordDuration * 1000 - 50);
      };

      scheduleNextChord();
    } catch (e) {
      console.warn('Error scheduling music', e);
    }
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    this.bgmOscs.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    });
    this.bgmOscs = [];
    if (this.bgmLvl) {
      try {
        this.bgmLvl.disconnect();
      } catch (e) {}
      this.bgmLvl = null;
    }
  }
}

export const audioSystem = new AudioSystem();
