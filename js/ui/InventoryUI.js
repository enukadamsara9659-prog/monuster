/* ============================================================
   METEORFALL — InventoryUI.js
   Weapon inventory grid (I key). Renders via UIManager.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class InventoryUI {
    open() {
      MF.ui.showScreen("inventory-panel");
      MF.ui.renderInventory();
      MF.game.pause();
      MF.input.exitPointerLock();
    }
    close() {
      MF.ui.hideScreen("inventory-panel");
      MF.game.resume();
    }
    toggle() {
      if (MF.ui.isShown("inventory-panel")) this.close();
      else this.open();
    }
  }

  MF.InventoryUI = InventoryUI;
})(window.MF);
