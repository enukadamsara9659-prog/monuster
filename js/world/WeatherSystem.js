/* ============================================================
   METEORFALL — WeatherSystem.js
   Weather state machine: clear / rain / storm / fog / meteor.
   Drives particles, lighting mood, ambience and lightning.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const STATES = ["clear", "clear", "rain", "storm", "fog", "clear"];

  class WeatherSystem {
    constructor() {
      this.current = "clear";
      this.timer = MF.randRange(180, 420);
      this.lightningTimer = MF.randRange(5, 15);
      this.rainIntensity = 0;
      this.forced = null;
    }

    force(state, duration) {
      this.forced = state;
      this.current = state;
      this.forcedTime = duration || 60;
    }

    update(dt, cameraPos, particles, ui) {
      if (this.forced) {
        this.forcedTime -= dt;
        if (this.forcedTime <= 0) this.forced = null;
      } else {
        this.timer -= dt;
        if (this.timer <= 0) {
          const prev = this.current;
          let next = MF.pick(STATES);
          if (next === prev) next = "clear";
          this.current = next;
          this.timer = MF.randRange(180, 420);
          if (next !== "clear" && ui) {
            ui.toast(next === "storm" ? "A storm is approaching…" : next === "rain" ? "Rain begins to fall." : next === "fog" ? "Thick fog rolls in…" : "The skies clear.");
          }
        }
      }

      // rain particles
      const wantRain = this.current === "rain" || this.current === "storm" || this.current === "meteor";
      const targetIntensity = this.current === "storm" ? 1 : wantRain ? 0.55 : 0;
      this.rainIntensity = MF.damp(this.rainIntensity, targetIntensity, 1.5, dt);

      if (particles && cameraPos && this.rainIntensity > 0.02) {
        const count = Math.floor(this.rainIntensity * 22);
        for (let i = 0; i < count; i++) {
          particles.emit("rain", cameraPos, {
            count: 1,
            color: this.current === "meteor" ? 0xffa060 : 0x9fc8e8,
            size: this.current === "meteor" ? 1.4 : 0.5,
            life: 1.1,
            speed: 46,
            up: -46,
            spread: 60,
            height: 42,
          });
        }
      }

      // lightning during storms
      if (this.current === "storm") {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
          this.lightningTimer = MF.randRange(5, 15);
          if (ui) {
            ui.flash("#dfe8ff", 0.75, 0.28);
            MF.audio.playThunder();
          }
          if (MF.game && MF.game.weatherFx) MF.game.weatherFx.strike();
        }
      }

      // scripted meteor storm: random ground impacts
      if (this.current === "meteor" && particles && cameraPos && Math.random() < dt * 0.5) {
        const ang = Math.random() * Math.PI * 2;
        const dist = MF.randRange(60, 180);
        const x = cameraPos.x + Math.cos(ang) * dist;
        const z = cameraPos.z + Math.sin(ang) * dist;
        const y = MF.getHeight(x, z);
        particles.emit("explosion", new THREE.Vector3(x, y + 1, z), {
          count: 22, color: 0xff8840, size: 3, life: 1.1, speed: 14, up: 6,
        });
        MF.audio.playExplosion({ x, y, z }, 0.6);
      }
    }
  }

  MF.WeatherSystem = WeatherSystem;
})(window.MF);
