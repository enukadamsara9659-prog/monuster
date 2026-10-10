/* ============================================================
   METEORFALL — VehiclePhysics.js
   Arcade vehicle physics: accel, brake/reverse, steering,
   handbrake drift, terrain following, slope response.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class VehiclePhysics {
    constructor(vehicle) {
      this.vehicle = vehicle;
      this.speed = 0;           // forward m/s
      this.heading = vehicle.heading || 0;
      this.velocityY = 0;
    }

    update(dt, controls, camYaw) {
      const v = this.vehicle;
      const def = v.def;

      // throttle
      if (controls.forward) {
        this.speed += def.accel * dt;
      } else if (controls.backward) {
        this.speed -= def.brake * dt;
      } else {
        // friction
        const fr = def.friction * dt;
        if (Math.abs(this.speed) <= fr) this.speed = 0;
        else this.speed -= Math.sign(this.speed) * fr;
      }
      this.speed = MF.clamp(this.speed, -def.maxSpeed * 0.45, def.maxSpeed);

      // steering (scaled by speed)
      const steerStrength = def.steer * MF.clamp(Math.abs(this.speed) / 8, 0.15, 1);
      if (controls.left) this.heading += steerStrength * dt * (this.speed >= 0 ? 1 : -1);
      if (controls.right) this.heading -= steerStrength * dt * (this.speed >= 0 ? 1 : -1);

      // handbrake
      if (controls.handbrake) {
        this.speed *= Math.pow(0.35, dt * 3);
      }

      // move
      const dirX = Math.sin(this.heading);
      const dirZ = Math.cos(this.heading);
      v.position.x += dirX * this.speed * dt;
      v.position.z += dirZ * this.speed * dt;
      v.position.x = MF.clamp(v.position.x, 20, MF.WORLD_SIZE - 20);
      v.position.z = MF.clamp(v.position.z, 20, MF.WORLD_SIZE - 20);

      // terrain follow
      const onWater = v.isBoat;
      const groundY = MF.getHeight(v.position.x, v.position.z);
      const waterY = MF.game.world.water.surfaceAt(v.position.x, v.position.z);
      if (onWater && waterY > -Infinity) {
        v.position.y = MF.damp(v.position.y, waterY - 0.15, 6, dt);
      } else {
        v.position.y = MF.damp(v.position.y, groundY + 0.05, 10, dt);
        // slope slows
        const n = MF.getNormal(v.position.x, v.position.z);
        if (n.y < 0.86) this.speed *= Math.pow(0.6, dt * 2.5);
      }

      MF.resolveCollisions(v.position, Math.max(1.4, v.def.width * 0.6), 1.8);

      // pitch/roll to match terrain
      const n2 = MF.getNormal(v.position.x, v.position.z);
      const targetPitch = Math.atan2(n2.z, n2.y) * (this.speed > 0 ? 1 : -1) * 0.45;
      const targetRoll = -Math.atan2(n2.x, n2.y) * 0.45;
      v.mesh.rotation.set(targetPitch, this.heading, targetRoll, "YXZ");
      v.mesh.position.copy(v.position);

      // wheel spin
      if (v.wheels) {
        const spin = this.speed * dt * 2.4;
        for (const w of v.wheels) w.rotation.x += spin;
      }

      // run over monsters
      if (Math.abs(this.speed) > 6 && MF.game.monsters) {
        for (const m of MF.game.monsters.list) {
          if (!m.isAlive) continue;
          if (MF.dist2D(m.position.x, m.position.z, v.position.x, v.position.z) < 2.6) {
            if (m.maxHealth < 200) {
              m.takeDamage(9999, m.position, false);
            } else {
              m.takeDamage(Math.abs(this.speed) * 8, m.position, false);
            }
          }
        }
      }
    }
  }

  MF.VehiclePhysics = VehiclePhysics;
})(window.MF);
