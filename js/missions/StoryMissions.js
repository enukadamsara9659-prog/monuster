/* ============================================================
   METEORFALL — StoryMissions.js
   All 8 story chapters, ready to play start-to-finish.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  function storyMissions() {
    return [
      /* ============ CHAPTER 1 — THE FALLING SKY ============ */
      {
        id: "ch1", chapter: 1,
        title: "Survive the Impact",
        description: "The meteor has fallen. Grab a weapon and survive the first wave.",
        objectives: [
          {
            type: "INTERACT", text: "Pick up the assault rifle", label: "Pick up AR-Standard",
            targetPos: { x: 206, z: 196 }, radius: 4,
            onActivate: (obj) => {
              MF.game.weapons.unlock("ar");
              MF.game.weapons.equipByName("ar");
            },
          },
          { type: "KILL", text: "Kill Crawlers", targetCount: 5, killType: "crawler" },
          { type: "GO_TO", text: "Reach the village center", targetPos: { x: 200, z: 200 }, radius: 8 },
          { type: "SURVIVE_TIME", text: "Survive the monster wave", duration: 90 },
        ],
        rewards: { weapon: "shotgun" },
      },

      /* ============ CHAPTER 2 — FIRST CONTACT ============ */
      {
        id: "ch2", chapter: 2,
        title: "Into the Forest",
        description: "Elena is at the research camp in the Ashen Forest. Find her and keep her alive.",
        objectives: [
          { type: "GO_TO", text: "Travel to the Ashen Forest", targetPos: { x: 780, z: 700 }, radius: 14 },
          { type: "KILL", text: "Kill Stalkers", targetCount: 3, killType: "stalker" },
          {
            type: "INTERACT", text: "Find Elena at the research camp", label: "Talk to Elena",
            targetPos: { x: 760, z: 640 }, radius: 5,
            onActivate: () => { MF.game.squad.recruit("Elena"); },
          },
          { type: "DEFEND", text: "Defend Elena", targetPos: { x: 760, z: 640 }, radius: 22, duration: 90 },
        ],
        rewards: { recruit: "Elena", weapon: "sniper" },
      },

      /* ============ CHAPTER 3 — THE SURVIVORS ============ */
      {
        id: "ch3", chapter: 3,
        title: "Rally the Team",
        description: "Activate the radio tower and recruit the scattered survivors.",
        objectives: [
          { type: "GO_TO", text: "Go to the radio tower", targetPos: { x: 860, z: 420 }, radius: 12 },
          { type: "KILL", text: "Clear monsters at the tower", targetCount: 10 },
          {
            type: "INTERACT", text: "Activate the radio", label: "Activate radio",
            targetPos: { x: 860, z: 420 }, radius: 5,
            onActivate: () => { MF.audio.playUI("confirm"); MF.ui.toast("Radio online — the squad is gathering."); },
          },
          { type: "GO_TO", text: "Recruit Maya (Haven Village)", targetPos: { x: 236, z: 186 }, radius: 6, onComplete: () => MF.game.squad.recruit("Maya") },
          { type: "GO_TO", text: "Recruit Ryan (Riverside Town)", targetPos: { x: 210, z: 1000 }, radius: 10, onComplete: () => MF.game.squad.recruit("Ryan") },
          { type: "GO_TO", text: "Recruit Sarah (Ancient Kingdom)", targetPos: { x: 300, z: 1600 }, radius: 12, onComplete: () => MF.game.squad.recruit("Sarah") },
          { type: "GO_TO", text: "Recruit Arjun (Bunker)", targetPos: { x: 1180, z: 1680 }, radius: 10, onComplete: () => MF.game.squad.recruit("Arjun") },
        ],
        rewards: { recruitAll: true },
      },

      /* ============ CHAPTER 4 — THE LOST KINGDOM ============ */
      {
        id: "ch4", chapter: 4,
        title: "Ancient Secrets",
        description: "Something awakens beneath the Ancient Kingdom. End it before it spreads.",
        objectives: [
          { type: "GO_TO", text: "Travel to the Ancient Kingdom", targetPos: { x: 300, z: 1600 }, radius: 16 },
          { type: "GO_TO", text: "Explore the palace", targetPos: { x: 300, z: 1600 }, radius: 6 },
          { type: "KILL", text: "Kill monsters inside", targetCount: 12 },
          {
            type: "BOSS_FIGHT", text: "Defeat the Meteor Queen", bossType: "queen",
            targetPos: { x: 380, z: 1630 }, radius: 40,
            onActivate: (obj) => {
              const pos = new THREE.Vector3(obj.targetPos.x, MF.getHeight(obj.targetPos.x, obj.targetPos.y), obj.targetPos.y);
              obj.bossRef = MF.game.monsters.spawnBoss("queen", pos);
            },
          },
        ],
        rewards: { weapon: "meteor" },
      },

      /* ============ CHAPTER 5 — THE INFECTION ============ */
      {
        id: "ch5", chapter: 5,
        title: "Spreading Darkness",
        description: "The infection is spreading. Destroy the nests and fell the Titan.",
        objectives: [
          { type: "GO_TO", text: "Visit infected zone 1 (Deadlands rim)", targetPos: { x: 1120, z: 940 }, radius: 12 },
          {
            type: "INTERACT", text: "Destroy nest 1", label: "Destroy nest",
            targetPos: { x: 1120, z: 940 }, radius: 5,
            onActivate: () => {
              MF.explosion && MF.explosion.spawn(new THREE.Vector3(1120, MF.getHeight(1120, 940), 940), 5);
            },
          },
          { type: "GO_TO", text: "Visit infected zone 2 (Swamp)", targetPos: { x: 300, z: 320 }, radius: 12 },
          {
            type: "INTERACT", text: "Destroy nest 2", label: "Destroy nest",
            targetPos: { x: 300, z: 320 }, radius: 5,
            onActivate: () => {
              MF.explosion && MF.explosion.spawn(new THREE.Vector3(300, MF.getHeight(300, 320), 320), 5);
            },
          },
          {
            type: "BOSS_FIGHT", text: "Kill the Titan", bossType: "titan",
            targetPos: { x: 1000, z: 1000 }, radius: 60,
            onActivate: (obj) => {
              const pos = new THREE.Vector3(1040, MF.getHeight(1040, 960), 960);
              obj.bossRef = MF.game.monsters.spawnBoss("titan", pos);
            },
          },
        ],
        rewards: { weapon: "gravity" },
      },

      /* ============ CHAPTER 6 — THE DARK MOUNTAIN ============ */
      {
        id: "ch6", chapter: 6,
        title: "The Climb",
        description: "Ascend the Dark Mountains, find the bunker, and break the Ancient Guardian.",
        objectives: [
          { type: "GO_TO", text: "Ascend the mountain path", targetPos: { x: 1180, z: 1500 }, radius: 16 },
          { type: "KILL", text: "Kill monsters on the way", targetCount: 18 },
          { type: "GO_TO", text: "Find the military bunker", targetPos: { x: 1180, z: 1680 }, radius: 12 },
          {
            type: "BOSS_FIGHT", text: "Defeat the Ancient Guardian", bossType: "guardian",
            targetPos: { x: 1180, z: 1680 }, radius: 45,
            onActivate: (obj) => {
              const pos = new THREE.Vector3(1150, MF.getHeight(1150, 1650), 1650);
              obj.bossRef = MF.game.monsters.spawnBoss("guardian", pos);
            },
          },
        ],
        rewards: { weapon: "rocket", vehicle: "truck" },
      },

      /* ============ CHAPTER 7 — THE AWAKENING ============ */
      {
        id: "ch7", chapter: 7,
        title: "Heart of the Meteor",
        description: "The crater pulses with alien energy. Reach the core.",
        objectives: [
          { type: "GO_TO", text: "Travel to the crater center", targetPos: { x: 1000, z: 1000 }, radius: 20 },
          { type: "KILL", text: "Kill monsters in the Deadlands", targetCount: 24 },
          { type: "GO_TO", text: "Enter the meteor structure", targetPos: { x: 1000, z: 1000 }, radius: 8 },
          {
            type: "INTERACT", text: "Discover the alien core", label: "Touch the alien core",
            targetPos: { x: 1000, z: 1000 }, radius: 10,
            onActivate: () => {
              MF.ui.flash("#b060ff", 0.85, 1.2);
              MF.ui.dialogue("???", "YOU AWAKEN US…", 5000);
            },
          },
        ],
        rewards: { weapon: "voidcannon" },
      },

      /* ============ CHAPTER 8 — THE LAST DAWN ============ */
      {
        id: "ch8", chapter: 8,
        title: "Final Stand",
        description: "Everything ends now. Prepare, drive to the crater, and destroy the Void Titan.",
        objectives: [
          {
            type: "INTERACT", text: "Prepare at the village", label: "Gear up",
            targetPos: { x: 200, z: 200 }, radius: 8,
            onActivate: () => {
              MF.game.health.reset();
              MF.game.squad.roster.forEach((m) => { m.health = m.maxHealth; m.isAlive = true; });
              MF.ui.toast("Squad restored — this is it.");
            },
          },
          { type: "GO_TO", text: "Drive to the crater", targetPos: { x: 1000, z: 1000 }, radius: 30 },
          { type: "KILL", text: "Kill monsters in the final battle", targetCount: 40 },
          {
            type: "BOSS_FIGHT", text: "Destroy the Void Titan", bossType: "void",
            targetPos: { x: 1000, z: 1000 }, radius: 70,
            onActivate: (obj) => {
              const pos = new THREE.Vector3(1000, MF.getHeight(1000, 1000) + 1, 1000);
              obj.bossRef = MF.game.monsters.spawnBoss("void", pos);
              MF.game.weather.force("meteor", 240);
            },
          },
          { type: "GO_TO", text: "Escape the crater", targetPos: { x: 1120, z: 940 }, radius: 14 },
        ],
        rewards: { victory: true },
      },
    ];
  }

  MF.storyMissions = storyMissions;
})(window.MF);
