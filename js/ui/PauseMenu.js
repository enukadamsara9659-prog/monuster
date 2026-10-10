/* ============================================================
   METEORFALL — PauseMenu.js
   Escape-to-pause handling + settings panel values.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class PauseMenu {
    constructor() {
      this.isOpen = false;
    }

    open() {
      this.isOpen = true;
      MF.ui.showScreen("pause-menu");
      MF.game.pause();
      MF.input.exitPointerLock();
    }

    close() {
      this.isOpen = false;
      MF.ui.hideScreen("pause-menu");
      MF.ui.hideScreen("settings-panel");
      MF.game.resume();
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    syncSettingsUI() {
      const music = document.getElementById("set-music");
      const sfx = document.getElementById("set-sfx");
      const sens = document.getElementById("set-sens");
      if (music) music.value = Math.round(MF.audio.volumes.music * 100);
      if (sfx) sfx.value = Math.round(MF.audio.volumes.sfx * 100);
      if (sens) sens.value = Math.round((MF.input.sensitivity || 1) * 100);
    }
  }

  MF.PauseMenu = PauseMenu;
})(window.MF);
