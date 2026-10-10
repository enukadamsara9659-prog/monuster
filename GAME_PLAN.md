# METEORFALL: THE LAST DAWN — Realistic Development Plan

> A 3D third-person open-world action survival game that runs **100% in a web browser**.
> Playable by simply opening `index.html` — no server, no npm, no build tools.

---

## 1. Reality Check (සැබෑ තත්ත්වය)

Browser games cannot match Unreal Engine 5 AAA titles. The plan below is scoped to
what WebGL + JavaScript can do **really well**:

| Feature | AAA (Unreal) | This Project (Web) | Our Realistic Target |
|---|---|---|---|
| Graphics | Photorealistic | Stylized-realistic 3D | Textured terrain, shader blending, lighting, weather, particles |
| World Size | 64 km² | 2–4 km² | **2 km × 2 km (4 km²)** island |
| Monster Count | 50+ | 15–25 | **20 active** monsters cap |
| Physics | Chaos Physics | Basic | Custom lightweight physics (gravity, heightfield, AABB) |
| File Size | 50–100 GB | 200–500 MB | **< 5 MB** (procedural + embedded textures) |
| Performance | 60 FPS GPU | 30–60 FPS | 30–60 FPS with instancing, pooling, culling |
| Platform | PC/Console | Any browser | Chrome / Firefox / Edge / Safari, desktop + basic touch |

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Rendering | **Three.js r149** (vendored UMD build) | Runs from `file://` — no CDN needed, works offline |
| Physics | **Custom mini-physics** (`Utils` + heightfield) | Cannon-es is ESM-only; a custom heightfield/AABB solver runs from `file://` reliably and covers gravity, terrain collision, projectile ballistics, vehicle arcade physics |
| Audio | **Web Audio API synthesis** | All gunshots, monsters, ambience and music generated procedurally — zero audio files |
| UI | HTML + CSS overlay (Rajdhani font) | DOM UI = crisp text, easy layout, low cost |
| Assets | Embedded base64 textures + procedural Canvas2D | `file://` blocks cross-origin image loading into WebGL; **data-URI textures always work** |
| Storage | localStorage | 10 save slots + autosave |
| Hosting | GitHub Pages / Netlify / any static host | Also runs by double-clicking `index.html` |

### Why these deviations (මොනවද වෙනස් කළේ)
1. **Vendored three.min.js instead of CDN** — the game must run offline / from `file://`.
2. **Custom physics instead of cannon-es** — cannon-es ships only ES modules which `file://` pages cannot import; our game only needs terrain height collision, AABBs and projectile arcs.
3. **Web Audio synthesis instead of Howler + audio files** — matches Phase 7 of the brief, keeps the repo tiny, and gives unlimited weapon/monster/music sounds.
4. **Embedded base64 textures instead of loose image files** — Chrome taints WebGL when `file://` pages load `file://` images; data-URIs are origin-clean and always render.

---

## 3. Asset Pipeline (Web එකෙන් assets ගෙන modify කිරීම)

The brief asks: *"find good assets on the web, copy them, and add modified variations."*

```
Web image search (grass, rock, sand, stone, bark, snow, alien…)
        │
        ├── clean, watermark-free  ──► copy into assets/textures/
        │
        └── watermarked stock previews ──► regenerate as AI textures (assets/textures/gen_*.png)
                                              │
                    ┌─────────────────────────┘
                    ▼
        PIL processing pipeline (tools/build_textures.py):
          • resize to 512×512, normalize
          • create VARIANTS: hue/tint shifts, flipped tiles, contrast copies
            (grass → grass_dry, rock → rock_dark, alien → alien_warm …)
          • export JPEG q82 → assets/textures/*.jpg
          • embed as base64 → js/core/EmbeddedTextures.js (origin-clean for WebGL)
```

Runtime also generates **procedural Canvas2D textures** (noise grass, scorch, water
caustics, UI icons) so the game still runs even if every image asset is missing
(graceful fallback).

---

## 4. Architecture & File Tree

```
meteorfall/
├── index.html                  # boot, script order, UI DOM skeleton
├── css/style.css               # HUD, menus, weapon wheel, map, damage FX
├── GAME_PLAN.md                # this file
├── README.md                   # how to run, controls, limitations
├── js/
│   ├── vendor/three.min.js     # Three.js r149 UMD (vendored)
│   ├── core/
│   │   ├── EmbeddedTextures.js # base64 texture pack (generated)
│   │   ├── Utils.js            # math, noise, pooling, easing, collision helpers
│   │   ├── AssetLoader.js      # decode textures, progress %, cache
│   │   ├── SceneManager.js     # scene graph, pooling, LOD/culling helpers
│   │   ├── InputManager.js     # keyboard/mouse/pointer-lock/gamepad/touch
│   │   ├── AudioManager.js     # Web Audio synth + dynamic music crossfade
│   │   ├── SaveManager.js      # localStorage 10 slots + autosave
│   │   ├── UIManager.js        # screen stack, notifications, fades
│   │   └── Game.js             # states, loop, system orchestration
│   ├── world/
│   │   ├── TerrainGenerator.js # 2km heightfield, regions, crater, splat shader
│   │   ├── WaterSystem.js      # ocean, river, lakes, waterfall, swimming
│   │   ├── VegetationSystem.js # 6 tree types (instanced), grass
│   │   ├── BuildingGenerator.js# village, town, ancient kingdom, bunker
│   │   ├── MeteorCrater.js     # crater, alien spires, meteor core
│   │   ├── DayNightCycle.js    # sun/moon, sky color, lighting
│   │   ├── WeatherSystem.js    # clear/rain/storm/fog/meteor-storm
│   │   └── WorldGenerator.js   # builds everything, region lookups
│   ├── characters/
│   │   ├── PlayerAnimator.js   # procedural anim state machine
│   │   ├── PlayerCharacter.js  # procedural humanoid model
│   │   ├── PlayerController.js # third-person camera + movement + interact
│   │   ├── SquadMember.js      # 6 heroes (Maya, Ryan, Elena, Arjun, Sarah, Marcus)
│   │   ├── SquadAI.js          # follow/combat/abilities/revive
│   │   ├── SquadManager.js     # active squad, formation, commands
│   │   └── NPCManager.js       # survivors, dialog, recruits
│   ├── combat/
│   │   ├── HealthSystem.js     # player health, regen, low-health FX
│   │   ├── DamageSystem.js     # falloff, headshots, damage numbers
│   │   ├── WeaponBase.js       # 6 procedural weapon models + stats
│   │   ├── ProjectileSystem.js # rockets, grenades, acid, alien bolts (pooled)
│   │   ├── CombatEffects.js    # tracers, impacts, screen shake
│   │   └── WeaponSystem.js     # 4 slots, switching, firing, reload, infinite ammo
│   ├── monsters/
│   │   ├── MonsterBase.js      # state machine, health, loot, death
│   │   ├── MonsterAI.js        # idle/patrol/chase/attack/retreat + packs
│   │   ├── MonsterTypes.js     # Crawler, Stalker, Brute, Screamer, Spitter, Flyer, Burrower
│   │   ├── BossMonster.js      # Titan + Meteor Queen + Ancient Guardian + Void Titan
│   │   ├── MonsterSpawner.js   # zone weights, caps, waves, night rules
│   │   └── MonsterManager.js   # update loop, despawn, counts
│   ├── vehicles/
│   │   ├── VehiclePhysics.js   # arcade accel/steer/friction + terrain follow
│   │   ├── VehicleBase.js      # jeep, motorcycle, truck, boat (procedural)
│   │   └── VehicleSystem.js    # enter/exit, squad boarding, damage
│   ├── missions/
│   │   ├── MissionBase.js      # objectives (GO_TO/KILL/DEFEND/INTERACT/SURVIVE/BOSS)
│   │   ├── StoryMissions.js    # 8 chapters (full storyline)
│   │   ├── SideMissions.js     # optional objectives + rewards
│   │   └── MissionManager.js   # tracking, waypoints, rewards, save data
│   ├── effects/
│   │   ├── ParticleSystem.js   # pooled billboard particles (rain, fire, dust…)
│   │   ├── MuzzleFlash.js      # barrel flash + light
│   │   ├── ExplosionEffect.js  # fire/smoke/shockwave/shake/sound
│   │   ├── WeatherEffects.js   # rain/snow/storm visuals
│   │   ├── PostProcessing.js   # CSS screen FX (vignette, flash, underwater…)
│   │   └── MeteorImpactSequence.js # scripted 30s opening (skippable)
│   └── ui/
│       ├── HUD.js  MainMenu.js  PauseMenu.js  InventoryUI.js
│       ├── MapUI.js  WeaponWheel.js  SquadCommandUI.js  MissionUI.js
├── assets/
│   ├── textures/               # source + processed textures + variants
│   └── data/                   # game data (missions, balance JSON)
└── tools/build_textures.py     # texture processing / embedding script
```

---

## 5. World Design

**Playable area:** 2000 m × 2000 m island. Coordinates X (west→east), Z (south→north).

| Region | Location | Content |
|---|---|---|
| Coastal Cliffs | south edge (z < 200) | cliffs, ocean, boats |
| Haven Village | (200, 200) | 12 houses, market, church, school — **player start** |
| Ashen Forest | east (x 500–1000) | dense trees, lake, Stalkers |
| Deadlands / Crater | center (1000, 1000) | meteor crater r=150m, alien flora, heavy spawns |
| Riverside Towns | west (x 0–500) | town, damaged bridge, docks |
| Whispering Swamp | southwest | low wet ground, murky lake, Spitters |
| Ancient Kingdom | northwest (300, 1600) | palace, 2 temples, walls, Guardian boss arena |
| Dark Mountains | north | peaks, waterfall, military bunker, Titan |

**Terrain:** 4×4 chunks (16 × 500 m), 256×256 total segments, 4-octave value-noise
heightfield (analytic `getHeight(x,z)` shared by rendering + physics), crater bowl,
river valley, mountain boost, village flattening. Splat shader blends 6 textures by
height/slope/region.

**Water:** ocean plane at y=0, river curve (mountains → sea), 2 lakes, waterfall with
mist. Swimming when the player is below water level.

---

## 6. Gameplay Systems

* **Player** — Kael Raven, third-person spring-arm camera, WASD + mouse (pointer lock),
  sprint/crouch/jump/swim, stamina, procedural animations (idle/walk/run/aim/fire/reload/death).
* **Weapons** — AR, Sniper, Shotgun, Minigun, Rocket Launcher, Meteor Blaster (+ unlockables).
  **Unlimited ammo** (reload is visual). Hitscan + projectiles, recoil, tracers, muzzle flash,
  damage falloff, 3× headshots.
* **Monsters** — 7 regular types + Titan mini-boss + 3 story bosses with phases.
  State-machine AI, pack detection, obstacle steering, night buffs.
* **Squad** — pick 3 of 6 heroes; triangle formation, combat AI, unique special abilities,
  revive loop, Q radial commands, banter lines.
* **Vehicles** — jeep, motorcycle, military truck, boat. Arcade physics, terrain following,
  running over small monsters, squad boarding (V key).
* **Missions** — 8 story chapters + side missions, 3D waypoints, objective tracking, rewards.
* **Survival layer** — day/night cycle, weather (rain/storm/fog/meteor storm), health regen,
  death/respawn, save/load (10 slots + autosave every 5 min).

---

## 7. Performance Budget

* ≤ 20 live monsters, ≤ 300 particles, ≤ 50 projectiles (all pooled)
* Trees: 1 InstancedMesh per type (~2,500 instances total), grass within 100 m only
* Terrain chunks culled beyond 900 m; shadows only on key lights with capped maps (2048)
* Delta time capped at 1/30 s; fixed physics substep 1/60 s
* Pixel ratio capped at 2; FPS counter on F1

---

## 8. Milestones (7 Phases)

| Phase | Deliverable | Status target |
|---|---|---|
| 1 | Core engine, loading screen, main menu, walking player on terrain | engine boots, NEW GAME works |
| 2 | Terrain regions, water, vegetation, buildings, crater | full 2 km world walkable |
| 3 | Player combat, 6 weapons, effects, unlimited ammo | shooting feels good |
| 4 | Monsters + AI + spawners + bosses | combat loop alive |
| 5 | Squad system + abilities + commands | squad fights with you |
| 6 | Vehicles, 8 chapters, complete UI | game completable |
| 7 | Particles, weather, audio, saves, opening sequence, polish | ship-ready |

---

## 9. Controls

| Input | Action | Input | Action |
|---|---|---|---|
| W A S D | Move | Mouse | Camera |
| Shift | Sprint | Space | Jump / swim up |
| Ctrl | Crouch | LMB | Fire |
| RMB | Aim | R | Reload (visual) |
| E | Interact / revive / enter | V | Enter / exit vehicle |
| 1–4 / scroll | Weapons | Tab (hold) | Weapon wheel |
| Q (hold) | Squad commands | M | Map |
| I | Inventory | Esc | Pause |
| F1 | FPS counter | Enter | Skip cutscene |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `file://` WebGL texture taint | base64 embedded textures + procedural fallback |
| Safari WebGL quirks | conservative shader (no exotic extensions), tested feature set |
| Performance on weak GPUs | instancing, pooling, distance caps, quality toggle in settings |
| Scope explosion | 8 chapters scripted compactly, bosses with real phases but lean arenas |
| Save corruption | schema versioning, try/catch restore, autosave ring buffer |

---

*Built with Three.js · procedurally generated world · AI-assisted development.*
