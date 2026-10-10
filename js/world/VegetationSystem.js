/* ============================================================
   METEORFALL — VegetationSystem.js
   6 procedural tree types (one InstancedMesh per type), region
   density placement, and camera-following instanced grass.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  function colorize(geo, r, g, b) {
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b; }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }

  function applyMatrix(geo, m) {
    const g = geo.clone();
    g.applyMatrix4(m);
    return g;
  }

  function mat4(px, py, pz, rx, ry, rz, s) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    m.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(s || 1, s || 1, s || 1));
    return m;
  }

  class VegetationSystem {
    constructor(terrain) {
      this.terrain = terrain;
      this.group = new THREE.Group();
      this.group.name = "vegetation";
      this.protos = {};
      this.meshes = {};
      this.grass = null;
      this._grassAnchor = new THREE.Vector3(1e9, 0, 1e9);
    }

    /* ---------- tree prototypes ---------- */
    buildPrototypes() {
      const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
      this.trunkMat = trunkMat;

      // 1. TROPICAL PALM
      {
        const parts = [];
        const segs = 5;
        for (let i = 0; i < segs; i++) {
          const m = mat4(Math.sin(i * 0.35) * 0.9, i * 1.9 + 0.95, 0, 0, 0, -0.12 * i, 1);
          const seg = applyMatrix(new THREE.CylinderGeometry(0.32 - i * 0.03, 0.38 - i * 0.03, 1.95, 6), m);
          parts.push(colorize(seg, 0.42, 0.3, 0.18));
        }
        const topY = segs * 1.9;
        const topX = Math.sin((segs - 1) * 0.35) * 0.9 + 0.5;
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const m = mat4(topX + Math.cos(ang) * 1.9, topY + 0.6, Math.sin(ang) * 1.9, 0.55, ang, 0, 1);
          const leaf = applyMatrix(new THREE.BoxGeometry(0.7, 0.09, 4.4), m);
          parts.push(colorize(leaf, 0.16, 0.45, 0.16));
        }
        this.protos.palm = MF.mergeGeometries(parts);
      }

      // 2. OAK
      {
        const parts = [];
        const trunk = new THREE.CylinderGeometry(0.5, 0.75, 6, 7);
        parts.push(colorize(applyMatrix(trunk, mat4(0, 3, 0)), 0.36, 0.25, 0.15));
        const canopyPts = [[0, 7.6, 0, 3.1], [-1.9, 6.9, 1.1, 2.3], [1.8, 7.1, -1.2, 2.5], [0.4, 8.9, -0.4, 2.0]];
        canopyPts.forEach((c) => {
          const s = new THREE.SphereGeometry(c[3], 8, 6);
          parts.push(colorize(applyMatrix(s, mat4(c[0], c[1], c[2])), 0.16, 0.42, 0.15));
        });
        this.protos.oak = MF.mergeGeometries(parts);
      }

      // 3. PINE
      {
        const parts = [];
        const trunk = new THREE.CylinderGeometry(0.28, 0.45, 12, 6);
        parts.push(colorize(applyMatrix(trunk, mat4(0, 6, 0)), 0.34, 0.23, 0.14));
        const tiers = [[4.2, 5.2, 4.8], [3.3, 4.6, 8.0], [2.3, 4.0, 11.0]];
        tiers.forEach((t) => {
          const cone = new THREE.ConeGeometry(t[0], t[1], 8);
          parts.push(colorize(applyMatrix(cone, mat4(0, t[2], 0)), 0.1, 0.3, 0.14));
        });
        this.protos.pine = MF.mergeGeometries(parts);
      }

      // 4. DEAD TREE
      {
        const parts = [];
        const trunk = new THREE.CylinderGeometry(0.25, 0.5, 6.5, 6);
        parts.push(colorize(applyMatrix(trunk, mat4(0, 3.2, 0)), 0.32, 0.29, 0.26));
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 + 0.4;
          const m = mat4(Math.cos(ang) * 1.3, 4.6 + i * 0.5, Math.sin(ang) * 1.3, Math.sin(ang) * 0.9, ang, Math.cos(ang) * 0.9, 1);
          const br = applyMatrix(new THREE.CylinderGeometry(0.08, 0.16, 3.1, 4), m);
          parts.push(colorize(br, 0.3, 0.28, 0.25));
        }
        this.protos.dead = MF.mergeGeometries(parts);
      }

      // 5. BAMBOO
      {
        const parts = [];
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const r = i === 0 ? 0 : 0.75;
          const h = 6 + (i % 3) * 1.6;
          const m = mat4(Math.cos(ang) * r, h / 2, Math.sin(ang) * r, Math.sin(ang) * 0.06, 0, -Math.cos(ang) * 0.06, 1);
          const cane = applyMatrix(new THREE.CylinderGeometry(0.13, 0.17, h, 5), m);
          parts.push(colorize(cane, 0.35, 0.55, 0.22));
        }
        this.protos.bamboo = MF.mergeGeometries(parts);
      }

      // 6. ALIEN TREE (infected)
      {
        const parts = [];
        const trunk = new THREE.CylinderGeometry(0.4, 0.66, 7, 6);
        parts.push(colorize(applyMatrix(trunk, mat4(0, 3.5, 0)), 0.22, 0.1, 0.3));
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const m = mat4(Math.cos(ang) * 1.6, 5.4 + (i % 3), Math.sin(ang) * 1.6, Math.sin(ang) * 1.1, ang, Math.cos(ang) * 1.1, 1);
          const tendril = applyMatrix(new THREE.CylinderGeometry(0.05, 0.14, 3.4, 4), m);
          parts.push(colorize(tendril, 0.75, 0.35, 0.95));
        }
        const bulb = new THREE.SphereGeometry(1.35, 8, 6);
        parts.push(colorize(applyMatrix(bulb, mat4(0, 7.9, 0)), 0.55, 0.2, 0.75));
        this.protos.alien = MF.mergeGeometries(parts);
      }
    }

    /* ---------- placement ---------- */
    densityFor(region, type) {
      const key = region + ":" + type;
      const table = {
        "Haven Village:palm": 0.02, "Haven Village:oak": 0.008,
        "Ashen Forest:oak": 0.06, "Ashen Forest:pine": 0.02, "Ashen Forest:bamboo": 0.03,
        "Deadlands:alien": 0.03, "Deadlands:dead": 0.008,
        "Riverside Towns:oak": 0.02, "Riverside Towns:bamboo": 0.015, "Riverside Towns:palm": 0.012,
        "Ancient Kingdom:oak": 0.012, "Ancient Kingdom:pine": 0.01, "Ancient Kingdom:dead": 0.006,
        "Dark Mountains:pine": 0.045, "Dark Mountains:dead": 0.008,
        "Whispering Swamp:dead": 0.03, "Whispering Swamp:bamboo": 0.01,
        "Coastal Cliffs:palm": 0.025, "Coastal Cliffs:dead": 0.004,
      };
      return table[key] || 0;
    }

    placeAll() {
      this.buildPrototypes();
      const placements = { palm: [], oak: [], pine: [], dead: [], bamboo: [], alien: [] };
      const rng = MF.mulberry32(9911);
      const types = Object.keys(placements);
      const total = 4200;

      for (let i = 0; i < total; i++) {
        const x = rng() * MF.WORLD_SIZE;
        const z = rng() * MF.WORLD_SIZE;
        const h = this.terrain.getHeight(x, z);
        if (h < 2.2) continue;                                  // water / beach line
        const region = this.terrain.getRegion(x, z);
        const normal = this.terrain.getNormal(x, z);
        if (normal.y < 0.72) continue;                          // too steep
        if (Math.hypot(x - this.terrain.crater.x, z - this.terrain.crater.z) < 60) continue;

        let placed = false;
        for (const type of types) {
          const dens = this.densityFor(region, type);
          if (dens > 0 && rng() < dens * 12) {
            const scale = MF.randRange(0.8, 1.35) * (type === "bamboo" ? 1 : 1);
            placements[type].push({ x, z, y: h, rot: rng() * Math.PI * 2, scale });
            placed = true;
            break;
          }
        }
        if (!placed && rng() < 0.12) {
          placements.oak.push({ x, z, y: h, rot: rng() * Math.PI * 2, scale: MF.randRange(0.7, 1.2) });
        }
      }

      const dummy = new THREE.Object3D();
      for (const type of types) {
        const list = placements[type];
        if (!list.length) continue;
        const geo = this.protos[type];
        const mesh = new THREE.InstancedMesh(geo, this.trunkMat, list.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          dummy.position.set(p.x, p.y - 0.15, p.z);
          dummy.rotation.set(0, p.rot, 0);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        this.group.add(mesh);
        this.meshes[type] = mesh;
      }

      this.buildGrass();
      return this.group;
    }

    /* ---------- grass (recycled around player) ---------- */
    buildGrass() {
      const blade = new THREE.BufferGeometry();
      // two crossed quads
      const v = new Float32Array([
        -0.35, 0, 0, 0.35, 0, 0, -0.35, 0.9, 0, 0.35, 0, 0, 0.35, 0.9, 0, -0.35, 0.9, 0,
        0, 0, -0.35, 0, 0, 0.35, 0, 0.9, -0.35, 0, 0, 0.35, 0, 0.9, 0.35, 0, 0.9, -0.35,
      ]);
      const c = new Float32Array(v.length);
      for (let i = 0; i < v.length / 3; i++) {
        const tone = 0.75 + MF.rand() * 0.35;
        c[i * 3] = 0.2 * tone; c[i * 3 + 1] = 0.52 * tone; c[i * 3 + 2] = 0.16 * tone;
      }
      blade.setAttribute("position", new THREE.BufferAttribute(v, 3));
      blade.setAttribute("color", new THREE.BufferAttribute(c, 3));
      blade.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 1,
        metalness: 0,
      });
      const count = 2600;
      this.grass = new THREE.InstancedMesh(blade, mat, count);
      this.grass.frustumCulled = false;
      this._grassData = [];
      const rng = MF.mulberry32(4242);
      for (let i = 0; i < count; i++) {
        this._grassData.push({ a: rng() * Math.PI * 2, r: 6 + rng() * 94, rot: rng() * Math.PI, s: 0.7 + rng() * 0.8 });
      }
      this.group.add(this.grass);
    }

    updateGrass(playerPos) {
      if (!this.grass) return;
      const moved = playerPos.distanceTo(this._grassAnchor);
      if (moved < 18) return;
      this._grassAnchor.copy(playerPos);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this._grassData.length; i++) {
        const g = this._grassData[i];
        const x = playerPos.x + Math.cos(g.a) * g.r;
        const z = playerPos.z + Math.sin(g.a) * g.r;
        const y = this.terrain.getHeight(x, z);
        const region = this.terrain.getRegion(x, z);
        const inCrater = Math.hypot(x - this.terrain.crater.x, z - this.terrain.crater.z) < 200;
        const visible = y > 2.4 && !inCrater && region !== "Deadlands" && region !== "Coastal Cliffs";
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, g.rot, 0);
        dummy.scale.setScalar(visible ? g.s : 0.001);
        dummy.updateMatrix();
        this.grass.setMatrixAt(i, dummy.matrix);
      }
      this.grass.instanceMatrix.needsUpdate = true;
    }
  }

  MF.VegetationSystem = VegetationSystem;
})(window.MF);
