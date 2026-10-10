/* ============================================================
   METEORFALL — MonsterAI.js
   State machine decisions: idle / patrol / chase / attack /
   retreat, pack alerts for Crawlers, target selection.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;
  const STATE = MF.MONSTER_STATE;

  const MonsterAI = {
    think(monster, dt, time) {
      const game = MF.game;
      if (!game || !game.player) return;

      // target selection: player or nearest living squad member
      const playerPos = game.player.position;
      let bestTarget = game.player;
      let bestDist = MF.dist3D(monster.position, playerPos);
      if (game.squad) {
        for (const m of game.squad.active) {
          if (!m.isAlive) continue;
          const d = MF.dist3D(monster.position, m.position);
          if (d < bestDist * 0.85) {
            bestDist = d;
            bestTarget = m;
          }
        }
      }
      monster.target = bestTarget;
      const targetPos = bestTarget.position || bestTarget;

      // perception (checked on a stagger timer)
      monster._senseTimer = (monster._senseTimer || 0) - dt;
      if (monster._senseTimer <= 0) {
        monster._senseTimer = 0.45;
        const detectBonus = game.dayNight && game.dayNight.isNight ? 1.25 : 1;
        const detected = bestDist < monster.detectionRange * detectBonus;
        if (detected) {
          monster.lastSeenTime = time;
          if (monster.state === STATE.IDLE || monster.state === STATE.PATROL) {
            monster.state = STATE.CHASE;
            MF.audio.playMonster(monster.type, monster.position);
            // pack alert (crawlers call friends)
            if (monster.type === "crawler" && game.monsters) {
              for (const other of game.monsters.list) {
                if (other === monster || !other.isAlive) continue;
                if (other.type === "crawler" && MF.dist3D(other.position, monster.position) < 34) {
                  other.state = STATE.CHASE;
                  other.lastSeenTime = time;
                }
              }
            }
          }
        }
      }

      // retreat when badly hurt (non-boss)
      if (!monster.isBoss && monster.health < monster.maxHealth * 0.18 && monster.state !== STATE.RETREAT) {
        monster.state = STATE.RETREAT;
      }

      switch (monster.state) {
        case STATE.IDLE: {
          monster.waitTimer -= dt;
          if (monster.waitTimer <= 0) {
            monster.state = STATE.PATROL;
            const ang = Math.random() * Math.PI * 2;
            const r = MF.randRange(6, 20);
            monster.patrolTarget = new THREE.Vector3(
              monster.spawnPos.x + Math.cos(ang) * r,
              0,
              monster.spawnPos.z + Math.sin(ang) * r
            );
          }
          break;
        }

        case STATE.PATROL: {
          if (!monster.patrolTarget) { monster.state = STATE.IDLE; monster.waitTimer = MF.randRange(2, 4); break; }
          monster.moveToward(monster.patrolTarget, 0.45, dt);
          if (MF.dist2D(monster.position.x, monster.position.z, monster.patrolTarget.x, monster.patrolTarget.z) < 1.6) {
            monster.patrolTarget = null;
            monster.state = STATE.IDLE;
            monster.waitTimer = MF.randRange(2, 4);
          }
          if (time - monster.lastSeenTime < 8 && bestDist < monster.detectionRange * 1.5) {
            monster.state = STATE.CHASE;
          }
          break;
        }

        case STATE.CHASE: {
          const dist = MF.dist3D(monster.position, targetPos);
          if (dist <= monster.attackRange * monster.scale) {
            monster.state = STATE.ATTACK;
          } else if (dist > monster.detectionRange * 1.6 && time - monster.lastSeenTime > 6) {
            monster.state = STATE.PATROL;
          } else {
            monster.moveToward(targetPos, 1, dt);
          }
          break;
        }

        case STATE.ATTACK: {
          const dist = MF.dist3D(monster.position, targetPos);
          monster.faceTarget(dt);
          if (dist > monster.attackRange * monster.scale * 1.35) {
            monster.state = STATE.CHASE;
          } else {
            monster.attack();
          }
          break;
        }

        case STATE.RETREAT: {
          const away = new THREE.Vector3(
            monster.position.x - (targetPos.x - monster.position.x),
            monster.position.y,
            monster.position.z - (targetPos.z - monster.position.z)
          );
          monster.moveToward(away, 0.8, dt);
          if (MF.dist3D(monster.position, targetPos) > 32) {
            monster.state = STATE.PATROL;
          }
          break;
        }

        default:
          break;
      }
    },
  };

  MF.MonsterAI = MonsterAI;
})(window.MF);
