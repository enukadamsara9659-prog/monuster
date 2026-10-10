/* ============================================================
   METEORFALL — VehicleBase.js
   Procedural vehicles: Jeep, Motorcycle, Military Truck, Boat.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const DEFS = {
    jeep: {
      name: "Jeep", maxSpeed: 20, accel: 11, brake: 14, friction: 4.5, steer: 2.1, width: 2.4, health: 800,
    },
    motorcycle: {
      name: "Motorcycle", maxSpeed: 26, accel: 15, brake: 16, friction: 3.2, steer: 2.8, width: 1.1, health: 350,
    },
    truck: {
      name: "Military Truck", maxSpeed: 12.5, accel: 6.5, brake: 10, friction: 5, steer: 1.35, width: 3, health: 1500,
    },
    boat: {
      name: "Boat", maxSpeed: 11, accel: 5, brake: 6, friction: 2.2, steer: 1.2, width: 2.6, health: 600,
    },
  };

  function wheel(r, w) {
    const geo = new THREE.CylinderGeometry(r, r, w, 12);
    geo.rotateZ(Math.PI / 2);
    return geo;
  }

  class VehicleBase {
    constructor(type, position, heading) {
      this.type = type;
      this.def = DEFS[type];
      this.position = position.clone();
      this.heading = heading || 0;
      this.health = this.def.health;
      this.mesh = this.buildMesh();
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.heading;
      this.wheels = [];
      this.mesh.traverse((o) => {
        if (o.userData && o.userData.isWheel) this.wheels.push(o);
      });
      this.physics = new MF.VehiclePhysics(this);
      this.isBoat = type === "boat";
      this.occupied = false;
    }

    buildMesh() {
      const g = new THREE.Group();
      const body = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.28 });
      const glass = new THREE.MeshStandardMaterial({
        color: 0x88b8d8, transparent: true, opacity: 0.42, roughness: 0.12, metalness: 0.6,
      });
      const tire = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });

      const addWheel = (x, z, r, w) => {
        const m = new THREE.Mesh(wheel(r, w), tire);
        m.position.set(x, r, z);
        m.userData.isWheel = true;
        m.castShadow = true;
        g.add(m);
        return m;
      };

      if (this.type === "jeep") {
        const paint = body(0x3c4a32);
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 4.1), paint);
        hull.position.y = 1.05;
        hull.castShadow = true;
        g.add(hull);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 2), paint);
        cabin.position.set(0, 1.85, -0.2);
        cabin.castShadow = true;
        g.add(cabin);
        const shield = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 0.08), glass);
        shield.position.set(0, 2.05, 0.82);
        shield.rotation.x = -0.22;
        g.add(shield);
        for (const [x, z] of [[-1.15, 1.35], [1.15, 1.35], [-1.15, -1.35], [1.15, -1.35]]) addWheel(x, z, 0.42, 0.32);
        // roll bar
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), body(0x22262a));
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 2.55, -1.1);
        g.add(bar);
        for (const side of [-1, 1]) {
          const light = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffc878, emissiveIntensity: 0.6 }));
          light.position.set(side * 0.8, 1.15, 2.08);
          g.add(light);
        }
      } else if (this.type === "motorcycle") {
        const paint = body(0x5a2222);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 1.9), paint);
        frame.position.y = 0.92;
        frame.castShadow = true;
        g.add(frame);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.8), body(0x1c1c20));
        seat.position.set(0, 1.18, -0.25);
        g.add(seat);
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), body(0x8a8f94));
        fork.position.set(0, 1.15, 0.85);
        fork.rotation.x = 0.5;
        g.add(fork);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), body(0x22262a));
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 1.55, 0.72);
        g.add(bar);
        addWheel(0, 1.05, 0.45, 0.16);
        addWheel(0, -1.05, 0.45, 0.16);
      } else if (this.type === "truck") {
        const paint = body(0x3a4230);
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.5, 6.4), paint);
        hull.position.y = 1.55;
        hull.castShadow = true;
        g.add(hull);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.5, 1.9), paint);
        cabin.position.set(0, 2.85, 2);
        cabin.castShadow = true;
        g.add(cabin);
        const shield = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 0.1), glass);
        shield.position.set(0, 3.15, 2.96);
        shield.rotation.x = -0.14;
        g.add(shield);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 3.4), paint);
        bed.position.set(0, 2.5, -1.2);
        g.add(bed);
        // turret
        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 10), body(0x2c3228));
        turretBase.position.set(0, 3.35, -1.2);
        g.add(turretBase);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8), body(0x1c201c));
        gun.rotation.x = Math.PI / 2;
        gun.position.set(0, 3.62, -0.2);
        g.add(gun);
        for (const [x, z] of [[-1.5, 2.2], [1.5, 2.2], [-1.5, 0], [1.5, 0], [-1.5, -2.2], [1.5, -2.2]]) addWheel(x, z, 0.55, 0.38);
      } else if (this.type === "boat") {
        const wood = body(0x6a4a2c);
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 5.2), wood);
        hull.position.y = 0.65;
        hull.scale.set(1, 1, 1);
        hull.castShadow = true;
        g.add(hull);
        const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 4), wood);
        bow.rotation.x = -Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.position.set(0, 0.65, 3.3);
        g.add(bow);
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.5), body(0x22262a));
        motor.position.set(0, 1.05, -2.8);
        g.add(motor);
        for (const z of [-1.2, 0.2, 1.5]) {
          const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.5), wood);
          seat.position.set(0, 1.15, z);
          g.add(seat);
        }
      }
      return g;
    }

    takeDamage(amount) {
      this.health = Math.max(0, this.health - amount);
      if (this.health <= 0) this.destroy();
    }

    destroy() {
      MF.audio.playExplosion(this.position, 1.2);
      if (MF.game.particles) {
        MF.game.particles.emit("explosion", this.position, { count: 30, size: 3 });
        MF.game.particles.emit("smoke", this.position, { count: 16 });
      }
      if (MF.explosion) MF.explosion.spawn(this.position, 6);
      this.destroyed = true;
    }
  }

  VehicleBase.DEFS = DEFS;
  MF.VehicleBase = VehicleBase;
})(window.MF);
