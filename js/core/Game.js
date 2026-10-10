/* ============================================================
   METEORFALL — Game.js
   Master orchestrator: renderer, game states, main loop,
   system wiring, saves, death/victory flow.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const STATE = {
    LOADING: "LOADING", MENU: "MENU", INTRO: "INTRO",
    PLAYING: "PLAYING", PAUSED: "PAUSED", DEAD: "DEAD", VICTORY: "VICTORY",
  };
  MF.STATE = STATE;

  const TIPS = [
    "Monsters are more active at night.",
    "Use squad commands (Q) to coordinate attacks.",
    "Explore ancient temples for powerful alien weapons.",
    "Vehicles can run over smaller monsters — press V to drive.",
    "Elena can heal the squad. Keep her alive.",
    "Headshots deal 3x damage — aim for the glowing parts.",
    "Press Tab to open the weapon wheel. Ammo is unlimited.",
    "The crater at the island's heart hides the source…",
  ];

  class Game {
    constructor() {
      this.state = STATE.LOADING;
      this.elapsed = 0;
      this.playTime = 0;
      this.stats = { kills: 0, shots: 0 };
      this.cheatsGod = false;
      this.autoSaveTimer = 300;
      MF.game = this;
    }

    /* ---------------- boot ---------------- */
    init() {
      // WebGL check
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
      if (!gl) {
        document.getElementById("loading-screen").innerHTML =
          '<div class="loading-box"><h2>WebGL not available</h2><p>Your browser does not support WebGL. Please use Chrome, Firefox, or Edge.</p></div>';
        return;
      }

      try {
        // renderer
        const canvas = document.getElementById("game-canvas");
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        if (THREE.sRGBEncoding !== undefined) this.renderer.outputEncoding = THREE.sRGBEncoding;

        // scene + camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 2600);
        this.camera.position.set(200, 30, 240);

        // core systems
        MF.input = new MF.InputManager();
        MF.input.attach(canvas);
        MF.audio = new MF.AudioManager();
        MF.save = new MF.SaveManager();
        MF.ui = new MF.UIManager();
        MF.ui.init();
        MF.assets = new MF.AssetLoader();
        this.sceneManager = new MF.SceneManager(this.scene);

        // effects
        MF.screenFx = new MF.PostProcessing();
      } catch (err) {
        console.error("METEORFALL engine error:", err);
        document.getElementById("loading-screen").innerHTML =
          '<div class="loading-box"><h2>Engine failed to start</h2><p>' +
          (err && err.message ? err.message : err) + "</p></div>";
        return;
      }

      // loading tips
      const tipEl = document.getElementById("loading-tip");
      let tipIdx = 0;
      if (tipEl) {
        tipEl.textContent = TIPS[0];
        setInterval(() => {
          tipIdx = (tipIdx + 1) % TIPS.length;
          if (tipEl) tipEl.textContent = TIPS[tipIdx];
        }, 3600);
      }

      // load assets then build world
      MF.assets.loadAll(
        (p) => {
          const bar = document.getElementById("loading-bar");
          if (bar) bar.style.width = Math.round(p * 100) + "%";
          const status = document.getElementById("loading-status");
          if (status) status.textContent = "Loading the world… " + Math.round(p * 100) + "%";
        },
        () => this.onAssetsLoaded()
      );

      // events
      window.addEventListener("resize", () => this.onResize());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === STATE.PLAYING) this.pause();
      });

      // Browsers only allow audio AFTER a user gesture — unlock on first click/key
      const unlockAudio = () => {
        if (this._audioUnlocked) return;
        MF.audio.init();
        MF.audio.resume();
        if (MF.audio.ctx) {
          this._audioUnlocked = true;
          MF.audio.musicMode = "none";
          MF.audio.setMusicMode("exploration");
          window.removeEventListener("pointerdown", unlockAudio);
          window.removeEventListener("keydown", unlockAudio);
        }
      };
      window.addEventListener("pointerdown", unlockAudio);
      window.addEventListener("keydown", unlockAudio);

      // start loop
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    onAssetsLoaded() {
      try {
        MF.particles = new MF.ParticleSystem(this.scene, MF.assets);
        MF.muzzle = new MF.MuzzleFlash(this.scene, MF.assets);
        MF.explosion = new MF.ExplosionEffect(this.scene);
        // expose on the game instance too (systems read MF.game.particles / .muzzle / .explosion)
        this.particles = MF.particles;
        this.muzzle = MF.muzzle;
        this.explosion = MF.explosion;

        this.world = new MF.WorldGenerator(this);
        this.world.build(this.scene, MF.assets, (p) => {
          const bar = document.getElementById("loading-bar");
          if (bar) bar.style.width = Math.round(60 + p * 40) + "%";
          const status = document.getElementById("loading-status");
          if (status) status.textContent = "Building the world… " + Math.round(60 + p * 40) + "%";
        });

        // world build steps run synchronously; finish setup
        this.setupGameplay();
        MF.ui.hideScreen("loading-screen");
        MF.ui.fadeIn(0.9);
        this.state = STATE.MENU;
        this.mainMenu.show();
        // audio starts only after the first user gesture (browser policy)
      } catch (err) {
        console.error("METEORFALL boot error:", err);
        const screen = document.getElementById("loading-screen");
        if (screen) {
          screen.innerHTML =
            '<div class="loading-box"><h2>Could not start the game</h2><p>' +
            (err && err.message ? err.message : err) +
            "</p><p>Open the browser console (F12) for details.</p></div>";
        }
      }
    }

    setupGameplay() {
      // player
      this.player = new MF.PlayerCharacter();
      const spawn = this.world.getSpawnPoint();
      this.player.position.copy(spawn);
      this.scene.add(this.player.object3D);

      this.controller = new MF.PlayerController(this.player, this.camera);
      this.dayNight = new MF.DayNightCycle(this.scene);
      this.weather = new MF.WeatherSystem();
      this.weatherFx = new MF.WeatherEffects(this.scene);

      this.health = new MF.HealthSystem();
      this.damage = new MF.DamageSystem();
      this.combat = new MF.CombatEffects(this.scene, MF.assets);
      this.weapons = new MF.WeaponSystem();
      this.weapons.refreshModels();

      this.projectiles = new MF.ProjectileSystem(this.scene);
      this.monsters = new MF.MonsterManager(this.scene);
      this.squad = new MF.SquadManager(this.scene);
      this.vehicles = new MF.VehicleSystem(this.scene);
      this.npcs = new MF.NPCManager(this.scene);
      this.missions = new MF.MissionManager(this.scene);

      this.hud = new MF.HUD();
      this.mainMenu = new MF.MainMenu();
      this.pauseMenu = new MF.PauseMenu();
      this.inventoryUI = new MF.InventoryUI();
      this.mapUI = new MF.MapUI();
      this.weaponWheel = new MF.WeaponWheel();
      this.squadWheel = new MF.SquadCommandUI();
      this.missionUI = new MF.MissionUI();
      this.intro = new MF.MeteorImpactSequence(this);

      // squad initial positions
      this.squad.active.forEach((m, i) => {
        m.setPosition(spawn.x - 2 - i * 1.5, MF.getHeight(spawn.x - 2 - i * 1.5, spawn.z - 2), spawn.z - 2);
      });
    }

    /* ---------------- game state flow ---------------- */
    newGame(plus) {
      MF.audio.resume();
      MF.ui.fadeOut(() => {
        this.mainMenu.hide();
        MF.ui.hideScreen("victory-screen");
        MF.ui.hideScreen("death-screen");
        this.stats = { kills: 0, shots: 0 };
        this.playTime = 0;
        this.health.reset();
        this.player.position.copy(this.world.getSpawnPoint());
        if (plus) {
          this.weapons.unlocked = new Set(["ar", "sniper", "shotgun", "rocket", "meteor"]);
          this.weapons.slots = ["ar", "shotgun", "rocket", "meteor"];
          this.weapons.refreshModels();
          MF.ui.toast("NEW GAME+ — monsters are stronger!");
        } else {
          this.weapons.unlocked = new Set(["ar"]);
          this.weapons.slots = ["ar", "sniper", "shotgun", "rocket"];
          this.weapons.refreshModels();
        }
        this.missions.completed = [];
        this.missions.chapter = 1;
        this.state = STATE.INTRO;
        MF.ui.showScreen("hud");
        MF.ui.fadeIn(1);
        this.intro.start();
      }, 0.5);
    }

    continueGame() {
      const data = MF.save.loadGame(0) || MF.save.loadGame(1) || (() => {
        for (let i = 2; i <= 10; i++) {
          const d = MF.save.loadGame(i);
          if (d) return d;
        }
        return null;
      })();
      if (data) this.loadFromSnapshot(data);
      else this.newGame(false);
    }

    loadFromSnapshot(data) {
      MF.ui.fadeOut(() => {
        this.mainMenu.hide();
        MF.ui.hideScreen("death-screen");
        MF.save.applySnapshot(data);
        this.state = STATE.PLAYING;
        this.intro.done = true;
        this.intro.running = false;
        MF.ui.showScreen("hud");
        MF.ui.fadeIn(0.8);
        MF.ui.toast("Game loaded.");
        MF.input.requestPointerLock();
      }, 0.4);
    }

    pause() {
      if (this.state !== STATE.PLAYING) return;
      this.state = STATE.PAUSED;
      this.pauseMenu.open();
    }
    resume() {
      if (this.state !== STATE.PAUSED && this.state !== STATE.PLAYING) {
        // resuming from inventory/map
      }
      this.state = STATE.PLAYING;
      this.pauseMenu.isOpen = false;
      MF.ui.hideScreen("pause-menu");
      MF.audio.resume();
      MF.input.requestPointerLock();
    }

    returnToMenu() {
      MF.ui.fadeOut(() => {
        MF.ui.hideScreen("pause-menu");
        MF.ui.hideScreen("death-screen");
        MF.ui.hideScreen("victory-screen");
        MF.ui.hideScreen("inventory-panel");
        MF.ui.hideScreen("map-panel");
        MF.ui.hideScreen("hud");
        MF.save.autoSave();
        this.state = STATE.MENU;
        this.mainMenu.show();
        MF.ui.fadeIn(0.7);
      }, 0.45);
    }

    onPlayerDeath() {
      if (this.state === STATE.DEAD) return;
      this.player.animator.triggerDeath();
      MF.screenFx.setDeath(true);
      MF.audio.setMusicMode("none");
      // allow squad revive window
      setTimeout(() => {
        if (!this.health.alive) {
          this.state = STATE.DEAD;
          this.missionUI.showDeath();
          MF.input.exitPointerLock();
        }
      }, 2200);
    }

    respawn() {
      this.missionUI.hideDeath();
      MF.screenFx.setDeath(false);
      this.health.reset();
      this.player.animator.state = "idle";
      this.player.animator.deathT = 0;
      this.player.rig.root.rotation.x = 0;
      this.player.position.copy(this.world.getSpawnPoint());
      this.state = STATE.PLAYING;
      MF.audio.setMusicMode("exploration");
      MF.input.requestPointerLock();
    }

    onVictory() {
      this.state = STATE.VICTORY;
      this.missionUI.showVictory({ playTime: this.playTime, kills: this.stats.kills, shots: this.stats.shots });
      MF.input.exitPointerLock();
    }

    /* ---------------- main loop ---------------- */
    gameLoop(timestamp) {
      requestAnimationFrame((t) => this.gameLoop(t));

      // belt & braces: never let a stale loading screen cover the game
      if (this.state !== STATE.LOADING && !this._loadingHidden) {
        const ls = document.getElementById("loading-screen");
        if (ls) {
          if (!ls.classList.contains("hidden")) ls.classList.add("hidden");
          this._loadingHidden = true;
        }
      }

      let dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      dt = Math.min(dt, 1 / 30);
      const rawDt = dt;
      if (this.state === STATE.PAUSED || this.state === STATE.MENU || this.state === STATE.DEAD || this.state === STATE.VICTORY) {
        dt = 0;
      }
      this.elapsed += dt;
      this.menuTime = (this.menuTime || 0) + rawDt;

      // ---- global UI keys ----
      const input = MF.input;
      if (input.pressed && this.state !== STATE.LOADING) {
        if (input.actionPressed("pause")) this.handleEscape();
        if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
          if (input.actionPressed("map")) this.mapUI.toggle();
          if (input.actionPressed("inventory")) this.inventoryUI.toggle();
          if (input.actionPressed("stats")) {
            const el = document.getElementById("fps-counter");
            if (el) el.classList.toggle("hidden");
          }
        }
        if (this.intro && this.intro.running && input.actionPressed("skip")) this.intro.skip();
        // weapon/squad wheels (hold)
        if (this.state === STATE.PLAYING) {
          if (input.action("weaponWheel") && !this.weaponWheel.active) this.weaponWheel.open();
          if (!input.action("weaponWheel") && this.weaponWheel.active) this.weaponWheel.release();
          if (input.action("squadWheel") && !this.squadWheel.active) this.squadWheel.open();
          if (!input.action("squadWheel") && this.squadWheel.active) this.squadWheel.release();
        }
        if (this.weaponWheel.active) this.weaponWheel.update();
        if (this.squadWheel.active) this.squadWheel.update();
      }

      // ---- intro sequence ----
      if (this.state === STATE.INTRO) {
        this.intro.update(dt);
        this.world.update(dt, this.player.position, MF.particles);
        this.dayNight.update(dt, this.player.position, this.weather);
        this.player.update(dt);
        MF.explosion.update(dt);
        if (this.intro.done) {
          this.state = STATE.PLAYING;
          this.missions.startChapter(1);
          MF.input.requestPointerLock();
        }
        this.renderer.render(this.scene, this.camera);
        input.endFrame();
        return;
      }

      if (dt > 0 && (this.state === STATE.PLAYING || this.state === STATE.DEAD)) {
        this.playTime += dt;

        // world + weather
        this.dayNight.update(dt, this.player.position, this.weather);
        this.weather.update(dt, this.camera.position, MF.particles, MF.ui);
        if (this.weatherFx) this.weatherFx.update(dt, this.weather, this.camera.position, MF.particles);
        MF.audio.setAmbienceMood(this.dayNight.isNight, this.weather.current === "storm");

        // player + squad + monsters
        this.controller.update(dt);
        this.player.update(dt);
        this.squad.update(dt, this.elapsed);
        this.monsters.update(dt, this.elapsed, this.player.position);
        this.vehicles.update(dt);
        this.npcs.update(dt, this.elapsed);
        this.missions.update(dt, this.elapsed);
        this.world.update(dt, this.player.position, MF.particles);

        // effects
        MF.particles.update(dt);
        MF.muzzle.update(dt);
        MF.explosion.update(dt);
        this.combat.update(dt);
        MF.screenFx.update(dt, this.controller);
        this.projectiles.update(dt);
        this.health.update(dt);

        // dynamic music
        let combatNear = false;
        let bossNear = false;
        for (const m of this.monsters.list) {
          if (!m.isAlive) continue;
          const d = MF.dist3D(m.position, this.player.position);
          if (m.isBoss && d < 120) bossNear = true;
          else if (d < 42 && (m.state === "chase" || m.state === "attack")) combatNear = true;
        }
        const wantedMode = bossNear ? "boss" : combatNear ? "combat" : "exploration";
        if (this.state === STATE.PLAYING && wantedMode !== MF.audio.musicMode) {
          MF.audio.setMusicMode(wantedMode);
        }

        // underwater FX
        if (this.world.water) {
          MF.screenFx.setUnderwater(this.world.water.isUnderwater(this.player.position));
        }
        // infected zone FX
        const craterDist = MF.dist2D(this.player.position.x, this.player.position.z, this.world.terrain.crater.x, this.world.terrain.crater.z);
        MF.screenFx.setInfected(craterDist < 230);

        // autosave
        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) {
          this.autoSaveTimer = 300;
          MF.save.autoSave();
          MF.ui.toast("Autosaved.");
        }

        // HUD
        this.hud.update(dt);
        if (this.mainMenu.visible) this.mainMenu.update(dt);
      } else if (this.state === STATE.MENU) {
        // slow camera orbit over the island for the menu background
        const t = (this.menuTime || 0) * 0.08;
        this.camera.position.set(1000 + Math.cos(t) * 620, 260 + Math.sin(t * 0.6) * 60, 1000 + Math.sin(t) * 620);
        this.camera.lookAt(1000, 40, 1000);
        this.dayNight && this.dayNight.update(dt, this.camera.position, this.weather);
        MF.particles && MF.particles.update(1 / 60);
        if (this.mainMenu) this.mainMenu.update(1 / 60);
      }

      this.renderer.render(this.scene, this.camera);
      input.endFrame();
    }

    handleEscape() {
      if (this.intro && this.intro.running) {
        this.intro.skip();
        return;
      }
      if (MF.ui.isShown("map-panel")) { this.mapUI.close(); return; }
      if (MF.ui.isShown("inventory-panel")) { this.inventoryUI.close(); return; }
      if (MF.ui.isShown("settings-panel")) { MF.ui.hideScreen("settings-panel"); return; }
      if (MF.ui.isShown("save-load-panel")) { MF.ui.hideScreen("save-load-panel"); return; }
      if (this.state === STATE.PLAYING) this.pause();
      else if (this.state === STATE.PAUSED) this.resume();
    }

    onResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  /* ---------------- boot on load ---------------- */
  window.addEventListener("load", () => {
    const game = new Game();
    game.init();
  });
})();
