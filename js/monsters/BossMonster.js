/* ============================================================
   METEORFALL — BossMonster.js
   Titan mini-boss + 3 story bosses (Meteor Queen, Ancient
   Guardian, Void Titan) with multi-phase attack patterns.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  function bossMat(color, emissive, ei) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.72, metalness: 0.2,
      emissive: emissive || 0x000000, emissiveIntensity: emissive ? (ei || 1) : 0,
      flatShading: true,
    });
  }

  /* Shared boss behaviour: phases + special attack timers. */
  function bossBrain(m, dt, time) {
    if (!m.isAlive) return;
    const game = MF.game;
    const hpRatio = m.health / m.maxHealth;
    m.phaseTimer = (m.phaseTimer || 0) - dt;
    m.specialTimer = (m.specialTimer || 3) - dt;

    // phase transitions
    const thresholds = m.phaseThresholds || [0.66, 0.33];
    let phase = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (hpRatio <= thresholds[i]) phase = i + 2;
    }
    if (phase !== m.phase) {
      m.phase = phase;
      MF.ui.toast(m.name + " — Phase " + phase + "!");
      MF.audio.playMonster("boss", m.position);
      if (MF.game.particles) MF.game.particles.emit("spawn", m.position, { count: 26 });
      if (phase >= 2) m.speed *= 1.12;
    }

    // special attacks
    if (m.specialTimer <= 0 && m.state === "attack") {
      m.specialTimer = m.specialCooldown || 5;
      const playerPos = game.player.position;
      const dist = MF.dist3D(m.position, playerPos);

      if (m.bossType === "titan") {
        // ground stomp AOE
        MF.game.particles.emit("explosion", m.position, { count: 20, size: 2.4 });
        MF.game.particles.emit("dust", m.position, { count: 14, size: 2.2 });
        if (dist < 9) MF.game.health.takeDamage(28 + m.phase * 8, m.position);
        if (MF.game.controller) MF.game.controller.addShake(1.4);
        MF.audio.playExplosion(m.position, 0.8);
      } else if (m.bossType === "queen") {
        if (m.phase === 1) {
          // summon crawlers
          if (game.monsters) {
            for (let i = 0; i < 3; i++) {
              game.monsters.spawn("crawler", m.position.clone().add(new THREE.Vector3(MF.randRange(-6, 6), 0, MF.randRange(-6, 6))));
            }
          }
        } else if (m.phase === 2) {
          // acid spray projectile
          const dir = playerPos.clone().sub(m.position).normalize();
          game.projectiles.spawn("acid", m.position.clone().setY(m.position.y + 2), dir, "monster");
        } else {
          // dive: leap toward player
          m.position.lerp(playerPos, 0.35);
          MF.game.particles.emit("death", m.position, { count: 12 });
        }
      } else if (m.bossType === "guardian") {
        if (m.phase <= 2) {
          const dir = playerPos.clone().sub(m.position).normalize();
          game.projectiles.spawn("void", m.position.clone().setY(m.position.y + 3), dir, "monster");
        } else if (m.phase === 3) {
          // electrify ground near player
          game.particles.emit("explosion", playerPos, { count: 16, size: 1.6, color: 0x66c0ff });
          if (dist < 12) MF.game.health.takeDamage(18, playerPos);
        } else {
          if (game.monsters) {
            for (let i = 0; i < 2; i++) {
              game.monsters.spawn("stalker", m.position.clone().add(new THREE.Vector3(MF.randRange(-8, 8), 0, MF.randRange(-8, 8))));
            }
          }
        }
      } else if (m.bossType === "void") {
        if (m.phase === 1) {
          // gravity pull: yank player toward boss
          const pull = playerPos.clone().sub(m.position).normalize().multiplyScalar(-4);
          playerPos.add(pull);
          MF.game.particles.emit("spawn", m.position, { count: 18 });
        } else if (m.phase === 2) {
          if (game.monsters) {
            const kinds = ["crawler", "stalker", "spitter"];
            for (let i = 0; i < 3; i++) {
              game.monsters.spawn(MF.pick(kinds), m.position.clone().add(new THREE.Vector3(MF.randRange(-10, 10), 0, MF.randRange(-10, 10))));
            }
          }
        } else if (m.phase === 3) {
          // void zone on player
          game.particles.emit("explosion", playerPos, { count: 22, size: 2.6, color: 0xb060ff });
          if (dist < 20 && MF.dist2D(playerPos.x, playerPos.z, m.position.x, m.position.z) < 8) {
            MF.game.health.takeDamage(35, m.position);
          }
        } else if (m.phase === 4) {
          m.speed *= 1.05;
          const dir = playerPos.clone().sub(m.position).normalize();
          game.projectiles.spawn("void", m.position.clone().setY(m.position.y + 3), dir, "monster");
        } else {
          m.mesh.traverse((o) => {
            if (o.material && o.material.emissiveIntensity !== undefined) o.material.emissiveIntensity = 1.8;
          });
        }
      }
    }
  }

  const BossFactory = {
    createTitan(pos) {
      const g = new THREE.Group();
      const rock = bossMat(0x5a4e42);
      const lava = bossMat(0x3a2a20, 0xff6a1e, 1.25);
      const body = new THREE.Mesh(new THREE.BoxGeometry(3, 3.6, 2.2), rock);
      body.position.y = 3.4;
      body.castShadow = true;
      g.add(body);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.1, 1.15), rock);
        arm.position.set(side * 2.15, 3.1, 0);
        arm.castShadow = true;
        g.add(arm);
        const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), rock);
        fist.position.set(side * 2.15, 1.35, 0.2);
        g.add(fist);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 2, 7), rock);
        leg.position.set(side * 0.85, 1, 0);
        g.add(leg);
      }
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1, 1.05), rock);
      head.position.y = 5.75;
      g.add(head);
      for (let i = 0; i < 5; i++) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.16, MF.randRange(1, 2.4), 0.08), lava);
        crack.position.set(MF.randRange(-1.2, 1.2), MF.randRange(2.4, 5), 1.16);
        g.add(crack);
      }
      const weak = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), bossMat(0x3a88ff, 0x3a88ff, 1.8));
      weak.position.set(0, 4.4, -1.25);
      g.add(weak);

      return new MF.MonsterBase({
        name: "Titan", type: "brute", isBoss: true, bossType: "titan",
        health: 2000, damage: 100, speed: 2.2, attackRange: 5, detectionRange: 45,
        attackCooldown: 2.6, mesh: g, position: pos, hitRadius: 2.6, scale: 2.2,
        phaseThresholds: [0.5],
        animate(m, dt, time) {
          m.animPhase += dt * 1.4;
          m.mesh.position.y = m.position.y + Math.abs(Math.sin(m.animPhase)) * 0.12;
          bossBrain(m, dt, time);
          if (Math.random() < dt * 2) MF.game.particles.emit("ember", m.position.clone().setY(m.position.y + 4), { count: 1, size: 0.7 });
        },
      });
    },

    createMeteorQueen(pos) {
      const g = new THREE.Group();
      const shell = bossMat(0x3b1d4d);
      const vein = bossMat(0x3a1c28, 0xff6a1e, 1.3);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), shell);
      body.scale.set(1, 1.35, 1.5);
      body.position.y = 2.6;
      body.castShadow = true;
      g.add(body);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6), shell);
        leg.position.set(Math.cos(ang) * 1.9, 1.2, Math.sin(ang) * 1.9);
        leg.rotation.set(Math.sin(ang) * 0.7, 0, -Math.cos(ang) * 0.7);
        g.add(leg);
      }
      for (let i = 0; i < 4; i++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.1, 5), vein);
        crystal.position.set((i - 1.5) * 0.5, 4.5, 0.2);
        crystal.rotation.z = (i - 1.5) * 0.35;
        g.add(crystal);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 3.6, 7), shell);
      tail.position.set(0, 2.4, -2.8);
      tail.rotation.x = 1.05;
      g.add(tail);
      const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), vein);
      stinger.position.set(0, 1.35, -4.1);
      stinger.rotation.x = 2.1;
      g.add(stinger);

      return new MF.MonsterBase({
        name: "Meteor Queen", type: "boss", isBoss: true, bossType: "queen",
        health: 5000, damage: 60, speed: 3.4, attackRange: 5.5, detectionRange: 60,
        attackCooldown: 2.2, mesh: g, position: pos, hitRadius: 2.4, scale: 1.9,
        phaseThresholds: [0.66, 0.33], specialCooldown: 12,
        animate(m, dt, time) {
          m.animPhase += dt * 2.4;
          m.mesh.position.y = m.position.y + Math.sin(m.animPhase) * 0.16;
          bossBrain(m, dt, time);
        },
      });
    },

    createAncientGuardian(pos) {
      const g = new THREE.Group();
      const stone = bossMat(0x6a6a72);
      const rune = bossMat(0x2a3a4a, 0x3a9aff, 1.4);
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 1.6), stone);
      body.position.y = 3.6;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 1), stone);
      head.position.y = 5.85;
      g.add(head);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), rune);
        eye.position.set(side * 0.28, 5.95, 0.52);
        g.add(eye);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.8, 0.8), stone);
        arm.position.set(side * 1.85, 3.5, 0);
        arm.castShadow = true;
        g.add(arm);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.2, 0.95), stone);
        leg.position.set(side * 0.7, 1.1, 0);
        g.add(leg);
      }
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 2.2), stone);
      shield.position.set(-2.35, 3.3, 0.8);
      g.add(shield);
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 0.16), stone);
      sword.position.set(2.35, 3.1, 0.6);
      sword.rotation.z = -0.25;
      g.add(sword);
      const chestRune = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 18), rune);
      chestRune.position.set(0, 4.1, 0.86);
      g.add(chestRune);

      return new MF.MonsterBase({
        name: "Ancient Guardian", type: "boss", isBoss: true, bossType: "guardian",
        health: 8000, damage: 90, speed: 2.6, attackRange: 6, detectionRange: 55,
        attackCooldown: 2.4, mesh: g, position: pos, hitRadius: 2.5, scale: 2.1,
        phaseThresholds: [0.75, 0.5, 0.25], specialCooldown: 8,
        animate(m, dt, time) {
          m.animPhase += dt * 1.7;
          m.mesh.position.y = m.position.y + Math.abs(Math.sin(m.animPhase)) * 0.1;
          bossBrain(m, dt, time);
        },
      });
    },

    createVoidTitan(pos) {
      const g = new THREE.Group();
      const voidMat = bossMat(0x1c1030);
      voidMat.transparent = true;
      voidMat.opacity = 0.94;
      const glow = bossMat(0x2a1440, 0x9a3aff, 1.3);
      const body = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.6, 8), voidMat);
      body.position.y = 3.4;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), voidMat);
      head.position.y = 6.2;
      g.add(head);
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 3.3, 6), glow);
        arm.position.set(Math.cos(ang) * 1.7, 3.9, Math.sin(ang) * 1.7);
        arm.rotation.set(Math.sin(ang) * 0.85, 0, -Math.cos(ang) * 0.85);
        g.add(arm);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), bossMat(0xffffff, 0xffffff, 2.2));
      core.position.set(0, 4.1, 0.95);
      g.add(core);
      g.userData.core = core;

      return new MF.MonsterBase({
        name: "Void Titan", type: "boss", isBoss: true, bossType: "void",
        health: 12000, damage: 110, speed: 3, attackRange: 7, detectionRange: 80,
        attackCooldown: 2.6, mesh: g, position: pos, hitRadius: 2.8, scale: 2.4,
        phaseThresholds: [0.8, 0.6, 0.4, 0.2], specialCooldown: 7,
        flying: true, hoverHeight: 1.2,
        animate(m, dt, time) {
          m.animPhase += dt * 1.8;
          m.mesh.position.y = m.position.y + Math.sin(m.animPhase * 0.8) * 0.35;
          m.mesh.rotation.y += dt * 0.22;
          if (m.mesh.userData.core) {
            m.mesh.userData.core.material.emissiveIntensity = 1.6 + Math.sin(m.animPhase * 2) * 0.7;
          }
          if (MF.game.particles && Math.random() < dt * 5) {
            MF.game.particles.emit("spawn", m.position.clone().setY(m.position.y + 3), { count: 1, size: 1.1, speed: 1.6 });
          }
          bossBrain(m, dt, time);
        },
      });
    },
  };

  MF.BossFactory = BossFactory;
})(window.MF);
