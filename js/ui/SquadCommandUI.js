/* ============================================================
   METEORFALL — SquadCommandUI.js
   Hold Q: radial squad command wheel.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const CMD_LABELS = {
    follow: "Follow Me",
    hold: "Hold Position",
    attack: "Attack Target",
    defend: "Defend Area",
    regroup: "Regroup",
    special: "Use Special",
  };

  class SquadCommandUI {
    constructor() {
      this.el = document.getElementById("squad-wheel");
      this.slotsEl = document.getElementById("squad-wheel-slots");
      this.active = false;
      this.highlight = 0;
      this.buildSlots();
    }

    buildSlots() {
      if (!this.slotsEl) return;
      this.slotsEl.innerHTML = "";
      MF.SQUAD_COMMANDS.forEach((cmd, i) => {
        const div = document.createElement("div");
        div.className = "wheel-slot";
        div.dataset.index = i;
        div.innerHTML = CMD_LABELS[cmd];
        this.slotsEl.appendChild(div);
      });
    }

    open() {
      this.active = true;
      MF.ui.showScreen("squad-wheel");
      MF.input.exitPointerLock();
    }

    close() {
      this.active = false;
      MF.ui.hideScreen("squad-wheel");
    }

    update() {
      if (!this.active) return;
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const ang = Math.atan2(MF.input.mouse.y - cy, MF.input.mouse.x - cx);
      const deg = ((ang * 180 / Math.PI) + 360 + 90) % 360;
      const n = MF.SQUAD_COMMANDS.length;
      this.highlight = Math.floor(((deg + 180 / n) % 360) / (360 / n)) % n;
      const slots = this.slotsEl.children;
      for (let i = 0; i < n; i++) slots[i].classList.toggle("selected", i === this.highlight);
    }

    release() {
      if (this.active) {
        MF.game.squad.setCommand(MF.SQUAD_COMMANDS[this.highlight]);
        this.close();
      }
    }
  }

  MF.SquadCommandUI = SquadCommandUI;
})(window.MF);
