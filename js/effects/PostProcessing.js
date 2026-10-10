/* ============================================================
   METEORFALL — PostProcessing.js
   CSS-based screen effects: damage flash, low-health vignette,
   underwater tint, infected zones, death grading, flash.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class PostProcessing {
    constructor() {
      this.vignette = document.getElementById("vignette");
      this.underwater = document.getElementById("underwater-overlay");
      this.infected = document.getElementById("infected-overlay");
      this.deathScreen = document.getElementById("death-screen");
      this._shakeTime = 0;
      this._shakePower = 0;
    }

    setLowHealth(ratio) {
      if (!this.vignette) return;
      // ratio 0..1 (1 = full health)
      let alpha = 0;
      if (ratio < 0.3) alpha = (0.3 - ratio) / 0.3 * 0.55;
      if (ratio < 0.15) alpha = Math.max(alpha, 0.62);
      this.vignette.style.opacity = String(alpha);
    }

    setUnderwater(on) {
      if (this.underwater) this.underwater.style.opacity = on ? "1" : "0";
    }

    setInfected(on) {
      if (this.infected) this.infected.style.opacity = on ? "1" : "0";
    }

    setDeath(on) {
      if (this.deathScreen) {
        if (on) this.deathScreen.classList.remove("hidden");
        else this.deathScreen.classList.add("hidden");
      }
      document.getElementById("game-canvas-wrap").style.filter = on ? "grayscale(0.8) contrast(1.1)" : "none";
    }

    damageFlash() {
      MF.ui.damageFlash();
    }

    screenFlash(color, peak, duration) {
      MF.ui.flash(color, peak, duration);
    }

    shake(power, duration) {
      this._shakePower = Math.max(this._shakePower, power);
      this._shakeTime = Math.max(this._shakeTime, duration || 0.3);
    }

    update(dt, cameraController) {
      if (this._shakeTime > 0) {
        this._shakeTime -= dt;
        if (cameraController) cameraController.addShake(this._shakePower * (this._shakeTime > 0 ? 1 : 0));
        if (this._shakeTime <= 0) this._shakePower = 0;
      }
    }
  }

  MF.PostProcessing = PostProcessing;
})(window.MF);
