/* ============================================================
   METEORFALL — MonsterBase.js
   Monster state machine, health, hit zones, movement, attack,
   death + loot. AI decisions live in MonsterAI.js.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const STATE = {
    IDLE: "idle", PATROL: "patrol", CHASE: "chase",
    ATTACK: "attack", RETREAT: "retreat", DEAD: "dead",
  };
  MF.MONSTER_STATE = STATE;

  class MonsterBase {
    constructor(config) {
      this.name = config.name || "Monster";
      this.type = config.type || "crawler";
      this.maxHealth = config.health || 50;
      this.health = this.maxHealth;
      this.damage = config.damage || 10;
      this.speed = config.speed || 5;
      this.attackRange = config.attackRange || 2.2;
      this.detectionRange = config.detectionRange || 30;
      this.attackCooldown = config.attackCooldown || 1.2;
      this.scale = config.scale || 1;
      this.position = config.position ? config.position.clone() : new THREE.Vector3();
      this.mesh = config.mesh;
      this.mesh.position.copy(this.position);
      this.state = STATE.IDLE;
      this.isAlive = true;
      this.target = null;
      this.lastAttackTime = -99;
      this.lastSeenTime = -99;
      this.patrolTarget = null;
      this.waitTimer = 0;
      this.spawnPos = this.position.clone();
      this.animPhase = MF.rand() * Math.PI * 2;
      this.deathTimer = 0;
      this.hitFlash = 0;
      this.hitRadius = (config.hitRadius || 1) * this.scale;
      this.customAnimate = config.animate || null;
      this.onDeath = config.onDeath || null;
      this.isBoss = !!config.isBoss;
      this.yOffset = config.yOffset !== undefined ? config.yOffset : 0;
      this.flying = !!config.flying;
      this.hoverHeight = config.hoverHeight || 0;

      this.updateHitZones();
    }

    updateHitZones() {
      const s = this.scale;
      this.hitZones = [
        { center: this.position.clone().add(new THREE.Vector3(0, 1.0 * s + this.yOffset, 0)), radius: this.hitRadius, crit: false },
        { center: this.position.clone().add(new THREE.Vector3(0, 1.85 * s + this.yOffset, 0)), radius: 0.38 * s, crit: true },
      ];
    }

    update(dt, time) {
      if (!this.isAlive) {
        this.deathTimer += dt;
        // sink & fade
        const t = Math.min(1, this.deathTimer / 3);
        this.mesh.position.y = this.position.y - t * 1.4;
        this.mesh.rotation.x = t * 1.2;
        this.mesh.traverse((o) => {
          if (o.material && o.material.transparent !== undefined && !Array.isArray(o.material)) {
            o.material.transparent = true;
            o.material.opacity = 1 - t * 0.9;
          }
        });
        return;
      }

      if (this.hitFlash > 0) {
        this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
        this.mesh.traverse((o) => {
          if (o.material && o.material.emissive !== undefined && !Array.isArray(o.material)) {
            o.material.emissiveIntensity = this._baseEmissive === undefined
              ? (this._baseEmissive = o.material.emissiveIntensity)
              : this._baseEmissive + this.hitFlash * 1.6;
          }
        });
      }

      MF.MonsterAI.think(this, dt, time);
      if (this.customAnimate) this.customAnimate(this, dt, time);
      this.mesh.position.copy(this.position);
      this.updateHitZones();
    }

    takeDamage(amount, hitPoint, crit) {
      if (!this.isAlive) return;
      this.health = Math.max(0, this.health - amount);
      this.hitFlash = 1;
      MF.audio.playMonster(this.type === "boss" ? "boss" : this.type, this.position);
      if (this.health <= 0) this.die();
    }

    die() {
      if (!this.isAlive) return;
      this.isAlive = false;
      this.state = STATE.DEAD;
      this.deathTimer = 0;
      MF.audio.playMonster("death", this.position);
      if (MF.game.particles) {
        MF.game.particles.emit("death", this.position, { count: 18 });
      }
      if (MF.game.monsters) MF.game.monsters.onMonsterKilled(this);
      if (this.onDeath) this.onDeath(this);
    }

    attack() {
      const now = MF.game ? MF.game.elapsed : 0;
      if (now - this.lastAttackTime < this.attackCooldown) return false;
      this.lastAttackTime = now;
      const target = this.target;
      if (!target) return false;
      const targetPos = target.position || target;
      const d = MF.dist3D(this.position, targetPos);
      if (d <= this.attackRange * this.scale + 0.8) {
        if (target === (MF.game.player)) {
          MF.game.health.takeDamage(this.damage, this.position);
        } else if (target.takeDamage) {
          target.takeDamage(this.damage, this.position);
        }
        return true;
      }
      return false;
    }

    moveToward(targetPos, speedMul, dt) {
      const speed = this.speed * (speedMul || 1);
      const dx = targetPos.x - this.position.x;
      const dz = targetPos.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) return;

      let dirX = dx / dist, dirZ = dz / dist;

      // simple obstacle avoidance: probe left/right if blocked ahead
      const probe = 2.2 * this.scale;
      const aheadX = this.position.x + dirX * probe;
      const aheadZ = this.position.z + dirZ * probe;
      const blocked = MF.colliders.some((c) =>
        aheadX >= c.minX - 0.4 && aheadX <= c.maxX + 0.4 &&
        aheadZ >= c.minZ - 0.4 && aheadZ <= c.maxZ + 0.4 &&
        this.position.y < c.top
      );
      if (blocked) {
        // steer sideways
        const sideX = -dirZ, sideZ = dirX;
        const sign = Math.sin(this.animPhase + this.position.x) > 0 ? 1 : -1;
        dirX += sideX * sign * 0.9;
        dirZ += sideZ * sign * 0.9;
        const len = Math.hypot(dirX, dirZ) || 1;
        dirX /= len; dirZ /= len;
      }

      const step = speed * dt;
      this.position.x += dirX * step;
      this.position.z += dirZ * step;

      if (this.flying) {
        const ground = MF.getHeight(this.position.x, this.position.z);
        const targetY = ground + this.hoverHeight;
        this.position.y = MF.damp(this.position.y, targetY, 2.2, dt);
      } else {
        this.position.y = MF.getHeight(this.position.x, this.position.z);
      }
      MF.resolveCollisions(this.position, this.hitRadius * 0.6, this.scale * 1.4);

      const yaw = Math.atan2(dirX, dirZ);
      this.mesh.rotation.y = MF.angleLerp(this.mesh.rotation.y, yaw, 1 - Math.exp(-7 * dt));
    }

    faceTarget(dt) {
      if (!this.target) return;
      const tp = this.target.position || this.target;
      const yaw = Math.atan2(tp.x - this.position.x, tp.z - this.position.z);
      this.mesh.rotation.y = MF.angleLerp(this.mesh.rotation.y, yaw, 1 - Math.exp(-8 * dt));
    }
  }

  MF.MonsterBase = MonsterBase;
})(window.MF);
