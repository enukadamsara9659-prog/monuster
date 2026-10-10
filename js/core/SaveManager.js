/* ============================================================
   METEORFALL — SaveManager.js
   localStorage saves: 10 manual slots + 1 autosave (slot 0).
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;
  const PREFIX = "meteorfall_save_";

  class SaveManager {
    constructor() {
      this.slots = 10;
      this.schema = 1;
    }

    buildSnapshot() {
      const g = MF.game;
      if (!g || !g.player) return null;
      const p = g.player;
      return {
        schema: this.schema,
        timestamp: new Date().toISOString(),
        playTime: g.playTime || 0,
        chapter: g.missions ? g.missions.chapter : 1,
        playerPosition: { x: p.position.x, y: p.position.y, z: p.position.z },
        playerHealth: g.health ? g.health.hp : 100,
        playerRotation: p.yaw || 0,
        equippedWeapons: g.weapons ? g.weapons.slots.slice() : ["ar"],
        currentWeaponIndex: g.weapons ? g.weapons.currentIndex : 0,
        unlockedWeapons: g.weapons ? Array.from(g.weapons.unlocked) : ["ar"],
        squadMembers: g.squad
          ? g.squad.roster.map((m) => ({ name: m.name, health: m.health, isActive: m.isActive, isAlive: m.isAlive }))
          : [],
        completedMissions: g.missions ? g.missions.completed.slice() : [],
        currentMission: g.missions && g.missions.active
          ? { id: g.missions.active.id, objectiveIndex: g.missions.active.objectiveIndex, counts: g.missions.active.objectives.map((o) => o.currentCount) }
          : null,
        discoveredLocations: g.world ? Array.from(g.world.discovered) : [],
        worldTime: g.dayNight ? g.dayNight.timeOfDay : 12,
        settings: {
          musicVolume: MF.audio ? MF.audio.volumes.music : 0.5,
          sfxVolume: MF.audio ? MF.audio.volumes.sfx : 0.9,
          mouseSensitivity: MF.input ? MF.input.sensitivity : 1,
        },
        stats: g.stats || { kills: 0, shots: 0 },
      };
    }

    saveGame(slot) {
      try {
        const snap = this.buildSnapshot();
        if (!snap) return false;
        localStorage.setItem(PREFIX + slot, JSON.stringify(snap));
        return true;
      } catch (e) {
        console.warn("Save failed", e);
        return false;
      }
    }

    loadGame(slot) {
      try {
        const raw = localStorage.getItem(PREFIX + slot);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Load failed", e);
        return null;
      }
    }

    applySnapshot(data) {
      const g = MF.game;
      if (!g || !data) return false;
      g.playTime = data.playTime || 0;
      if (g.health) g.health.hp = data.playerHealth || 100;
      if (g.player) {
        g.player.position.set(data.playerPosition.x, data.playerPosition.y, data.playerPosition.z);
        g.player.yaw = data.playerRotation || 0;
      }
      if (g.weapons) {
        g.weapons.unlocked = new Set(data.unlockedWeapons || ["ar"]);
        g.weapons.slots = (data.equippedWeapons || ["ar"]).slice(0, 4);
        g.weapons.currentIndex = data.currentWeaponIndex || 0;
        g.weapons.refreshModels();
      }
      if (g.squad && data.squadMembers) {
        data.squadMembers.forEach((s) => {
          const m = g.squad.roster.find((r) => r.name === s.name);
          if (m) { m.health = s.health; m.isActive = s.isActive; m.isAlive = s.isAlive; }
        });
        g.squad.syncActive();
      }
      if (g.missions) {
        g.missions.completed = (data.completedMissions || []).slice();
        if (data.currentMission) g.missions.startById(data.currentMission.id, data.currentMission);
        else g.missions.advanceChapter();
      }
      if (g.world && data.discoveredLocations) {
        g.world.discovered = new Set(data.discoveredLocations);
      }
      if (g.dayNight) g.dayNight.timeOfDay = data.worldTime || 12;
      if (data.settings) {
        if (MF.audio) {
          MF.audio.setVolume("music", data.settings.musicVolume);
          MF.audio.setVolume("sfx", data.settings.sfxVolume);
        }
        if (MF.input) MF.input.sensitivity = data.settings.mouseSensitivity || 1;
      }
      if (data.stats) g.stats = data.stats;
      return true;
    }

    autoSave() {
      this.saveGame(0);
    }

    deleteSave(slot) {
      try { localStorage.removeItem(PREFIX + slot); } catch (e) {}
    }

    hasSave(slot) {
      try { return !!localStorage.getItem(PREFIX + slot); } catch (e) { return false; }
    }

    getSaveInfo(slot) {
      const data = this.loadGame(slot);
      if (!data) return null;
      return {
        slot,
        timestamp: data.timestamp,
        playTime: data.playTime,
        chapter: data.chapter,
        missionId: data.currentMission ? data.currentMission.id : null,
      };
    }

    anySaveExists() {
      for (let i = 0; i <= this.slots; i++) if (this.hasSave(i)) return true;
      return false;
    }
  }

  MF.SaveManager = SaveManager;
})();
