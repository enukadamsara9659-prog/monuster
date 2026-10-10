#!/usr/bin/env node
/**
 * Headless smoke test for METEORFALL.
 * Stubs just enough DOM to run world generation + factories in Node.
 * Usage: node tools/smoke_test.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const vm = require("vm");

// ---- DOM stubs ----
function makeCtx2D() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 256, height: 256 };
      if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "createRadialGradient" || k === "createLinearGradient")
        return () => ({ addColorStop: noop });
      return noop;
    },
    set() { return true; },
  });
}
function makeCanvas() {
  return {
    width: 256, height: 256,
    style: {},
    getContext: () => makeCtx2D(),
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
}
function makeElement() {
  return {
    style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    innerHTML: "", textContent: "", children: [],
    appendChild: () => {}, removeChild: () => {}, remove: () => {},
    addEventListener: () => {}, setAttribute: () => {}, disabled: false,
    getContext: () => makeCtx2D(),
  };
}

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 0),
  performance: { now: () => Date.now() },
  navigator: { getGamepads: () => [] },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  },
  document: {
    createElement: (tag) => (tag === "canvas" ? makeCanvas() : makeElement()),
    getElementById: () => makeElement(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    hidden: false,
    exitPointerLock: () => {},
    pointerLockElement: null,
  },
  window: null,
  self: null,
  THREE: null,
  MF: null,
  MF_TEXTURES: {},
  Math, JSON, Object, Array, Number, String, Boolean, Error, Date,
  Uint8Array, Uint8ClampedArray, Float32Array, Uint16Array, Uint32Array, Int32Array,
  Set, Map, Promise, Proxy, Reflect, isNaN, parseInt, parseFloat,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const ROOT = path.join(__dirname, "..");

// ---- load three.js ----
const threeSrc = fs.readFileSync(path.join(ROOT, "js/vendor/three.min.js"), "utf8");
vm.runInContext(threeSrc, sandbox, { filename: "three.min.js" });
if (!sandbox.THREE) {
  // UMD may have attached to exports instead of the global
  for (const key of Object.keys(sandbox)) {
    const v = sandbox[key];
    if (v && typeof v === "object" && v.Scene && v.Vector3) { sandbox.THREE = v; break; }
  }
}
if (!sandbox.THREE) throw new Error("failed to load THREE into sandbox");

// ---- load game files (minus AssetLoader / Game which need real DOM + WebGL) ----
const FILES = [
  "js/core/Utils.js",
  "js/core/SceneManager.js",
  "js/core/InputManager.js",
  "js/core/AudioManager.js",
  "js/core/SaveManager.js",
  "js/core/UIManager.js",
  "js/effects/ParticleSystem.js",
  "js/effects/MuzzleFlash.js",
  "js/effects/ExplosionEffect.js",
  "js/effects/PostProcessing.js",
  "js/effects/WeatherEffects.js",
  "js/effects/MeteorImpactSequence.js",
  "js/world/TerrainGenerator.js",
  "js/world/WaterSystem.js",
  "js/world/VegetationSystem.js",
  "js/world/BuildingGenerator.js",
  "js/world/MeteorCrater.js",
  "js/world/DayNightCycle.js",
  "js/world/WeatherSystem.js",
  "js/world/WorldGenerator.js",
  "js/characters/PlayerAnimator.js",
  "js/characters/PlayerCharacter.js",
  "js/characters/PlayerController.js",
  "js/characters/SquadMember.js",
  "js/characters/SquadAI.js",
  "js/characters/SquadManager.js",
  "js/characters/NPCManager.js",
  "js/combat/HealthSystem.js",
  "js/combat/DamageSystem.js",
  "js/combat/WeaponBase.js",
  "js/combat/ProjectileSystem.js",
  "js/combat/CombatEffects.js",
  "js/combat/WeaponSystem.js",
  "js/monsters/MonsterBase.js",
  "js/monsters/MonsterAI.js",
  "js/monsters/MonsterTypes.js",
  "js/monsters/BossMonster.js",
  "js/monsters/MonsterSpawner.js",
  "js/monsters/MonsterManager.js",
  "js/vehicles/VehiclePhysics.js",
  "js/vehicles/VehicleBase.js",
  "js/vehicles/VehicleSystem.js",
  "js/missions/MissionBase.js",
  "js/missions/StoryMissions.js",
  "js/missions/SideMissions.js",
  "js/missions/MissionManager.js",
  "js/ui/HUD.js",
  "js/ui/MainMenu.js",
  "js/ui/PauseMenu.js",
  "js/ui/InventoryUI.js",
  "js/ui/MapUI.js",
  "js/ui/WeaponWheel.js",
  "js/ui/SquadCommandUI.js",
  "js/ui/MissionUI.js",
];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  vm.runInContext(src, sandbox, { filename: f });
}

// ---- run smoke assertions ----
const MF = sandbox.MF;
const THREE = sandbox.THREE;
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log("  ✔ " + name);
    passed++;
  } catch (e) {
    console.log("  ✘ " + name + " — " + e.message);
    failed++;
  }
}

console.log("METEORFALL smoke test");
check("THREE loaded", () => { if (!THREE || !THREE.Scene) throw new Error("no THREE"); });

// stub runtime services
MF.assets = {
  textures: {},
  get(name) {
    if (!this.textures[name]) this.textures[name] = new THREE.Texture();
    return this.textures[name];
  },
};
MF.ui = { toast() {}, dialogue() {}, flash() {}, damageFlash() {}, showScreen() {}, hideScreen() {}, isShown: () => false };
MF.audio = { playShot() {}, playExplosion() {}, playMonster() {}, playHit() {}, playUI() {}, playReload() {}, playFootstep() {}, playThunder() {}, setMusicMode() {}, setAmbienceMood() {}, updateListener() {}, init() {}, resume() {}, volumes: { music: 0.5, sfx: 0.9 }, musicMode: "none" };
MF.input = { sensitivity: 1, actionPressed: () => false, action: () => false, actionReleased: () => false, getMoveVector: () => ({ x: 0, y: 0 }), getLookDelta: () => ({ dx: 0, dy: 0 }), mouse: { x: 0, y: 0, wheel: 0, buttons: [false, false, false] }, endFrame() {}, pressed: new Set(), keys: new Set() };

// minimal game stub
const playerPos = new THREE.Vector3(200, 20, 200);
MF.game = {
  elapsed: 0,
  player: { position: playerPos, yaw: 0, speed: 0, object3D: new THREE.Object3D() },
  health: { hp: 100, maxHp: 100, alive: true, takeDamage() {}, heal() {}, reset() {} },
  damage: { areaDamage() {}, applyToMonster() {}, computeDamage: () => 10 },
  weapons: { unlock() {}, equipByName() {}, unlocked: new Set(["ar"]), slots: ["ar"], refreshModels() {}, current: { name: "AR" } },
  monsters: { list: [], spawn() {}, spawnBoss: () => ({ isAlive: true, deathTimer: 0, name: "boss" }), countAlive: () => 0, nearestTo: () => null, onMonsterKilled() {} },
  squad: { roster: [], active: [], recruit() {}, recruitAll() {} },
  projectiles: { spawn() {} },
  particles: null,
  world: null,
  dayNight: { isNight: false },
  weather: { force() {}, current: "clear" },
  controller: { addShake() {}, addRecoil() {} },
  stats: { kills: 0, shots: 0 },
  cheatsGod: true,
  missions: null,
};

const scene = new THREE.Scene();

check("terrain bake", () => {
  const t = new MF.TerrainGenerator();
  t.bake();
  MF.terrain = t;
  const h = t.getHeight(200, 200);
  if (!isFinite(h)) throw new Error("bad height");
  if (t.getHeight(1000, 1000) >= t.getHeight(200, 200)) { /* crater should be lower than village-ish; not strict */ }
  const n = t.getNormal(500, 500);
  if (!n || Math.abs(n.length() - 1) > 0.01) throw new Error("bad normal");
  sandbox.__terrain = t;
});
check("terrain chunk geometry", () => {
  const geo = sandbox.__terrain.buildChunkGeometry(0, 0);
  if (geo.attributes.position.count < 1000) throw new Error("too few verts");
});
check("terrain minimap", () => {
  const c = sandbox.__terrain.buildMinimapCanvas();
  if (!c) throw new Error("no canvas");
});
check("water system build", () => {
  const w = new MF.WaterSystem(sandbox.__terrain, MF.assets);
  w.build(scene);
  sandbox.__water = w;
  MF.game.world = { water: w, terrain: sandbox.__terrain, discovered: new Set(), locations: [] };
  const wh = w.surfaceAt(330, 950);
  if (wh === undefined) throw new Error("no water height");
});
check("vegetation placeAll", () => {
  const v = new MF.VegetationSystem(sandbox.__terrain);
  v.placeAll();
  scene.add(v.group);
  let instances = 0;
  v.group.traverse((o) => { if (o.isInstancedMesh) instances += o.count; });
  if (instances < 500) throw new Error("too few trees: " + instances);
  console.log("      (" + instances + " tree/grass instances)");
});
check("buildings build", () => {
  const b = new MF.BuildingGenerator(sandbox.__terrain, MF.assets);
  b.build(scene);
  if (MF.colliders.length < 30) throw new Error("too few colliders: " + MF.colliders.length);
  console.log("      (" + MF.colliders.length + " colliders, " + MF.interactables.length + " interactables)");
});
check("meteor crater build", () => {
  const c = new MF.MeteorCrater(sandbox.__terrain, MF.assets);
  c.build(scene);
  c.update(0.016, { emit() {} });
});
check("day/night + weather", () => {
  const dn = new MF.DayNightCycle(scene);
  const weather = new MF.WeatherSystem();
  for (let i = 0; i < 30; i++) dn.update(0.1, new THREE.Vector3(200, 10, 200), weather);
  const wfx = new MF.WeatherEffects(scene);
  wfx.update(0.1, weather, new THREE.Vector3(200, 10, 200), { emit() {} });
  wfx.strike();
  wfx.update(0.1, weather, new THREE.Vector3(200, 10, 200), { emit() {} });
});
check("player character + animator", () => {
  const p = new MF.PlayerCharacter();
  for (let i = 0; i < 20; i++) p.update(0.016);
  p.animator.triggerFire(); p.animator.triggerReload(); p.animator.triggerDeath();
  for (let i = 0; i < 20; i++) p.update(0.016);
  sandbox.__player = p;
});
check("weapon models (all 8)", () => {
  for (const def of MF.WeaponBase.getDefs()) {
    const m = MF.WeaponBase.buildModel(def.id);
    if (!m || !m.userData.muzzle) throw new Error("bad model " + def.id);
  }
});
check("monster factories (all 7)", () => {
  const pos = new THREE.Vector3(500, sandbox.__terrain.getHeight(500, 500), 500);
  const types = ["crawler", "stalker", "brute", "screamer", "spitter", "flyer", "burrower"];
  for (const t of types) {
    const m = MF.MonsterTypes["create" + t[0].toUpperCase() + t.slice(1)](pos.clone());
    if (!m || !m.mesh || !m.hitZones.length) throw new Error("bad monster " + t);
    m.update(0.016, 0);
    m.takeDamage(10, m.position, false);
    m.update(0.016, 0.1);
  }
});
check("boss factories (all 4)", () => {
  const pos = new THREE.Vector3(1000, sandbox.__terrain.getHeight(1000, 1000), 1000);
  const bosses = [["titan", "createTitan"], ["queen", "createMeteorQueen"], ["guardian", "createAncientGuardian"], ["void", "createVoidTitan"]];
  for (const [kind, fn] of bosses) {
    const b = MF.BossFactory[fn](pos.clone());
    if (!b || !b.isBoss) throw new Error("bad boss " + kind);
  }
});
check("vehicles (all 4 types)", () => {
  for (const type of ["jeep", "motorcycle", "truck", "boat"]) {
    const v = new MF.VehicleBase(type, new THREE.Vector3(200, sandbox.__terrain.getHeight(200, 200), 200), 0);
    v.physics.update(0.016, { forward: true, backward: false, left: false, right: false, handbrake: false }, 0);
  }
});
check("squad members (all 6)", () => {
  for (let i = 0; i < 6; i++) {
    const m = new MF.SquadMember(i);
    m.setPosition(200, sandbox.__terrain.getHeight(200, 200), 200);
    m.animate(0.016, 1);
    m.takeDamage(20, m.position);
  }
});
check("missions (8 chapters parse)", () => {
  const defs = MF.storyMissions();
  if (defs.length !== 8) throw new Error("expected 8 chapters, got " + defs.length);
  for (const d of defs) {
    const m = new MF.Mission(d);
    if (!m.objectives.length) throw new Error("no objectives in " + d.id);
    m.start();
    while (m.current && m.current.type !== "BOSS_FIGHT") {
      m.advance();
      if (m.isCompleted) break;
    }
  }
  const sides = MF.sideMissions();
  if (!sides.length) throw new Error("no side missions");
});
check("noise is deterministic", () => {
  const a = MF.noise.fbm(12.3, 45.6, 4);
  const b = MF.noise.fbm(12.3, 45.6, 4);
  if (a !== b) throw new Error("noise not deterministic");
});
check("collision resolve pushes out of boxes", () => {
  MF.colliders.length = 0;
  MF.addBoxCollider(0, 10, 0, 10, 0, 10);
  const p = new THREE.Vector3(5, 2, 5);
  MF.resolveCollisions(p, 0.5, 1.7);
  if (p.x > -0.4 && p.x < 10.4 && p.z > -0.4 && p.z < 10.4) throw new Error("not pushed out");
});
check("raycastColliders hits a box", () => {
  MF.colliders.length = 0;
  MF.addBoxCollider(-2, 2, 10, 14, 0, 6);
  const r = MF.raycastColliders(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 1), 20);
  if (!isFinite(r.dist) || r.dist > 11) throw new Error("missed box, dist=" + r.dist);
});

console.log(failed === 0 ? `\nALL ${passed} SMOKE TESTS PASSED` : `\n${passed} passed, ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
