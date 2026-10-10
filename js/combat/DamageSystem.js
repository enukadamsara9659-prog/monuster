/* ============================================================
   METEORFALL — DamageSystem.js
   Damage math: distance falloff, headshot crits, floating
   damage numbers, monster armor.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class DamageSystem {
    constructor() {
      this.numbers = [];
    }

    /* Falloff: full damage within effective range, linear to min beyond. */
    computeDamage(def, distance, isCrit) {
      let dmg = def.damage;
      const eff = def.range * (def.falloff === 0 ? 4 : 1);
      if (def.falloff > 0 && distance > def.range) {
        const t = MF.clamp(1 - (distance - def.range) / (def.range * 1.2), 0, 1);
        dmg *= MF.lerp(1 - def.falloff, 1, t);
      }
      if (isCrit) dmg *= 3;
      return Math.max(1, Math.round(dmg));
    }

    applyToMonster(monster, rawDamage, hitPoint, isCrit) {
      if (!monster || !monster.isAlive) return 0;
      const dmg = Math.round(rawDamage);
      monster.takeDamage(dmg, hitPoint, isCrit);
      this.spawnNumber(hitPoint, dmg, isCrit);
      MF.audio.playHit(isCrit);
      if (MF.game.combat) MF.game.combat.hitMarker(isCrit);
      return dmg;
    }

    spawnNumber(worldPos, amount, crit) {
      const hud = MF.game.hud;
      if (hud && hud.spawnDamageNumber) hud.spawnDamageNumber(worldPos, amount, crit);
    }

    /* Area damage for explosions */
    areaDamage(center, radius, damage, exclude) {
      const monsters = MF.game.monsters ? MF.game.monsters.list : [];
      for (const m of monsters) {
        if (m === exclude || !m.isAlive) continue;
        const d = MF.dist3D(m.position, center);
        if (d < radius) {
          const scaled = damage * (1 - (d / radius) * 0.7);
          this.applyToMonster(m, scaled, m.position.clone().setY(m.position.y + 1), false);
        }
      }
      // player splash
      const p = MF.game.player;
      if (p) {
        const d = MF.dist3D(p.position, center);
        if (d < radius && d > 1) {
          MF.game.health.takeDamage(damage * 0.22 * (1 - d / radius), center);
        }
      }
    }
  }

  MF.DamageSystem = DamageSystem;
})(window.MF);
