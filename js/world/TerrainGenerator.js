/* ============================================================
   METEORFALL — TerrainGenerator.js
   2km x 2km heightfield world:
   4-octave Perlin terrain + mountain range, crater bowl, river
   valley, village flatten, swamp, south coast cliffs.
   Splat shader blends 6 textures by height / slope / region.
   Analytic getHeight(x,z) is shared by rendering AND physics.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const WORLD = 2000;              // meters
  const GRID = 256;                // samples per axis
  const CELL = WORLD / GRID;
  const CHUNKS = 4;
  const CHUNK_SIZE = WORLD / CHUNKS;

  // River path (north mountains -> south sea)
  const RIVER_POINTS = [
    [620, 1920], [560, 1700], [520, 1500], [420, 1300], [380, 1100],
    [330, 900], [300, 700], [270, 500], [240, 320], [210, 160], [190, 40],
  ];

  const LAKES = [
    { x: 760, z: 640, r: 55 },     // forest lake
    { x: 300, z: 320, r: 85 },     // swamp lake
  ];

  class TerrainGenerator {
    constructor() {
      this.size = WORLD;
      this.grid = GRID;
      this.cell = CELL;
      this.heights = new Float32Array((GRID + 1) * (GRID + 1));
      this.group = new THREE.Group();
      this.group.name = "terrain";
      this.chunks = [];
      this.riverSamples = [];
      this.riverCurve = null;
      this.crater = { x: 1000, z: 1000, r: 150 };
      this.lakes = LAKES;
      this.seaLevel = 0.5;
    }

    /* ---------- master height function (before grid bake) ---------- */
    rawHeight(x, z) {
      const n = MF.noise;
      const n1 = n.fbm(x * 0.001, z * 0.001, 4);
      const n2 = n.fbm(x * 0.005 + 7.3, z * 0.005 + 2.1, 3);
      const n3 = n.fbm(x * 0.02 + 3.7, z * 0.02 + 9.2, 2);
      const n4 = n.noise2(x * 0.1 + 1.1, z * 0.1 + 4.4);
      let h = 18 + (n1 * 0.5 + 0.5) * 62 + n2 * 22 + n3 * 5 + n4 * 1.2;

      // northern mountain range
      const mMask = MF.smoothstep(1320, 1950, z);
      if (mMask > 0) h += mMask * n.ridged(x * 0.0016 + 11, z * 0.0016 + 5, 4) * 150;

      // north-west plateau (Ancient Kingdom)
      const pMask = MF.smoothstep(1350, 1550, z) * (1 - MF.smoothstep(850, 1050, x)) * (1 - MF.smoothstep(1950, 2100, z));
      if (pMask > 0) h = MF.lerp(h, 46 + n2 * 8, pMask * 0.9);

      // village flatten (Haven)
      const dv = Math.hypot(x - 200, z - 200);
      const vMask = MF.smoothstep(170, 70, dv);
      if (vMask > 0) h = MF.lerp(h, 6.5 + n3 * 1.4, vMask);

      // swamp lowland (south-west)
      const sMask = (1 - MF.smoothstep(380, 560, x)) * (1 - MF.smoothstep(380, 560, z));
      if (sMask > 0) h = MF.lerp(h, 2.4 + n3 * 1.2, sMask * 0.92);

      // south coast cliff ramp
      const cMask = MF.smoothstep(30, 190, z);
      h = MF.lerp(1.4 + n3 * 0.8, h, cMask);

      // meteor crater (center bowl + rim)
      const dc = Math.hypot(x - this.crater.x, z - this.crater.z);
      if (dc < 240) {
        const bowl = 1 - MF.smoothstep(0, 155, dc);
        h -= bowl * bowl * 58;
        const rim = MF.smoothstep(125, 168, dc) * (1 - MF.smoothstep(168, 235, dc));
        h += rim * 15;
      }
      return h;
    }

    bake() {
      // build river curve + samples
      const pts = RIVER_POINTS.map((p) => new THREE.Vector3(p[0], 0, p[1]));
      this.riverCurve = new THREE.CatmullRomCurve3(pts);
      const curvePts = this.riverCurve.getPoints(90);
      this.riverSamples = curvePts.map((p) => ({ x: p.x, z: p.z }));

      // bake raw heights
      for (let j = 0; j <= GRID; j++) {
        for (let i = 0; i <= GRID; i++) {
          const x = i * CELL, z = j * CELL;
          this.heights[j * (GRID + 1) + i] = this.rawHeight(x, z);
        }
      }

      // river surface heights: smoothed terrain height along centerline
      const surf = this.riverSamples.map((s) => this.sampleGrid(s.x, s.z));
      this.riverSurface = [];
      for (let i = 0; i < surf.length; i++) {
        let sum = 0, cnt = 0;
        for (let k = -6; k <= 6; k++) {
          const idx = MF.clamp(i + k, 0, surf.length - 1);
          sum += surf[idx]; cnt++;
        }
        this.riverSurface.push(sum / cnt - 1.2);
      }

      // carve river valley into the grid
      for (let j = 0; j <= GRID; j++) {
        for (let i = 0; i <= GRID; i++) {
          const x = i * CELL, z = j * CELL;
          let best = 1e9, bestIdx = 0;
          for (let s = 0; s < this.riverSamples.length; s++) {
            const rs = this.riverSamples[s];
            const d = (rs.x - x) * (rs.x - x) + (rs.z - z) * (rs.z - z);
            if (d < best) { best = d; bestIdx = s; }
          }
          const dist = Math.sqrt(best);
          const width = 26 + (bestIdx / this.riverSamples.length) * 14;
          if (dist < width * 2.4) {
            const waterY = this.riverSurface[bestIdx];
            const bank = waterY + (dist / width) * 5.5 - 1.6;
            const target = Math.min(this.heights[j * (GRID + 1) + i], bank);
            const w = MF.smoothstep(width * 2.4, width * 0.6, dist);
            this.heights[j * (GRID + 1) + i] = MF.lerp(this.heights[j * (GRID + 1) + i], target, w);
          }
        }
      }

      // lake basins
      LAKES.forEach((lk) => {
        for (let j = 0; j <= GRID; j++) {
          for (let i = 0; i <= GRID; i++) {
            const x = i * CELL, z = j * CELL;
            const d = Math.hypot(x - lk.x, z - lk.z);
            if (d < lk.r * 1.5) {
              const w = MF.smoothstep(lk.r * 1.5, lk.r * 0.4, d);
              const bed = lk.y !== undefined ? lk.y : 1.2;
              const idx = j * (GRID + 1) + i;
              this.heights[idx] = MF.lerp(this.heights[idx], bed - 2 + (d / lk.r) * 4, w);
            }
          }
        }
        lk.surfaceY = 2.2;
      });

      // expose analytic accessors
      MF.getHeight = (x, z) => this.getHeight(x, z);
      MF.getNormal = (x, z) => this.getNormal(x, z);
    }

    sampleGrid(x, z) {
      const gx = MF.clamp(x / CELL, 0, GRID - 0.001);
      const gz = MF.clamp(z / CELL, 0, GRID - 0.001);
      const i = Math.floor(gx), j = Math.floor(gz);
      const fx = gx - i, fz = gz - j;
      const W = GRID + 1;
      const h00 = this.heights[j * W + i], h10 = this.heights[j * W + i + 1];
      const h01 = this.heights[(j + 1) * W + i], h11 = this.heights[(j + 1) * W + i + 1];
      return MF.lerp(MF.lerp(h00, h10, fx), MF.lerp(h01, h11, fx), fz);
    }

    getHeight(x, z) {
      if (x < 0 || z < 0 || x > WORLD || z > WORLD) {
        // gentle sea shelf outside the island
        return -2;
      }
      return this.sampleGrid(x, z);
    }

    getNormal(x, z) {
      const e = 2.5;
      const hL = this.getHeight(x - e, z), hR = this.getHeight(x + e, z);
      const hD = this.getHeight(x, z - e), hU = this.getHeight(x, z + e);
      const n = new THREE.Vector3(hL - hR, 2 * e, hD - hU);
      return n.normalize();
    }

    /* ---------- region queries ---------- */
    getRegion(x, z) {
      const dc = Math.hypot(x - this.crater.x, z - this.crater.z);
      if (dc < 240) return "Deadlands";
      if (z < 190) return "Coastal Cliffs";
      if (x < 520 && z < 520) return "Whispering Swamp";
      if (Math.hypot(x - 200, z - 200) < 220) return "Haven Village";
      if (x < 520 && z > 750 && z < 1350) return "Riverside Towns";
      if (x < 900 && z > 1350) return "Ancient Kingdom";
      if (z > 1320) return "Dark Mountains";
      if (x > 500 && x < 1100 && z < 1200) return "Ashen Forest";
      return "Ashen Forest";
    }

    isInWater(x, z) {
      return this.waterHeightAt(x, z) > this.getHeight(x, z) + 0.4;
    }

    waterHeightAt(x, z) {
      // ocean / south coast
      if (z < 120 && x > 60 && x < 1940) return this.seaLevel;
      if (x < 0 || x > WORLD || z < 0 || z > WORLD) return this.seaLevel;
      // lakes
      for (const lk of this.lakes) {
        if (Math.hypot(x - lk.x, z - lk.z) < lk.r) return lk.surfaceY;
      }
      // river
      let best = 1e9, bestIdx = 0;
      for (let s = 0; s < this.riverSamples.length; s += 2) {
        const rs = this.riverSamples[s];
        const d = (rs.x - x) * (rs.x - x) + (rs.z - z) * (rs.z - z);
        if (d < best) { best = d; bestIdx = s; }
      }
      const dist = Math.sqrt(best);
      const width = 26 + (bestIdx / this.riverSamples.length) * 14;
      if (dist < width * 1.15) return this.riverSurface[bestIdx];
      return -Infinity;
    }

    /* ---------- geometry ---------- */
    buildMeshes(scene, assets) {
      this.material = this.createMaterial(assets);
      for (let cz = 0; cz < CHUNKS; cz++) {
        for (let cx = 0; cx < CHUNKS; cx++) {
          const geo = this.buildChunkGeometry(cx, cz);
          const mesh = new THREE.Mesh(geo, this.material);
          mesh.receiveShadow = true;
          mesh.name = `terrain_chunk_${cx}_${cz}`;
          this.group.add(mesh);
          this.chunks.push(mesh);
        }
      }
      scene.add(this.group);
      return this.group;
    }

    buildChunkGeometry(cx, cz) {
      const seg = 64;
      const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, seg, seg);
      geo.rotateX(-Math.PI / 2);
      const offsetX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const offsetZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + offsetX;
        const z = pos.getZ(i) + offsetZ;
        pos.setX(i, x);
        pos.setZ(i, z);
        pos.setY(i, this.getHeight(x, z));
      }
      geo.computeVertexNormals();
      return geo;
    }

    createMaterial(assets) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      const names = ["grass", "dirt", "rock", "sand", "snow", "alien"];
      const texs = {};
      names.forEach((n) => {
        const t = assets.get(n);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        texs[n] = t;
      });

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.tGrass = { value: texs.grass };
        shader.uniforms.tDirt = { value: texs.dirt };
        shader.uniforms.tRock = { value: texs.rock };
        shader.uniforms.tSand = { value: texs.sand };
        shader.uniforms.tSnow = { value: texs.snow };
        shader.uniforms.tAlien = { value: texs.alien };
        shader.uniforms.uCrater = { value: new THREE.Vector3(this.crater.x, this.crater.z, this.crater.r) };
        shader.uniforms.uSwamp = { value: new THREE.Vector2(420, 420) };

        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;")
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);"
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
             varying vec3 vWPos;
             varying vec3 vWNrm;
             uniform sampler2D tGrass;
             uniform sampler2D tDirt;
             uniform sampler2D tRock;
             uniform sampler2D tSand;
             uniform sampler2D tSnow;
             uniform sampler2D tAlien;
             uniform vec3 uCrater;
             uniform vec2 uSwamp;`
          )
          .replace(
            "#include <map_fragment>",
            `
             vec2 wUV = vWPos.xz;
             vec3 cGrass = texture2D(tGrass, wUV * 0.045).rgb;
             vec3 cDirt  = texture2D(tDirt,  wUV * 0.055).rgb;
             vec3 cRock  = texture2D(tRock,  wUV * 0.035).rgb;
             vec3 cSand  = texture2D(tSand,  wUV * 0.060).rgb;
             vec3 cSnow  = texture2D(tSnow,  wUV * 0.040).rgb;
             vec3 cAlien = texture2D(tAlien, wUV * 0.050).rgb;

             float h = vWPos.y;
             float slope = 1.0 - clamp(vWNrm.y, 0.0, 1.0);

             float wSand  = smoothstep(7.0, 1.5, h);
             float wSnow  = smoothstep(95.0, 150.0, h);
             float wRock  = smoothstep(0.22, 0.55, slope) + smoothstep(70.0, 110.0, h) * 0.7;
             float wDirt  = smoothstep(0.06, 0.16, slope) * 0.6;
             float dCrate = distance(vWPos.xz, uCrater.xy);
             float wAlien = smoothstep(uCrater.z + 90.0, uCrater.z - 30.0, dCrate);
             float wGrass = 1.0;

             // swamp tint
             float swamp = smoothstep(420.0, 200.0, distance(vWPos.xz, uSwamp));
             cGrass = mix(cGrass, cGrass * vec3(0.55, 0.75, 0.55), swamp * 0.8);

             wGrass = max(wGrass - wAlien, 0.0);
             float total = wGrass + wDirt + wRock + wSand + wSnow + wAlien + 0.0001;
             vec3 splat = (cGrass * wGrass + cDirt * wDirt + cRock * wRock +
                           cSand * wSand + cSnow * wSnow + cAlien * wAlien) / total;
             diffuseColor.rgb *= splat;
            `
          );
        mat.userData.shader = shader;
      };
      return mat;
    }

    /* Distance-based chunk visibility. */
    updateLOD(playerPos) {
      for (const chunk of this.chunks) {
        if (!chunk.geometry.boundingSphere) chunk.geometry.computeBoundingSphere();
        const c = chunk.geometry.boundingSphere.center;
        const d = Math.hypot(c.x - playerPos.x, c.z - playerPos.z);
        chunk.visible = d < 1400;
      }
    }

    /* Pre-rendered top-down map for the Map UI. */
    buildMinimapCanvas() {
      const size = 256;
      const canvas = MF.makeCanvas(size);
      const ctx = canvas.getContext("2d");
      const img = ctx.createImageData(size, size);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const x = (i / size) * WORLD, z = (j / size) * WORLD;
          const h = this.getHeight(x, z);
          const region = this.getRegion(x, z);
          let r, g, b;
          if (h < 1.2 && z < 140) { r = 30; g = 70; b = 110; }
          else if (region === "Deadlands") { r = 90; g = 50; b = 110; }
          else if (region === "Whispering Swamp") { r = 55; g = 85; b = 55; }
          else if (h > 130) { r = 225; g = 230; b = 240; }
          else if (h > 95) { r = 120; g = 118; b = 122; }
          else if (region === "Haven Village" || region === "Riverside Towns") { r = 120; g = 130; b = 80; }
          else { r = 70; g = 115; b = 55; }
          const shade = MF.clamp(0.65 + h / 300, 0.65, 1.35);
          const idx = (j * size + i) * 4;
          img.data[idx] = MF.clamp(r * shade, 0, 255);
          img.data[idx + 1] = MF.clamp(g * shade, 0, 255);
          img.data[idx + 2] = MF.clamp(b * shade, 0, 255);
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      // draw river
      ctx.strokeStyle = "rgba(60,130,180,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.riverSamples.forEach((s, i) => {
        const px = (s.x / WORLD) * size, py = (s.z / WORLD) * size;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      this.minimapCanvas = canvas;
      return canvas;
    }
  }

  MF.TerrainGenerator = TerrainGenerator;
  MF.WORLD_SIZE = WORLD;
  MF.RIVER_POINTS = RIVER_POINTS;
})();
