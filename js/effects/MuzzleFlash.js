/* ============================================================
   METEORFALL — MuzzleFlash.js
   Quick additive sprite + point light at the weapon barrel.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MuzzleFlash {
    constructor(scene, assets) {
      this.scene = scene;
      this.sprites = [];
      this.lights = [];
      for (let i = 0; i < 6; i++) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({
          map: assets.get("glow"),
          color: 0xffc060,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }));
        spr.visible = false;
        scene.add(spr);
        this.sprites.push(spr);
      }
      for (let i = 0; i < 4; i++) {
        const light = new THREE.PointLight(0xffa050, 0, 7, 2);
        light.visible = false;
        scene.add(light);
        this.lights.push(light);
      }
    }

    flash(position, color) {
      const spr = this.sprites.find((s) => !s.visible) || this.sprites[0];
      spr.position.copy(position);
      spr.material.color.setHex(color === undefined ? 0xffc060 : color);
      spr.material.opacity = 1;
      spr.scale.setScalar(MF.randRange(0.7, 1.15));
      spr.visible = true;
      spr.userData.life = 0.055;

      const light = this.lights.find((l) => !l.visible) || this.lights[0];
      light.position.copy(position);
      light.color.setHex(color === undefined ? 0xffa050 : color);
      light.intensity = 3.2;
      light.visible = true;
      light.userData.life = 0.06;
    }

    update(dt) {
      for (const s of this.sprites) {
        if (!s.visible) continue;
        s.userData.life -= dt;
        s.material.opacity = Math.max(0, s.userData.life / 0.055);
        if (s.userData.life <= 0) s.visible = false;
      }
      for (const l of this.lights) {
        if (!l.visible) continue;
        l.userData.life -= dt;
        l.intensity = Math.max(0, (l.userData.life / 0.06) * 3.2);
        if (l.userData.life <= 0) l.visible = false;
      }
    }
  }

  MF.MuzzleFlash = MuzzleFlash;
})(window.MF);
