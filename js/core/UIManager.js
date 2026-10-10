/* ============================================================
   METEORFALL — UIManager.js
   Screen stack, fades, flashes, toasts and settings plumbing.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class UIManager {
    constructor() {
      this.screens = {};
      this.activeScreens = new Set();
      this.el = {};
      this.fadeLevel = 0;
    }

    init() {
      const ids = [
        "loading-screen", "loading-bar", "loading-tip", "main-menu", "pause-menu",
        "settings-panel", "save-load-panel", "death-screen", "victory-screen",
        "mission-card", "mission-complete", "credits-screen", "inventory-panel",
        "map-panel", "weapon-wheel", "squad-wheel", "notification", "fade-overlay",
        "flash-overlay", "damage-overlay", "vignette", "underwater-overlay",
        "infected-overlay", "hud", "crosshair", "interaction-prompt", "fps-counter",
        "dialogue-line", "skip-hint", "title-card",
      ];
      ids.forEach((id) => { this.el[id] = document.getElementById(id); });

      // wire generic buttons with data-action attributes
      document.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          MF.audio && MF.audio.playUI("confirm");
          this.handleAction(btn.getAttribute("data-action"), btn.getAttribute("data-arg"));
        });
        btn.addEventListener("mouseenter", () => MF.audio && MF.audio.playUI("hover"));
      });
    }

    handleAction(action, arg) {
      const g = MF.game;
      switch (action) {
        case "new-game": g && g.newGame(); break;
        case "continue-game": g && g.continueGame(); break;
        case "open-settings": this.showScreen("settings-panel"); break;
        case "close-settings": this.hideScreen("settings-panel"); this.saveSettings(); break;
        case "open-credits": this.showScreen("credits-screen"); break;
        case "close-credits": this.hideScreen("credits-screen"); break;
        case "resume": g && g.resume(); break;
        case "save-game": this.showSaveLoad("save"); break;
        case "load-game": this.showSaveLoad("load"); break;
        case "main-menu": g && g.returnToMenu(); break;
        case "respawn": g && g.respawn(); break;
        case "victory-menu": g && g.returnToMenu(); break;
        case "new-game-plus": g && g.newGame(true); break;
        case "save-slot": MF.save.saveGame(parseInt(arg, 10)); this.toast("Game saved — slot " + arg); this.renderSlots(this._slotMode); break;
        case "load-slot": {
          const data = MF.save.loadGame(parseInt(arg, 10));
          if (data) {
            this.hideScreen("save-load-panel");
            this.hideScreen("pause-menu");
            g && g.loadFromSnapshot(data);
          }
          break;
        }
        case "close-save-load": this.hideScreen("save-load-panel"); break;
        case "close-inventory": this.hideScreen("inventory-panel"); g && g.resume(); break;
        case "close-map": this.hideScreen("map-panel"); g && g.resume(); break;
        case "equip-weapon": g && g.weapons && g.weapons.equipByName(arg); this.renderInventory(); break;
        default: break;
      }
    }

    saveSettings() {
      const music = document.getElementById("set-music");
      const sfx = document.getElementById("set-sfx");
      const sens = document.getElementById("set-sens");
      if (music) MF.audio.setVolume("music", music.value / 100);
      if (sfx) MF.audio.setVolume("sfx", sfx.value / 100);
      if (sens) MF.input.sensitivity = sens.value / 100;
    }

    showScreen(id) {
      const el = this.el[id] || document.getElementById(id);
      if (!el) return;
      el.classList.remove("hidden");
      this.activeScreens.add(id);
    }
    hideScreen(id) {
      const el = this.el[id] || document.getElementById(id);
      if (!el) return;
      el.classList.add("hidden");
      this.activeScreens.delete(id);
    }
    isShown(id) { return this.activeScreens.has(id); }
    toggleScreen(id) { this.isShown(id) ? this.hideScreen(id) : this.showScreen(id); }

    /* Full-screen fade. cb fires at black. */
    fadeOut(cb, duration) {
      const el = this.el["fade-overlay"];
      if (!el) { cb && cb(); return; }
      el.style.transitionDuration = (duration || 0.5) + "s";
      el.style.opacity = "1";
      setTimeout(() => cb && cb(), (duration || 0.5) * 1000);
    }
    fadeIn(duration) {
      const el = this.el["fade-overlay"];
      if (!el) return;
      el.style.transitionDuration = (duration || 0.6) + "s";
      el.style.opacity = "0";
    }

    flash(color, peak, duration) {
      const el = this.el["flash-overlay"];
      if (!el) return;
      el.style.background = color || "#fff";
      el.style.opacity = String(peak === undefined ? 0.7 : peak);
      el.style.transitionDuration = "0s";
      requestAnimationFrame(() => {
        el.style.transitionDuration = (duration || 0.4) + "s";
        el.style.opacity = "0";
      });
    }

    damageFlash() {
      const el = this.el["damage-overlay"];
      if (!el) return;
      el.style.opacity = "0.45";
      el.style.transitionDuration = "0s";
      requestAnimationFrame(() => {
        el.style.transitionDuration = "0.35s";
        el.style.opacity = "0";
      });
    }

    toast(msg, duration) {
      const el = this.el["notification"];
      if (!el) return;
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove("show"), duration || 3000);
    }

    dialogue(name, line, duration) {
      const el = this.el["dialogue-line"];
      if (!el) return;
      el.innerHTML = `<b>${name}:</b> ${line}`;
      el.classList.add("show");
      clearTimeout(this._dlgTimer);
      this._dlgTimer = setTimeout(() => el.classList.remove("show"), duration || 3200);
    }

    /* MissionUI delegation */
    showTitleCard(chapter, title, desc) {
      if (MF.game && MF.game.missionUI) MF.game.missionUI.showTitleCard(chapter, title, desc);
    }
    showMissionComplete(mission) {
      if (MF.game && MF.game.missionUI) MF.game.missionUI.showMissionComplete(mission);
    }

    showSaveLoad(mode) {
      this._slotMode = mode;
      this.showScreen("save-load-panel");
      this.renderSlots(mode);
    }

    renderSlots(mode) {
      const wrap = document.getElementById("slots-list");
      if (!wrap) return;
      wrap.innerHTML = "";
      const title = document.getElementById("save-load-title");
      if (title) title.textContent = mode === "save" ? "SAVE GAME" : "LOAD GAME";
      for (let i = 0; i <= 10; i++) {
        const info = MF.save.getSaveInfo(i);
        const div = document.createElement("div");
        div.className = "slot-row" + (info ? "" : " empty");
        const label = i === 0 ? "AUTOSAVE" : "SLOT " + i;
        div.innerHTML = `<span class="slot-name">${label}</span>
          <span class="slot-info">${info ? "Ch." + info.chapter + " · " + MF.fmtTime(info.playTime) + " · " + new Date(info.timestamp).toLocaleString() : "— empty —"}</span>`;
        const btn = document.createElement("button");
        btn.className = "btn small";
        btn.textContent = mode === "save" ? "SAVE" : "LOAD";
        btn.disabled = mode === "load" && !info;
        btn.setAttribute("data-action", mode === "save" ? "save-slot" : "load-slot");
        btn.setAttribute("data-arg", String(i));
        btn.addEventListener("click", () => this.handleAction(btn.getAttribute("data-action"), btn.getAttribute("data-arg")));
        div.appendChild(btn);
        wrap.appendChild(div);
      }
    }

    renderInventory() {
      const wrap = document.getElementById("inventory-grid");
      if (!wrap || !MF.game || !MF.game.weapons) return;
      wrap.innerHTML = "";
      const all = MF.game.weapons.getAllDefs();
      all.forEach((def) => {
        const unlocked = MF.game.weapons.unlocked.has(def.id);
        const div = document.createElement("div");
        div.className = "inv-slot" + (unlocked ? "" : " locked");
        div.innerHTML = `<div class="inv-icon">${def.icon}</div>
          <div class="inv-name">${def.name}</div>
          <div class="inv-stats">DMG ${def.damage} · RATE ${def.fireRate}/s<br>RANGE ${def.range}m</div>`;
        if (unlocked) {
          const btn = document.createElement("button");
          btn.className = "btn small";
          btn.textContent = "EQUIP";
          btn.addEventListener("click", () => this.handleAction("equip-weapon", def.id));
          div.appendChild(btn);
        } else {
          const lock = document.createElement("div");
          lock.className = "inv-lock";
          lock.textContent = "LOCKED";
          div.appendChild(lock);
        }
        wrap.appendChild(div);
      });
    }
  }

  MF.UIManager = UIManager;
})();
