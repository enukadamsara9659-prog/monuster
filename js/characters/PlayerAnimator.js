/* ============================================================
   METEORFALL — PlayerAnimator.js
   Fully procedural animation: idle / walk / run / sprint /
   crouch / jump / aim / fire / reload / swim / death / damage.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class PlayerAnimator {
    constructor(rig) {
      this.rig = rig;
      this.state = "idle";
      this.phase = 0;
      this.fireKick = 0;
      this.reloadT = 0;
      this.deathT = 0;
      this.flinch = 0;
    }

    setState(state) {
      if (this.state !== state) {
        this.state = state;
      }
    }

    triggerFire() { this.fireKick = 1; }
    triggerReload() { this.reloadT = 1.5; }
    triggerDamage() { this.flinch = 1; }
    triggerDeath() { this.deathT = 0; this.state = "death"; }

    update(dt, speed, grounded, aiming) {
      const r = this.rig;
      const walkFreq = 8.5;
      const moving = speed > 0.3;
      this.phase += dt * (moving ? walkFreq * (0.5 + speed / 9) : 1.6);
      this.fireKick = Math.max(0, this.fireKick - dt * 7);
      this.flinch = Math.max(0, this.flinch - dt * 3.2);
      if (this.reloadT > 0) this.reloadT = Math.max(0, this.reloadT - dt);
      if (this.state === "death") this.deathT = Math.min(1, this.deathT + dt * 1.4);

      const breathe = Math.sin(this.phase * 0.35) * 0.012;

      // base pose
      if (this.state === "death") {
        const t = MF.Easing.cubicOut(this.deathT);
        r.root.rotation.x = -t * 1.5;
        r.root.position.y = -t * 0.35;
        r.armL.rotation.set(-0.4 + t * 0.8, 0, 0.25 + t * 0.7);
        r.armR.rotation.set(-0.4 + t * 0.6, 0, -0.25 - t * 0.8);
        r.legL.rotation.x = t * 0.45;
        r.legR.rotation.x = t * 0.25;
        r.torso.rotation.x = t * 0.3;
        return;
      }

      r.root.rotation.x = MF.damp(r.root.rotation.x, 0, 8, dt);
      r.root.position.y = MF.damp(r.root.position.y, 0, 8, dt);

      if (!grounded) {
        // jump pose: legs tuck, arms spread
        r.legL.rotation.x = MF.damp(r.legL.rotation.x, -0.75, 10, dt);
        r.legR.rotation.x = MF.damp(r.legR.rotation.x, -0.35, 10, dt);
        r.armL.rotation.set(MF.damp(r.armL.rotation.x, -1.1, 10, dt), 0, MF.damp(r.armL.rotation.z, 0.65, 10, dt));
        r.armR.rotation.set(MF.damp(r.armR.rotation.x, -1.1, 10, dt), 0, MF.damp(r.armR.rotation.z, -0.65, 10, dt));
        r.torso.position.y = 0;
        return;
      }

      if (this.state === "swim") {
        const s = Math.sin(this.phase * 1.2);
        r.root.rotation.x = -1.15;
        r.armL.rotation.set(s * 1.2 - 0.6, 0, 0.4);
        r.armR.rotation.set(-s * 1.2 - 0.6, 0, -0.4);
        r.legL.rotation.x = s * 0.5;
        r.legR.rotation.x = -s * 0.5;
        r.torso.position.y = 0;
        return;
      }

      const crouch = this.state === "crouch";
      const crouchOffset = crouch ? -0.32 : 0;
      r.torso.position.y = MF.damp(r.torso.position.y, crouchOffset + breathe, 10, dt);

      if (moving) {
        const swing = Math.sin(this.phase) * (0.35 + speed * 0.055);
        const swing2 = Math.sin(this.phase + Math.PI) * (0.35 + speed * 0.055);
        r.legL.rotation.x = swing * (crouch ? 0.55 : 1);
        r.legR.rotation.x = swing2 * (crouch ? 0.55 : 1);
        if (aiming) {
          r.armL.rotation.set(-1.35 + this.fireKick * 0.12, 0.35, 0.42);
          r.armR.rotation.set(-1.5 + this.fireKick * 0.35, -0.12, -0.18);
        } else {
          r.armL.rotation.set(swing2 * 0.85, 0, 0.14);
          r.armR.rotation.set(swing * 0.85, 0, -0.14);
        }
        r.torso.rotation.x = MF.damp(r.torso.rotation.x, 0.06 + speed * 0.008, 8, dt);
      } else {
        r.legL.rotation.x = MF.damp(r.legL.rotation.x, 0, 8, dt);
        r.legR.rotation.x = MF.damp(r.legR.rotation.x, 0, 8, dt);
        const sway = Math.sin(this.phase * 0.6) * 0.06;
        if (aiming) {
          r.armL.rotation.set(-1.35 + this.fireKick * 0.12, 0.35, 0.42);
          r.armR.rotation.set(-1.5 + this.fireKick * 0.35, -0.12, -0.18);
        } else {
          r.armL.rotation.set(sway, 0, 0.12 + breathe);
          r.armR.rotation.set(-sway, 0, -0.12 - breathe);
        }
        r.torso.rotation.x = MF.damp(r.torso.rotation.x, 0, 8, dt);
      }

      // reload: left hand to magazine
      if (this.reloadT > 0) {
        const t = Math.sin((1 - this.reloadT / 1.5) * Math.PI);
        r.armL.rotation.set(-1.1 - t * 0.4, 0.15, 0.3 + t * 0.25);
      }

      // damage flinch
      if (this.flinch > 0) {
        r.torso.rotation.x += this.flinch * 0.18;
        r.root.rotation.x += this.flinch * 0.08;
      }

      // head look
      r.head.rotation.y = MF.damp(r.head.rotation.y, Math.sin(this.phase * 0.3) * (moving ? 0.06 : 0.16), 4, dt);
    }
  }

  MF.PlayerAnimator = PlayerAnimator;
})(window.MF);
