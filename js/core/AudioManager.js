/* ============================================================
   METEORFALL — AudioManager.js
   All sound is synthesized with the Web Audio API:
   gunshots, explosions, monster calls, ambience, and a dynamic
   music system (exploration / combat / boss) with crossfades.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.categories = {};
      this.volumes = { master: 0.8, music: 0.55, sfx: 0.9, ambience: 0.5, voice: 0.9 };
      this.musicMode = "none";
      this.enabled = true;
      this._noiseBuf = null;
      this._musicNodes = null;
      this._listener = { x: 0, y: 0, z: 0, angle: 0 };
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.master.connect(this.ctx.destination);
      for (const key of ["music", "sfx", "ambience", "voice"]) {
        const g = this.ctx.createGain();
        g.gain.value = this.volumes[key];
        g.connect(this.master);
        this.categories[key] = g;
      }
      // shared noise buffer (2s of white noise)
      const len = this.ctx.sampleRate * 2;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.startAmbience();
    }

    resume() {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    }

    setVolume(category, v) {
      v = MF.clamp(v, 0, 1);
      this.volumes[category] = v;
      if (category === "master" && this.master) this.master.gain.value = v;
      else if (this.categories[category]) this.categories[category].gain.value = v;
    }

    now() { return this.ctx ? this.ctx.currentTime : 0; }

    /* Positional helper: gain + stereo pan from world position */
    _spatial(pos, baseGain, basePan) {
      let gain = baseGain === undefined ? 1 : baseGain;
      let pan = basePan || 0;
      if (pos) {
        const dx = pos.x - this._listener.x, dz = pos.z - this._listener.z;
        const d = Math.hypot(dx, dz);
        gain *= MF.clamp(1 - d / 160, 0, 1);
        const ang = Math.atan2(dx, dz) - this._listener.angle;
        pan = MF.clamp(Math.sin(ang), -1, 1) * 0.8;
      }
      return { gain, pan };
    }

    _env(gainNode, t0, attack, decay, peak) {
      const g = gainNode.gain;
      g.setValueAtTime(0.0001, t0);
      g.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + attack);
      g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    }

    _noiseSource(t0, dur, filterType, freq, q) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = filterType || "bandpass";
      filt.frequency.value = freq || 1200;
      filt.Q.value = q || 1;
      src.connect(filt);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
      return filt;
    }

    /* ---------------- weapon sounds ---------------- */
    playShot(kind, pos) {
      if (!this.ctx) return;
      const t0 = this.now();
      const s = this._spatial(pos, 1);
      const out = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = s.pan; out.connect(pan); pan.connect(this.categories.sfx); }
      else out.connect(this.categories.sfx);
      out.gain.value = s.gain;

      const cfg = {
        ar: { f: 1800, q: 0.8, d: 0.09, thump: 95, td: 0.06 },
        sniper: { f: 900, q: 0.6, d: 0.22, thump: 60, td: 0.14 },
        shotgun: { f: 700, q: 0.5, d: 0.18, thump: 55, td: 0.12 },
        minigun: { f: 2400, q: 1.2, d: 0.05, thump: 130, td: 0.03 },
        rocket: { f: 400, q: 2, d: 0.5, thump: 70, td: 0.2 },
        alien: { f: 1600, q: 4, d: 0.16, thump: 220, td: 0.1 },
      }[kind] || { f: 1500, q: 1, d: 0.1, thump: 90, td: 0.06 };

      const filt = this._noiseSource(t0, cfg.d, "bandpass", cfg.f, cfg.q);
      const g = this.ctx.createGain();
      filt.connect(g); g.connect(out);
      this._env(g, t0, 0.001, cfg.d, 0.7);

      // low thump oscillator
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(cfg.thump * 3, t0);
      osc.frequency.exponentialRampToValueAtTime(cfg.thump, t0 + cfg.td);
      const og = this.ctx.createGain();
      osc.connect(og); og.connect(out);
      this._env(og, t0, 0.001, cfg.td, 0.9);
      osc.start(t0); osc.stop(t0 + cfg.td + 0.05);

      if (kind === "rocket") {
        // whoosh rising pitch
        const w = this.ctx.createOscillator();
        w.type = "sawtooth";
        w.frequency.setValueAtTime(180, t0);
        w.frequency.exponentialRampToValueAtTime(900, t0 + 0.4);
        const wg = this.ctx.createGain();
        w.connect(wg); wg.connect(out);
        this._env(wg, t0, 0.05, 0.4, 0.25);
        w.start(t0); w.stop(t0 + 0.5);
      }
    }

    playExplosion(pos, scale) {
      if (!this.ctx) return;
      scale = scale || 1;
      const t0 = this.now();
      const s = this._spatial(pos, 1);
      const out = this.ctx.createGain();
      out.gain.value = s.gain * scale;
      out.connect(this.categories.sfx);

      const filt = this._noiseSource(t0, 1.2, "lowpass", 400, 0.5);
      const g = this.ctx.createGain();
      filt.connect(g); g.connect(out);
      this._env(g, t0, 0.005, 1.1, 1.2);

      const rum = this.ctx.createOscillator();
      rum.type = "sine";
      rum.frequency.setValueAtTime(90, t0);
      rum.frequency.exponentialRampToValueAtTime(28, t0 + 0.9);
      const rg = this.ctx.createGain();
      rum.connect(rg); rg.connect(out);
      this._env(rg, t0, 0.01, 0.9, 1.4);
      rum.start(t0); rum.stop(t0 + 1.1);
    }

    playReload() {
      if (!this.ctx) return;
      const t0 = this.now();
      for (let i = 0; i < 3; i++) {
        const o = this.ctx.createOscillator();
        o.type = "square";
        o.frequency.value = 300 + i * 180;
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.categories.sfx);
        this._env(g, t0 + i * 0.12, 0.002, 0.05, 0.12);
        o.start(t0 + i * 0.12); o.stop(t0 + i * 0.12 + 0.08);
      }
    }

    playHit(crit) {
      if (!this.ctx) return;
      const t0 = this.now();
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(crit ? 1400 : 900, t0);
      o.frequency.exponentialRampToValueAtTime(crit ? 700 : 500, t0 + 0.08);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.categories.sfx);
      this._env(g, t0, 0.002, 0.08, 0.25);
      o.start(t0); o.stop(t0 + 0.12);
    }

    playMonster(kind, pos) {
      if (!this.ctx) return;
      const t0 = this.now();
      const s = this._spatial(pos, 1);
      const out = this.ctx.createGain();
      out.gain.value = s.gain * 0.8;
      out.connect(this.categories.voice);

      const cfg = {
        crawler: { type: "sine", f0: 900, f1: 1600, d: 0.18 },
        stalker: { type: "sawtooth", f0: 220, f1: 160, d: 0.5 },
        brute: { type: "sawtooth", f0: 90, f1: 55, d: 0.7 },
        screamer: { type: "sine", f0: 700, f1: 2400, d: 0.6 },
        spitter: { type: "square", f0: 300, f1: 140, d: 0.25 },
        flyer: { type: "triangle", f0: 500, f1: 800, d: 0.3 },
        burrower: { type: "sawtooth", f0: 120, f1: 70, d: 0.5 },
        boss: { type: "sawtooth", f0: 70, f1: 40, d: 1.2 },
        death: { type: "triangle", f0: 400, f1: 80, d: 0.5 },
      }[kind] || { type: "sine", f0: 400, f1: 200, d: 0.3 };

      const o = this.ctx.createOscillator();
      o.type = cfg.type;
      o.frequency.setValueAtTime(cfg.f0, t0);
      o.frequency.exponentialRampToValueAtTime(cfg.f1, t0 + cfg.d);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(out);
      this._env(g, t0, 0.02, cfg.d, 0.5);
      o.start(t0); o.stop(t0 + cfg.d + 0.05);

      if (kind === "death" || kind === "boss") {
        const n = this._noiseSource(t0, cfg.d, "lowpass", 500, 1);
        const ng = this.ctx.createGain();
        n.connect(ng); ng.connect(out);
        this._env(ng, t0, 0.01, cfg.d, 0.35);
      }
    }

    playUI(kind) {
      if (!this.ctx) return;
      const t0 = this.now();
      const o = this.ctx.createOscillator();
      o.type = "triangle";
      const f = kind === "hover" ? 660 : kind === "confirm" ? 880 : 440;
      o.frequency.setValueAtTime(f, t0);
      if (kind === "confirm") o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.categories.sfx);
      this._env(g, t0, 0.005, 0.12, 0.18);
      o.start(t0); o.stop(t0 + 0.2);
    }

    playFootstep(pos, wet) {
      if (!this.ctx) return;
      const t0 = this.now();
      const s = this._spatial(pos, 0.5);
      const out = this.ctx.createGain();
      out.gain.value = s.gain * 0.4;
      out.connect(this.categories.sfx);
      const n = this._noiseSource(t0, 0.08, wet ? "highpass" : "bandpass", wet ? 900 : 500, 1.2);
      const g = this.ctx.createGain();
      n.connect(g); g.connect(out);
      this._env(g, t0, 0.002, wet ? 0.12 : 0.06, 0.5);
    }

    playThunder() {
      if (!this.ctx) return;
      this.playExplosion(null, 0.7);
    }

    /* ---------------- ambience ---------------- */
    startAmbience() {
      if (!this.ctx) return;
      // wind: looping filtered noise with slow gain LFO
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 380;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 0.035;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(filt); filt.connect(g); g.connect(this.categories.ambience);
      src.start(); lfo.start();
      this._windGain = g;
      this._windFilter = filt;
    }

    setAmbienceMood(night, storm) {
      if (!this._windGain) return;
      const target = storm ? 0.11 : night ? 0.07 : 0.05;
      this._windGain.gain.linearRampToValueAtTime(target, this.now() + 2);
      this._windFilter.frequency.linearRampToValueAtTime(storm ? 600 : night ? 260 : 380, this.now() + 2);
    }

    /* ---------------- dynamic music ---------------- */
    /* Generative pads + percussion, crossfaded between modes. */
    setMusicMode(mode) {
      if (!this.ctx || mode === this.musicMode) return;
      this.musicMode = mode;
      if (mode === "none") {
        this._fadeOutMusic(2);
        return;
      }
      this._startMusicEngine(mode);
    }

    _fadeOutMusic(sec) {
      if (!this._musicNodes) return;
      const t = this.now();
      this._musicNodes.gain.gain.linearRampToValueAtTime(0.0001, t + sec);
      const old = this._musicNodes;
      setTimeout(() => {
        try { old.oscs.forEach((o) => o.stop()); } catch (e) {}
        if (this._musicNodes === old) this._musicNodes = null;
      }, sec * 1000 + 100);
    }

    _startMusicEngine(mode) {
      this._fadeOutMusic(1.2);
      const t0 = this.now();
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 1.5);
      gain.connect(this.categories.music);

      const chords = {
        exploration: [
          [110, 164.8, 220], [98, 146.8, 196], [87.3, 130.8, 174.6], [110, 164.8, 246.9],
        ],
        combat: [
          [82.4, 123.5, 164.8], [87.3, 130.8, 174.6], [73.4, 110, 146.8], [82.4, 123.5, 155.6],
        ],
        boss: [
          [73.4, 110, 146.8, 220], [69.3, 103.8, 138.6, 207.7], [77.8, 116.5, 155.6, 233.1],
        ],
      }[mode] || [[110, 164.8, 220]];

      const tempo = mode === "combat" ? 0.42 : mode === "boss" ? 0.34 : 1.4;
      const oscs = [];
      const voices = mode === "boss" ? 4 : 3;
      for (let v = 0; v < voices; v++) {
        const o = this.ctx.createOscillator();
        o.type = v % 2 ? "triangle" : "sine";
        const g = this.ctx.createGain();
        g.gain.value = 0.12 / (v * 0.4 + 1);
        o.connect(g); g.connect(gain);
        o.start(t0);
        oscs.push(o);
        // slow chord stepping
        let step = 0;
        const stepFn = () => {
          if (!this._musicNodes || this._musicNodes.gain !== gain) return;
          const chord = chords[step % chords.length];
          const f = chord[v % chord.length];
          o.frequency.linearRampToValueAtTime(f, this.now() + tempo * 0.9);
          step++;
          this._musicTimer = setTimeout(stepFn, tempo * 1000);
        };
        stepFn();
      }

      // percussion for combat/boss
      if (mode !== "exploration") {
        const beat = () => {
          if (!this._musicNodes || this._musicNodes.gain !== gain) return;
          const t = this.now();
          const n = this._noiseSource(t, 0.12, "lowpass", mode === "boss" ? 220 : 400, 1);
          const g = this.ctx.createGain();
          n.connect(g); g.connect(gain);
          g.gain.setValueAtTime(mode === "boss" ? 0.5 : 0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          this._percTimer = setTimeout(beat, tempo * 1000 * (mode === "boss" ? 1 : 1.5));
        };
        beat();
      }

      this._musicNodes = { gain, oscs };
    }

    updateListener(pos, angle) {
      this._listener.x = pos.x; this._listener.y = pos.y; this._listener.z = pos.z;
      this._listener.angle = angle;
    }
  }

  MF.AudioManager = AudioManager;
})();
