/* ============================================================
   METEORFALL — DayNightCycle.js
   Sun / moon orbit, sky + fog color grading, stars at night.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class DayNightCycle {
    constructor(scene) {
      this.scene = scene;
      this.timeOfDay = 17.2;        // start late afternoon (matches the story)
      this.dayLength = 600;         // seconds per full day
      this.paused = false;

      this.sun = new THREE.DirectionalLight(0xffe0b0, 1.25);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const d = 260;
      this.sun.shadow.camera.left = -d;
      this.sun.shadow.camera.right = d;
      this.sun.shadow.camera.top = d;
      this.sun.shadow.camera.bottom = -d;
      this.sun.shadow.camera.near = 10;
      this.sun.shadow.camera.far = 700;
      this.sun.shadow.bias = -0.0012;
      scene.add(this.sun);
      scene.add(this.sun.target);

      this.moon = new THREE.DirectionalLight(0x8fa8ff, 0.0);
      scene.add(this.moon);
      scene.add(this.moon.target);

      this.hemi = new THREE.HemisphereLight(0x9db8d8, 0x3a3226, 0.55);
      scene.add(this.hemi);

      this.skyDay = new THREE.Color(0x8fb6d8);
      this.skyDusk = new THREE.Color(0xd88a4e);
      this.skyNight = new THREE.Color(0x0a1226);
      this.skyStorm = new THREE.Color(0x3a4048);
      this.fogDay = new THREE.Color(0x88aacc);
      this.fogNight = new THREE.Color(0x0c1428);

      scene.background = this.skyDay.clone();
      scene.fog = new THREE.FogExp2(0x88aacc, 0.00085);

      this.buildStars();
    }

    buildStars() {
      const geo = new THREE.BufferGeometry();
      const count = 700;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = MF.rand() * Math.PI * 2;
        const phi = Math.acos(MF.randRange(0.05, 1));
        const r = 1800;
        pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        pos[i * 3 + 1] = Math.cos(phi) * r * 0.8 + 100;
        pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xcfe0ff, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0 });
      this.stars = new THREE.Points(geo, mat);
      this.stars.position.set(1000, 0, 1000);
      this.scene.add(this.stars);
    }

    get sunElevation() {
      return Math.sin(((this.timeOfDay - 6) / 24) * Math.PI * 2);
    }

    get isNight() {
      return this.timeOfDay < 5.6 || this.timeOfDay > 19.4;
    }

    update(dt, playerPos, weather) {
      if (!this.paused) {
        this.timeOfDay += (dt / this.dayLength) * 24;
        if (this.timeOfDay >= 24) this.timeOfDay -= 24;
      }

      const t = this.timeOfDay;
      const elev = this.sunElevation;
      const ang = ((t - 6) / 24) * Math.PI * 2;

      // sun & moon positions relative to the player (shadow follow)
      const px = playerPos ? playerPos.x : 1000;
      const pz = playerPos ? playerPos.z : 1000;
      this.sun.position.set(px + Math.cos(ang) * 300, Math.max(40, Math.sin(ang) * 320), pz + Math.sin(ang * 0.6) * 180);
      this.sun.target.position.set(px, 0, pz);
      this.moon.position.set(px - Math.cos(ang) * 300, Math.max(60, -Math.sin(ang) * 280), pz - 120);
      this.moon.target.position.set(px, 0, pz);

      const dayFactor = MF.smoothstep(-0.08, 0.28, elev);
      const duskFactor = MF.clamp(1 - Math.abs(elev) * 3.2, 0, 1);

      this.sun.intensity = MF.lerp(0.02, 1.35, dayFactor);
      this.moon.intensity = MF.lerp(0.32, 0, dayFactor);
      this.hemi.intensity = MF.lerp(0.14, 0.6, dayFactor);

      // sky + fog grading
      const sky = this.skyNight.clone().lerp(this.skyDay, dayFactor);
      sky.lerp(this.skyDusk, duskFactor * 0.55);
      const fog = this.fogNight.clone().lerp(this.fogDay, dayFactor);
      fog.lerp(this.skyDusk, duskFactor * 0.3);

      if (weather && weather.current === "storm") {
        sky.lerp(this.skyStorm, 0.55);
        fog.lerp(this.skyStorm, 0.5);
      } else if (weather && weather.current === "rain") {
        sky.lerp(this.skyStorm, 0.3);
        fog.lerp(this.skyStorm, 0.3);
      } else if (weather && weather.current === "fog") {
        sky.lerp(fog, 0.5);
      } else if (weather && weather.current === "meteor") {
        sky.lerp(new THREE.Color(0x8a3a20), 0.45);
      }

      if (this.scene.background instanceof THREE.Color) this.scene.background.copy(sky);
      if (this.scene.fog) {
        this.scene.fog.color.copy(fog);
        const targetDensity = weather && weather.current === "fog" ? 0.0032
          : weather && weather.current === "storm" ? 0.0016
          : weather && weather.current === "rain" ? 0.0012
          : 0.00085;
        this.scene.fog.density = MF.damp(this.scene.fog.density, targetDensity, 1.2, dt);
      }

      this.stars.material.opacity = MF.clamp(1 - dayFactor * 1.6, 0, 0.9);
      this.stars.rotation.y += dt * 0.004;
    }
  }

  MF.DayNightCycle = DayNightCycle;
})();
