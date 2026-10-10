/* ============================================================
   METEORFALL — MainMenu.js
   Title screen wiring + animated background handling.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MainMenu {
    constructor() {
      this.visible = true;
      this.continueBtn = document.getElementById("btn-continue");
    }

    show() {
      MF.ui.showScreen("main-menu");
      this.visible = true;
      if (this.continueBtn) {
        this.continueBtn.disabled = !MF.save.anySaveExists();
      }
      MF.audio.setMusicMode("exploration");
    }

    hide() {
      MF.ui.hideScreen("main-menu");
      this.visible = false;
    }

    update(dt) {
      // slow rotate the title glyph
      const title = document.getElementById("game-title");
      if (title && this.visible) {
        const t = performance.now() * 0.0004;
        title.style.textShadow = `0 0 ${28 + Math.sin(t) * 12}px rgba(255,120,40,${0.55 + Math.sin(t * 1.7) * 0.2})`;
      }
    }
  }

  MF.MainMenu = MainMenu;
})(window.MF);
