# 🌑 METEORFALL: THE LAST DAWN

A 3D third-person open-world action survival game that runs **entirely in a web browser**.
A meteor has shattered the sky over Ashen Island. Alien monsters spread across the land.
You are **Kael Raven** — build your squad, take up unlimited-ammo weapons, and fight
through 8 story chapters from Haven Village to the heart of the meteor itself.

![Tech](https://img.shields.io/badge/Three.js-r149-blue) ![Physics](https://img.shields.io/badge/physics-custom-green) ![Audio](https://img.shields.io/badge/audio-Web%20Audio-orange)

---

## ▶️ How to Run

**Option A — just open it (no server needed):**
```
Double-click index.html  →  opens in your browser. Done.
```

**Option B — local server (recommended for best performance):**
```bash
cd meteorfall
python3 -m http.server 8000
# open http://localhost:8000
```

No npm, no build tools, no internet required (Three.js is vendored, textures are embedded).

Then: **NEW GAME** → play through the opening meteor sequence (press `Enter` to skip) → survive.

---

## 🎮 Controls

| Input | Action | Input | Action |
|---|---|---|---|
| **W A S D** | Move | **Mouse** | Camera |
| **Shift** | Sprint | **Space** | Jump / swim / handbrake |
| **Ctrl / C** | Crouch | **LMB** | Fire (unlimited ammo) |
| **RMB** | Aim down sights | **R** | Reload (visual only) |
| **E** | Interact / revive / loot | **V** | Enter / exit vehicle |
| **1 – 4 / Scroll** | Select weapon | **Tab** *(hold)* | Weapon wheel |
| **Q** *(hold)* | Squad command wheel | **M** | World map (click = fast travel) |
| **I** | Inventory / weapons | **Esc** | Pause |
| **F1** | FPS / stats overlay | **Enter** | Skip cutscene |

---

## 🗺️ Features

* **2 km × 2 km open world** — 8 named regions: Haven Village, Ashen Forest,
  Deadlands crater, Riverside Towns, Whispering Swamp, Ancient Kingdom,
  Dark Mountains, Coastal Cliffs
* **Procedural everything** — terrain (4-octave Perlin + crater + river valley),
  6 tree types (~5,000 instanced trees), buildings, roads, palace, temples, bunker
* **Full combat loop** — 8 weapons (AR, sniper, shotgun, minigun, rocket launcher,
  Meteor Blaster, Gravity Rifle, Void Cannon), hitscan + projectiles, tracers,
  muzzle flash, explosions, damage numbers, 3× headshots, distance falloff
* **11 enemy types** — Crawler, Stalker, Brute, Screamer, Spitter, Flyer,
  Burrower + Titan mini-boss + 3 multi-phase bosses (Meteor Queen,
  Ancient Guardian, Void Titan)
* **Squad system** — 6 heroes (Maya, Ryan, Elena, Arjun, Sarah, Marcus) with
  unique abilities (heal, turret, war cry, scan, mark, airstrike), formations,
  Q-wheel commands, revive loop, banter
* **4 vehicles** — jeep, motorcycle, military truck, boat (arcade physics,
  run over small monsters)
* **8 story chapters** + side missions, 3D waypoints, rewards, victory + New Game+
* **Living world** — day/night cycle, weather (rain / thunderstorm / fog /
  meteor storm), procedural Web Audio (weapons, monsters, ambience, dynamic
  exploration/combat/boss music)
* **Full UI** — HUD, minimap, world map with fast travel, weapon wheel,
  squad wheel, inventory, save/load (10 slots + autosave), settings,
  death & victory screens
* **Save system** — localStorage, autosave every 5 minutes and on mission complete

---

## 🧩 Technology & Design Choices

| Layer | Choice | Why |
|---|---|---|
| Rendering | Three.js r149 (vendored UMD) | Works from `file://`, offline, no build step |
| Physics | Custom heightfield + AABB solver | Cannon-es is ESM-only (breaks `file://`); the game needs gravity, terrain collision, projectile ballistics — all included |
| Audio | Web Audio API synthesis | Zero audio files; every gunshot/roar/track is generated |
| Textures | Base64-embedded JPEG + procedural Canvas2D | Chrome taints WebGL when `file://` pages load local images; data-URIs always render |

---

## 🎨 Assets

Asset pipeline (see `tools/build_textures.py` and `GAME_PLAN.md`):

1. **Web-sourced** — seamless grass texture (copied into `assets/textures/web_grass_source.jpg`)
2. **AI-generated replacements** — stock previews carried watermarks, so clean
   tileable textures were generated (stone, rock, dirt, sand, snow, alien, wall,
   roof, bark, metal)
3. **Modified variants** — copied + deliberately altered (tint / contrast / flip):
   `grass_dry`, `grass_swamp`, `rock_dark`, `sand_wet`, `alien_warm`,
   `wall_scorched`, `stone_mossy`, `metal_rusty`
4. All runtime textures are packed into `js/core/EmbeddedTextures.js` as data-URIs

---

## 🖥️ Browser Requirements

* Chrome, Firefox, Edge, or Safari (desktop). WebGL required — a clear error
  message appears otherwise.
* Recommended: any GPU from the last ~8 years. The game targets 30–60 FPS with
  distance culling, instancing, and pooled particles.
* Basic touch controls are included for mobile browsers; gamepads are supported.

---

## 📁 Project Structure

```
index.html              boot + UI DOM + script order
css/style.css           HUD / menus / wheels / overlays
js/vendor/three.min.js  Three.js r149
js/core/                engine (loop, input, audio, save, UI, assets, utils)
js/world/               terrain, water, vegetation, buildings, crater, weather, day/night
js/characters/          player, animator, controller, squad, NPCs
js/combat/              weapons, projectiles, damage, health, effects
js/monsters/            7 monster types, 4 bosses, AI, spawner
js/vehicles/            jeep, motorcycle, truck, boat
js/missions/            8 story chapters + side missions
js/effects/             particles, explosions, muzzle flash, weather FX, opening sequence
js/ui/                  HUD, menus, map, wheels, mission UI
assets/textures/        source + variant textures
tools/build_textures.py texture processing / embedding
tools/smoke_test.js     headless Node smoke test (node tools/smoke_test.js)
GAME_PLAN.md            full development plan
```

---

## ⚠️ Known Limitations

* Graphics are **stylized-realistic**, not photorealistic — browser WebGL budget.
* Physics is arcade-style (no rigid-body stacking or ragdolls).
* Building interiors are simple rooms; doors animate but buildings are not fully enterable floor plans.
* Boss phases are real but arenas are open-world spaces rather than bespoke dungeons.
* `file://` mode works, but a local static server gives the smoothest asset loading.
* Save data lives in the browser profile — clearing site data clears saves.

---

*Created with Three.js · procedurally generated world · AI-assisted development.*
