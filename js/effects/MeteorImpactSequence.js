/* ============================================================
   METEORFALL — MeteorImpactSequence.js
   Scripted 30s opening (skippable with Enter):
   peaceful village -> sky turns -> meteor impact -> aftermath
   -> first monster -> gameplay handoff.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MeteorImpactSequence {
    constructor(game) {
      this.game = game;
      this.time = 0;
      this.running = false;
      this.done = false;
      this.step = -1;
      this.meteor = null;
    }

    start() {
      this.running = true;
      this.time = 0;
      this.step = -1;
      this.game.controller.locked = true;

      // build the meteor
      const geo = new THREE.IcosahedronGeometry(9, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a2418, emissive: 0xff7a20, emissiveIntensity: 2.2, roughness: 0.6,
      });
      this.meteor = new THREE.Mesh(geo, mat);
      this.meteor.position.set(1400, 520, 1400);
      this.game.scene.add(this.meteor);
      const light = new THREE.PointLight(0xff8830, 3, 400, 2);
      this.meteor.add(light);
    }

    skip() {
      if (this.running && !this.done) {
        this.finish();
      }
    }

    finish() {
      this.running = false;
      this.done = true;
      if (this.meteor) {
        this.game.scene.remove(this.meteor);
        this.meteor = null;
      }
      MF.ui.fadeIn(0.8);
      MF.ui.flash("#ffffff", 0, 0.1);
      this.game.controller.locked = false;
      this.game.controller.camYaw = Math.PI;
      MF.ui.hideScreen("skip-hint");
      MF.ui.toast("Pick up the weapon. Survive.");
      MF.audio.setMusicMode("exploration");
    }

    update(dt) {
      if (!this.running) return;
      this.time += dt;
      const t = this.time;
      const cam = this.game.camera;
      const player = this.game.player;

      const lookAt = (px, py, pz, tx, ty, tz, lerp) => {
        cam.position.lerp(new THREE.Vector3(px, py, pz), lerp === undefined ? 1 : lerp);
        cam.lookAt(tx, ty, tz);
      };

      if (t < 8) {
        // STEP 1: peaceful aerial descent over Haven Village
        if (this.step !== 0) {
          this.step = 0;
          MF.ui.showScreen("skip-hint");
          MF.ui.showTitleCard("ASHEN ISLAND", "6:42 PM", "Minutes before the fall.");
          MF.audio.setMusicMode("exploration");
        }
        const k = t / 8;
        lookAt(
          200 + Math.cos(k * 1.2) * (90 - k * 40), 60 - k * 30, 200 + Math.sin(k * 1.2) * (90 - k * 40),
          200, 8, 200
        );
      } else if (t < 14) {
        // STEP 2: sky changes
        if (this.step !== 1) {
          this.step = 1;
          MF.ui.showTitleCard("", "Something is coming…", "");
        }
        const k = (t - 8) / 6;
        lookAt(200, 12, 200, 900, 240 + k * 160, 900, 0.08);
        this.game.dayNight.skyDusk.setHex(0xd85a2a);
        this.meteor.position.lerp(new THREE.Vector3(1150, 260, 1150), dt * 1.4);
      } else if (t < 19) {
        // STEP 3: impact
        if (this.step !== 2) {
          this.step = 2;
          MF.ui.flash("#ffd8a0", 0.85, 1.4);
          MF.audio.playExplosion({ x: 1000, y: 0, z: 1000 }, 1.6);
          this.game.controller.addShake(2.4);
          MF.explosion.spawn(new THREE.Vector3(1000, MF.getHeight(1000, 1000) + 4, 1000), 16);
          for (let i = 0; i < 8; i++) {
            this.game.particles.emit("explosion", new THREE.Vector3(1000, MF.getHeight(1000, 1000) + 6, 1000), {
              count: 22, size: 3.4, speed: 26,
            });
          }
          for (let i = 0; i < 26; i++) {
            this.game.particles.emit("ember", new THREE.Vector3(1000, 80, 1000), {
              count: 4, size: 1.6, speed: 30, up: 12,
            });
          }
        }
        const k = (t - 14) / 5;
        lookAt(
          200 + k * 60, 14 + Math.sin(k * 22) * 0.8, 200 + k * 40,
          1000, 40, 1000, 0.12
        );
        if (this.meteor) {
          this.meteor.position.lerp(new THREE.Vector3(1000, MF.getHeight(1000, 1000) + 8, 1000), dt * 3);
        }
      } else if (t < 25) {
        // STEP 4: aftermath
        if (this.step !== 3) {
          this.step = 3;
          MF.ui.fadeOut(() => MF.ui.fadeIn(1.2), 0.4);
          MF.ui.showTitleCard("", "Minutes later…", "");
          if (this.meteor) {
            this.game.scene.remove(this.meteor);
            this.meteor = null;
          }
          for (let i = 0; i < 12; i++) {
            this.game.particles.emit("smoke", new THREE.Vector3(
              1000 + MF.randRange(-200, 200), MF.getHeight(1000, 1000) + 12, 1000 + MF.randRange(-200, 200)
            ), { count: 3, size: 4 });
          }
        }
        const k = (t - 19) / 6;
        lookAt(260, 10, 260, 200, 6, 200, 0.06);
        this.game.controller.addShake(0.25 * (1 - k));
      } else {
        // STEP 5: first monster + handoff
        if (this.step !== 4) {
          this.step = 4;
          MF.ui.showTitleCard("", "Pick up the weapon. Survive.", "");
          const pos = new THREE.Vector3(230, MF.getHeight(230, 230), 230);
          this.game.monsters.spawn("crawler", pos);
          MF.audio.playMonster("crawler", pos);
        }
        lookAt(214, 7, 214, 232, 3, 232, 0.1);
        if (t > 28.5) this.finish();
      }

      // particles during the sequence
      this.game.particles.update(dt);
      MF.muzzle && MF.muzzle.update(dt);
      MF.explosion && MF.explosion.update(dt);
    }
  }

  MF.MeteorImpactSequence = MeteorImpactSequence;
})(window.MF);
