/* ============================================================
   METEORFALL — AssetLoader.js
   Loads the embedded texture pack (base64 data-URIs, origin-clean
   even on file:// pages) + procedural Canvas2D fallback textures.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class AssetLoader {
    constructor() {
      this.textures = {};
      this.loadingManager = new THREE.LoadingManager();
      this.loader = new THREE.TextureLoader(this.loadingManager);
      this.progress = 0;
      this.ready = false;
    }

    /* Load everything with a progress callback (0..1). */
    loadAll(onProgress, onDone) {
      const pack = window.MF_TEXTURES || {};
      const names = Object.keys(pack);
      const total = names.length + 1; // +1 for procedural set
      let done = 0;
      const tick = () => {
        done++;
        this.progress = done / total;
        if (onProgress) onProgress(this.progress);
        if (done >= total && !this.ready) {
          this.ready = true;
          if (onDone) onDone();
        }
      };

      names.forEach((name) => {
        this.loader.load(
          pack[name],
          (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.encoding = THREE.sRGBEncoding;
            tex.anisotropy = 4;
            this.textures[name] = tex;
            tick();
          },
          undefined,
          () => {
            // graceful fallback: procedural texture
            this.textures[name] = this.makeProcedural(name);
            tick();
          }
        );
      });

      // procedural extras (always available)
      this.buildProceduralExtras();
      tick();

      // safety: if the manager never fires (no textures), resolve soon
      if (names.length === 0) {
        this.ready = true;
        if (onDone) onDone();
      }
    }

    get(name, repeat) {
      const src = this.textures[name] || this.textures.dirt;
      if (!repeat) return src;
      const tex = src.clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      return tex;
    }

    /* Runtime tinted clone — used for "copied & modified" asset variants. */
    tinted(name, color) {
      const tex = (this.textures[name] || this.textures.dirt).clone();
      tex.needsUpdate = true;
      // tint via material color is cheaper; this helper exists for canvas-level mods
      return tex;
    }

    buildProceduralExtras() {
      this.textures.glow = this.proceduralGlow();
      this.textures.flare = this.proceduralFlare();
      this.textures.caustics = this.proceduralCaustics();
      this.textures.scorch = this.proceduralScorch();
    }

    makeProcedural(name) {
      const c = MF.makeCanvas(128);
      const g = c.getContext("2d");
      const base = { grass: "#4a7c34", dirt: "#7a5c3c", rock: "#7d7d82", sand: "#c8b287", snow: "#e8eef5", alien: "#5b2d7a", wall: "#cbb894", stone: "#8b8b8f", roof: "#9c5a42", wood: "#7a5535", bark: "#6b4a2e", metal: "#4c5a4c" }[name] || "#888";
      g.fillStyle = base;
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.18})`;
        g.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 3, 2 + Math.random() * 3);
      }
      return MF.canvasTexture(c);
    }

    proceduralGlow() {
      const c = MF.makeCanvas(64);
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,220,150,0.55)");
      grad.addColorStop(1, "rgba(255,180,80,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      return t;
    }

    proceduralFlare() {
      const c = MF.makeCanvas(64);
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    proceduralCaustics() {
      const c = MF.makeCanvas(256);
      const g = c.getContext("2d");
      g.fillStyle = "#1b5f7a";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * 256, y = Math.random() * 256, r = 6 + Math.random() * 22;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(180,230,255,0.5)");
        grad.addColorStop(1, "rgba(180,230,255,0)");
        g.fillStyle = grad;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      return MF.canvasTexture(c, 8);
    }

    proceduralScorch() {
      const c = MF.makeCanvas(128);
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
      grad.addColorStop(0, "rgba(10,8,8,0.95)");
      grad.addColorStop(0.6, "rgba(40,30,25,0.55)");
      grad.addColorStop(1, "rgba(60,50,40,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
  }

  MF.AssetLoader = AssetLoader;
})();
