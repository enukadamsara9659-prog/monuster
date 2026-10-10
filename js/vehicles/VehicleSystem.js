/* ============================================================
   METEORFALL — VehicleSystem.js
   Vehicle spawns, enter/exit (V), driving control, squad
   boarding, smoke on damage.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const SPAWNS = [
    { type: "jeep", x: 262, z: 168, heading: 0.6 },
    { type: "jeep", x: 158, z: 246, heading: -1.2 },
    { type: "jeep", x: 250, z: 1024, heading: 2.4 },
    { type: "motorcycle", x: 222, z: 172, heading: 0.2 },
    { type: "motorcycle", x: 196, z: 1042, heading: 1.8 },
    { type: "truck", x: 1206, z: 1662, heading: -0.7 },
    { type: "boat", x: 302, z: 1062, heading: 0.4 },
    { type: "boat", x: 980, z: 60, heading: 2.2 },
  ];

  class VehicleSystem {
    constructor(scene) {
      this.scene = scene;
      this.vehicles = [];
      this.playerVehicle = null;
      SPAWNS.forEach((s) => {
        const pos = new THREE.Vector3(s.x, MF.getHeight(s.x, s.z), s.z);
        const v = new MF.VehicleBase(s.type, pos, s.heading);
        scene.add(v.mesh);
        this.vehicles.push(v);
        MF.interactables.push({
          pos: v.mesh.position,
          radius: 3.4,
          label: "Drive " + v.def.name,
          action: () => {
            if (this.playerVehicle) return false;
            this.enterVehicle(v);
            return true;
          },
          vehicleRef: v,
        });
      });
    }

    enterVehicle(v) {
      this.playerVehicle = v;
      v.occupied = true;
      MF.game.player.object3D.visible = false;
      MF.ui.toast("Driving " + v.def.name + " — WASD to drive, Space handbrake, V to exit");
      MF.audio.playUI("confirm");
      if (MF.game.controller) MF.game.controller.camDistance = 7.2;
    }

    exitVehicle() {
      const v = this.playerVehicle;
      if (!v) return;
      v.occupied = false;
      this.playerVehicle = null;
      const side = new THREE.Vector3(Math.cos(v.heading) * 2.4, 0, -Math.sin(v.heading) * 2.4);
      const exitPos = v.position.clone().add(side);
      exitPos.y = MF.getHeight(exitPos.x, exitPos.z) + 0.1;
      MF.game.player.position.copy(exitPos);
      MF.game.player.object3D.visible = true;
      if (MF.game.controller) MF.game.controller.camDistance = 4.6;
    }

    tryToggleVehicle() {
      if (this.playerVehicle) {
        this.exitVehicle();
      } else {
        // find nearest vehicle
        let best = null, bestD = 3.6;
        for (const v of this.vehicles) {
          if (v.destroyed) continue;
          const d = MF.dist3D(v.position, MF.game.player.position);
          if (d < bestD) { bestD = d; best = v; }
        }
        if (best) this.enterVehicle(best);
      }
    }

    controlVehicle(dt, camYaw) {
      const v = this.playerVehicle;
      if (!v) return;
      const input = MF.input;
      const mv = input.getMoveVector();
      v.physics.update(dt, {
        forward: mv.y > 0.15,
        backward: mv.y < -0.15,
        left: mv.x < -0.15,
        right: mv.x > 0.15,
        handbrake: input.action("jump"),
      }, camYaw);

      // seat the player at vehicle position
      MF.game.player.position.copy(v.position);
      MF.game.player.yaw = v.heading;

      // smoke when damaged
      if (v.health < v.def.health * 0.45 && MF.game.particles && Math.random() < dt * 9) {
        MF.game.particles.emit("smoke", v.position.clone().setY(v.position.y + 1.2), { count: 1, size: 1.6 });
      }
      if (v.destroyed) this.exitVehicle();

      // engine hum
      if (Math.abs(v.physics.speed) > 1 && Math.random() < dt * 3) {
        MF.audio.playFootstep(v.position, false);
      }
    }

    update(dt) {
      for (const v of this.vehicles) {
        if (v === this.playerVehicle) continue;
        // slight idle
        if (v.mesh.position.y < MF.getHeight(v.position.x, v.position.z) - 0.5) {
          v.position.y = MF.getHeight(v.position.x, v.position.z);
          v.mesh.position.copy(v.position);
        }
      }
    }
  }

  MF.VehicleSystem = VehicleSystem;
})(window.MF);
