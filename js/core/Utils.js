/* ============================================================
   METEORFALL — Utils.js
   Math helpers, seeded noise, pooling, easing, collision helpers.
   ============================================================ */
(function () {
  "use strict";
  const MF = (window.MF = window.MF || {});

  MF.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  MF.lerp = (a, b, t) => a + (b - a) * t;
  MF.damp = (a, b, lambda, dt) => MF.lerp(a, b, 1 - Math.exp(-lambda * dt));
  MF.smoothstep = (e0, e1, x) => {
    const t = MF.clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  };
  MF.rand = () => Math.random();
  MF.randRange = (a, b) => a + Math.random() * (b - a);
  MF.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  MF.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  MF.deg2rad = (d) => (d * Math.PI) / 180;
  MF.dist2D = (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1);
  MF.dist3D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  MF.angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };
  MF.fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h > 0 ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  /* ---------------- seeded RNG + Perlin noise ---------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  MF.mulberry32 = mulberry32;

  class Noise {
    constructor(seed) {
      this.seed = seed || 1337;
      const rng = mulberry32(this.seed);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      this.perm = new Uint8Array(512);
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    grad(h, x, y) {
      switch (h & 7) {
        case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y;
        case 4: return x; case 5: return -x; case 6: return y; default: return -y;
      }
    }
    noise2(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = this.fade(x), v = this.fade(y);
      const p = this.perm;
      const A = p[X] + Y, B = p[X + 1] + Y;
      return MF.lerp(
        MF.lerp(this.grad(p[A], x, y), this.grad(p[B], x - 1, y), u),
        MF.lerp(this.grad(p[A + 1], x, y - 1), this.grad(p[B + 1], x - 1, y - 1), u),
        v
      );
    }
    fbm(x, y, octaves, lacunarity, gain) {
      octaves = octaves || 4; lacunarity = lacunarity || 2.0; gain = gain || 0.5;
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amp * this.noise2(x * freq, y * freq);
        norm += amp; amp *= gain; freq *= lacunarity;
      }
      return sum / norm;
    }
    ridged(x, y, octaves) {
      octaves = octaves || 4;
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amp * (1 - Math.abs(this.noise2(x * freq, y * freq)));
        norm += amp; amp *= 0.5; freq *= 2.1;
      }
      return sum / norm;
    }
  }
  MF.Noise = Noise;
  MF.noise = new Noise(20251010);
  MF.noise2 = new Noise(777);

  /* ---------------- easing ---------------- */
  MF.Easing = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    backOut: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  };

  /* ---------------- object pool ---------------- */
  class ObjectPool {
    constructor(factory, reset, initial) {
      this.factory = factory; this.reset = reset || (() => {});
      this.free = []; this.active = [];
      for (let i = 0; i < (initial || 0); i++) this.free.push(factory());
    }
    acquire() {
      const obj = this.free.length ? this.free.pop() : this.factory();
      this.active.push(obj);
      return obj;
    }
    release(obj) {
      const i = this.active.indexOf(obj);
      if (i >= 0) this.active.splice(i, 1);
      this.reset(obj);
      this.free.push(obj);
    }
    releaseAll() {
      while (this.active.length) this.release(this.active[this.active.length - 1]);
    }
  }
  MF.ObjectPool = ObjectPool;

  /* ---------------- timer ---------------- */
  class Timer {
    constructor(duration, callback, repeat) {
      this.duration = duration; this.callback = callback;
      this.repeat = !!repeat; this.elapsed = 0; this.done = false;
    }
    update(dt) {
      if (this.done) return;
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        this.callback();
        if (this.repeat) this.elapsed -= this.duration;
        else this.done = true;
      }
    }
    reset() { this.elapsed = 0; this.done = false; }
  }
  MF.Timer = Timer;

  /* ---------------- geometry merge (for tree prototypes) ---------------- */
  MF.mergeGeometries = function (geoms) {
    const nonIndexed = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
    let vCount = 0;
    nonIndexed.forEach((g) => { vCount += g.attributes.position.count; });
    const pos = new Float32Array(vCount * 3);
    const nor = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const col = new Float32Array(vCount * 3);
    let o = 0;
    nonIndexed.forEach((g) => {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
      else { for (let i = 0; i < n * 3; i++) col[o * 3 + i] = 1; }
      o += n;
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    merged.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    merged.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return merged;
  };

  /* ---------------- collision helpers ---------------- */
  MF.colliders = [];          // AABBs: {minX,maxX,minZ,maxZ,bottom,top, obj?}
  MF.interactables = [];      // {pos:Vector3, radius, label, action, obj?}

  MF.addBoxCollider = function (minX, maxX, minZ, maxZ, bottom, top, obj) {
    const c = { minX, maxX, minZ, maxZ, bottom, top, obj };
    MF.colliders.push(c);
    return c;
  };
  MF.addBoxFromObject = function (obj3d, pad) {
    pad = pad || 0;
    const box = new THREE.Box3().setFromObject(obj3d);
    return MF.addBoxCollider(box.min.x - pad, box.max.x + pad, box.min.z - pad, box.max.z + pad, box.min.y, box.max.y, obj3d);
  };
  MF.pointInCollider = function (x, y, z, c) {
    return x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && y >= c.bottom - 0.5 && y <= c.top;
  };
  /* Push a position out of building AABBs (cylinder vs AABB on XZ). */
  MF.resolveCollisions = function (pos, radius, height) {
    height = height || 1.6;
    for (let i = 0; i < MF.colliders.length; i++) {
      const c = MF.colliders[i];
      if (pos.y > c.top || pos.y + height < c.bottom) continue;
      const cx = MF.clamp(pos.x, c.minX, c.maxX);
      const cz = MF.clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.0001;
        if (d2 < 1e-8) {
          // inside the box: push out along smallest axis
          const pushLeft = pos.x - c.minX, pushRight = c.maxX - pos.x;
          const pushBack = pos.z - c.minZ, pushFront = c.maxZ - pos.z;
          const m = Math.min(pushLeft, pushRight, pushBack, pushFront);
          if (m === pushLeft) pos.x = c.minX - radius;
          else if (m === pushRight) pos.x = c.maxX + radius;
          else if (m === pushBack) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        } else {
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        }
      }
    }
    return pos;
  };
  /* Segment (ray) vs collider AABBs — returns nearest hit distance or Infinity. */
  MF.raycastColliders = function (origin, dir, maxDist) {
    let best = Infinity, bestBox = null;
    for (let i = 0; i < MF.colliders.length; i++) {
      const c = MF.colliders[i];
      // slab test
      let tmin = 0, tmax = maxDist;
      const axes = [
        ["x", origin.x, dir.x, c.minX, c.maxX],
        ["y", origin.y, dir.y, c.bottom, c.top],
        ["z", origin.z, dir.z, c.minZ, c.maxZ],
      ];
      let hit = true;
      for (let a = 0; a < 3; a++) {
        const o = axes[a][1], d = axes[a][2], mn = axes[a][3], mx = axes[a][4];
        if (Math.abs(d) < 1e-8) {
          if (o < mn || o > mx) { hit = false; break; }
        } else {
          let t1 = (mn - o) / d, t2 = (mx - o) / d;
          if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
          tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
          if (tmin > tmax) { hit = false; break; }
        }
      }
      if (hit && tmin < best && tmin <= maxDist) { best = tmin; bestBox = c; }
    }
    return { dist: best, box: bestBox };
  };

  /* Quick ray-march against the analytic heightfield (terrain hits). */
  MF.raycastTerrain = function (origin, dir, maxDist) {
    const step = 1.5;
    let t = step;
    let prev = origin.y - MF.getHeight(origin.x, origin.z);
    while (t <= maxDist) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      const h = y - MF.getHeight(x, z);
      if (h <= 0) {
        // refine
        let lo = t - step, hi = t;
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          const my = origin.y + dir.y * mid - MF.getHeight(origin.x + dir.x * mid, origin.z + dir.z * mid);
          if (my <= 0) hi = mid; else lo = mid;
        }
        return { dist: hi, point: new THREE.Vector3(origin.x + dir.x * hi, origin.y + dir.y * hi, origin.z + dir.z * hi) };
      }
      prev = h;
      t += step * (1 + t * 0.02);
    }
    return { dist: Infinity, point: null };
  };

  /* Terrain accessor — assigned by TerrainGenerator. */
  MF.getHeight = function () { return 0; };
  MF.getNormal = function () { return new THREE.Vector3(0, 1, 0); };

  /* Canvas helpers for procedural textures */
  MF.makeCanvas = function (size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  };
  MF.canvasTexture = function (canvas, repeat) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (repeat) tex.repeat.set(repeat, repeat);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  };
  MF.fmtNum = (n) => Math.round(n).toLocaleString();
})();
