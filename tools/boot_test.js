#!/usr/bin/env node
/**
 * Headless BOOT test for METEORFALL.
 * Boots the FULL game (renderer stubbed) through:
 *   loading -> main menu -> new game -> intro -> gameplay -> combat
 * Asserts the loading screen is hidden and no runtime errors occur.
 * Usage: node tools/boot_test.js
 */
"use strict";
const path = require("path");
const fs = require("fs");
const vm = require("vm");

// ---------- rich DOM stubs ----------
function makeCtx2D() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 256, height: 256 };
      if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === "measureText") return () => ({ width: 10 });
      if (k === "createRadialGradient" || k === "createLinearGradient") return () => ({ addColorStop: noop });
      return noop;
    },
    set() { return true; },
  });
}
function makeClassList() {
  const set = new Set();
  return {
    add: (...cs) => cs.forEach((c) => set.add(c)),
    remove: (...cs) => cs.forEach((c) => set.delete(c)),
    toggle: (c, force) => {
      const on = force !== undefined ? force : !set.has(c);
      if (on) set.add(c); else set.delete(c);
      return on;
    },
    contains: (c) => set.has(c),
    _set: set,
  };
}
function makeElement(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    style: {},
    classList: makeClassList(),
    className: "",
    innerHTML: "",
    textContent: "",
    value: "50",
    disabled: false,
    children: [],
    dataset: {},
    width: 256,
    height: 256,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    getContext: () => makeCtx2D(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    querySelector: () => makeElement("div"),
    querySelectorAll: () => [],
  };
  return el;
}

const elementsById = {};
const windowListeners = {};
const documentListeners = {};
const rafQueue = [];
let now = 0;

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
  performance: { now: () => now },
  navigator: { getGamepads: () => [] },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  },
  document: {
    createElement: (tag) => makeElement(tag),
    createElementNS: (ns, tag) => makeElement(tag),
    getElementById: (id) => {
      if (!elementsById[id]) elementsById[id] = makeElement("div");
      return elementsById[id];
    },
    querySelectorAll: () => [],
    addEventListener: (ev, fn) => { (documentListeners[ev] = documentListeners[ev] || []).push(fn); },
    hidden: false,
    exitPointerLock: () => {},
    pointerLockElement: null,
  },
  window: null,
  self: null,
  THREE: null,
  MF: null,
  MF_TEXTURES: {},
  Math, JSON, Object, Array, Number, String, Boolean, Error, Date, RegExp,
  Uint8Array, Uint8ClampedArray, Float32Array, Uint16Array, Uint32Array, Int32Array,
  Set, Map, WeakMap, Promise, Proxy, Reflect, isNaN, parseInt, parseFloat, Infinity, NaN,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.innerWidth = 1280;
sandbox.innerHeight = 720;
sandbox.addEventListener = (ev, fn) => { (windowListeners[ev] = windowListeners[ev] || []).push(fn); };
sandbox.removeEventListener = () => {};
vm.createContext(sandbox);

const ROOT = path.join(__dirname, "..");

// ---------- load three ----------
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/vendor/three.min.js"), "utf8"), sandbox, { filename: "three.min.js" });
if (!sandbox.THREE) {
  for (const key of Object.keys(sandbox)) {
    const v = sandbox[key];
    if (v && typeof v === "object" && v.Scene && v.Vector3) { sandbox.THREE = v; break; }
  }
}
const THREE = sandbox.THREE;
if (!THREE) throw new Error("THREE failed to load");

// stub the GPU + image loading BEFORE game code runs
THREE.WebGLRenderer = class WebGLRendererStub {
  constructor() { this.shadowMap = { enabled: false, type: 0 }; this.domElement = makeElement("canvas"); }
  setSize() {} setPixelRatio() {} render() {}
};
THREE.TextureLoader.prototype.load = function (url, onLoad) {
  const tex = new THREE.Texture();
  if (onLoad) onLoad(tex);
  return tex;
};

// ---------- load ALL game files (including AssetLoader + Game) ----------
const FILES = [
  "js/core/EmbeddedTextures.js",
  "js/core/Utils.js",
  "js/core/AssetLoader.js",
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
  "js/core/Game.js",
];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}

// ---------- run ----------
const MF = sandbox.MF;
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); console.log("  ✔ " + name); passed++; }
  catch (e) { console.log("  ✘ " + name + " — " + e.message); failed++; }
}
function pumpFrames(n, msPerFrame) {
  for (let i = 0; i < n; i++) {
    now += msPerFrame || 16;
    const queue = rafQueue.splice(0, rafQueue.length);
    for (const cb of queue) cb(now);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

console.log("METEORFALL boot test");

check("window load -> engine init", () => {
  const loads = windowListeners["load"] || [];
  assert(loads.length > 0, "no load listener registered");
  loads.forEach((fn) => fn());
});

check("assets load + world build complete", () => {
  assert(MF.game, "game instance missing");
  assert(MF.game.world && MF.game.world.terrain, "world not built");
  assert(MF.game.player, "player not created");
  assert(MF.game.missions, "missions not created");
});

check("loading screen hidden + MAIN MENU shown", () => {
  const loading = elementsById["loading-screen"];
  assert(loading.classList.contains("hidden"), "LOADING SCREEN STILL VISIBLE — game would look stuck!");
  assert(MF.game.state === "MENU", "state is " + MF.game.state + ", expected MENU");
});

check("game loop runs in MENU without errors", () => {
  pumpFrames(20);
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  check("NEW GAME starts the intro sequence", () => {
    MF.game.newGame(false);
  });
  await sleep(700); // fadeOut callback
  check("intro sequence is running", () => {
    assert(MF.game.state === "INTRO", "state is " + MF.game.state + ", expected INTRO");
    pumpFrames(30);
  });

  check("skip intro -> PLAYING + chapter 1 starts", () => {
    MF.game.intro.skip();
    pumpFrames(5);
    assert(MF.game.state === "PLAYING", "state is " + MF.game.state + ", expected PLAYING");
    assert(MF.game.missions.active, "no active mission");
    assert(MF.game.missions.chapter === 1, "chapter is " + MF.game.missions.chapter);
  });

  check("gameplay: movement + 240 frames without errors", () => {
    MF.input.getMoveVector = () => ({ x: 0.2, y: 1 });
    MF.input.action = (name) => name === "sprint";
    const start = MF.game.player.position.clone();
    pumpFrames(240);
    const moved = MF.game.player.position.distanceTo(start);
    assert(moved > 1, "player did not move (moved " + moved.toFixed(2) + "m)");
  });

  check("gameplay: combat (spawn monsters + fire weapons)", () => {
    const p = MF.game.player.position;
    const spawnPos = new THREE.Vector3(p.x + 8, MF.getHeight(p.x + 8, p.z), p.z + 8);
    MF.game.monsters.spawn("crawler", spawnPos.clone());
    MF.game.monsters.spawn("brute", spawnPos.clone());
    MF.game.monsters.spawnBoss("titan", new THREE.Vector3(p.x + 30, MF.getHeight(p.x + 30, p.z + 30), p.z + 30));
    MF.input.action = (name) => name === "fire";
    MF.input.actionPressed = (name) => name === "fire" || name === "weapon2";
    pumpFrames(120);
    assert(MF.game.stats.shots > 0, "no shots fired");
  });

  check("gameplay: take damage + health regen path", () => {
    MF.game.health.takeDamage(30, MF.game.player.position);
    assert(MF.game.health.hp < 100, "damage not applied");
    pumpFrames(30);
  });

  check("gameplay: vehicles + map + wheels + save/load", () => {
    MF.game.vehicles.tryToggleVehicle();
    pumpFrames(30);
    MF.game.vehicles.tryToggleVehicle();
    MF.game.mapUI.draw();
    MF.save.saveGame(1);
    const data = MF.save.loadGame(1);
    assert(data && data.playerPosition, "save/load broken");
    MF.game.hud.update(0.016);
    MF.game.missions.update(0.016, 1);
  });

  check("600 mixed frames (long-run stability)", () => {
    MF.input.action = () => false;
    pumpFrames(600);
    assert(MF.game.state === "PLAYING", "unexpected state " + MF.game.state);
    assert(MF.game.monsters.list.length >= 0, "monster list broken");
  });

  console.log(failed === 0 ? `\nALL ${passed} BOOT TESTS PASSED` : `\n${passed} passed, ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
