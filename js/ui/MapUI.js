/* ============================================================
   METEORFALL — MapUI.js
   Full-screen world map (M key): terrain image, player,
   discovered locations, mission waypoint, zoom, fast travel.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MapUI {
    constructor() {
      this.canvas = document.getElementById("map-canvas");
      this.zoom = 1;
      this.opened = false;
      if (this.canvas) {
        this.canvas.addEventListener("wheel", (e) => {
          this.zoom = MF.clamp(this.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.6, 3);
          this.draw();
          e.preventDefault();
        }, { passive: false });
        this.canvas.addEventListener("click", (e) => this.onClick(e));
      }
    }

    open() {
      this.opened = true;
      MF.ui.showScreen("map-panel");
      MF.game.pause();
      MF.input.exitPointerLock();
      this.draw();
    }
    close() {
      this.opened = false;
      MF.ui.hideScreen("map-panel");
      MF.game.resume();
    }
    toggle() {
      if (this.opened) this.close();
      else this.open();
    }

    worldToScreen(x, z) {
      const w = this.canvas.width, h = this.canvas.height;
      const world = MF.WORLD_SIZE;
      const cx = w / 2, cy = h / 2;
      return {
        x: cx + (x / world - 0.5) * w * this.zoom,
        y: cy + (z / world - 0.5) * h * this.zoom,
      };
    }

    draw() {
      if (!this.canvas || !MF.game.world) return;
      const ctx = this.canvas.getContext("2d");
      const w = this.canvas.width, h = this.canvas.height;
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(0, 0, w, h);

      const src = MF.game.world.minimap;
      if (src) {
        const dw = w * this.zoom, dh = h * this.zoom;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }

      // fog of war
      const discovered = MF.game.world.discovered;
      ctx.fillStyle = "rgba(4,8,14,0.72)";
      for (const loc of MF.game.world.locations) {
        if (discovered.has(loc.id)) continue;
        const q = this.worldToScreen(loc.x, loc.z);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 42 * this.zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // location labels
      ctx.font = "12px Rajdhani, sans-serif";
      for (const loc of MF.game.world.locations) {
        if (!discovered.has(loc.id)) continue;
        const q = this.worldToScreen(loc.x, loc.z);
        ctx.fillStyle = "rgba(255,220,140,0.92)";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe6b0";
        ctx.fillText(loc.name, q.x + 8, q.y + 4);
      }

      // mission waypoint
      const obj = MF.game.missions && MF.game.missions.active && MF.game.missions.active.current;
      if (obj && obj.targetPos) {
        const q = this.worldToScreen(obj.targetPos.x, obj.targetPos.y);
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.moveTo(q.x, q.y - 9); ctx.lineTo(q.x + 7, q.y); ctx.lineTo(q.x, q.y + 9); ctx.lineTo(q.x - 7, q.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillText(obj.text, q.x + 12, q.y + 4);
      }

      // player
      const p = this.worldToScreen(MF.game.player.position.x, MF.game.player.position.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-MF.game.player.yaw);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 3); ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    onClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      // fast travel to discovered locations
      for (const loc of MF.game.world.locations) {
        if (!MF.game.world.discovered.has(loc.id)) continue;
        const q = this.worldToScreen(loc.x, loc.z);
        if (Math.hypot(q.x - mx, q.y - my) < 16) {
          const y = MF.getHeight(loc.x, loc.z) + 0.2;
          MF.game.player.position.set(loc.x, y, loc.z);
          MF.ui.toast("Fast travelled to " + loc.name);
          this.close();
          return;
        }
      }
    }
  }

  MF.MapUI = MapUI;
})(window.MF);
