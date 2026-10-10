/* ============================================================
   METEORFALL — WeaponSystem.js
   4 weapon slots, switching, hitscan + projectile firing,
   reload (visual only — ammo is INFINITE), recoil, ADS.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class WeaponSystem {
    constructor() {
      this.slots = ["ar", "sniper", "shotgun", "rocket"];
      this.unlocked = new Set(["ar"]);
      this.currentIndex = 0;
      this.cooldown = 0;
      this.reloadTimer = 0;
      this.fireHeld = false;
      this.raycaster = new THREE.Raycaster();
      this.raycaster.far = 600;
      this.spinAngle = 0;
      this.lastFireTime = 0;
    }

    get current() { return MF.WeaponBase.getDef(this.slots[this.currentIndex]); }
    get currentModel() { return this.playerModel; }

    refreshModels() {
      const def = this.current;
      const model = MF.WeaponBase.buildModel(def.id);
      if (MF.game.player) MF.game.player.attachWeapon(model);
      this.playerModel = model;
      if (MF.game.hud) MF.game.hud.updateWeaponPanel(def);
    }

    equipByName(id) {
      if (!this.unlocked.has(id)) return;
      // if already in slots, select it; else replace current slot
      const idx = this.slots.indexOf(id);
      if (idx >= 0) this.currentIndex = idx;
      else this.slots[this.currentIndex] = id;
      this.refreshModels();
    }

    unlock(id) {
      this.unlocked.add(id);
      // auto-equip into a free slot
      if (!this.slots.includes(id)) {
        const free = this.slots.findIndex((s) => !this.unlocked.has(s) || false);
        // replace slot 4th or last
        this.slots[3] = id;
      }
      MF.ui.toast("New weapon unlocked: " + MF.WeaponBase.getDef(id).name);
      this.refreshModels();
    }

    select(index) {
      if (index < 0 || index >= this.slots.length) return;
      this.currentIndex = index;
      this.reloadTimer = 0;
      this.refreshModels();
      MF.audio.playUI("hover");
    }

    cycle(dir) {
      let i = this.currentIndex;
      for (let n = 0; n < 4; n++) {
        i = (i + dir + 4) % 4;
        if (this.unlocked.has(this.slots[i]) || this.slots[i]) {
          this.currentIndex = i;
          break;
        }
      }
      this.refreshModels();
    }

    getAllDefs() { return MF.WeaponBase.getDefs(); }

    update(dt, aiming) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.reloadTimer > 0) {
        this.reloadTimer = Math.max(0, this.reloadTimer - dt);
        if (this.reloadTimer === 0) MF.ui && MF.ui.toast && null;
      }

      // minigun spin animation
      if (this.playerModel && this.playerModel.userData.spinPart) {
        const def = this.current;
        const spinning = def.spin && this.fireHeld;
        this.spinAngle += dt * (spinning ? 18 : this.spinAngle > 0 ? 4 : 0);
        this.playerModel.userData.spinPart.rotation.z = this.spinAngle;
      }

      const input = MF.input;
      const def = this.current;

      if (input.actionPressed("reload") && this.reloadTimer <= 0) {
        this.reloadTimer = def.reloadTime;
        if (MF.game.player) MF.game.player.animator.triggerReload();
        MF.audio.playReload();
      }

      const wantFire = def.auto ? input.action("fire") : input.actionPressed("fire");
      this.fireHeld = input.action("fire");

      if (wantFire && this.cooldown <= 0 && this.reloadTimer <= 0 && MF.game.state === "PLAYING") {
        this.fire(aiming);
      }
    }

    fire(aiming) {
      const def = this.current;
      this.cooldown = 1 / def.fireRate;
      const player = MF.game.player;
      const controller = MF.game.controller;
      const camera = MF.game.camera;

      MF.game.stats.shots++;
      MF.audio.playShot(def.sound, player.position);
      if (player) player.animator.triggerFire();
      if (controller) controller.addRecoil(def.recoil * (aiming ? 0.55 : 1));

      // muzzle flash
      const muzzlePos = player ? player.getMuzzleWorldPosition() : camera.position.clone();
      if (MF.muzzle) MF.muzzle.flash(muzzlePos, def.alien ? 0xff8a3a : 0xffb04a);
      if (MF.game.particles) {
        MF.game.particles.emit("muzzle", muzzlePos, { count: 6, color: def.alien ? 0xff8a3a : 0xffc060 });
      }

      if (def.projectile) {
        const dir = this.getAimDirection();
        const origin = camera.position.clone().add(dir.clone().multiplyScalar(1.2));
        origin.y = Math.max(origin.y, MF.getHeight(origin.x, origin.z) + 0.6);
        MF.game.projectiles.spawn(def.projectile, origin, dir, "player");
        return;
      }

      // hitscan (shotgun = multiple pellets)
      const pellets = def.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        this.hitscan(def, aiming, i === 0);
      }
    }

    getAimDirection() {
      const camera = MF.game.camera;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      return dir;
    }

    hitscan(def, aiming, mainPellet) {
      const camera = MF.game.camera;
      const dir = this.getAimDirection();

      // spread
      const spread = def.spread * (aiming ? 0.35 : 1);
      dir.x += MF.randRange(-spread, spread);
      dir.y += MF.randRange(-spread, spread);
      dir.z += MF.randRange(-spread, spread);
      dir.normalize();

      const origin = camera.position.clone();

      // find nearest monster hit via ray-sphere
      let nearest = Infinity;
      let hitMonster = null;
      let hitPoint = null;
      let isCrit = false;

      const monsters = MF.game.monsters ? MF.game.monsters.list : [];
      for (const m of monsters) {
        if (!m.isAlive) continue;
        // body sphere
        for (const zone of m.hitZones || []) {
          const toC = zone.center.clone().sub(origin);
          const proj = toC.dot(dir);
          if (proj < 0 || proj > nearest) continue;
          const closest = origin.clone().addScaledVector(dir, proj);
          const d = closest.distanceTo(zone.center);
          if (d < zone.radius) {
            nearest = proj;
            hitMonster = m;
            hitPoint = closest;
            isCrit = !!zone.crit;
          }
        }
      }

      // terrain + building blockers
      const terrHit = MF.raycastTerrain(origin, dir, Math.min(def.range * 1.4, nearest));
      const boxHit = MF.raycastColliders(origin, dir, Math.min(def.range * 1.4, nearest));
      const blockerDist = Math.min(terrHit.dist, boxHit.dist);

      if (hitMonster && nearest <= blockerDist && nearest <= def.range * 1.4) {
        const dmg = MF.game.damage.computeDamage(def, nearest, isCrit);
        MF.game.damage.applyToMonster(hitMonster, dmg, hitPoint, isCrit);
        if (MF.game.combat) MF.game.combat.impact(hitPoint, "monster");
        if (mainPellet && MF.game.combat) {
          MF.game.combat.spawnTracer(this.getMuzzleWorld(), hitPoint, def.alien ? 0xff8a3a : 0xffe0a0);
        }
      } else if (blockerDist < Infinity) {
        const point = terrHit.dist < boxHit.dist ? terrHit.point
          : origin.clone().addScaledVector(dir, boxHit.dist);
        if (MF.game.combat) {
          MF.game.combat.impact(point, boxHit.dist < terrHit.dist ? "wood" : "terrain");
          if (mainPellet) MF.game.combat.spawnTracer(this.getMuzzleWorld(), point, def.alien ? 0xff8a3a : 0xffe0a0);
        }
      } else if (mainPellet && MF.game.combat) {
        MF.game.combat.spawnTracer(this.getMuzzleWorld(), origin.clone().addScaledVector(dir, def.range), def.alien ? 0xff8a3a : 0xffe0a0);
      }
    }

    getMuzzleWorld() {
      if (this.playerModel && this.playerModel.userData.muzzle) {
        return this.playerModel.userData.muzzle.getWorldPosition(new THREE.Vector3());
      }
      return MF.game.camera.position.clone();
    }
  }

  MF.WeaponSystem = WeaponSystem;
})(window.MF);
