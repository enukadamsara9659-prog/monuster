/* ============================================================
   METEORFALL — WeatherEffects.js
   Visual helpers for weather: rain sheets, lightning glare,
   ground puddle shimmer, meteor streaks.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class WeatherEffects {
    constructor(scene) {
      this.scene = scene;
      this.lightningLight = new THREE.DirectionalLight(0xcfe0ff, 0);
      this.lightningLight.position.set(400, 600, 300);
      scene.add(this.lightningLight);
      this.flashTimer = 0;
    }

    /* Called by the game loop when the weather system is active. */
    update(dt, weather, cameraPos, particles) {
      // lightning flash decay
      if (this.flashTimer > 0) {
        this.flashTimer = Math.max(0, this.flashTimer - dt * 3.2);
        this.lightningLight.intensity = this.flashTimer * 2.6;
      } else {
        this.lightningLight.intensity = 0;
      }

      // puddle shimmer on wet ground near the camera
      if ((weather.current === "rain" || weather.current === "storm") && particles && Math.random() < dt * 4) {
        const ang = Math.random() * Math.PI * 2;
        const dist = MF.randRange(4, 18);
        const x = cameraPos.x + Math.cos(ang) * dist;
        const z = cameraPos.z + Math.sin(ang) * dist;
        particles.emit("mist", new THREE.Vector3(x, MF.getHeight(x, z) + 0.15, z), {
          count: 1, size: 0.55, life: 0.5, speed: 0.8, up: 0.5,
        });
      }
    }

    /* Trigger a lightning glare (called by WeatherSystem). */
    strike() {
      this.flashTimer = 1;
    }
  }

  MF.WeatherEffects = WeatherEffects;
})(window.MF);
