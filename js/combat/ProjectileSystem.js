/* ============================================================
   METEORFALL — ProjectileSystem.js
   Pooled projectiles: rockets, grenades, acid, alien bolts,
   gravity orbs, void spheres. Terrain/monster collision,
   explosion on impact.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const TYPE_CFG = {
    rocket: { speed: 70, gravity: -4, radius: 10, damage: 500, color: 0xffa040, size: 0.22, trail: true },
    grenade: { speed: 22, gravity: -16, radius: 8, damage: 220, color: 0x8a8a6a, size: 0.16, trail: false, fuse: 2.2 },
    acid: { speed: 18, gravity: -12, radius: 3.2, damage: 30, color: 0x7aff3a, size: 0.28, trail: true, pool: true },
    bolt: { speed: 95, gravity: 0, radius: 4, damage: 60, color: 0xff8a3a, size: 0.2, trail: true },
    gravity: { speed: 60, gravity: 0, radius: 6, damage: 95, color: 0x4aa8ff, size: 0.26, trail: true },
    void: { speed: 55, gravity: 0, radius: 9, damage: 160, color: 0xb060ff, size: 0.34, trail: true },
    rock: { speed: 26, gravity: -14, radius: 5, damage: 60, color: 0x8a7a66, size: 0.55, trail: false },
  };

  class ProjectileSystem {
    constructor(scene) {
      this.scene = scene;
      this.list = [];
      this.pool = [];
    }

    spawn(type, origin, dir, owner) {
      const cfg = TYPE_CFG[type] || TYPE_CFG.bolt;
      let mesh = this.pool.pop();
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 10, 8),
          new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 1.2, color: 0xffffff })
        );
        mesh.frustumCulled = false;
      }
      mesh.visible = true;
      mesh.scale.setScalar(cfg.size);
      mesh.material.color.setHex(cfg.color);
      mesh.material.emissive.setHex(cfg.color);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.list.push({
        mesh, type, cfg,
        velocity: dir.clone().normalize().multiplyScalar(cfg.speed),
        life: 0,
        owner: owner || "player",
      });
    }

    explode(p) {
      const particles = MF.game.particles;
      if (particles) {
        particles.emit("explosion", p.mesh.position, { count: 26, size: 2.2 });
        particles.emit("smoke", p.mesh.position, { count: 10 });
      }
      MF.audio.playExplosion(p.mesh.position, p.type === "rocket" ? 1 : 0.6);
      MF.explosion.spawn(p.mesh.position, p.cfg.radius * 0.5);

      if (p.type === "acid") {
        MF.game.damage.areaDamage(p.mesh.position, p.cfg.radius, p.cfg.damage, null);
        // acid pool
        if (MF.game.particles) {
          for (let i = 0; i < 10; i++) {
            MF.game.particles.emit("acid", p.mesh.position, { count: 1, speed: 2.2 });
          }
        }
      } else if (p.owner === "monster") {
        const dist = MF.dist3D(p.mesh.position, MF.game.player.position);
        if (dist < p.cfg.radius) {
          MF.game.health.takeDamage(p.cfg.damage * (1 - dist / p.cfg.radius * 0.6), p.mesh.position);
        }
        if (MF.game.controller && dist < 30) MF.game.controller.addShake(0.8 * (1 - dist / 30));
      } else {
        MF.game.damage.areaDamage(p.mesh.position, p.cfg.radius, p.cfg.damage, null);
        const dist = MF.dist3D(p.mesh.position, MF.game.player.position);
        if (MF.game.controller && dist < 30) MF.game.controller.addShake(1.1 * (1 - dist / 30));
      }

      this.scene.remove(p.mesh);
      this.pool.push(p.mesh);
      const i = this.list.indexOf(p);
      if (i >= 0) this.list.splice(i, 1);
    }

    update(dt) {
      const playersTarget = MF.game.player ? MF.game.player.position : null;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.life += dt;
        p.velocity.y += p.cfg.gravity * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);

        if (p.cfg.trail && MF.game.particles && Math.random() < dt * 40) {
          MF.game.particles.emit("ember", p.mesh.position, {
            count: 1, color: p.cfg.color, size: 0.5, life: 0.35, speed: 0.6, up: 0.4,
          });
        }

        // terrain collision
        const gy = MF.getHeight(p.mesh.position.x, p.mesh.position.z);
        let hit = p.mesh.position.y <= gy + 0.25;

        // monster collision (player-owned projectiles)
        if (!hit && p.owner === "player" && MF.game.monsters) {
          for (const m of MF.game.monsters.list) {
            if (!m.isAlive) continue;
            const d = MF.dist3D(m.position, p.mesh.position);
            if (d < (m.hitRadius || 1.2) + p.cfg.size + 0.3) { hit = true; break; }
          }
        }

        // player collision (monster-owned)
        if (!hit && p.owner === "monster" && playersTarget) {
          if (MF.dist3D(playersTarget, p.mesh.position) < 1.1) hit = true;
        }

        // building collision
        if (!hit) {
          const origin = p.mesh.position.clone().addScaledVector(p.velocity, -dt);
          const dir = p.velocity.clone().normalize();
          const hitInfo = MF.raycastColliders(origin, dir, p.velocity.length() * dt + 0.4);
          if (hitInfo.dist < Infinity && hitInfo.dist <= p.velocity.length() * dt + 0.35) hit = true;
        }

        if (hit || p.life > 6 || (p.cfg.fuse && p.life > p.cfg.fuse)) {
          this.explode(p);
        }
      }
    }
  }

  MF.ProjectileSystem = ProjectileSystem;
})(window.MF);
