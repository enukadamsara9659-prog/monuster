/* ============================================================
   METEORFALL — PlayerController.js
   Third-person spring-arm camera, movement (walk/sprint/crouch/
   jump/swim), collision, aiming, interactions, vehicle entry.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class PlayerController {
    constructor(player, camera) {
      this.player = player;
      this.camera = camera;
      this.camYaw = Math.PI;
      this.camPitch = -0.18;
      this.camDistance = 4.6;
      this.camPos = new THREE.Vector3();
      this.camLook = new THREE.Vector3();
      this.aiming = false;
      this.crouching = false;
      this.stamina = 100;
      this.gravity = -22;
      this.moveSpeed = 0;
      this.interactTarget = null;
      this.fovBase = 72;
      this.fovAim = 52;
      this.recoil = 0;
      this.shake = 0;
      this.locked = false;         // true during cutscenes
      this._bobTime = 0;
    }

    update(dt) {
      const p = this.player;
      const input = MF.input;
      if (this.locked || MF.game.state !== "PLAYING") {
        // still keep camera near player during scripted moments
        if (this.locked) this.updateCamera(dt, true);
        return;
      }

      /* -------- look -------- */
      const look = input.getLookDelta();
      const sens = (input.sensitivity || 1) * 0.0022;
      this.camYaw -= look.dx * sens;
      this.camPitch = MF.clamp(this.camPitch - look.dy * sens, -1.05, 1.05);

      /* -------- movement -------- */
      const mv = input.getMoveVector();
      const inVehicle = MF.game.vehicles && MF.game.vehicles.playerVehicle;
      if (inVehicle) {
        MF.game.vehicles.controlVehicle(dt, this.camYaw);
        this.updateCamera(dt, true);
        this.handleInteractions(dt, true);
        return;
      }

      this.aiming = input.action("aim");
      this.crouching = input.action("crouch");

      const sprinting = input.action("sprint") && this.stamina > 2 && mv.y > 0.1 && !this.aiming && !this.crouching;
      let speed = this.aiming ? 2.6 : this.crouching ? 2.2 : sprinting ? 9.2 : 4.6;
      if (this.stamina <= 0.5) speed = Math.min(speed, 3.6);

      // stamina
      if (sprinting) {
        this.stamina = Math.max(0, this.stamina - 16 * dt);
      } else {
        this.stamina = Math.min(100, this.stamina + 11 * dt);
      }

      const swimming = MF.game.world && MF.game.world.water && MF.game.world.water.isUnderwater(p.position)
        || (MF.game.world && MF.game.world.water && MF.game.world.water.surfaceAt(p.position.x, p.position.z) > p.position.y - 0.2
            && MF.game.world.water.surfaceAt(p.position.x, p.position.z) > -Infinity);

      if (swimming) speed = 2.4;

      const yaw = this.camYaw;
      const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
      const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
      let dx = (fwdX * mv.y + rightX * mv.x);
      let dz = (fwdZ * mv.y + rightZ * mv.x);
      const dLen = Math.hypot(dx, dz);
      if (dLen > 0.001) {
        dx /= dLen; dz /= dLen;
        p.position.x += dx * speed * dt;
        p.position.z += dz * speed * dt;
        p.position.x = MF.clamp(p.position.x, -40, MF.WORLD_SIZE + 40);
        p.position.z = MF.clamp(p.position.z, -40, MF.WORLD_SIZE + 40);
        // face movement (or camera when aiming)
        const targetYaw = this.aiming ? yaw + Math.PI : Math.atan2(dx, dz);
        p.yaw = MF.angleLerp(p.yaw, targetYaw, 1 - Math.exp(-11 * dt));
        this._bobTime += dt * speed;
      }
      this.moveSpeed = dLen > 0.01 ? speed * Math.min(1, dLen) : 0;

      /* -------- vertical -------- */
      const groundY = MF.getHeight(p.position.x, p.position.z);
      const waterY = MF.game.world ? MF.game.world.water.surfaceAt(p.position.x, p.position.z) : -Infinity;

      if (swimming && waterY > -Infinity) {
        // float toward surface
        const targetY = waterY - 0.35;
        p.position.y = MF.damp(p.position.y, targetY, 6, dt);
        p.velocityY = 0;
        p.grounded = false;
        p.animator.setState("swim");
        if (input.action("jump")) p.position.y += 2.2 * dt;
      } else {
        p.velocityY += this.gravity * dt;
        if (input.actionPressed("jump") && p.grounded) {
          p.velocityY = 8.6;
          p.grounded = false;
        }
        p.position.y += p.velocityY * dt;
        if (p.position.y <= groundY + 0.02) {
          p.position.y = groundY;
          p.velocityY = 0;
          p.grounded = true;
        } else {
          p.grounded = false;
        }
      }

      /* -------- collisions with buildings -------- */
      MF.resolveCollisions(p.position, 0.42, 1.7);

      /* -------- animation state -------- */
      if (p.animator.state !== "swim") {
        if (!p.grounded) p.animator.setState("jump");
        else if (this.aiming) p.animator.setState("aim");
        else if (this.crouching) p.animator.setState("crouch");
        else if (this.moveSpeed > 7) p.animator.setState("sprint");
        else if (this.moveSpeed > 1) p.animator.setState("walk");
        else p.animator.setState("idle");
      }
      p.speed = this.moveSpeed;

      // footsteps
      if (this.moveSpeed > 1.5 && p.grounded) {
        this.footTimer -= dt;
        if (this.footTimer <= 0) {
          this.footTimer = this.moveSpeed > 7 ? 0.32 : 0.48;
          MF.audio.playFootstep(p.position, swimming);
        }
      }

      /* -------- weapons -------- */
      if (MF.game.weapons) {
        MF.game.weapons.update(dt, this.aiming);
        if (input.actionPressed("weapon1")) MF.game.weapons.select(0);
        if (input.actionPressed("weapon2")) MF.game.weapons.select(1);
        if (input.actionPressed("weapon3")) MF.game.weapons.select(2);
        if (input.actionPressed("weapon4")) MF.game.weapons.select(3);
        if (Math.abs(input.mouse.wheel) > 0) MF.game.weapons.cycle(input.mouse.wheel > 0 ? 1 : -1);
      }

      /* -------- interactions -------- */
      this.handleInteractions(dt, false);

      /* -------- camera -------- */
      this.updateCamera(dt, false);

      /* -------- damage flash low health FX handled by HealthSystem -------- */
      if (input.actionPressed("vehicle")) {
        MF.game.vehicles && MF.game.vehicles.tryToggleVehicle();
      }
    }

    handleInteractions(dt, inVehicle) {
      const input = MF.input;
      const p = this.player;
      let best = null, bestDist = Infinity;
      for (const it of MF.interactables) {
        if (it.disabled) continue;
        const d = MF.dist3D(it.pos, p.position);
        if (d < (it.radius || 3) && d < bestDist) { best = it; bestDist = d; }
      }
      this.interactTarget = best;
      const prompt = document.getElementById("interaction-prompt");
      if (prompt) {
        if (best) {
          prompt.innerHTML = `<b>E</b> — ${best.label}`;
          prompt.classList.add("show");
        } else {
          prompt.classList.remove("show");
        }
      }
      if (best && input.actionPressed("interact")) {
        const consumed = best.action && best.action();
        if (consumed === false) {
          // no-op
        }
      }
    }

    updateCamera(dt, scripted) {
      const p = this.player;
      const aiming = this.aiming && !scripted;
      const targetDist = aiming ? 2.1 : this.camDistance;
      const side = aiming ? 0.55 : 0.95;
      const height = aiming ? 1.62 : 1.9;

      const yaw = this.camYaw + Math.PI;
      const pitch = this.camPitch;

      // desired camera position on orbit
      const cx = p.position.x + Math.sin(yaw) * Math.cos(pitch) * targetDist + Math.cos(yaw) * side;
      const cy = p.position.y + height + Math.sin(pitch) * targetDist;
      const cz = p.position.z + Math.cos(yaw) * Math.cos(pitch) * targetDist - Math.sin(yaw) * side;

      // collision: don't go under terrain or through buildings
      const camTarget = new THREE.Vector3(cx, cy, cz);
      const dir = camTarget.clone().sub(p.position);
      const len = dir.length();
      dir.normalize();
      const terrHit = MF.raycastTerrain(p.position.clone().add(new THREE.Vector3(0, 1.35, 0)), dir, len);
      let maxDist = len;
      if (terrHit.dist < len) maxDist = Math.max(1.4, terrHit.dist - 0.35);
      const boxHit = MF.raycastColliders(p.position.clone().add(new THREE.Vector3(0, 1.35, 0)), dir, maxDist);
      if (boxHit.dist < maxDist) maxDist = Math.max(1.2, boxHit.dist - 0.3);

      const finalPos = p.position.clone().add(new THREE.Vector3(0, 1.35, 0)).add(dir.multiplyScalar(maxDist));
      const minY = MF.getHeight(finalPos.x, finalPos.z) + 0.45;
      if (finalPos.y < minY) finalPos.y = minY;

      const lerpFactor = scripted ? 2.2 : 13;
      this.camPos.lerp(finalPos, 1 - Math.exp(-lerpFactor * dt));
      this.camera.position.copy(this.camPos);

      const lookTarget = p.position.clone().add(new THREE.Vector3(0, aiming ? 1.52 : 1.35, 0));
      lookTarget.x += Math.sin(this.camYaw + Math.PI) * 2.4;
      lookTarget.z += Math.cos(this.camYaw + Math.PI) * 2.4;
      this.camLook.lerp(lookTarget, 1 - Math.exp(-14 * dt));

      // recoil & shake
      if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4.5);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
      const shakeX = (Math.random() - 0.5) * this.shake * 0.5;
      const shakeY = (Math.random() - 0.5) * this.shake * 0.5;

      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY + this.recoil * 0.32;
      this.camera.lookAt(this.camLook);

      // FOV
      const targetFov = aiming ? this.fovAim : (MF.game.player.speed > 8 ? 78 : this.fovBase);
      this.camera.fov = MF.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    addRecoil(amount) {
      this.recoil = Math.min(1.2, this.recoil + amount);
    }
    addShake(amount) {
      this.shake = Math.min(2.5, this.shake + amount);
    }
  }

  MF.PlayerController = PlayerController;
})(window.MF);
