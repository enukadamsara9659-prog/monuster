/* ============================================================
   METEORFALL — HUD.js
   Minimap, health/stamina, weapon panel, squad panels,
   crosshair, floating damage numbers, compass, FPS.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class HUD {
    constructor() {
      this.minimap = document.getElementById("minimap");
      this.minimapCtx = this.minimap ? this.minimap.getContext("2d") : null;
      this.damageNumbers = [];
      this.fps = 0;
      this._fpsAcc = 0;
      this._fpsCount = 0;
    }

    update(dt) {
      const g = MF.game;
      if (!g || !g.player) return;

      // fps
      this._fpsAcc += dt;
      this._fpsCount++;
      if (this._fpsAcc > 0.5) {
        this.fps = Math.round(this._fpsCount / this._fpsAcc);
        this._fpsAcc = 0;
        this._fpsCount = 0;
        const el = document.getElementById("fps-counter");
        if (el && !el.classList.contains("hidden")) {
          el.textContent = this.fps + " FPS · " + (g.monsters ? g.monsters.countAlive() : 0) + " enemies";
        }
      }

      // health + stamina
      const hpFill = document.getElementById("health-fill");
      const hpText = document.getElementById("health-text");
      const stFill = document.getElementById("stamina-fill");
      if (hpFill) {
        const ratio = g.health.hp / g.health.maxHp;
        hpFill.style.width = (ratio * 100) + "%";
        hpFill.style.background = ratio < 0.3 ? "#e83232" : ratio < 0.6 ? "#e8863a" : "#3ec85a";
      }
      if (hpText) hpText.textContent = Math.ceil(g.health.hp) + " / " + g.health.maxHp;
      if (stFill && g.controller) stFill.style.width = g.controller.stamina + "%";

      // weapon panel
      const wpnName = document.getElementById("weapon-name");
      const wpnMode = document.getElementById("weapon-mode");
      if (wpnName && g.weapons) {
        const def = g.weapons.current;
        wpnName.textContent = def.name;
        if (wpnMode) wpnMode.textContent = def.auto ? "AUTO" : "SEMI";
      }

      // mission
      const mTitle = document.getElementById("mission-title");
      const mObj = document.getElementById("mission-objective");
      if (mTitle && g.missions) mTitle.textContent = g.missions.missionTitle();
      if (mObj && g.missions) {
        const obj = g.missions.active && g.missions.active.current;
        let text = g.missions.objectiveText();
        const dist = g.missions.waypointDistance();
        if (obj && obj.targetPos && dist !== null && (obj.type === "GO_TO" || obj.type === "INTERACT")) {
          text += "  ·  " + Math.round(dist) + "m";
        }
        mObj.textContent = text;
      }

      // squad panels
      this.updateSquadPanels(g);

      // damage direction indicators
      this.updateDamageIndicators(g);

      // damage numbers
      this.updateDamageNumbers(dt);

      // compass
      this.updateCompass(g);

      // minimap
      this.updateMinimap(g);
    }

    updateWeaponPanel(def) {
      const icon = document.getElementById("weapon-icon");
      if (icon) icon.textContent = def.icon;
    }

    updateSquadPanels(g) {
      const wrap = document.getElementById("squad-panels");
      if (!wrap || !g.squad) return;
      const active = g.squad.active;
      while (wrap.children.length > active.length) wrap.removeChild(wrap.lastChild);
      while (wrap.children.length < active.length) {
        const div = document.createElement("div");
        div.className = "squad-panel";
        div.innerHTML = `<div class="squad-avatar"></div>
          <div class="squad-name"></div>
          <div class="squad-bar"><div class="squad-fill"></div></div>
          <div class="squad-cd"></div>`;
        wrap.appendChild(div);
      }
      active.forEach((m, i) => {
        const div = wrap.children[i];
        div.classList.toggle("downed", !m.isAlive);
        const avatar = div.querySelector(".squad-avatar");
        avatar.textContent = m.name[0];
        avatar.style.background = "#" + m.hero.accent.toString(16).padStart(6, "0");
        div.querySelector(".squad-name").textContent = m.name + " · " + m.role;
        div.querySelector(".squad-fill").style.width = (m.health / m.maxHealth * 100) + "%";
        const cd = div.querySelector(".squad-cd");
        cd.textContent = m.abilityCooldown > 0 ? Math.ceil(m.abilityCooldown) + "s" : m.hero.ability.name;
        cd.classList.toggle("ready", m.abilityCooldown <= 0);
      });
    }

    updateDamageIndicators(g) {
      const wrap = document.getElementById("damage-indicators");
      if (!wrap) return;
      wrap.innerHTML = "";
      const camYaw = g.controller ? g.controller.camYaw : 0;
      for (const ind of g.health.damageIndicators) {
        const div = document.createElement("div");
        div.className = "dmg-indicator";
        const rel = ind.angle - camYaw + Math.PI;
        div.style.transform = `rotate(${rel}rad)`;
        div.style.opacity = String(Math.min(1, ind.time));
        wrap.appendChild(div);
      }
    }

    spawnDamageNumber(worldPos, amount, crit) {
      const wrap = document.getElementById("damage-numbers");
      if (!wrap) return;
      const div = document.createElement("div");
      div.className = "dmg-number" + (crit ? " crit" : "");
      div.textContent = Math.round(amount);
      wrap.appendChild(div);
      this.damageNumbers.push({ el: div, pos: worldPos.clone(), age: 0, life: 1.1 });
    }

    updateDamageNumbers(dt) {
      const cam = MF.game.camera;
      for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
        const dn = this.damageNumbers[i];
        dn.age += dt;
        if (dn.age > dn.life) {
          dn.el.remove();
          this.damageNumbers.splice(i, 1);
          continue;
        }
        const v = dn.pos.clone();
        v.y += dn.age * 1.4;
        v.project(cam);
        if (v.z > 1) { dn.el.style.display = "none"; continue; }
        dn.el.style.display = "block";
        dn.el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + "px";
        dn.el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + "px";
        dn.el.style.opacity = String(1 - dn.age / dn.life);
      }
    }

    updateCompass(g) {
      const el = document.getElementById("compass");
      if (!el || !g.controller) return;
      const yaw = ((-g.controller.camYaw * 180 / Math.PI) % 360 + 360) % 360;
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const idx = Math.round(yaw / 45) % 8;
      el.textContent = dirs[idx];
    }

    updateMinimap(g) {
      const ctx = this.minimapCtx;
      if (!ctx || !g.world || !g.world.minimap) return;
      const w = this.minimap.width, h = this.minimap.height;
      const p = g.player.position;
      const world = MF.WORLD_SIZE;
      const scale = 2.6; // zoom
      const view = 220 / scale;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // terrain image
      const src = g.world.minimap;
      const sx = ((p.x - view / 2) / world) * src.width;
      const sy = ((p.z - view / 2) / world) * src.height;
      const sw = (view / world) * src.width;
      ctx.drawImage(src, sx, sy, sw, sw, 0, 0, w, h);

      const toMap = (x, z) => ({
        x: ((x - (p.x - view / 2)) / view) * w,
        y: ((z - (p.z - view / 2)) / view) * h,
      });

      // squad
      if (g.squad) {
        ctx.fillStyle = "#4a9eff";
        for (const m of g.squad.active) {
          if (!m.isAlive) continue;
          const q = toMap(m.position.x, m.position.z);
          ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      // enemies
      if (g.monsters) {
        ctx.fillStyle = "#ff4848";
        for (const m of g.monsters.list) {
          if (!m.isAlive) continue;
          const d = MF.dist3D(m.position, p);
          if (d > 140 && !m.isBoss) continue;
          const q = toMap(m.position.x, m.position.z);
          ctx.beginPath();
          ctx.arc(q.x, q.y, m.isBoss ? 5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // waypoint
      const obj = g.missions && g.missions.active && g.missions.active.current;
      if (obj && obj.targetPos) {
        const q = toMap(obj.targetPos.x, obj.targetPos.y);
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.moveTo(q.x, q.y - 6); ctx.lineTo(q.x + 5, q.y); ctx.lineTo(q.x, q.y + 6); ctx.lineTo(q.x - 5, q.y);
        ctx.closePath(); ctx.fill();
      }

      // player arrow
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-g.player.yaw);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 2); ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();

      // ring
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  MF.HUD = HUD;
})(window.MF);
