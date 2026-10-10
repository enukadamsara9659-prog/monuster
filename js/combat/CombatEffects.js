/* ============================================================
   METEORFALL — CombatEffects.js
   Tracer pool, impact effects, hit markers, camera shake glue.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class CombatEffects {
    constructor(scene, assets) {
      this.scene = scene;
      this.tracers = [];
      this.pool = [];
      this.time = 0;
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd9a0, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      for (let i = 0; i < 24; i++) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        const line = new THREE.Line(geo, mat.clone());
        line.visible = false;
        line.frustumCulled = false;
        scene.add(line);
        this.pool.push(line);
      }
    }

    spawnTracer(from, to, color) {
      const line = this.pool.find((l) => !l.visible) || this.pool[0];
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, from.x, from.y, from.z);
      pos.setXYZ(1, to.x, to.y, to.z);
      pos.needsUpdate = true;
      line.material.color.setHex(color === undefined ? 0xffd9a0 : color);
      line.material.opacity = 0.9;
      line.visible = true;
      line.userData.life = 0.09;
      this.tracers.push(line);
    }

    impact(point, kind) {
      const particles = MF.game && MF.game.particles;
      if (!particles) return;
      if (kind === "monster") {
        particles.emit("blood", point, { count: 11 });
      } else if (kind === "metal") {
        particles.emit("impact", point, { count: 8, color: 0xffd080, additive: true, speed: 9 });
      } else if (kind === "wood") {
        particles.emit("impact", point, { count: 8, color: 0xa07840, speed: 7 });
      } else {
        particles.emit("impact", point, { count: 9 });
      }
    }

    hitMarker(crit) {
      const el = document.getElementById("hit-marker");
      if (!el) return;
      el.className = crit ? "crit" : "";
      el.classList.add("show");
      clearTimeout(this._hmTimer);
      this._hmTimer = setTimeout(() => el.classList.remove("show"), crit ? 220 : 140);
    }

    update(dt) {
      this.time += dt;
      for (let i = this.tracers.length - 1; i >= 0; i--) {
        const l = this.tracers[i];
        l.userData.life -= dt;
        l.material.opacity = Math.max(0, l.userData.life / 0.09) * 0.85;
        if (l.userData.life <= 0) {
          l.visible = false;
          this.tracers.splice(i, 1);
        }
      }
    }
  }

  MF.CombatEffects = CombatEffects;
})(window.MF);
