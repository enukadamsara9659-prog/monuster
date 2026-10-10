/* ============================================================
   METEORFALL — MonsterTypes.js
   Procedural meshes + stats for all 7 regular monster types.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  function mat(color, emissive, ei) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.8, metalness: 0.12,
      emissive: emissive || 0x000000,
      emissiveIntensity: emissive ? (ei === undefined ? 1.1 : ei) : 0,
      flatShading: true,
    });
  }

  const M = {
    createCrawler(pos, extra) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(0x3b2250));
      body.scale.set(1, 0.55, 1.5);
      body.position.y = 0.55;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(0x2c1a3c));
      head.position.set(0, 0.62, 0.85);
      g.add(head);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 5), mat(0x2c1a3c));
          leg.position.set(side * 0.55, 0.42, 0.45 - i * 0.45);
          leg.rotation.z = side * 0.95;
          leg.rotation.x = (i - 1) * 0.4;
          g.add(leg);
        }
      }
      for (let i = 0; i < 4; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), mat(0xff2222, 0xff2222, 2));
        eye.position.set((i % 2 ? 0.12 : -0.12), 0.7 + (i > 1 ? 0.1 : 0), 1.08);
        g.add(eye);
      }
      const mand1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 5), mat(0x1c1028));
      mand1.position.set(0.16, 0.5, 1.15);
      mand1.rotation.x = 1.2;
      const mand2 = mand1.clone();
      mand2.position.x = -0.16;
      g.add(mand1, mand2);

      return new MF.MonsterBase(Object.assign({
        name: "Crawler", type: "crawler", health: 50, damage: 10, speed: 8.2,
        attackRange: 1.7, detectionRange: 30, attackCooldown: 1.0,
        mesh: g, position: pos, hitRadius: 0.85, scale: 1,
        animate(m, dt, time) {
          const speed = m.state === "chase" ? 12 : 4;
          m.animPhase += dt * speed;
          let i = 0;
          m.mesh.children.forEach((c) => {
            if (c.geometry && c.geometry.type === "CylinderGeometry") {
              c.rotation.x = (i - 1) * 0.4 + Math.sin(m.animPhase + i * 1.7) * 0.45;
              i++;
            }
          });
          m.mesh.position.y = m.position.y + Math.abs(Math.sin(m.animPhase * 0.5)) * 0.08;
        },
      }, extra || {}));
    },

    createStalker(pos, extra) {
      const g = new THREE.Group();
      const bodyMat = mat(0x1a1a22);
      bodyMat.transparent = true;
      bodyMat.opacity = 0.42;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.9, 8), bodyMat);
      body.position.y = 1.25;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), bodyMat);
      head.scale.set(1, 1.35, 1);
      head.position.y = 2.35;
      g.add(head);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mat(0xffffff, 0xdfe8ff, 2.4));
      eye.position.set(0, 2.4, 0.22);
      g.add(eye);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 1.7, 5), bodyMat);
        arm.position.set(side * 0.32, 1.35, 0.1);
        arm.rotation.z = side * 0.28;
        arm.rotation.x = -0.25;
        g.add(arm);
        for (let i = 0; i < 3; i++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3, 4), bodyMat);
          claw.position.set(side * (0.36 + i * 0.06), 0.5, 0.32 + i * 0.08);
          claw.rotation.x = 1.15;
          g.add(claw);
        }
      }

      return new MF.MonsterBase(Object.assign({
        name: "Stalker", type: "stalker", health: 80, damage: 25, speed: 5.4,
        attackRange: 2.4, detectionRange: 40, attackCooldown: 1.5,
        mesh: g, position: pos, hitRadius: 0.75, scale: 1,
        animate(m, dt, time) {
          m.animPhase += dt * 2.2;
          const sw = Math.sin(m.animPhase) * 0.12;
          m.mesh.rotation.z = sw;
          m.mesh.position.y = m.position.y + Math.sin(m.animPhase * 1.4) * 0.1 + 0.15;
          // fade in when attacking/chasing
          const targetOp = (m.state === "attack" || m.state === "chase") ? 0.92 : 0.36;
          m.mesh.traverse((o) => {
            if (o.material && o.material.transparent) {
              o.material.opacity = MF.damp(o.material.opacity, targetOp, 4, dt);
            }
          });
        },
      }, extra || {}));
    },

    createBrute(pos, extra) {
      const g = new THREE.Group();
      const skin = mat(0x4a3c34);
      const armor = mat(0x2e2822);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.1), skin);
      body.position.y = 1.65;
      body.castShadow = true;
      g.add(body);
      for (const side of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 1.25), armor);
        plate.position.set(side * 0.95, 2.35, 0);
        plate.rotation.z = side * 0.25;
        g.add(plate);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 1.4, 7), skin);
        arm.position.set(side * 1.05, 1.55, 0);
        arm.rotation.z = side * 0.32;
        g.add(arm);
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), skin);
        fist.position.set(side * 1.28, 0.85, 0.1);
        g.add(fist);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1, 7), skin);
        leg.position.set(side * 0.45, 0.5, 0);
        g.add(leg);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), skin);
      head.position.y = 2.85;
      g.add(head);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat(0xff5522, 0xff5522, 1.8));
        eye.position.set(side * 0.12, 2.9, 0.28);
        g.add(eye);
      }

      return new MF.MonsterBase(Object.assign({
        name: "Brute", type: "brute", health: 500, damage: 50, speed: 3.1,
        attackRange: 3.2, detectionRange: 25, attackCooldown: 2.1,
        mesh: g, position: pos, hitRadius: 1.5, scale: 1,
        animate(m, dt, time) {
          m.animPhase += dt * (m.state === "chase" ? 3.2 : 1.4);
          m.mesh.position.y = m.position.y + Math.abs(Math.sin(m.animPhase)) * 0.07;
          m.mesh.rotation.z = Math.sin(m.animPhase * 0.5) * 0.045;
        },
      }, extra || {}));
    },

    createScreamer(pos, extra) {
      const g = new THREE.Group();
      const skin = mat(0xd8d0c8);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.35, 7), skin);
      body.position.y = 1.05;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
      head.position.y = 1.95;
      g.add(head);
      const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 8), mat(0x30181a));
      mouth.position.set(0, 1.88, 0.3);
      mouth.rotation.x = -Math.PI / 2;
      g.add(mouth);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.1, 5), skin);
        arm.position.set(side * 0.3, 1.15, 0);
        arm.rotation.z = side * 0.55;
        g.add(arm);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 5), skin);
        leg.position.set(side * 0.13, 0.42, 0);
        g.add(leg);
      }
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.045, 6, 22),
        new THREE.MeshBasicMaterial({ color: 0xffd0d0, transparent: true, opacity: 0, depthWrite: false })
      );
      ring.position.y = 1.95;
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      g.userData.screamRing = ring;

      return new MF.MonsterBase(Object.assign({
        name: "Screamer", type: "screamer", health: 60, damage: 5, speed: 6.2,
        attackRange: 2, detectionRange: 50, attackCooldown: 4.5,
        mesh: g, position: pos, hitRadius: 0.7, scale: 1,
        animate(m, dt, time) {
          m.animPhase += dt * 4;
          m.mesh.position.y = m.position.y + Math.abs(Math.sin(m.animPhase * 0.6)) * 0.12;
          const ring = m.mesh.userData.screamRing;
          if (ring) {
            if (m.state === "attack" && m._screamT === undefined) m._screamT = 0;
            if (m._screamT !== undefined) {
              m._screamT += dt;
              const t = (m._screamT % 1.2) / 1.2;
              ring.material.opacity = (1 - t) * 0.75;
              ring.scale.setScalar(0.4 + t * 3.2);
              if (m.state !== "attack") { m._screamT = undefined; ring.material.opacity = 0; }
            }
          }
        },
        onDeath(m) {
          // alert everything nearby
          if (MF.game.monsters) {
            for (const other of MF.game.monsters.list) {
              if (other.isAlive && MF.dist3D(other.position, m.position) < 200) {
                other.state = MF.MONSTER_STATE.CHASE;
              }
            }
          }
        },
      }, extra || {}));
    },

    createSpitter(pos, extra) {
      const g = new THREE.Group();
      const skin = mat(0x5a7a2c);
      const sacMat = mat(0x8ab040, 0x6a9a20, 0.55);
      sacMat.transparent = true;
      sacMat.opacity = 0.82;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), skin);
      body.scale.set(1, 1.15, 1);
      body.position.y = 1.0;
      body.castShadow = true;
      g.add(body);
      const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 8), mat(0x2c3a12));
      mouth.position.set(0, 1.05, 0.78);
      mouth.rotation.x = -Math.PI / 2;
      g.add(mouth);
      for (const side of [-1, 1]) {
        const sac = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), sacMat);
        sac.position.set(side * 0.62, 0.95, -0.15);
        g.add(sac);
        for (let i = 0; i < 2; i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 6), skin);
          leg.position.set(side * 0.5, 0.36, i === 0 ? 0.35 : -0.35);
          g.add(leg);
        }
      }

      return new MF.MonsterBase(Object.assign({
        name: "Spitter", type: "spitter", health: 100, damage: 30, speed: 4.1,
        attackRange: 22, detectionRange: 35, attackCooldown: 2.8,
        mesh: g, position: pos, hitRadius: 1.1, scale: 1,
        animate(m, dt, time) {
          m.animPhase += dt * 2;
          m.mesh.position.y = m.position.y + Math.sin(m.animPhase) * 0.05;
          m.mesh.scale.setScalar(1 + Math.sin(m.animPhase * 1.6) * 0.02);
        },
      }, extra || {}));
    },

    createFlyer(pos, extra) {
      const g = new THREE.Group();
      const skin = mat(0x2c2430);
      const wingMat = mat(0x4a2c3c);
      wingMat.side = THREE.DoubleSide;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), skin);
      body.scale.set(1, 0.75, 1.8);
      body.castShadow = true;
      g.add(body);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.85), wingMat);
        wing.position.set(side * 1.05, 0.15, -0.1);
        wing.rotation.z = side * 0.14;
        g.add(wing);
        const talon = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.36, 5), mat(0x181018));
        talon.position.set(side * 0.18, -0.38, 0.25);
        talon.rotation.x = Math.PI;
        g.add(talon);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 6), skin);
      tail.position.set(0, 0, -1.15);
      tail.rotation.x = Math.PI / 2 - 0.25;
      g.add(tail);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat(0xff3333, 0xff3333, 2));
      eye.position.set(0, 0.12, 0.72);
      g.add(eye);

      return new MF.MonsterBase(Object.assign({
        name: "Flyer", type: "flyer", health: 70, damage: 20, speed: 12,
        attackRange: 3.2, detectionRange: 60, attackCooldown: 1.7,
        mesh: g, position: pos, hitRadius: 1, scale: 1,
        flying: true, hoverHeight: 12, yOffset: -0.4,
        animate(m, dt, time) {
          m.animPhase += dt * 9;
          let wi = 0;
          m.mesh.children.forEach((c) => {
            if (c.geometry && c.geometry.type === "BoxGeometry" && Math.abs(c.position.x) > 0.5) {
              c.rotation.z = (wi === 0 ? 1 : -1) * (0.14 + Math.sin(m.animPhase) * 0.55);
              wi++;
            }
          });
          // dive behaviour: lower hover when attacking
          const targetHover = m.state === "attack" ? 1.6 : 12 + Math.sin(time * 0.7 + m.animPhase * 0.1) * 2;
          m.hoverHeight = MF.damp(m.hoverHeight, targetHover, 2, dt);
        },
      }, extra || {}));
    },

    createBurrower(pos, extra) {
      const g = new THREE.Group();
      const skin = mat(0x5a4632);
      const segs = 5;
      for (let i = 0; i < segs; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.5, 8), skin);
        seg.rotation.x = Math.PI / 2;
        seg.position.set(Math.sin(i * 0.9) * 0.35, 0.55 + (i === 0 ? 0.25 : 0), -i * 0.52 + 0.6);
        seg.castShadow = true;
        g.add(seg);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), skin);
      head.position.set(0, 0.85, 1.1);
      g.add(head);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 4), mat(0xd8c8a8));
        tooth.position.set(Math.cos(ang) * 0.3, 0.85 + Math.sin(ang) * 0.3, 1.42);
        tooth.rotation.x = Math.PI / 2;
        g.add(tooth);
      }

      return new MF.MonsterBase(Object.assign({
        name: "Burrower", type: "burrower", health: 150, damage: 35, speed: 6.5,
        attackRange: 2.6, detectionRange: 22, attackCooldown: 1.9,
        mesh: g, position: pos, hitRadius: 1.05, scale: 1,
        animate(m, dt, time) {
          m.animPhase += dt * 6;
          for (let i = 1; i < 5; i++) {
            const seg = m.mesh.children[i];
            if (seg) seg.position.x = Math.sin(m.animPhase + i * 0.9) * 0.38;
          }
          // underground: sink when patrolling, emerge when attacking
          const sink = (m.state === "patrol" || m.state === "idle") ? -1.25 : 0;
          m.mesh.position.y = m.position.y + MF.damp(m.mesh.position.y - m.position.y, sink + Math.sin(m.animPhase * 0.4) * 0.06, 3, dt);
          if (MF.game.particles && Math.random() < dt * 3 && sink < -0.5) {
            MF.game.particles.emit("dust", m.position, { count: 1, size: 0.8 });
          }
        },
      }, extra || {}));
    },
  };

  MF.MonsterTypes = M;
})(window.MF);
