/* ============================================================
   METEORFALL — WorldGenerator.js
   Builds the whole world (terrain, water, vegetation, buildings,
   crater) and tracks discovered locations for the map UI.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const LOCATIONS = [
    { id: "haven", name: "Haven Village", x: 200, z: 200 },
    { id: "forest", name: "Ashen Forest", x: 780, z: 700 },
    { id: "lake", name: "Forest Lake", x: 760, z: 640 },
    { id: "town", name: "Riverside Town", x: 210, z: 1000 },
    { id: "bridge", name: "Broken Bridge", x: 355, z: 1000 },
    { id: "swamp", name: "Whispering Swamp", x: 300, z: 320 },
    { id: "kingdom", name: "Ancient Kingdom", x: 300, z: 1600 },
    { id: "temple", name: "Twin Temples", x: 380, z: 1630 },
    { id: "bunker", name: "Military Bunker", x: 1180, z: 1680 },
    { id: "tower", name: "Radio Tower", x: 860, z: 420 },
    { id: "crater", name: "The Deadlands", x: 1000, z: 1000 },
    { id: "mountains", name: "Dark Mountains", x: 1400, z: 1800 },
    { id: "waterfall", name: "Highland Falls", x: 585, z: 1830 },
    { id: "coast", name: "Coastal Cliffs", x: 1000, z: 80 },
    { id: "meteor", name: "Meteor Core", x: 1000, z: 1000 },
  ];

  class WorldGenerator {
    constructor(game) {
      this.game = game;
      this.discovered = new Set(["haven"]);
      this.locations = LOCATIONS;
      this.time = 0;
    }

    build(scene, assets, onProgress) {
      const steps = [];
      steps.push((cb) => {
        this.terrain = new MF.TerrainGenerator();
        this.terrain.bake();
        if (onProgress) onProgress(0.2);
        cb();
      });
      steps.push((cb) => {
        this.terrain.buildMeshes(scene, assets);
        MF.terrain = this.terrain;
        if (onProgress) onProgress(0.4);
        cb();
      });
      steps.push((cb) => {
        this.water = new MF.WaterSystem(this.terrain, assets);
        this.water.build(scene);
        if (onProgress) onProgress(0.55);
        cb();
      });
      steps.push((cb) => {
        this.vegetation = new MF.VegetationSystem(this.terrain);
        this.vegetation.placeAll();
        scene.add(this.vegetation.group);
        if (onProgress) onProgress(0.75);
        cb();
      });
      steps.push((cb) => {
        this.buildings = new MF.BuildingGenerator(this.terrain, assets);
        this.buildings.build(scene);
        if (onProgress) onProgress(0.9);
        cb();
      });
      steps.push((cb) => {
        this.crater = new MF.MeteorCrater(this.terrain, assets);
        this.crater.build(scene);
        this.minimap = this.terrain.buildMinimapCanvas();
        if (onProgress) onProgress(1);
        cb();
      });

      // run steps sequentially (keeps loading bar honest without blocking)
      let i = 0;
      const runNext = () => {
        if (i >= steps.length) return;
        steps[i++](runNext);
      };
      runNext();
    }

    update(dt, playerPos, particles) {
      this.time += dt;
      if (this.water) this.water.update(dt, playerPos, particles);
      if (this.crater) this.crater.update(dt, particles);
      if (this.vegetation && playerPos) this.vegetation.updateGrass(playerPos);
      if (this.buildings) this.buildings.update(dt, this.time, this.game.dayNight && this.game.dayNight.isNight);
      if (this.terrain && playerPos) this.terrain.updateLOD(playerPos);

      // location discovery
      if (playerPos) {
        for (const loc of this.locations) {
          if (!this.discovered.has(loc.id) && MF.dist2D(playerPos.x, playerPos.z, loc.x, loc.z) < 90) {
            this.discovered.add(loc.id);
            MF.ui.toast("Location discovered: " + loc.name);
          }
        }
      }
    }

    getSpawnPoint() {
      return new THREE.Vector3(200, this.terrain.getHeight(200, 200) + 1.4, 200);
    }
  }

  MF.WorldGenerator = WorldGenerator;
  MF.LOCATIONS = LOCATIONS;
})(window.MF);
