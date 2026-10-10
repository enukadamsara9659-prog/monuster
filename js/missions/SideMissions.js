/* ============================================================
   METEORFALL — SideMissions.js
   Optional objectives with bonus rewards.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  function sideMissions() {
    return [
      {
        id: "side_nests", chapter: 0,
        title: "Exterminate",
        description: "Destroy the creature nests before they multiply.",
        objectives: [
          { type: "KILL", text: "Kill 15 monsters anywhere", targetCount: 15 },
          { type: "GO_TO", text: "Report back to Haven Village", targetPos: { x: 200, z: 200 }, radius: 8 },
        ],
        rewards: { heal: 40 },
      },
      {
        id: "side_scavenge", chapter: 0,
        title: "Scavenger Run",
        description: "Supply caches are scattered across the island.",
        objectives: [
          { type: "GO_TO", text: "Search the Riverside docks", targetPos: { x: 300, z: 1060 }, radius: 10 },
          { type: "GO_TO", text: "Search the swamp lake", targetPos: { x: 300, z: 320 }, radius: 12 },
          { type: "GO_TO", text: "Search the waterfall base", targetPos: { x: 585, z: 1830 }, radius: 12 },
        ],
        rewards: { weapon: "meteor" },
      },
      {
        id: "side_hunt", chapter: 0,
        title: "Big Game",
        description: "The Brutes are getting bold. Thin their numbers.",
        objectives: [
          { type: "KILL", text: "Kill 4 Brutes", targetCount: 4, killType: "brute" },
        ],
        rewards: { heal: 60 },
      },
    ];
  }

  MF.sideMissions = sideMissions;
})(window.MF);
