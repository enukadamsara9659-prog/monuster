/* ============================================================
   METEORFALL — BuildingGenerator.js
   Procedural buildings: Haven Village, Riverside Town, Ancient
   Kingdom, military bunker. Interactable doors + interiors,
   roads, fences, market, church, palace, temple, bridge, docks.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class BuildingGenerator {
    constructor(terrain, assets) {
      this.terrain = terrain;
      this.assets = assets;
      this.group = new THREE.Group();
      this.group.name = "buildings";
      this.doors = [];
      this.lights = [];
      this.lootSpots = [];
    }

    mat(name, repeat, opts) {
      const tex = this.assets.get(name, repeat || 2);
      return new THREE.MeshStandardMaterial(Object.assign({
        map: tex, roughness: 0.92, metalness: 0.04,
      }, opts || {}));
    }

    /* =============== building factories =============== */
    makeHouse(x, z, rotY, destroyed) {
      const g = new THREE.Group();
      const wallMat = this.mat(destroyed ? "wall_scorched" : "wall", 2);
      const roofMat = this.mat(destroyed ? "wall_scorched" : "roof", 2);
      const woodMat = this.mat("wood", 1);
      const w = 6, d = 5, h = 3.4;

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      body.position.y = h / 2;
      body.castShadow = true; body.receiveShadow = true;
      g.add(body);

      if (destroyed) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.15, 0.35, d * 0.75), roofMat);
        roof.position.set(-0.6, h + 0.55, -0.5);
        roof.rotation.z = 0.28;
        roof.castShadow = true;
        g.add(roof);
        for (let i = 0; i < 5; i++) {
          const deb = new THREE.Mesh(new THREE.BoxGeometry(MF.randRange(0.4, 1.1), MF.randRange(0.3, 0.7), MF.randRange(0.4, 1)), wallMat);
          deb.position.set(MF.randRange(-w, w) * 0.7, 0.25, MF.randRange(-d, d) * 0.9);
          deb.rotation.y = MF.rand() * Math.PI;
          g.add(deb);
        }
      } else {
        // pitched roof from two slabs
        const slab1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, 0.28, d * 0.62), roofMat);
        slab1.position.set(0, h + 1.05, d * 0.24);
        slab1.rotation.x = -0.62;
        const slab2 = slab1.clone();
        slab2.position.z = -d * 0.24;
        slab2.rotation.x = 0.62;
        slab1.castShadow = slab2.castShadow = true;
        g.add(slab1, slab2);

        // windows
        const winMat = new THREE.MeshStandardMaterial({
          color: 0x9fc4d8, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.2,
        });
        for (const wx of [-w * 0.28, w * 0.28]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.12), winMat);
          win.position.set(wx, h * 0.55, d / 2 + 0.02);
          g.add(win);
          this.lights.push(win);
        }

        // door (interactable)
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.15, 0.14), woodMat);
        door.position.set(0, 1.08, d / 2 + 0.06);
        door.geometry.translate(0.575, 0, 0); // hinge pivot at left edge
        door.position.x -= 0.575;
        g.add(door);
        this.doors.push(door);
      }

      g.position.set(x, this.terrain.getHeight(x, z) - 0.15, z);
      g.rotation.y = rotY;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.15);
      return g;
    }

    makeLargeBuilding(x, z, rotY, kind) {
      const g = new THREE.Group();
      const wallMat = this.mat(kind === "church" ? "stone" : "wall", 3);
      const roofMat = this.mat("roof", 3);
      const w = 12, d = 8, h = kind === "church" ? 6.5 : 5;

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      body.position.y = h / 2;
      body.castShadow = true; body.receiveShadow = true;
      g.add(body);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.4, d * 1.1), roofMat);
      roof.position.y = h + 0.9;
      roof.rotation.x = 0.24;
      roof.castShadow = true;
      g.add(roof);

      if (kind === "church") {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 3), wallMat);
        tower.position.set(0, 6, -d * 0.28);
        tower.castShadow = true;
        g.add(tower);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 4), roofMat);
        spire.position.set(0, 14.2, -d * 0.28);
        spire.rotation.y = Math.PI / 4;
        spire.castShadow = true;
        g.add(spire);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.22), roofMat);
        cross.position.set(0, 17.3, -d * 0.28);
        g.add(cross);
      }

      // sign / banner
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.18), this.mat("wood", 1));
      sign.position.set(0, h - 0.6, d / 2 + 0.15);
      g.add(sign);

      // door
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 0.16), this.mat("wood", 1));
      door.position.set(0, 1.25, d / 2 + 0.08);
      door.geometry.translate(0.8, 0, 0);
      door.position.x -= 0.8;
      g.add(door);
      this.doors.push(door);

      g.position.set(x, this.terrain.getHeight(x, z) - 0.15, z);
      g.rotation.y = rotY;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.2);
      return g;
    }

    makeBunker(x, z, rotY) {
      const g = new THREE.Group();
      const conc = this.mat("metal", 2, { color: 0x8a8f8a, roughness: 0.95 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 10), conc);
      body.position.y = 1.2;
      body.castShadow = true; body.receiveShadow = true;
      g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.7, 11), conc);
      roof.position.y = 3.4;
      g.add(roof);
      // antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 5), conc);
      ant.position.set(3, 6.5, -3);
      g.add(ant);
      // sandbags
      const sandMat = this.mat("dirt", 1);
      for (let i = 0; i < 10; i++) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.7), sandMat);
        bag.position.set(-4.5 + i * 1.0, 0.35, 6.2 + Math.sin(i) * 0.4);
        bag.rotation.y = MF.randRange(-0.3, 0.3);
        g.add(bag);
      }
      // heavy door
      const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 0.3), conc);
      door.position.set(0, 1.3, 5.1);
      door.geometry.translate(1, 0, 0);
      door.position.x -= 1;
      g.add(door);
      this.doors.push(door);

      g.position.set(x, this.terrain.getHeight(x, z) - 1.2, z);
      g.rotation.y = rotY;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.3);
      return g;
    }

    makeTemple(x, z, rotY) {
      const g = new THREE.Group();
      const stone = this.mat("stone", 4);
      const moss = this.mat("stone_mossy", 3);

      // steps
      for (let i = 0; i < 4; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(20 - i * 2.2, 0.7, 15 - i * 1.8), stone);
        step.position.y = i * 0.7;
        step.receiveShadow = true;
        g.add(step);
      }
      const baseY = 2.8;
      const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 10), moss);
      hall.position.y = baseY + 4.5;
      hall.castShadow = true; hall.receiveShadow = true;
      g.add(hall);

      // columns
      for (const cx of [-5.5, -1.8, 1.8, 5.5]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1, 9, 10), stone);
        col.position.set(cx, baseY + 4.5, 5.6);
        col.castShadow = true;
        g.add(col);
      }
      // roof slab
      const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 1.1, 13), stone);
      roof.position.y = baseY + 9.6;
      roof.castShadow = true;
      g.add(roof);
      // altar glow inside
      const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.6), moss);
      altar.position.set(0, baseY + 0.7, -1);
      g.add(altar);
      const glow = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.7, 1),
        new THREE.MeshStandardMaterial({ color: 0x6ad0ff, emissive: 0x3aa0ff, emissiveIntensity: 1.4 })
      );
      glow.position.set(0, baseY + 2.1, -1);
      g.add(glow);
      const light = new THREE.PointLight(0x66c0ff, 1.4, 30, 2);
      light.position.copy(glow.position);
      g.add(light);

      g.position.set(x, this.terrain.getHeight(x, z) - 0.3, z);
      g.rotation.y = rotY;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.4);
      return g;
    }

    makePalace(x, z, rotY) {
      const g = new THREE.Group();
      const stone = this.mat("stone", 5);
      const wallMat = this.mat("wall", 4);

      const main = new THREE.Mesh(new THREE.BoxGeometry(36, 18, 26), wallMat);
      main.position.y = 9;
      main.castShadow = true; main.receiveShadow = true;
      g.add(main);

      // corner towers
      for (const [tx, tz] of [[-18, -13], [18, -13], [-18, 13], [18, 13]]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 24, 10), stone);
        tower.position.set(tx, 12, tz);
        tower.castShadow = true;
        g.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(5, 6, 10), this.mat("roof", 2));
        cap.position.set(tx, 27, tz);
        cap.castShadow = true;
        g.add(cap);
      }

      // grand staircase
      for (let i = 0; i < 6; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(16 + i * 1.4, 0.8, 2.2), stone);
        step.position.set(0, 0.4 + i * 0.8, 15 + i * 1.1);
        step.receiveShadow = true;
        g.add(step);
      }

      // partially ruined wing
      const ruin = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 8), wallMat);
      ruin.position.set(-26, 5, 2);
      ruin.rotation.z = 0.12;
      ruin.castShadow = true;
      g.add(ruin);
      for (let i = 0; i < 6; i++) {
        const deb = new THREE.Mesh(new THREE.BoxGeometry(MF.randRange(1, 2.6), MF.randRange(0.8, 1.6), MF.randRange(1, 2)), stone);
        deb.position.set(-26 + MF.randRange(-8, 8), 0.7, MF.randRange(-8, 10));
        deb.rotation.y = MF.rand() * Math.PI;
        g.add(deb);
      }

      // throne (interactable lore)
      const throne = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 1.6), this.mat("metal", 1, { color: 0xb08a3a }));
      throne.position.set(0, 2.2, -8);
      g.add(throne);

      g.position.set(x, this.terrain.getHeight(x, z) - 0.4, z);
      g.rotation.y = rotY;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.5);
      return g;
    }

    makeFenceLine(x1, z1, x2, z2) {
      const dist = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.floor(dist / 2.2);
      const woodMat = this.mat("wood", 1);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = MF.lerp(x1, x2, t), z = MF.lerp(z1, z2, t);
        const y = this.terrain.getHeight(x, z);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), woodMat);
        post.position.set(x, y + 0.6, z);
        this.group.add(post);
        if (i < n) {
          const t2 = (i + 0.5) / n;
          const rx = MF.lerp(x1, x2, t2), rz = MF.lerp(z1, z2, t2);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(dist / n + 0.2, 0.12, 0.1), woodMat);
          rail.position.set(rx, this.terrain.getHeight(rx, rz) + 1.0, rz);
          rail.rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
          this.group.add(rail);
        }
      }
    }

    makeWell(x, z) {
      const stone = this.mat("stone", 2);
      const well = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 12), stone);
      ring.position.y = 0.6;
      ring.castShadow = true;
      well.add(ring);
      const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), this.mat("wood", 1));
      post1.position.set(-1.2, 1.9, 0);
      const post2 = post1.clone(); post2.position.x = 1.2;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.2), this.mat("wood", 1));
      beam.position.y = 3.1;
      well.add(post1, post2, beam);
      well.position.set(x, this.terrain.getHeight(x, z), z);
      this.group.add(well);
      MF.addBoxFromObject(well, 0.1);
    }

    makeLamp(x, z) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 6), this.mat("metal", 1));
      pole.position.y = 2.3;
      g.add(pole);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffc878, emissiveIntensity: 1.2 })
      );
      bulb.position.y = 4.7;
      g.add(bulb);
      const light = new THREE.PointLight(0xffc878, 0.0, 18, 2);
      light.position.y = 4.7;
      g.add(light);
      light.userData.isLamp = true;
      this.lights.push(light);
      g.position.set(x, this.terrain.getHeight(x, z), z);
      this.group.add(g);
    }

    makeStall(x, z, color) {
      const g = new THREE.Group();
      const wood = this.mat("wood", 1);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.4), wood);
      table.position.y = 0.5;
      g.add(table);
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.9), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
      top.position.y = 2.15;
      top.rotation.x = -0.12;
      top.castShadow = true;
      g.add(top);
      for (const [px, pz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12), wood);
        leg.position.set(px, 1.05, pz);
        g.add(leg);
      }
      g.position.set(x, this.terrain.getHeight(x, z), z);
      g.rotation.y = MF.rand() * 0.6 - 0.3;
      this.group.add(g);
      MF.addBoxFromObject(g, 0.05);
    }

    makeBridge(x, z, rotY, broken) {
      const g = new THREE.Group();
      const wood = this.mat("wood", 2);
      const len = 46, width = 5;
      const plankCount = 18;
      for (let i = 0; i < plankCount; i++) {
        if (broken && i > 7 && i < 12) continue; // gap in the middle
        const t = i / (plankCount - 1);
        const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, len / plankCount * 0.92), wood);
        plank.position.set(0, 1.6 + Math.sin(t * Math.PI) * 1.2, -len / 2 + t * len);
        plank.castShadow = true; plank.receiveShadow = true;
        g.add(plank);
      }
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        for (const side of [-1, 1]) {
          const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 7, 6), wood);
          pil.position.set(side * (width / 2 - 0.4), -1.5 + Math.sin(t * Math.PI) * 1.2, -len / 2 + t * len);
          g.add(pil);
        }
      }
      g.position.set(x, this.terrain.getHeight(x, z) + 0.4, z);
      g.rotation.y = rotY;
      this.group.add(g);
      return g;
    }

    makeDock(x, z, rotY) {
      const g = new THREE.Group();
      const wood = this.mat("wood", 2);
      for (let i = 0; i < 8; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.1), wood);
        plank.position.set(0, 1.15, i * 1.15);
        g.add(plank);
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.4, 5), wood);
          post.position.set(side * 1.5, 0.2, i * 1.15);
          g.add(post);
        }
      }
      g.position.set(x, this.terrain.getHeight(x, z) + 0.3, z);
      g.rotation.y = rotY;
      this.group.add(g);
    }

    makeRadioTower(x, z) {
      const g = new THREE.Group();
      const metal = this.mat("metal", 2, { color: 0x9aa0a4, metalness: 0.5, roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 - i * 0.35, 0.09, 6, 4), metal);
        ring.position.y = i * 3.4 + 1.6;
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = Math.PI / 4;
        g.add(ring);
      }
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 18, 5), metal);
        leg.position.set(Math.cos(ang) * 1.7, 9, Math.sin(ang) * 1.7);
        leg.rotation.z = Math.cos(ang) * 0.16;
        leg.rotation.x = -Math.sin(ang) * 0.16;
        g.add(leg);
      }
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 1.6 }));
      beacon.position.y = 18.6;
      g.add(beacon);
      this.beacon = beacon;
      g.position.set(x, this.terrain.getHeight(x, z), z);
      this.group.add(g);
      MF.addBoxFromObject(g, 0.2);
      return g;
    }

    makeWatchtower(x, z) {
      const g = new THREE.Group();
      const stone = this.mat("stone", 2);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 12, 10), stone);
      base.position.y = 6;
      base.castShadow = true;
      g.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.2, 2.6, 10), stone);
      top.position.y = 13.2;
      top.castShadow = true;
      g.add(top);
      g.position.set(x, this.terrain.getHeight(x, z) - 0.3, z);
      this.group.add(g);
      MF.addBoxFromObject(g, 0.3);
      return g;
    }

    makeRuinWall(x1, z1, x2, z2, height) {
      const stone = this.mat("stone", 3);
      const dist = Math.hypot(x2 - x1, z2 - z1);
      const segs = Math.floor(dist / 3);
      for (let i = 0; i < segs; i++) {
        const t = (i + 0.5) / segs;
        const x = MF.lerp(x1, x2, t), z = MF.lerp(z1, z2, t);
        const hh = height * MF.randRange(0.55, 1);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(dist / segs + 0.25, hh, 1.6), stone);
        seg.position.set(x, this.terrain.getHeight(x, z) + hh / 2 - 0.3, z);
        seg.rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
        seg.castShadow = true; seg.receiveShadow = true;
        this.group.add(seg);
      }
    }

    addLoot(x, z, kind) {
      const y = this.terrain.getHeight(x, z) + 0.9;
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.45, 1),
        new THREE.MeshStandardMaterial({
          color: kind === "health" ? 0x44ff88 : 0xffc844,
          emissive: kind === "health" ? 0x22cc66 : 0xdd8800,
          emissiveIntensity: 1.1,
        })
      );
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      const spot = { mesh, kind, pos: mesh.position, taken: false, phase: MF.rand() * 6 };
      this.lootSpots.push(spot);
      MF.interactables.push({
        pos: mesh.position,
        radius: 2.6,
        label: kind === "health" ? "Pick up med-kit" : "Pick up supplies",
        action: () => {
          if (spot.taken) return false;
          spot.taken = true;
          mesh.visible = false;
          if (kind === "health" && MF.game && MF.game.health) {
            MF.game.health.heal(35);
            MF.ui.toast("Med-kit used  +35 HP");
          } else {
            if (MF.game && MF.game.health) MF.game.health.heal(15);
            MF.ui.toast("Supplies collected  +15 HP");
          }
          MF.audio.playUI("confirm");
          return true;
        },
      });
    }

    /* =============== world layouts =============== */
    build(scene) {
      this.buildHavenVillage();
      this.buildRiversideTown();
      this.buildAncientKingdom();
      this.buildMilitaryBunker();
      this.buildRadioTower();
      scene.add(this.group);
      return this.group;
    }

    buildHavenVillage() {
      const cx = 200, cz = 200;
      // two roads
      this.makeRoad(cx - 120, cz, cx + 120, cz);
      this.makeRoad(cx, cz - 110, cx, cz + 110);

      const houses = [
        [-80, -34, 0], [-52, -36, 0], [-22, -32, 0], [16, -36, 0], [48, -33, 0], [82, -36, 0],
        [-78, 36, Math.PI], [-46, 38, Math.PI], [-14, 35, Math.PI], [22, 37, Math.PI], [56, 34, Math.PI], [88, 37, Math.PI],
      ];
      houses.forEach((h, i) => {
        this.makeHouse(cx + h[0], cz + h[1], h[2] + MF.randRange(-0.1, 0.1), false);
      });

      this.makeLargeBuilding(cx - 4, cz - 6, 0, "market");
      this.makeLargeBuilding(cx + 96, cz + 92, Math.PI * 0.85, "church");
      this.makeLargeBuilding(cx - 108, cz + 88, Math.PI * 0.15, "school");

      this.makeWell(cx + 8, cz + 8);
      for (let i = 0; i < 5; i++) this.makeLamp(cx - 90 + i * 45, cz - 6);
      for (let i = 0; i < 4; i++) this.makeLamp(cx + 6, cz - 80 + i * 52);
      this.makeStall(cx - 26, cz - 14, 0xc85a3a);
      this.makeStall(cx - 18, cz + 16, 0x3a7ac8);
      this.makeStall(cx + 30, cz - 12, 0xc8a23a);

      this.makeFenceLine(cx - 118, cz - 52, cx - 60, cz - 52);
      this.makeFenceLine(cx + 40, cz + 54, cx + 110, cz + 54);

      this.addLoot(cx + 4, cz + 22, "health");
      this.addLoot(cx - 64, cz + 8, "supplies");
    }

    buildRiversideTown() {
      const cx = 210, cz = 1000;
      this.makeRoad(cx - 90, cz, cx + 70, cz);
      const buildings = [
        [-70, -30, 0, true], [-38, -28, 0, false], [-4, -32, 0, false], [32, -28, 0, true],
        [-64, 30, Math.PI, false], [-28, 32, Math.PI, true], [12, 28, Math.PI, false], [52, 32, Math.PI, false],
      ];
      buildings.forEach((b) => this.makeHouse(cx + b[0], cz + b[1], b[2], b[3]));

      // bridge across the river (partially destroyed)
      this.makeBridge(355, 1000, 0.15, true);
      this.makeDock(300, 1060, Math.PI * 0.6);
      this.addLoot(cx + 20, cz + 12, "health");
      this.addLoot(cx - 40, cz - 16, "supplies");
    }

    buildAncientKingdom() {
      const cx = 300, cz = 1600;
      this.makePalace(cx, cz, 0.2);
      this.makeTemple(cx - 78, cz + 30, 0.5);
      this.makeTemple(cx + 82, cz + 26, -0.4);
      // perimeter walls (100x100)
      const w = 110;
      this.makeRuinWall(cx - w / 2, cz - w / 2, cx + w / 2, cz - w / 2, 5);
      this.makeRuinWall(cx + w / 2, cz - w / 2, cx + w / 2, cz + w / 2, 5);
      this.makeRuinWall(cx + w / 2, cz + w / 2, cx - w / 2, cz + w / 2, 5);
      this.makeRuinWall(cx - w / 2, cz + w / 2, cx - w / 2, cz - w / 2, 5);
      for (const [tx, tz] of [[cx - w / 2, cz - w / 2], [cx + w / 2, cz - w / 2], [cx - w / 2, cz + w / 2], [cx + w / 2, cz + w / 2]]) {
        this.makeWatchtower(tx, tz);
      }
      // fallen pillars
      const stone = this.mat("stone", 2);
      for (let i = 0; i < 7; i++) {
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 8, 8), stone);
        const px = cx + MF.randRange(-70, 70), pz = cz + MF.randRange(40, 90);
        pil.position.set(px, this.terrain.getHeight(px, pz) + 1, pz);
        pil.rotation.set(Math.PI / 2 + MF.randRange(-0.2, 0.2), MF.rand() * Math.PI, MF.randRange(-0.2, 0.2));
        pil.castShadow = true;
        this.group.add(pil);
      }
      this.addLoot(cx + 4, cz + 42, "supplies");
    }

    buildMilitaryBunker() {
      const x = 1180, z = 1680;
      this.makeBunker(x, z, -0.7);
      this.addLoot(x + 10, z + 12, "health");
      this.addLoot(x - 12, z + 6, "supplies");
    }

    buildRadioTower() {
      const x = 860, z = 420;
      this.makeRadioTower(x, z);
      this.addLoot(x + 6, z + 6, "supplies");
    }

    makeRoad(x1, z1, x2, z2) {
      const width = 7;
      const dist = Math.hypot(x2 - x1, z2 - z1);
      const segs = Math.max(8, Math.floor(dist / 6));
      const positions = [], uvs = [], indices = [];
      const ang = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
      const nx = Math.cos(ang), nz = Math.sin(ang);
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = MF.lerp(x1, x2, t), z = MF.lerp(z1, z2, t);
        const y = this.terrain.getHeight(x, z) + 0.12;
        positions.push(x + nx * width, this.terrain.getHeight(x + nx * width, z + nz * width) + 0.12, z + nz * width);
        positions.push(x - nx * width, this.terrain.getHeight(x - nx * width, z - nz * width) + 0.12, z - nz * width);
        uvs.push(0, t * dist * 0.08, 1, t * dist * 0.08);
        if (i < segs) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const road = new THREE.Mesh(geo, this.mat("dirt", 1, { roughness: 1 }));
      road.receiveShadow = true;
      this.group.add(road);
    }

    /* Night lighting + loot bobbing. */
    update(dt, time, isNight) {
      for (const l of this.lights) {
        if (l.isLight) {
          l.intensity = isNight ? 1.1 : 0;
        } else if (l.material && l.material.emissiveIntensity !== undefined) {
          l.material.emissiveIntensity = isNight ? 1.0 : 0.25;
        }
      }
      for (const spot of this.lootSpots) {
        if (spot.taken) continue;
        spot.mesh.position.y = spot.pos.y + Math.sin(time * 2 + spot.phase) * 0.18;
        spot.mesh.rotation.y += dt * 1.4;
      }
      if (this.beacon) {
        this.beacon.material.emissiveIntensity = 1 + Math.sin(time * 3.4) * 0.8;
      }
    }
  }

  MF.BuildingGenerator = BuildingGenerator;
})(window.MF);
