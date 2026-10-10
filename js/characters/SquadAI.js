/* ============================================================
   METEORFALL — SquadAI.js
   Per-member state machine: follow, combat, revive, abilities.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const SquadAI = {
    update(member, dt, time, ctx) {
      if (!member.isAlive) {
        member.downedTimer -= dt;
        if (member.downedTimer <= 0 && member.isActive) {
          // out for the rest of the mission — stays down
          member.state = "out";
        }
        return;
      }
      if (!member.isActive) return;

      member.abilityCooldown = Math.max(0, member.abilityCooldown - dt);
      member.fireCooldown = Math.max(0, member.fireCooldown - dt);

      const game = MF.game;
      const playerPos = game.player.position;

      // revive player?
      if (!game.health.alive && game.health.hp <= 0) {
        const d = MF.dist3D(member.position, playerPos);
        if (d < 26) {
          member.state = "revive";
          member.reviveTarget = playerPos;
          member.reviveProgress = (member.reviveProgress || 0) + dt;
          member.moveToward(playerPos, 1.15, dt);
          if (member.reviveProgress >= 5) {
            game.health.hp = 30;
            game.health.alive = true;
            game.health.timeSinceDamage = 0;
            MF.ui.toast(member.name + " revived you!");
            member.reviveProgress = 0;
            MF.screenFx.setDeath(false);
          }
          return;
        }
      }
      member.reviveProgress = 0;

      // revive downed squadmates
      for (const other of ctx.squad.active) {
        if (other !== member && !other.isAlive && other.downedTimer > 5) {
          const d = MF.dist3D(member.position, other.position);
          if (d < 30 && member.role === "Medic") {
            member.moveToward(other.position, 1.1, dt);
            if (d < 2.2) {
              other.downedTimer += dt * 8; // stabilize
              if (Math.random() < dt * 0.4) other.health = Math.min(other.maxHealth, other.health + 4);
              if (other.health > 10) other.revive();
            }
            return;
          }
        }
      }

      // find target
      let target = game.monsters.nearestTo(member.position, 42);
      if (ctx.command === "attack" && ctx.focusTarget && ctx.focusTarget.isAlive) target = ctx.focusTarget;
      member.target = target;

      if (target) {
        member.state = "combat";
        const tPos = target.position;
        const dist = MF.dist3D(member.position, tPos);

        // preferred engagement range by role
        const preferred = member.role === "Sniper" ? 26 : member.role === "Heavy" ? 12 : member.role === "Engineer" ? 14 : 18;
        if (dist > preferred + 6) {
          member.moveToward(tPos, 1, dt);
        } else if (dist < preferred - 8 && dist > 0) {
          // back off a little
          const away = member.position.clone().sub(tPos).normalize().multiplyScalar(-2);
          member.moveToward(member.position.clone().add(away), 0.7, dt);
        } else {
          // face target
          const yaw = Math.atan2(tPos.x - member.position.x, tPos.z - member.position.z);
          member.mesh.rotation.y = MF.angleLerp(member.mesh.rotation.y, yaw, 1 - Math.exp(-8 * dt));
        }

        // shoot
        if (member.fireCooldown <= 0 && dist < 40) {
          const rate = member.hero.weapon === "sniper" ? 1.1 : member.hero.weapon === "minigun" ? 8 : member.hero.weapon === "shotgun" ? 1.3 : 4;
          member.fireCooldown = 1 / rate;
          const accuracy = 0.6;
          if (Math.random() < accuracy) {
            const def = MF.WeaponBase.getDef(member.hero.weapon);
            const dmg = def.damage * 0.7;
            MF.game.damage.applyToMonster(target, dmg, tPos.clone().setY(tPos.y + 1), Math.random() < 0.08);
          }
          // visual tracer + sound
          const from = member.position.clone().setY(member.position.y + 1.3);
          const to = tPos.clone().setY(tPos.y + 1);
          if (MF.game.combat) MF.game.combat.spawnTracer(from, to, 0xffd090);
          MF.audio.playShot(member.hero.weapon, member.position);
          if (MF.game.particles) MF.game.particles.emit("muzzle", from, { count: 3 });
        }
      } else {
        member.state = ctx.command === "hold" ? "hold" : "follow";
        if (ctx.command === "hold") {
          member.moveToward(member.holdPosition || member.position, 0, dt);
        } else {
          const slot = ctx.formationSlots[member.formationIndex] || playerPos;
          const d = MF.dist3D(member.position, slot);
          if (d > 1.6) {
            const speedMul = d > 14 ? 1.35 : 1;
            member.moveToward(slot, speedMul, dt);
          }
          const yaw = MF.game.player.yaw;
          member.mesh.rotation.y = MF.angleLerp(member.mesh.rotation.y, yaw, 1 - Math.exp(-5 * dt));
        }
      }

      // auto ability usage
      if (member.abilityCooldown <= 0 && target) {
        const useIt = member.hero.ability.id === "heal"
          ? ctx.squad.active.some((m) => m.isAlive && m.health < 55) || game.health.hp < 50
          : member.hero.ability.id === "warcry" ? MF.dist3D(member.position, target.position) < 18
          : Math.random() < 0.6;
        if (useIt) {
          ctx.squad.useAbility(member);
        }
      }
    },

    /* movement helper on the member prototype */
  };

  // attach moveToward to SquadMember instances via prototype
  MF.SquadMember.prototype.moveToward = function (targetPos, speedMul, dt) {
    const speed = 5.2 * (speedMul || 1);
    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08 || speedMul === 0) return;
    const step = Math.min(speed * dt, dist);
    this.position.x += (dx / dist) * step;
    this.position.z += (dz / dist) * step;
    this.position.y = MF.getHeight(this.position.x, this.position.z);
    MF.resolveCollisions(this.position, 0.38, 1.6);
    const yaw = Math.atan2(dx, dz);
    this.mesh.rotation.y = MF.angleLerp(this.mesh.rotation.y, yaw, 1 - Math.exp(-8 * dt));
  };

  MF.SquadAI = SquadAI;
})(window.MF);
