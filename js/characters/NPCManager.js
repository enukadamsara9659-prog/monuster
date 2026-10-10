/* ============================================================
   METEORFALL — NPCManager.js
   Static survivors in the world: dialogs, recruits, quest givers.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const NPC_DEFS = [
    {
      name: "Elder Rowan", x: 214, z: 214, color: 0x6a5a3c,
      line: "The sky burned... the monsters came with the rock. Find the others — we survive together.",
    },
    {
      name: "Scout Nisha", x: 236, z: 186, color: 0x3c4a5c,
      line: "The forest east is crawling with Stalkers. Shoot the glowing eye — that's the weak spot.",
    },
    {
      name: "Medic Owen", x: 176, z: 224, color: 0xb8c4c8,
      line: "Elena runs the field clinic near the forest camp. She'll join you if you find her.",
    },
    {
      name: "Engineer Dev", x: 224, z: 236, color: 0xb8862a,
      line: "There are vehicles scattered around. Press V near one to drive. The bunker in the mountains has a truck.",
    },
    {
      name: "Guard Kira", x: 300, z: 1612, color: 0x4a3a2c,
      line: "The Ancient Kingdom still stands... barely. The Guardian wakes if you tread too deep.",
    },
    {
      name: "Hermit Sol", x: 300, z: 340, color: 0x3a4a2c,
      line: "The swamp whispers at night. The things that live here spit acid — keep your distance.",
    },
  ];

  class NPCManager {
    constructor(scene) {
      this.scene = scene;
      this.npcs = [];
      NPC_DEFS.forEach((def) => {
        const g = new THREE.Group();
        const bodyGeo = THREE.CapsuleGeometry
          ? new THREE.CapsuleGeometry(0.28, 1.1, 4, 8)
          : new THREE.CylinderGeometry(0.28, 0.32, 1.5, 8);
        const body = new THREE.Mesh(
          bodyGeo,
          new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 })
        );
        body.position.y = 1.05;
        body.castShadow = true;
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.19, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xc99070, roughness: 0.8 })
        );
        head.position.y = 1.95;
        g.add(body, head);
        const y = MF.getHeight(def.x, def.z);
        g.position.set(def.x, y, def.z);
        scene.add(g);

        const npc = { def, mesh: g, spoke: false };
        this.npcs.push(npc);
        MF.interactables.push({
          pos: g.position,
          radius: 3.2,
          label: "Talk to " + def.name,
          action: () => {
            MF.ui.dialogue(def.name, def.line, 5200);
            MF.audio.playUI("confirm");
            return true;
          },
        });
      });
    }

    update(dt, time) {
      for (const npc of this.npcs) {
        // idle sway + face player when close
        npc.mesh.rotation.y += Math.sin(time * 0.4 + npc.mesh.position.x) * dt * 0.12;
        const p = MF.game.player;
        if (p && MF.dist3D(p.position, npc.mesh.position) < 8) {
          const yaw = Math.atan2(p.position.x - npc.mesh.position.x, p.position.z - npc.mesh.position.z);
          npc.mesh.rotation.y = MF.angleLerp(npc.mesh.rotation.y, yaw, 1 - Math.exp(-3 * dt));
        }
      }
    }
  }

  MF.NPCManager = NPCManager;
})(window.MF);
