/* ============================================================
   METEORFALL — ParticleSystem.js
   Pooled billboard particles (two Points systems: additive glow
   and soft alpha). Types: muzzle, impact, blood, explosion,
   smoke, death, spawn, acid, heal, rain, mist, ember, fire.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;
  const MAX = 320;

  function makePointsMaterial(blending, tex) {
    return new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex } },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (240.0 / max(-mv.z, 1.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, t.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }`,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: blending,
    });
  }

  class ParticleSystem {
    constructor(scene, assets) {
      this.scene = scene;
      this.particles = []; // flat list of live particles
      this.time = 0;

      const glowTex = assets.get("glow");
      this.additive = this.buildPoints(THREE.AdditiveBlending, glowTex);
      this.soft = this.buildPoints(THREE.NormalBlending, glowTex);
      scene.add(this.additive);
      scene.add(this.soft);
    }

    buildPoints(blending, tex) {
      const geo = new THREE.BufferGeometry();
      this.posAttr = null;
      const positions = new Float32Array(MAX * 3);
      const colors = new Float32Array(MAX * 3);
      const sizes = new Float32Array(MAX);
      const alphas = new Float32Array(MAX);
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
      const points = new THREE.Points(geo, makePointsMaterial(blending, tex));
      points.frustumCulled = false;
      points.userData.buffers = { positions, colors, sizes, alphas };
      return points;
    }

    emit(type, position, opts) {
      if (this.particles.length > MAX * 2) return;
      opts = opts || {};
      const presets = {
        muzzle: { count: 7, color: 0xffb04a, size: 0.32, life: 0.12, speed: 22, up: 0, spread: 1, gravity: 0, additive: true },
        impact: { count: 9, color: 0x9a8a72, size: 0.16, life: 0.42, speed: 6, up: 3, spread: 1, gravity: -12, additive: false },
        blood: { count: 12, color: 0xb02020, size: 0.19, life: 0.5, speed: 7, up: 2.5, spread: 1, gravity: -14, additive: false },
        explosion: { count: 34, color: 0xff8830, size: 1.6, life: 0.75, speed: 16, up: 6, spread: 1, gravity: -6, additive: true },
        smoke: { count: 16, color: 0x555049, size: 2.6, life: 2.2, speed: 3, up: 3.5, spread: 1, gravity: 1.2, additive: false },
        death: { count: 18, color: 0x8a4aff, size: 0.75, life: 1.9, speed: 2.4, up: 3.2, spread: 1, gravity: 1.1, additive: true },
        spawn: { count: 22, color: 0x7a2ad0, size: 0.85, life: 1.1, speed: 6, up: 5, spread: 1, gravity: 0, additive: true, spiral: true },
        acid: { count: 10, color: 0x7aff3a, size: 0.42, life: 0.8, speed: 5, up: 2, spread: 1, gravity: -10, additive: true },
        heal: { count: 18, color: 0x4aff88, size: 0.55, life: 1.1, speed: 2, up: 3.4, spread: 0.7, gravity: 0.6, additive: true, spiral: true },
        rain: { count: 1, color: 0x9fc8e8, size: 0.38, life: 1.1, speed: 42, up: -42, spread: 1, gravity: 0, additive: false },
        mist: { count: 2, color: 0xcfe8f5, size: 2.2, life: 1.7, speed: 2, up: 1.6, spread: 1, gravity: 0.4, additive: false },
        ember: { count: 2, color: 0xff8a3a, size: 0.5, life: 2.4, speed: 2.4, up: 2.4, spread: 1, gravity: 0.5, additive: true },
        fire: { count: 4, color: 0xff7a20, size: 0.85, life: 0.85, speed: 1.6, up: 3.4, spread: 1, gravity: 1.4, additive: true },
        dust: { count: 6, color: 0xb0a08a, size: 1.2, life: 1.2, speed: 3, up: 1.6, spread: 1, gravity: 0.2, additive: false },
      };
      const cfg = Object.assign({}, presets[type] || presets.impact, opts);
      const count = cfg.count || 5;
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= MAX * 2) break;
        const spread = cfg.spread || 1;
        const ang = Math.random() * Math.PI * 2;
        const elev = Math.random() * Math.PI - Math.PI / 2;
        const sp = cfg.speed * MF.randRange(0.35, 1);
        const p = {
          x: position.x + MF.randRange(-0.3, 0.3) * spread,
          y: position.y + MF.randRange(-0.3, 0.3) * spread,
          z: position.z + MF.randRange(-0.3, 0.3) * spread,
          vx: Math.cos(ang) * Math.cos(elev) * sp * spread,
          vy: Math.sin(elev) * sp * 0.5 + cfg.up * MF.randRange(0.5, 1),
          vz: Math.sin(ang) * Math.cos(elev) * sp * spread,
          life: cfg.life * MF.randRange(0.7, 1.2),
          age: 0,
          size: cfg.size * MF.randRange(0.7, 1.3),
          r: ((cfg.color >> 16) & 255) / 255,
          g: ((cfg.color >> 8) & 255) / 255,
          b: (cfg.color & 255) / 255,
          gravity: cfg.gravity || 0,
          additive: !!cfg.additive,
          spiral: !!cfg.spiral,
          spin: MF.randRange(-3, 3),
        };
        this.particles.push(p);
      }
    }

    update(dt) {
      this.time += dt;
      const list = this.particles;
      const a = this.additive.userData.buffers;
      const s = this.soft.userData.buffers;
      let ai = 0, si = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dt;
        if (p.age >= p.life) {
          list.splice(i, 1);
          continue;
        }
        if (p.spiral) {
          const ang = p.spin * p.age;
          p.vx += Math.cos(ang) * dt * 2.2;
          p.vz += Math.sin(ang) * dt * 2.2;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        // soft ground stop
        if (p.gravity < -2) {
          const gy = MF.getHeight(p.x, p.z);
          if (p.y < gy + 0.05) { p.y = gy + 0.05; p.vy *= -0.25; p.vx *= 0.6; p.vz *= 0.6; }
        }
        const fade = 1 - p.age / p.life;
        const buf = p.additive ? a : s;
        let idx = p.additive ? ai : si;
        if (idx < MAX) {
          buf.positions[idx * 3] = p.x;
          buf.positions[idx * 3 + 1] = p.y;
          buf.positions[idx * 3 + 2] = p.z;
          buf.colors[idx * 3] = p.r;
          buf.colors[idx * 3 + 1] = p.g;
          buf.colors[idx * 3 + 2] = p.b;
          buf.sizes[idx] = p.size * (0.6 + fade * 0.4);
          buf.alphas[idx] = fade * fade;
          if (p.additive) ai++; else si++;
        }
      }
      // hide unused
      for (let i = ai; i < MAX; i++) a.alphas[i] = 0;
      for (let i = si; i < MAX; i++) s.alphas[i] = 0;
      this.additive.geometry.attributes.position.needsUpdate = true;
      this.additive.geometry.attributes.color.needsUpdate = true;
      this.additive.geometry.attributes.size.needsUpdate = true;
      this.additive.geometry.attributes.alpha.needsUpdate = true;
      this.soft.geometry.attributes.position.needsUpdate = true;
      this.soft.geometry.attributes.color.needsUpdate = true;
      this.soft.geometry.attributes.size.needsUpdate = true;
      this.soft.geometry.attributes.alpha.needsUpdate = true;
    }
  }

  MF.ParticleSystem = ParticleSystem;
})(window.MF);
