/* ============================================================
   METEORFALL — SquadMember.js
   The 6 heroes (Maya, Ryan, Elena, Arjun, Sarah, Marcus) with
   procedural humanoid models, unique looks and special abilities.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const HEROES = [
    {
      name: "Maya", role: "Sniper", scale: 0.92, outfit: 0x24365c, accent: 0x3a6ad8,
      hair: "ponytail", weapon: "sniper",
      ability: { id: "mark", name: "Mark Target", cooldown: 30, desc: "All squad deal 2x damage for 10s" },
      lines: {
        spotted: ["Hostiles ahead!", "I see movement."],
        kill: ["Target down.", "Got one."],
        downed: ["I'm down! Need help!", "Medic!"],
      },
    },
    {
      name: "Ryan", role: "Heavy", scale: 1.12, outfit: 0x6a2c22, accent: 0xc83a2a,
      hair: "bald", weapon: "minigun",
      ability: { id: "warcry", name: "War Cry", cooldown: 45, desc: "Taunt all enemies in 20m for 10s" },
      lines: {
        spotted: ["Let's go loud!", "Contact!"],
        kill: ["Ha! Next!", "Scratch one."],
        downed: ["They got me…", "Need a hand!"],
      },
    },
    {
      name: "Elena", role: "Medic", scale: 0.96, outfit: 0xc8d8e8, accent: 0xe8e8f0,
      hair: "short", weapon: "ar",
      ability: { id: "heal", name: "Field Heal", cooldown: 60, desc: "Heal all allies for 50 HP" },
      lines: {
        spotted: ["Stay sharp, people.", "Movement!"],
        kill: ["Neutralized.", "It's down."],
        downed: ["I can't move!", "Help me up!"],
      },
    },
    {
      name: "Arjun", role: "Engineer", scale: 1.0, outfit: 0xc8862a, accent: 0xe8b04a,
      hair: "goggles", weapon: "shotgun",
      ability: { id: "turret", name: "Auto Turret", cooldown: 90, desc: "Deploy a turret for 20s" },
      lines: {
        spotted: ["Turret's ready if you need it.", "Heads up!"],
        kill: ["Bullseye!", "That's engineering."],
        downed: ["Systems failing…", "A little help?"],
      },
    },
    {
      name: "Sarah", role: "Scout", scale: 0.88, outfit: 0x2c3038, accent: 0x50586a,
      hair: "hood", weapon: "sniper",
      ability: { id: "scan", name: "Stealth Scan", cooldown: 45, desc: "Reveal all enemies for 15s" },
      lines: {
        spotted: ["Silent approach… contact.", "Movement in the dark."],
        kill: ["Quiet.", "Done here."],
        downed: ["Cover me!", "I'm hit!"],
      },
    },
    {
      name: "Marcus", role: "Tactical", scale: 1.04, outfit: 0x3c4a2c, accent: 0x6a8a3c,
      hair: "beret", weapon: "ar",
      ability: { id: "strike", name: "Tactical Strike", cooldown: 45, desc: "Grenade spread on target area" },
      lines: {
        spotted: ["Eyes on hostiles.", "Weapons free."],
        kill: ["Good effect.", "Target destroyed."],
        downed: ["Requesting support!", "I'm pinned!"],
      },
    },
  ];

  function buildHeroMesh(hero) {
    const g = new THREE.Group();
    const outfit = new THREE.MeshStandardMaterial({ color: hero.outfit, roughness: 0.88 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc99070, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c201c, roughness: 0.85 });
    const accent = new THREE.MeshStandardMaterial({ color: hero.accent, roughness: 0.7 });

    const root = new THREE.Group();
    const torso = new THREE.Group();
    root.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.26), outfit);
    chest.position.y = 1.26;
    chest.castShadow = true;
    torso.add(chest);

    const head = new THREE.Group();
    head.position.y = 1.68;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.195, 10, 8), skin);
    skull.castShadow = true;
    head.add(skull);

    if (hero.hair === "ponytail") {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.035, 0.5, 6), dark);
      tail.position.set(0, -0.12, -0.22);
      tail.rotation.x = 0.6;
      head.add(tail);
    } else if (hero.hair === "goggles") {
      const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 14), accent);
      goggles.position.set(0, 0.13, 0.11);
      goggles.rotation.x = -0.4;
      head.add(goggles);
    } else if (hero.hair === "hood") {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.55, 8), outfit);
      hood.position.y = 0.12;
      head.add(hood);
    } else if (hero.hair === "beret") {
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.07, 10), accent);
      beret.position.y = 0.18;
      beret.rotation.z = 0.12;
      head.add(beret);
    } else if (hero.hair === "short") {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
      hair.position.y = 0.05;
      head.add(hair);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xd03030 }));
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), cross.material);
      cross.position.set(-0.22, 1.32, 0.15);
      cross2.position.set(-0.22, 1.32, 0.15);
      torso.add(cross, cross2);
    }
    torso.add(head);

    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.28, 1.5, 0);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.72, 6), outfit);
      upper.position.y = -0.38;
      upper.castShadow = true;
      pivot.add(upper);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), skin);
      hand.position.y = -0.78;
      pivot.add(hand);
      torso.add(pivot);
      return pivot;
    };
    const armL = makeArm(-1);
    const armR = makeArm(1);

    const makeLeg = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.125, 0.95, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.85, 6), dark);
      thigh.position.y = -0.42;
      thigh.castShadow = true;
      pivot.add(thigh);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.22), dark);
      boot.position.set(0, -0.86, 0.04);
      pivot.add(boot);
      root.add(pivot);
      return pivot;
    };
    const legL = makeLeg(-1);
    const legR = makeLeg(1);

    const weaponMount = new THREE.Group();
    weaponMount.position.set(0.14, -0.76, -0.26);
    armR.add(weaponMount);

    g.add(root);
    g.scale.setScalar(hero.scale);
    return { group: g, rig: { root, torso, head, armL, armR, legL, legR, weaponMount }, weaponMount };
  }

  class SquadMember {
    constructor(heroIndex) {
      this.hero = HEROES[heroIndex % HEROES.length];
      this.name = this.hero.name;
      this.role = this.hero.role;
      this.maxHealth = 100;
      this.health = 100;
      this.isAlive = true;
      this.isActive = false;
      this.downedTimer = 0;
      this.abilityCooldown = 0;
      this.position = new THREE.Vector3();
      this.state = "follow";
      this.animPhase = Math.random() * 6;
      this.target = null;
      this.fireCooldown = 0;
      this.formationIndex = 0;

      const built = buildHeroMesh(this.hero);
      this.mesh = built.group;
      this.rig = built.rig;
      const weaponModel = MF.WeaponBase.buildModel(this.hero.weapon);
      weaponModel.scale.setScalar(0.9);
      built.weaponMount.add(weaponModel);

      if (heroIndex === 0) {
        // rifle slung on Maya's back
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.06), new THREE.MeshStandardMaterial({ color: 0x222226 }));
        back.position.set(0.18, 1.35, -0.2);
        back.rotation.z = 0.5;
        this.mesh.add(back);
      }
    }

    setPosition(x, y, z) {
      this.position.set(x, y, z);
      this.mesh.position.copy(this.position);
    }

    takeDamage(amount, fromPos) {
      if (!this.isAlive) return;
      this.health = Math.max(0, this.health - amount);
      if (this.health <= 0) {
        this.isAlive = false;
        this.state = "downed";
        this.downedTimer = 60;
        MF.ui.dialogue(this.name, MF.pick(this.hero.lines.downed));
        MF.ui.toast(this.name + " is down! Press E near them to revive.");
      }
    }

    heal(amount) {
      if (!this.isAlive) return;
      this.health = Math.min(this.maxHealth, this.health + amount);
    }

    revive() {
      this.isAlive = true;
      this.health = 45;
      this.state = "follow";
      MF.ui.toast(this.name + " is back on their feet!");
    }

    /* Simple humanoid anim */
    animate(dt, speed) {
      this.animPhase += dt * (speed > 0.5 ? 8 : 2);
      const swing = speed > 0.5 ? Math.sin(this.animPhase) * 0.5 : Math.sin(this.animPhase * 0.4) * 0.06;
      this.rig.legL.rotation.x = swing;
      this.rig.legR.rotation.x = -swing;
      if (this.state === "combat" && this.target) {
        this.rig.armR.rotation.x = -1.45;
        this.rig.armL.rotation.x = -1.25;
        this.rig.armL.rotation.z = 0.35;
      } else {
        this.rig.armR.rotation.x = -swing * 0.8;
        this.rig.armL.rotation.x = swing * 0.8;
        this.rig.armL.rotation.z = 0.1;
      }
      if (!this.isAlive) {
        this.mesh.rotation.x = -1.35;
        this.mesh.position.y = this.position.y - 0.25;
      } else {
        this.mesh.rotation.x = 0;
        this.mesh.position.copy(this.position);
      }
    }
  }

  SquadMember.HEROES = HEROES;
  MF.SquadMember = SquadMember;
})(window.MF);
