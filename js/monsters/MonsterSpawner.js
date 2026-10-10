/* ============================================================
   METEORFALL — MonsterSpawner.js
   Zone-based spawning with weights, caps, night/crater buffs,
   combat pacing and defense-mission waves.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const ZONES = [
    { region: "Haven Village", types: [["crawler", 1]], radius: 220 },
    { region: "Ashen Forest", types: [["crawler", 0.5], ["stalker", 0.5]], radius: 300 },
    { region: "Deadlands", types: [["crawler", 0.25], ["stalker", 0.2], ["brute", 0.2], ["spitter", 0.15], ["flyer", 0.1], ["burrower", 0.1]], radius: 260 },
    { region: "Riverside Towns", types: [["crawler", 0.5], ["brute", 0.25], ["spitter", 0.25]], radius: 260 },
    { region: "Ancient Kingdom", types: [["stalker", 0.55], ["brute", 0.45]], radius: 280 },
    { region: "Dark Mountains", types: [["flyer", 0.4], ["burrower", 0.3], ["crawler", 0.3]], radius: 320 },
    { region: "Whispering Swamp", types: [["spitter", 0.5], ["crawler", 0.3], ["screamer", 0.2]], radius: 240 },
    { region: "Coastal Cliffs", types: [["crawler", 0.7], ["flyer", 0.3]], radius: 240 },
  ];

  class MonsterSpawner {
    constructor() {
      this.timer = 4;
      this.maxAlive = 20;
      this.enabled = true;
    }

    pickType(region) {
      const zone = ZONES.find((z) => z.region === region) || ZONES[1];
      let total = 0;
      zone.types.forEach((t) => { total += t[1]; });
      let r = Math.random() * total;
      for (const [type, weight] of zone.types) {
        r -= weight;
        if (r <= 0) return type;
      }
      return zone.types[0][0];
    }

    findSpawnPosition(playerPos) {
      for (let tries = 0; tries < 14; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = MF.randRange(50, 100);
        const x = MF.clamp(playerPos.x + Math.cos(ang) * dist, 30, MF.WORLD_SIZE - 30);
        const z = MF.clamp(playerPos.z + Math.sin(ang) * dist, 30, MF.WORLD_SIZE - 30);
        const d = MF.dist2D(x, z, playerPos.x, playerPos.z);
        if (d < 22) continue;
        const y = MF.getHeight(x, z);
        if (y < 1.5) continue;
        return new THREE.Vector3(x, y, z);
      }
      return null;
    }

    update(dt, playerPos) {
      if (!this.enabled || !MF.game.monsters) return;
      const alive = MF.game.monsters.countAlive();
      if (alive >= this.maxAlive) return;

      // combat detection: any monster chasing within 45m
      let inCombat = false;
      for (const m of MF.game.monsters.list) {
        if (m.isAlive && (m.state === "chase" || m.state === "attack") && MF.dist3D(m.position, playerPos) < 45) {
          inCombat = true;
          break;
        }
      }

      const night = MF.game.dayNight && MF.game.dayNight.isNight;
      let interval = inCombat ? 3 : MF.randRange(5, 10);
      if (night) interval *= 0.5;

      this.timer -= dt;
      if (this.timer > 0) return;
      this.timer = interval;

      const pos = this.findSpawnPosition(playerPos);
      if (!pos) return;

      const region = MF.game.world.terrain.getRegion(pos.x, pos.z);
      const type = this.pickType(region);
      const nearCrater = MF.dist2D(pos.x, pos.z, MF.game.world.terrain.crater.x, MF.game.world.terrain.crater.z) < 320;

      const opts = {};
      if (night) opts.health = 1.5;
      if (nearCrater) opts.damage = 1.5;

      MF.game.monsters.spawn(type, pos, opts);
    }

    /* Defense mission waves */
    spawnWave(waveNumber, center) {
      const table = [
        { types: ["crawler"], count: 5 },
        { types: ["crawler", "crawler", "stalker"], count: 10 },
        { types: ["crawler", "stalker", "brute"], count: 14 },
        { types: ["stalker", "brute", "spitter"], count: 16 },
        { types: ["brute", "spitter", "flyer", "burrower"], count: 18 },
      ];
      const cfg = table[Math.min(table.length - 1, waveNumber - 1)];
      for (let i = 0; i < cfg.count; i++) {
        const ang = (i / cfg.count) * Math.PI * 2;
        const dist = MF.randRange(35, 60);
        const x = center.x + Math.cos(ang) * dist;
        const z = center.z + Math.sin(ang) * dist;
        const pos = new THREE.Vector3(x, MF.getHeight(x, z), z);
        MF.game.monsters.spawn(MF.pick(cfg.types), pos, { health: 1 + waveNumber * 0.08 });
      }
    }
  }

  MF.MonsterSpawner = MonsterSpawner;
})(window.MF);
