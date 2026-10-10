/* ============================================================
   METEORFALL — MeteorCrater.js
   The Deadlands: alien spires, glowing veins, floating rocks,
   the meteor core. Visual heart of the world.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MeteorCrater {
    constructor(terrain, assets) {
      this.terrain = terrain;
      this.assets = assets;
      this.group = new THREE.Group();
      this.group.name = "crater";
      this.floaters = [];
      this.time = 0;
    }

    build(scene) {
      const cx = this.terrain.crater.x, cz = this.terrain.crater.z;

      // meteor core: massive glowing rock at the bowl center
      const coreGeo = new THREE.IcosahedronGeometry(16, 2);
      const pos = coreGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = 0.86 + MF.noise.noise2(pos.getX(i) * 0.2, pos.getZ(i) * 0.2) * 0.28;
        pos.setXYZ(i, pos.getX(i) * v, pos.getY(i) * v * 1.25, pos.getZ(i) * v);
      }
      coreGeo.computeVertexNormals();
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x2a1233,
        emissive: 0xff6a1e,
        emissiveIntensity: 1.15,
        roughness: 0.55,
        metalness: 0.35,
        flatShading: true,
      });
      this.core = new THREE.Mesh(coreGeo, coreMat);
      const coreY = this.terrain.getHeight(cx, cz);
      this.core.position.set(cx, coreY + 10, cz);
      this.group.add(this.core);

      const coreLight = new THREE.PointLight(0xff7a2a, 2.2, 220, 2);
      coreLight.position.copy(this.core.position);
      this.group.add(coreLight);
      this.coreLight = coreLight;

      // alien spires around the rim
      const spireMat = new THREE.MeshStandardMaterial({
        color: 0x3b1d4d,
        emissive: 0xb44dff,
        emissiveIntensity: 0.55,
        roughness: 0.7,
        flatShading: true,
      });
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2 + MF.randRange(-0.2, 0.2);
        const r = MF.randRange(60, 165);
        const x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
        const h = MF.randRange(8, 30);
        const geo = new THREE.ConeGeometry(MF.randRange(2, 5.5), h, 5);
        const spire = new THREE.Mesh(geo, spireMat);
        spire.position.set(x, this.terrain.getHeight(x, z) + h * 0.42, z);
        spire.rotation.set(MF.randRange(-0.18, 0.18), MF.rand() * Math.PI, MF.randRange(-0.18, 0.18));
        spire.castShadow = true;
        this.group.add(spire);
      }

      // glowing ground veins (rings)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff7a2a,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.RingGeometry(18 + i * 22, 19.6 + i * 22, 48);
        geo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(geo, ringMat.clone());
        ring.position.set(cx, this.terrain.getHeight(cx, cz + 20 + i * 22) + 0.35, cz + 20 + i * 22);
        this.group.add(ring);
      }

      // floating rocks (bobbing)
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x4a2a5c,
        emissive: 0x6a2a9a,
        emissiveIntensity: 0.4,
        roughness: 0.8,
        flatShading: true,
      });
      for (let i = 0; i < 8; i++) {
        const ang = MF.rand() * Math.PI * 2;
        const r = MF.randRange(30, 120);
        const x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
        const s = MF.randRange(1.2, 3.6);
        const geo = new THREE.DodecahedronGeometry(s, 0);
        const rock = new THREE.Mesh(geo, rockMat);
        const baseY = this.terrain.getHeight(x, z) + MF.randRange(6, 18);
        rock.position.set(x, baseY, z);
        rock.userData.baseY = baseY;
        rock.userData.phase = MF.rand() * Math.PI * 2;
        this.group.add(rock);
        this.floaters.push(rock);
      }

      scene.add(this.group);
      return this.group;
    }

    update(dt, particles) {
      this.time += dt;
      const pulse = 1 + Math.sin(this.time * 1.6) * 0.12;
      this.core.material.emissiveIntensity = 1.0 * pulse;
      this.coreLight.intensity = 2.0 * pulse;
      this.core.rotation.y += dt * 0.06;
      for (const rock of this.floaters) {
        rock.position.y = rock.userData.baseY + Math.sin(this.time * 0.7 + rock.userData.phase) * 1.4;
        rock.rotation.y += dt * 0.25;
        rock.rotation.x += dt * 0.12;
      }
      // ambient ember particles near the core
      if (particles && Math.random() < dt * 6) {
        particles.emit("ember", this.core.position, {
          count: 2,
          color: 0xff8a3a,
          size: 1.1,
          life: 2.4,
          speed: 3,
          up: 2.2,
          spread: 12,
        });
      }
    }
  }

  MF.MeteorCrater = MeteorCrater;
})();
