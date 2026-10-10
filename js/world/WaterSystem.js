/* ============================================================
   METEORFALL — WaterSystem.js
   Ocean, river ribbon (mountains -> sea), two lakes, waterfall.
   Animated UV flow, swimming queries, waterfall mist particles.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class WaterSystem {
    constructor(terrain, assets) {
      this.terrain = terrain;
      this.assets = assets;
      this.group = new THREE.Group();
      this.group.name = "water";
      this.time = 0;
      this.waterfallEmitters = [];
    }

    build(scene) {
      this.buildOcean();
      this.buildRiver();
      this.buildLakes();
      this.buildWaterfall();
      scene.add(this.group);
      return this.group;
    }

    makeWaterMaterial(color, opacity, repeat) {
      const tex = this.assets.get("caustics", repeat || 6);
      const mat = new THREE.MeshStandardMaterial({
        color: color || 0x006994,
        transparent: true,
        opacity: opacity || 0.72,
        roughness: 0.12,
        metalness: 0.55,
        map: tex,
        emissive: new THREE.Color(0x0a2a3a),
        emissiveIntensity: 0.35,
        depthWrite: true,
      });
      mat.userData.flowTex = tex;
      return mat;
    }

    buildOcean() {
      const geo = new THREE.PlaneGeometry(6000, 6000, 32, 32);
      geo.rotateX(-Math.PI / 2);
      const mat = this.makeWaterMaterial(0x0b4f70, 0.82, 24);
      this.ocean = new THREE.Mesh(geo, mat);
      this.ocean.position.set(1000, this.terrain.seaLevel, 1000);
      this.group.add(this.ocean);
    }

    buildRiver() {
      const samples = this.terrain.riverSamples;
      const surf = this.terrain.riverSurface;
      const positions = [];
      const uvs = [];
      const indices = [];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const prev = samples[Math.max(0, i - 1)];
        const next = samples[Math.min(samples.length - 1, i + 1)];
        const dirX = next.x - prev.x, dirZ = next.z - prev.z;
        const len = Math.hypot(dirX, dirZ) || 1;
        const nx = -dirZ / len, nz = dirX / len;
        const width = 13 + (i / samples.length) * 7;
        const y = (surf[i] !== undefined ? surf[i] : this.terrain.getHeight(s.x, s.z)) + 0.65;
        positions.push(s.x + nx * width, y, s.z + nz * width);
        positions.push(s.x - nx * width, y, s.z - nz * width);
        uvs.push(0, i * 0.15, 1, i * 0.15);
        if (i < samples.length - 1) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mat = this.makeWaterMaterial(0x0d6a8c, 0.75, 1);
      mat.userData.flowTex.repeat.set(1, 1);
      this.river = new THREE.Mesh(geo, mat);
      this.group.add(this.river);
    }

    buildLakes() {
      this.terrain.lakes.forEach((lk, i) => {
        const geo = new THREE.CircleGeometry(lk.r, 40);
        geo.rotateX(-Math.PI / 2);
        const mat = this.makeWaterMaterial(i === 1 ? 0x3d6b35 : 0x14647f, i === 1 ? 0.8 : 0.72, 4);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(lk.x, lk.surfaceY, lk.z);
        this.group.add(mesh);
      });
    }

    buildWaterfall() {
      // mountain waterfall where the river drops from the highlands
      const x = 585, z = 1830;
      const topY = this.terrain.getHeight(x, z) + 12;
      const botY = this.terrain.getHeight(x, z - 26) + 1.5;
      const height = Math.max(8, topY - botY);
      const geo = new THREE.PlaneGeometry(14, height, 1, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x9fd8ef,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x2a6a88,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
      });
      const fall = new THREE.Mesh(geo, mat);
      fall.position.set(x, botY + height / 2, z - 12);
      fall.rotation.y = 0.35;
      this.group.add(fall);
      this.waterfall = fall;

      // mist at base
      this.mistPos = new THREE.Vector3(x, botY + 1, z - 12);
      this.mistAccum = 0;
    }

    /* Water surface height at a world position (for swimming). */
    surfaceAt(x, z) {
      return this.terrain.waterHeightAt(x, z);
    }

    isUnderwater(pos) {
      const wh = this.surfaceAt(pos.x, pos.z);
      return wh > -Infinity && pos.y < wh - 0.4;
    }

    update(dt, playerPos, particles) {
      this.time += dt;
      // flow animation on all water materials
      this.group.traverse((obj) => {
        if (obj.material && obj.material.userData && obj.material.userData.flowTex) {
          const t = obj.material.userData.flowTex;
          t.offset.y = (t.offset.y - dt * 0.06) % 1;
          t.offset.x = Math.sin(this.time * 0.15) * 0.02;
        }
      });

      // waterfall mist
      if (particles && this.mistPos) {
        this.mistAccum += dt;
        while (this.mistAccum > 0.08) {
          this.mistAccum -= 0.08;
          particles.emit("mist", this.mistPos, {
            count: 2,
            color: 0xcfe8f5,
            size: 2.4,
            life: 1.6,
            speed: 2.2,
            up: 1.4,
          });
        }
      }
    }
  }

  MF.WaterSystem = WaterSystem;
})();
