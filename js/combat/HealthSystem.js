/* ============================================================
   METEORFALL — HealthSystem.js
   Player health, regeneration, damage direction, death flow,
   low-health screen effects.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class HealthSystem {
    constructor() {
      this.maxHp = 100;
      this.hp = 100;
      this.regenDelay = 5;
      this.regenRate = 2.5;
      this.timeSinceDamage = 0;
      this.alive = true;
      this.damageIndicators = [];
    }

    reset() {
      this.hp = this.maxHp;
      this.alive = true;
      this.timeSinceDamage = 0;
    }

    takeDamage(amount, fromPos) {
      if (!this.alive || MF.game.cheatsGod) return;
      this.hp = Math.max(0, this.hp - amount);
      this.timeSinceDamage = 0;
      MF.screenFx.damageFlash();
      MF.audio.playUI("damage");
      if (fromPos && MF.game.player) {
        const p = MF.game.player.position;
        const ang = Math.atan2(fromPos.x - p.x, fromPos.z - p.z);
        this.damageIndicators.push({ angle: ang, time: 1.6 });
      }
      if (this.hp <= 0) {
        this.alive = false;
        MF.game.onPlayerDeath();
      }
    }

    heal(amount) {
      if (!this.alive) return;
      this.hp = Math.min(this.maxHp, this.hp + amount);
      if (MF.game.particles && MF.game.player) {
        MF.game.particles.emit("heal", MF.game.player.position, { count: 14 });
      }
    }

    update(dt) {
      this.timeSinceDamage += dt;
      if (this.alive && this.timeSinceDamage > this.regenDelay && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
      }
      for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
        this.damageIndicators[i].time -= dt;
        if (this.damageIndicators[i].time <= 0) this.damageIndicators.splice(i, 1);
      }
      if (MF.screenFx) MF.screenFx.setLowHealth(this.hp / this.maxHp);
    }
  }

  MF.HealthSystem = HealthSystem;
})(window.MF);
