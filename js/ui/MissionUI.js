/* ============================================================
   METEORFALL — MissionUI.js
   Chapter title cards, mission-complete screen, death and
   victory screens.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class MissionUI {
    showTitleCard(chapter, title, description) {
      const card = document.getElementById("title-card");
      if (!card) return;
      card.innerHTML = `
        <div class="tc-chapter">${chapter}</div>
        <div class="tc-title">${title}</div>
        <div class="tc-desc">${description || ""}</div>`;
      card.classList.add("show");
      clearTimeout(this._tcTimer);
      this._tcTimer = setTimeout(() => card.classList.remove("show"), 4200);
    }

    showMissionComplete(mission) {
      const el = document.getElementById("mission-complete");
      if (!el) return;
      const rewards = [];
      const r = mission.rewards || {};
      if (r.weapon) rewards.push("Weapon: " + MF.WeaponBase.getDef(r.weapon).name);
      if (r.recruit) rewards.push("Recruit: " + r.recruit);
      if (r.recruitAll) rewards.push("Full squad assembled");
      if (r.heal) rewards.push("+" + r.heal + " HP");
      if (r.victory) rewards.push("The island is saved");
      el.innerHTML = `
        <div class="mc-title">MISSION COMPLETE</div>
        <div class="mc-mission">${mission.title}</div>
        <ul class="mc-objectives">
          ${mission.objectives.map((o) => `<li class="done">✔ ${o.text}</li>`).join("")}
        </ul>
        <div class="mc-rewards">${rewards.map((x) => `<span class="mc-chip">${x}</span>`).join("")}</div>`;
      el.classList.add("show");
      clearTimeout(this._mcTimer);
      this._mcTimer = setTimeout(() => el.classList.remove("show"), 5200);
    }

    showDeath() {
      MF.ui.showScreen("death-screen");
    }
    hideDeath() {
      MF.ui.hideScreen("death-screen");
    }

    showVictory(stats) {
      const el = document.getElementById("victory-screen");
      if (!el) return;
      const t = document.getElementById("victory-stats");
      if (t) {
        t.innerHTML = `Play time: <b>${MF.fmtTime(stats.playTime || 0)}</b> · Monsters killed: <b>${stats.kills || 0}</b> · Shots fired: <b>${stats.shots || 0}</b>`;
      }
      MF.ui.showScreen("victory-screen");
      MF.audio.setMusicMode("exploration");
    }
  }

  MF.MissionUI = MissionUI;
})(window.MF);
