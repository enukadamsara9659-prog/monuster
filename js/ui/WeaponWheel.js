/* ============================================================
   METEORFALL — WeaponWheel.js
   Hold Tab: radial weapon selector with slow-motion.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class WeaponWheel {
    constructor() {
      this.el = document.getElementById("weapon-wheel");
      this.slotsEl = document.getElementById("weapon-wheel-slots");
      this.active = false;
      this.highlight = 0;
      this.buildSlots();
    }

    buildSlots() {
      if (!this.slotsEl) return;
      this.slotsEl.innerHTML = "";
      for (let i = 0; i < 4; i++) {
        const div = document.createElement("div");
        div.className = "wheel-slot";
        div.dataset.index = i;
        this.slotsEl.appendChild(div);
      }
    }

    open() {
      if (!MF.game.weapons) return;
      this.active = true;
      MF.ui.showScreen("weapon-wheel");
      MF.input.exitPointerLock();
      const slots = this.slotsEl.children;
      for (let i = 0; i < 4; i++) {
        const def = MF.WeaponBase.getDef(MF.game.weapons.slots[i]);
        slots[i].innerHTML = `<span class="wheel-icon">${def.icon}</span><span>${def.name}</span>`;
        slots[i].classList.toggle("unlocked", MF.game.weapons.unlocked.has(def.id));
      }
    }

    close() {
      this.active = false;
      MF.ui.hideScreen("weapon-wheel");
    }

    update() {
      if (!this.active) return;
      // highlight based on mouse position relative to screen center
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const ang = Math.atan2(MF.input.mouse.y - cy, MF.input.mouse.x - cx);
      const deg = ((ang * 180 / Math.PI) + 360 + 90) % 360;
      this.highlight = Math.floor(((deg + 45) % 360) / 90) % 4;
      const slots = this.slotsEl.children;
      for (let i = 0; i < 4; i++) slots[i].classList.toggle("selected", i === this.highlight);
    }

    release() {
      if (this.active) {
        MF.game.weapons.select(this.highlight);
        this.close();
      }
    }
  }

  MF.WeaponWheel = WeaponWheel;
})(window.MF);
