/* ============================================================
   METEORFALL — PlayerCharacter.js
   Procedurally generated humanoid (Kael Raven) with named rig
   parts for the animator, plus the weapon mount.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class PlayerCharacter {
    constructor() {
      this.position = new THREE.Vector3(200, 20, 200);
      this.yaw = 0;
      this.velocityY = 0;
      this.grounded = true;
      this.speed = 0;
      this.state = "idle";
      this.object3D = new THREE.Group();
      this.buildBody();
      this.animator = new MF.PlayerAnimator(this.rig);
      this.footTimer = 0;
    }

    buildBody() {
      const skin = new THREE.MeshStandardMaterial({ color: 0xc99070, roughness: 0.8 });
      const gear = new THREE.MeshStandardMaterial({ color: 0x3c4a32, roughness: 0.9 });
      const pants = new THREE.MeshStandardMaterial({ color: 0x2c3326, roughness: 0.95 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x1d211c, roughness: 0.85 });

      const root = new THREE.Group();
      const torso = new THREE.Group();
      root.add(torso);

      // torso + vest
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.28), gear);
      chest.position.y = 1.28;
      chest.castShadow = true;
      torso.add(chest);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.33), dark);
      vest.position.y = 1.34;
      torso.add(vest);

      // belt + pouches
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x5c4326, roughness: 0.95 }));
      belt.position.y = 1.0;
      torso.add(belt);
      for (const px of [-0.16, 0.16]) {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), dark);
        pouch.position.set(px, 1.0, 0.18);
        torso.add(pouch);
      }

      // head + helmet
      const head = new THREE.Group();
      head.position.y = 1.72;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
      skull.castShadow = true;
      head.add(skull);
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.245, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), gear);
      helmet.position.y = 0.045;
      helmet.castShadow = true;
      head.add(helmet);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.1), dark);
      visor.position.set(0, 0.02, 0.19);
      head.add(visor);
      torso.add(head);

      // backpack
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), gear);
      pack.position.set(0, 1.3, -0.24);
      pack.castShadow = true;
      torso.add(pack);

      // arms (pivot at shoulder)
      const makeArm = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.3, 1.52, 0);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 7), gear);
        upper.position.y = -0.22;
        upper.castShadow = true;
        pivot.add(upper);
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 7), gear);
        fore.position.y = -0.6;
        pivot.add(fore);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), skin);
        hand.position.y = -0.84;
        pivot.add(hand);
        torso.add(pivot);
        return pivot;
      };
      const armL = makeArm(-1);
      const armR = makeArm(1);

      // legs (pivot at hip)
      const makeLeg = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.135, 0.96, 0);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.095, 0.46, 7), pants);
        thigh.position.y = -0.24;
        thigh.castShadow = true;
        pivot.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.44, 7), pants);
        shin.position.y = -0.66;
        shin.castShadow = true;
        pivot.add(shin);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), dark);
        boot.position.set(0, -0.9, 0.05);
        boot.castShadow = true;
        pivot.add(boot);
        root.add(pivot);
        return pivot;
      };
      const legL = makeLeg(-1);
      const legR = makeLeg(1);

      // weapon mount (held at right hand)
      const weaponMount = new THREE.Group();
      weaponMount.position.set(0.16, -0.82, -0.28);
      armR.add(weaponMount);

      this.object3D.add(root);
      this.rig = { root, torso, head, armL, armR, legL, legR, weaponMount };
      this.weaponMount = weaponMount;
    }

    attachWeapon(mesh) {
      if (this.currentWeaponMesh) this.weaponMount.remove(this.currentWeaponMesh);
      this.currentWeaponMesh = mesh;
      if (mesh) this.weaponMount.add(mesh);
    }

    update(dt) {
      this.object3D.position.copy(this.position);
      this.object3D.rotation.y = this.yaw;
      this.animator.update(dt, this.speed, this.grounded, this.state === "aim" || this.state === "fire");
    }

    getMuzzleWorldPosition() {
      const v = new THREE.Vector3(0.15, -0.75, -1.15);
      return this.rig.armR.localToWorld(v);
    }
  }

  MF.PlayerCharacter = PlayerCharacter;
})(window.MF);
