/* ============================================================
   METEORFALL — MonsterManager.js
   Owns all monsters: spawn/despawn, updates, kill events.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MonsterManager {
    constructor(scene) {
      this.scene = scene;
      this.list = [];
      this.spawner = new MF.MonsterSpawner();
      this.totalKilled = 0;
    }

    spawn(type, position, opts) {
      opts = opts || {};
      const factory = {
        crawler: MF.MonsterTypes.createCrawler,
        stalker: MF.MonsterTypes.createStalker,
        brute: MF.MonsterTypes.createBrute,
        screamer: MF.MonsterTypes.createScreamer,
        spitter: MF.MonsterTypes.createSpitter,
        flyer: MF.MonsterTypes.createFlyer,
        burrower: MF.MonsterTypes.createBurrower,
      }[type];
      if (!factory) return null;
      const monster = factory(position, opts);
      if (opts.health) {
        monster.maxHealth = Math.round(monster.maxHealth * opts.health);
        monster.health = monster.maxHealth;
      }
      if (opts.damage) monster.damage = Math.round(monster.damage * opts.damage);
      this.scene.add(monster.mesh);
      this.list.push(monster);
      if (MF.game.particles) MF.game.particles.emit("spawn", position, { count: 16 });
      return monster;
    }

    spawnBoss(kind, position) {
      const factory = {
        titan: MF.BossFactory.createTitan,
        queen: MF.BossFactory.createMeteorQueen,
        guardian: MF.BossFactory.createAncientGuardian,
        void: MF.BossFactory.createVoidTitan,
      }[kind];
      if (!factory) return null;
      const boss = factory(position);
      this.scene.add(boss.mesh);
      this.list.push(boss);
      MF.ui.toast("⚠ " + boss.name + " has appeared!");
      MF.audio.playMonster("boss", position);
      return boss;
    }

    countAlive() {
      let n = 0;
      for (const m of this.list) if (m.isAlive) n++;
      return n;
    }

    onMonsterKilled(monster) {
      this.totalKilled++;
      if (MF.game.stats) MF.game.stats.kills++;
      if (MF.game.missions) MF.game.missions.onMonsterKilled(monster);
      if (MF.game.squad) MF.game.squad.onKill(monster);
    }

    update(dt, time, playerPos) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const m = this.list[i];
        m.update(dt, time);

        if (!m.isAlive && m.deathTimer > 6) {
          this.scene.remove(m.mesh);
          this.list.splice(i, 1);
          continue;
        }
        if (m.isAlive && playerPos && !m.isBoss) {
          const d = MF.dist3D(m.position, playerPos);
          if (d > 165) {
            this.scene.remove(m.mesh);
            this.list.splice(i, 1);
          }
        }
      }
      this.spawner.update(dt, playerPos);
    }

    clearAll() {
      for (const m of this.list) this.scene.remove(m.mesh);
      this.list.length = 0;
    }

    /* nearest alive monster to a point (for squad targeting) */
    nearestTo(pos, maxDist) {
      let best = null, bestD = maxDist || 60;
      for (const m of this.list) {
        if (!m.isAlive) continue;
        const d = MF.dist3D(m.position, pos);
        if (d < bestD) { bestD = d; best = m; }
      }
      return best;
    }
  }

  MF.MonsterManager = MonsterManager;
})(window.MF);
