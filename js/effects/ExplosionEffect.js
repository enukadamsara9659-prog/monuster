/* ============================================================
   METEORFALL — ExplosionEffect.js
   Reusable explosion: expanding flash sphere, shockwave ring,
   light burst, particles, camera shake, sound.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class ExplosionEffect {
    constructor(scene) {
      this.scene = scene;
      this.active = [];

      const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
      this.pool = [];
      for (let i = 0; i < 6; i++) {
        const sphere = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({
          color: 0xffa040, transparent: true, opacity: 0, depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        sphere.visible = false;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.86, 1, 36),
          new THREE.MeshBasicMaterial({
            color: 0xffc880, transparent: true, opacity: 0, depthWrite: false,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.visible = false;
        const light = new THREE.PointLight(0xffa050, 0, 26, 2);
        light.visible = false;
        scene.add(sphere, ring, light);
        this.pool.push({ sphere, ring, light, life: 0, maxLife: 1, size: 1 });
      }
    }

    spawn(position, size) {
      size = size || 4;
      const slot = this.pool.find((p) => p.life <= 0) || this.pool[0];
      slot.size = size;
      slot.life = 0.55;
      slot.maxLife = 0.55;
      slot.sphere.visible = true;
      slot.sphere.position.copy(position);
      slot.sphere.position.y += size * 0.35;
      slot.ring.visible = true;
      slot.ring.position.copy(position);
      slot.ring.position.y += 0.35;
      slot.light.visible = true;
      slot.light.position.copy(slot.sphere.position);
      this.active.push(slot);
    }

    update(dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const p = this.active[i];
        p.life -= dt;
        if (p.life <= 0) {
          p.sphere.visible = false;
          p.ring.visible = false;
          p.light.visible = false;
          this.active.splice(i, 1);
          continue;
        }
        const t = 1 - p.life / p.maxLife; // 0 -> 1
        const grow = 0.4 + t * 1.6;
        p.sphere.scale.setScalar(p.size * grow * 0.8);
        p.sphere.material.opacity = (1 - t) * 0.85;
        p.ring.scale.setScalar(p.size * (0.5 + t * 3.4));
        p.ring.material.opacity = (1 - t) * 0.7;
        p.light.intensity = (1 - t) * (1 - t) * 14;
      }
    }
  }

  MF.ExplosionEffect = ExplosionEffect;
})(window.MF);
