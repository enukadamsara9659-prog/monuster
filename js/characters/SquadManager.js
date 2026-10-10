/* ============================================================
   METEORFALL — SquadManager.js
   Active squad roster, formations, commands (Q wheel),
   special abilities, banter, HUD data.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const COMMANDS = ["follow", "hold", "attack", "defend", "regroup", "special"];

  class SquadManager {
    constructor(scene) {
      this.scene = scene;
      this.roster = [];
      for (let i = 0; i < 6; i++) {
        const m = new MF.SquadMember(i);
        this.roster.push(m);
        scene.add(m.mesh);
        m.mesh.visible = false;
      }
      // starting squad
      this.roster[2].isActive = true; // Elena
      this.roster[3].isActive = true; // Arjun
      this.roster[5].isActive = true; // Marcus
      this.syncActive();

      this.command = "follow";
      this.focusTarget = null;
      this.banterTimer = 12;
      this.damageBoost = 0;
      this.scanTimer = 0;
    }

    get active() { return this.roster.filter((m) => m.isActive); }

    syncActive() {
      this.roster.forEach((m) => { m.mesh.visible = m.isActive; });
    }

    recruit(name) {
      const m = this.roster.find((r) => r.name === name);
      if (m && !m.isActive) {
        m.isActive = true;
        this.syncActive();
        MF.ui.toast(name + " has joined your squad!");
      }
    }

    recruitAll() {
      this.roster.forEach((m) => { m.isActive = true; });
      this.syncActive();
    }

    formationSlots() {
      const p = MF.game.player;
      const yaw = p.yaw;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const base = p.position;
      return [
        new THREE.Vector3(base.x - fx * 3 + rx * 2, 0, base.z - fz * 3 + rz * 2),
        new THREE.Vector3(base.x - fx * 3 - rx * 2, 0, base.z - fz * 3 - rz * 2),
        new THREE.Vector3(base.x - fx * 5.2, 0, base.z - fz * 5.2),
      ];
    }

    setCommand(cmd) {
      if (!COMMANDS.includes(cmd)) return;
      this.command = cmd;
      if (cmd === "hold") {
        this.active.forEach((m) => { m.holdPosition = m.position.clone(); });
      }
      if (cmd === "regroup") {
        this.command = "follow";
      }
      if (cmd === "special") {
        const m = this.active.find((a) => a.abilityCooldown <= 0 && a.isAlive);
        if (m) this.useAbility(m);
        else MF.ui.toast("No special abilities ready.");
        this.command = "follow";
      }
      if (cmd === "attack") {
        this.focusTarget = MF.game.monsters && MF.game.monsters.nearestTo(MF.game.player.position, 80);
        if (!this.focusTarget) MF.ui.toast("No target in sight.");
      }
      if (cmd === "defend") {
        this.active.forEach((m, i) => {
          const ang = (i / Math.max(1, this.active.length)) * Math.PI * 2;
          m.holdPosition = new THREE.Vector3(
            MF.game.player.position.x + Math.cos(ang) * 7,
            0,
            MF.game.player.position.z + Math.sin(ang) * 7
          );
          m.holdPosition.y = MF.getHeight(m.holdPosition.x, m.holdPosition.z);
        });
        this.command = "hold";
      }
      MF.ui.toast("Squad command: " + cmd.toUpperCase());
    }

    useAbility(member) {
      if (member.abilityCooldown > 0) return;
      member.abilityCooldown = member.hero.ability.cooldown;
      const id = member.hero.ability.id;
      MF.ui.dialogue(member.name, "Activating " + member.hero.ability.name + "!");

      if (id === "heal") {
        this.active.forEach((m) => m.isAlive && m.heal(50));
        MF.game.health.heal(25);
        if (MF.game.particles) {
          this.active.forEach((m) => MF.game.particles.emit("heal", m.position, { count: 12 }));
          MF.game.particles.emit("heal", MF.game.player.position, { count: 16 });
        }
      } else if (id === "mark") {
        this.damageBoost = 10;
        const t = MF.game.monsters.nearestTo(MF.game.player.position, 80);
        if (t) {
          t.mesh.traverse((o) => {
            if (o.material && o.material.emissive) {
              o.material.emissive.setHex(0xff8800);
              o.material.emissiveIntensity = 1.2;
            }
          });
        }
      } else if (id === "warcry") {
        MF.game.monsters.list.forEach((mon) => {
          if (mon.isAlive && MF.dist3D(mon.position, member.position) < 20) {
            mon.target = member;
            mon.state = MF.MONSTER_STATE.CHASE;
          }
        });
      } else if (id === "turret") {
        this.deployTurret(member.position.clone());
      } else if (id === "scan") {
        this.scanTimer = 15;
        MF.ui.toast("Enemies revealed on the minimap!");
      } else if (id === "strike") {
        const center = MF.game.player.position.clone().add(
          new THREE.Vector3(Math.sin(MF.game.player.yaw) * 12, 0, Math.cos(MF.game.player.yaw) * 12)
        );
        for (let i = 0; i < 3; i++) {
          const offset = new THREE.Vector3(MF.randRange(-6, 6), 8, MF.randRange(-6, 6));
          MF.game.projectiles.spawn("grenade", center.clone().add(offset), new THREE.Vector3(0, -1, 0), "player");
        }
      }
    }

    deployTurret(pos) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a4238 }));
      base.position.y = 0.35;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 7), new THREE.MeshStandardMaterial({ color: 0x22262a }));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.y = 0.95;
      g.add(base, barrel);
      g.position.copy(pos);
      g.position.y = MF.getHeight(pos.x, pos.z);
      this.scene.add(g);

      const turret = { mesh: g, barrel, life: 20, fireTimer: 0 };
      this.turrets = this.turrets || [];
      this.turrets.push(turret);
      MF.ui.toast("Auto turret deployed!");
    }

    onKill(monster) {
      if (Math.random() < 0.35) {
        const m = MF.pick(this.active.filter((a) => a.isAlive).length ? this.active.filter((a) => a.isAlive) : this.roster);
        MF.ui.dialogue(m.name, MF.pick(m.hero.lines.kill));
      }
    }

    update(dt, time) {
      const ctx = {
        squad: this,
        command: this.command,
        focusTarget: this.focusTarget,
        formationSlots: this.formationSlots(),
      };

      // clear dead focus
      if (this.focusTarget && !this.focusTarget.isAlive) this.focusTarget = null;

      for (const member of this.roster) {
        if (member.isActive) {
          MF.SquadAI.update(member, dt, time, ctx);
          member.animate(dt, member.state === "combat" ? 2 : (MF.dist3D(member.position, MF.game.player.position) > 4 ? 1.4 : 0));
        }
      }

      if (this.damageBoost > 0) this.damageBoost = Math.max(0, this.damageBoost - dt);
      if (this.scanTimer > 0) this.scanTimer = Math.max(0, this.scanTimer - dt);

      // turrets
      if (this.turrets) {
        for (let i = this.turrets.length - 1; i >= 0; i--) {
          const t = this.turrets[i];
          t.life -= dt;
          if (t.life <= 0) {
            this.scene.remove(t.mesh);
            this.turrets.splice(i, 1);
            continue;
          }
          const target = MF.game.monsters.nearestTo(t.mesh.position, 45);
          if (target) {
            const yaw = Math.atan2(target.position.x - t.mesh.position.x, target.position.z - t.mesh.position.z);
            t.mesh.rotation.y = MF.angleLerp(t.mesh.rotation.y, yaw, 1 - Math.exp(-8 * dt));
            t.fireTimer -= dt;
            if (t.fireTimer <= 0) {
              t.fireTimer = 0.22;
              MF.game.damage.applyToMonster(target, 14, target.position.clone().setY(target.position.y + 1), false);
              if (MF.game.combat) {
                MF.game.combat.spawnTracer(t.mesh.position.clone().setY(t.mesh.position.y + 1), target.position.clone().setY(target.position.y + 1), 0xffe090);
              }
              MF.audio.playShot("minigun", t.mesh.position);
            }
          }
        }
      }

      // banter
      this.banterTimer -= dt;
      if (this.banterTimer <= 0) {
        this.banterTimer = MF.randRange(22, 44);
        const alive = this.active.filter((m) => m.isAlive);
        if (alive.length) {
          const m = MF.pick(alive);
          const hpRatio = MF.game.health.hp / MF.game.health.maxHp;
          let line;
          if (hpRatio < 0.35) line = "Kael, you're hurt! Watch yourself!";
          else if (MF.game.dayNight && MF.game.dayNight.isNight) line = "It's getting dark, stay alert.";
          else line = MF.pick(["All clear on my side.", "Area secured.", "Keep moving.", "I've got your six."]);
          MF.ui.dialogue(m.name, line);
        }
      }
    }
  }

  MF.SquadManager = SquadManager;
  MF.SQUAD_COMMANDS = COMMANDS;
})(window.MF);
