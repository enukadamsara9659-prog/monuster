/* ============================================================
   METEORFALL — MissionManager.js
   Tracks the active mission, 3D waypoints, objective triggers,
   rewards, chapter flow and save integration.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MissionManager {
    constructor(scene) {
      this.scene = scene;
      this.storyDefs = MF.storyMissions();
      this.sideDefs = MF.sideMissions();
      this.completed = [];
      this.active = null;
      this.chapter = 1;
      this.sideActive = null;
      this.buildWaypoint();
    }

    buildWaypoint() {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffc844, emissive: 0xffa020, emissiveIntensity: 1.3,
        transparent: true, opacity: 0.85,
      });
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 4), mat);
      top.position.y = 0.65;
      const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 4), mat);
      bottom.position.y = -0.65;
      bottom.rotation.x = Math.PI;
      g.add(top, bottom);
      g.visible = false;
      this.scene.add(g);
      this.waypoint = g;
      this.waypointTime = 0;
    }

    startById(id, saveState) {
      const def = this.storyDefs.find((m) => m.id === id) || this.sideDefs.find((m) => m.id === id);
      if (!def) return;
      this.active = new MF.Mission(def);
      this.chapter = this.active.chapter || this.chapter;
      if (saveState && saveState.objectiveIndex !== undefined) {
        this.active.objectives.forEach((o, i) => {
          if (i < saveState.objectiveIndex) o.completed = true;
          if (saveState.counts && saveState.counts[i] !== undefined) o.currentCount = saveState.counts[i];
        });
        this.active.objectiveIndex = saveState.objectiveIndex || 0;
        this.active.activateCurrent();
      } else {
        this.active.start();
      }
      MF.ui && MF.ui.toast && MF.ui.toast("Mission: " + this.active.title);
    }

    startChapter(n) {
      const def = this.storyDefs.find((m) => m.chapter === n);
      if (!def) return;
      this.chapter = n;
      this.active = new MF.Mission(def);
      this.active.start();
      // title card
      MF.ui && MF.ui.showTitleCard && MF.ui.showTitleCard("CHAPTER " + n, def.title, def.description);
    }

    advanceChapter() {
      const next = this.chapter + 1;
      if (next > 8) {
        MF.game && MF.game.onVictory && MF.game.onVictory();
        return;
      }
      this.startChapter(next);
    }

    notifyInteract() {
      const obj = this.active && this.active.current;
      if (obj && obj.type === "INTERACT") {
        this.completeObjective();
      }
    }

    onMonsterKilled(monster) {
      const obj = this.active && this.active.current;
      if (obj && obj.type === "KILL") {
        if (!obj.killType || obj.killType === monster.type || (obj.killType === "boss" && monster.isBoss)) {
          obj.currentCount++;
          if (obj.currentCount >= obj.targetCount) this.completeObjective();
        }
      }
    }

    completeObjective() {
      if (!this.active) return;
      const obj = this.active.current;
      if (obj && obj.onComplete) obj.onComplete(obj);
      const done = this.active.advance();
      if (done) this.onMissionComplete();
    }

    onMissionComplete() {
      const mission = this.active;
      if (!mission) return;
      this.completed.push(mission.id);
      MF.ui && MF.ui.showMissionComplete && MF.ui.showMissionComplete(mission);

      // rewards
      const r = mission.rewards || {};
      if (r.weapon) MF.game.weapons.unlock(r.weapon);
      if (r.recruit) MF.game.squad.recruit(r.recruit);
      if (r.recruitAll) {
        MF.game.squad.recruitAll();
        MF.ui.toast("All squad members are now available!");
      }
      if (r.heal) MF.game.health.heal(r.heal);
      if (r.vehicle) MF.ui.toast("Vehicle unlocked: " + r.vehicle);

      MF.save.autoSave();

      if (r.victory) {
        setTimeout(() => MF.game && MF.game.onVictory && MF.game.onVictory(), 2400);
      } else {
        setTimeout(() => this.advanceChapter(), 2600);
      }
    }

    update(dt, time) {
      const obj = this.active && this.active.current;
      if (!obj || !MF.game.player) {
        this.waypoint.visible = false;
        return;
      }

      const p = MF.game.player.position;

      switch (obj.type) {
        case "GO_TO":
        case "INTERACT": {
          const d = MF.dist2D(p.x, p.z, obj.targetPos.x, obj.targetPos.y);
          if (d < obj.radius && obj.type === "GO_TO") {
            this.completeObjective();
          }
          break;
        }
        case "KILL":
          // progress via kill events
          break;
        case "DEFEND": {
          const d = MF.dist2D(p.x, p.z, obj.targetPos.x, obj.targetPos.y);
          if (d < obj.radius) {
            obj.timer += dt;
            if (obj.timer >= obj.duration) this.completeObjective();
          }
          break;
        }
        case "SURVIVE_TIME": {
          obj.timer += dt;
          if (obj.timer >= obj.duration) this.completeObjective();
          break;
        }
        case "BOSS_FIGHT": {
          const boss = obj.bossRef;
          if (boss && !boss.isAlive && boss.deathTimer > 1.2) {
            this.completeObjective();
          } else if (!boss) {
            // boss failed to spawn; complete to avoid a stuck mission
            this.completeObjective();
          }
          break;
        }
        default:
          break;
      }

      // waypoint marker
      const target = obj.targetPos;
      if (target) {
        const wy = MF.getHeight(target.x, target.y) + 3.2;
        this.waypoint.position.set(target.x, wy, target.y);
        this.waypoint.visible = true;
        this.waypointTime += dt;
        this.waypoint.rotation.y += dt * 1.4;
        this.waypoint.position.y = wy + Math.sin(this.waypointTime * 2) * 0.35;
      } else {
        this.waypoint.visible = false;
      }
    }

    objectiveText() {
      const obj = this.active && this.active.current;
      return obj ? obj.progressText : "";
    }

    missionTitle() {
      return this.active ? "CH" + (this.active.chapter || this.chapter) + " — " + this.active.title : "";
    }

    waypointDistance() {
      const obj = this.active && this.active.current;
      if (!obj || !obj.targetPos || !MF.game.player) return null;
      const p = MF.game.player.position;
      return MF.dist2D(p.x, p.z, obj.targetPos.x, obj.targetPos.y);
    }
  }

  MF.MissionManager = MissionManager;
})(window.MF);
