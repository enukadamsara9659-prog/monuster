/* ============================================================
   METEORFALL — WeaponBase.js
   8 procedurally generated weapons + stats. Unlimited ammo.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const DEFS = [
    {
      id: "ar", name: "AR-Standard", icon: "▰",
      damage: 25, fireRate: 10, range: 120, spread: 0.012, auto: true,
      recoil: 0.22, reloadTime: 1.4, sound: "ar", projectile: null, falloff: 0.55,
    },
    {
      id: "sniper", name: "Sniper Bolt-Action", icon: "▬",
      damage: 150, fireRate: 1.1, range: 480, spread: 0.0015, auto: false,
      recoil: 0.85, reloadTime: 2.1, sound: "sniper", projectile: null, falloff: 0.25,
    },
    {
      id: "shotgun", name: "Shotgun Pump", icon: "▮",
      damage: 22, pellets: 8, fireRate: 1.4, range: 32, spread: 0.06, auto: false,
      recoil: 0.75, reloadTime: 1.9, sound: "shotgun", projectile: null, falloff: 0.85,
    },
    {
      id: "minigun", name: "Vulcan Minigun", icon: "≡",
      damage: 18, fireRate: 28, range: 95, spread: 0.03, auto: true,
      recoil: 0.12, reloadTime: 2.6, sound: "minigun", projectile: null, falloff: 0.6, spin: true,
    },
    {
      id: "rocket", name: "Rocket Launcher", icon: "➤",
      damage: 500, fireRate: 0.8, range: 260, spread: 0.004, auto: false,
      recoil: 1.1, reloadTime: 2.4, sound: "rocket", projectile: "rocket", falloff: 0,
    },
    {
      id: "meteor", name: "Meteor Blaster", icon: "✦",
      damage: 62, fireRate: 8, range: 130, spread: 0.02, auto: true,
      recoil: 0.18, reloadTime: 1.6, sound: "alien", projectile: "bolt", falloff: 0.4, alien: true,
    },
    {
      id: "gravity", name: "Gravity Rifle", icon: "✧",
      damage: 95, fireRate: 3.2, range: 150, spread: 0.01, auto: true,
      recoil: 0.3, reloadTime: 1.9, sound: "alien", projectile: "gravity", falloff: 0.35, alien: true,
    },
    {
      id: "voidcannon", name: "Void Cannon", icon: "◈",
      damage: 160, fireRate: 2, range: 200, spread: 0.008, auto: false,
      recoil: 0.65, reloadTime: 2.2, sound: "alien", projectile: "void", falloff: 0.2, alien: true,
    },
  ];

  function metal(color, emissive) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.55, metalness: 0.65,
      emissive: emissive || 0x000000, emissiveIntensity: emissive ? 1.2 : 0,
    });
  }

  function buildModel(id) {
    const g = new THREE.Group();
    const gunmetal = metal(0x2a2d31);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 });
    const black = metal(0x14161a);

    const add = (geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true;
      g.add(m);
      return m;
    };

    switch (id) {
      case "ar": {
        add(new THREE.BoxGeometry(0.62, 0.09, 0.07), gunmetal, 0, 0, -0.1);
        add(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 8), gunmetal, 0, 0.005, -0.52, Math.PI / 2);
        add(new THREE.BoxGeometry(0.2, 0.07, 0.05), wood, 0, -0.005, 0.28);
        add(new THREE.BoxGeometry(0.045, 0.13, 0.035), gunmetal, 0, -0.115, -0.02);
        add(new THREE.BoxGeometry(0.035, 0.09, 0.045), black, 0, -0.08, 0.12, 0.35);
        add(new THREE.BoxGeometry(0.05, 0.035, 0.12), black, 0, 0.065, -0.12);
        break;
      }
      case "sniper": {
        add(new THREE.BoxGeometry(0.92, 0.075, 0.055), gunmetal, 0, 0, -0.12);
        add(new THREE.CylinderGeometry(0.013, 0.013, 0.52, 8), gunmetal, 0, 0.004, -0.78, Math.PI / 2);
        add(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 10), black, 0, 0.09, -0.22, Math.PI / 2);
        add(new THREE.BoxGeometry(0.18, 0.06, 0.05), wood, 0, -0.01, 0.32);
        add(new THREE.BoxGeometry(0.04, 0.1, 0.04), black, 0, -0.085, 0.06);
        break;
      }
      case "shotgun": {
        add(new THREE.BoxGeometry(0.52, 0.1, 0.075), gunmetal, 0, 0, -0.08);
        add(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), gunmetal, 0, 0.02, -0.42, Math.PI / 2);
        add(new THREE.BoxGeometry(0.1, 0.06, 0.16), wood, 0, -0.075, -0.3);
        add(new THREE.BoxGeometry(0.2, 0.08, 0.06), wood, 0, -0.01, 0.26);
        break;
      }
      case "minigun": {
        const body = add(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 10), gunmetal, 0, 0, -0.12, Math.PI / 2);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          add(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6), black,
            Math.cos(ang) * 0.045, Math.sin(ang) * 0.045, -0.48, Math.PI / 2);
        }
        add(new THREE.BoxGeometry(0.14, 0.16, 0.14), black, 0, -0.14, -0.02);
        add(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), black, 0, 0.1, 0.08, 0, 0, Math.PI / 2);
        g.userData.spinPart = body;
        break;
      }
      case "rocket": {
        add(new THREE.CylinderGeometry(0.045, 0.05, 0.85, 10), metal(0x3d4438), 0, 0.01, -0.3, Math.PI / 2);
        add(new THREE.CylinderGeometry(0.06, 0.045, 0.12, 10), metal(0x2c3228), 0, 0.01, -0.76, Math.PI / 2);
        add(new THREE.BoxGeometry(0.04, 0.1, 0.05), black, 0, -0.1, -0.05);
        add(new THREE.BoxGeometry(0.03, 0.06, 0.1), black, 0, 0.08, -0.15);
        break;
      }
      case "meteor": {
        const organic = new THREE.MeshStandardMaterial({
          color: 0x4a2a1a, roughness: 0.5, metalness: 0.2,
          emissive: 0xff6a1e, emissiveIntensity: 0.65,
        });
        add(new THREE.SphereGeometry(0.09, 10, 8), organic, 0, 0, -0.12);
        add(new THREE.SphereGeometry(0.07, 10, 8), organic, 0, 0.02, -0.3);
        add(new THREE.SphereGeometry(0.055, 10, 8), organic, 0, -0.01, -0.47);
        add(new THREE.CylinderGeometry(0.035, 0.055, 0.22, 8), organic, 0, 0, -0.58, Math.PI / 2);
        add(new THREE.SphereGeometry(0.045, 8, 6), metal(0xff8a3a, 0xff6a1e), 0, 0, -0.72);
        break;
      }
      case "gravity": {
        const alien = new THREE.MeshStandardMaterial({
          color: 0x223344, roughness: 0.35, metalness: 0.75,
          emissive: 0x2a7fff, emissiveIntensity: 0.75,
        });
        add(new THREE.BoxGeometry(0.55, 0.1, 0.09), alien, 0, 0, -0.12);
        add(new THREE.TorusGeometry(0.07, 0.02, 8, 16), metal(0x4aa8ff, 0x2a7fff), 0, 0, -0.5, 0, Math.PI / 2);
        add(new THREE.BoxGeometry(0.05, 0.12, 0.05), alien, 0, -0.1, -0.02);
        break;
      }
      case "voidcannon": {
        const voidMat = new THREE.MeshStandardMaterial({
          color: 0x1a0f2a, roughness: 0.3, metalness: 0.8,
          emissive: 0x9a3aff, emissiveIntensity: 0.85,
        });
        add(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 10), voidMat, 0, 0, -0.28, Math.PI / 2);
        add(new THREE.SphereGeometry(0.085, 12, 10), metal(0xc060ff, 0x9a3aff), 0, 0, -0.62);
        add(new THREE.BoxGeometry(0.06, 0.13, 0.06), voidMat, 0, -0.11, -0.05);
        break;
      }
    }

    // shared muzzle marker
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.01, -0.82);
    g.add(muzzle);
    g.userData.muzzle = muzzle;
    return g;
  }

  class WeaponBase {
    static getDefs() { return DEFS; }
    static getDef(id) { return DEFS.find((d) => d.id === id) || DEFS[0]; }
    static buildModel(id) { return buildModel(id); }
  }

  MF.WeaponBase = WeaponBase;
})(window.MF);
