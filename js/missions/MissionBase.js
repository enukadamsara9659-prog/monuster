/* ============================================================
   METEORFALL — MissionBase.js
   Mission + objective model (GO_TO / KILL / DEFEND / INTERACT /
   SURVIVE_TIME / BOSS_FIGHT) with progress tracking.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class Objective {
    constructor(cfg) {
      this.type = cfg.type;
      this.text = cfg.text;
      this.targetPos = cfg.targetPos ? new THREE.Vector2(cfg.targetPos.x, cfg.targetPos.z) : null;
      this.targetCount = cfg.targetCount || 1;
      this.currentCount = 0;
      this.completed = false;
      this.radius = cfg.radius || 6;
      this.duration = cfg.duration || 0;
      this.timer = 0;
      this.bossType = cfg.bossType || null;
      this.killType = cfg.killType || null;
      this.label = cfg.label || null;
      this.bossRef = cfg.bossRef || null;
      this.onActivate = cfg.onActivate || null;
      this.onComplete = cfg.onComplete || null;
    }

    get progressText() {
      if (this.type === "KILL") return `${this.text}  ${this.currentCount}/${this.targetCount}`;
      if (this.type === "DEFEND" || this.type === "SURVIVE_TIME") {
        return `${this.text}  ${Math.ceil(Math.max(0, this.duration - this.timer))}s`;
      }
      return this.text;
    }
  }

  class Mission {
    constructor(cfg) {
      this.id = cfg.id;
      this.title = cfg.title;
      this.chapter = cfg.chapter || 1;
      this.description = cfg.description || "";
      this.objectives = cfg.objectives.map((o) => new Objective(o));
      this.objectiveIndex = 0;
      this.rewards = cfg.rewards || {};
      this.isCompleted = false;
      this.onComplete = cfg.onComplete || null;
      this.onStart = cfg.onStart || null;
    }

    get current() { return this.objectives[this.objectiveIndex] || null; }

    start() {
      this.objectiveIndex = 0;
      this.objectives.forEach((o) => { o.completed = false; o.currentCount = 0; o.timer = 0; });
      if (this.onStart) this.onStart(this);
      this.activateCurrent();
    }

    activateCurrent() {
      const obj = this.current;
      if (!obj) return;
      if (obj.type === "INTERACT" && obj.targetPos) {
        // auto-register the world interaction point
        const x = obj.targetPos.x, z = obj.targetPos.y;
        const pos = new THREE.Vector3(x, MF.getHeight(x, z) + 1, z);
        MF.interactables.push({
          pos,
          radius: Math.max(3.2, obj.radius * 0.6),
          label: obj.label || obj.text,
          action: () => {
            if (MF.game && MF.game.missions) MF.game.missions.notifyInteract();
            MF.audio.playUI("confirm");
            return true;
          },
        });
      }
      if (obj.onActivate) obj.onActivate(obj, this);
    }

    advance() {
      const obj = this.current;
      if (obj) obj.completed = true;
      this.objectiveIndex++;
      if (this.objectiveIndex >= this.objectives.length) {
        this.isCompleted = true;
        return true;
      }
      this.activateCurrent();
      MF.ui.toast("New objective: " + this.current.progressText);
      return false;
    }
  }

  Mission.Objective = Objective;
  MF.Mission = Mission;
})(window.MF);
