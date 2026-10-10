/* ============================================================
   METEORFALL — InputManager.js
   Keyboard, mouse (pointer lock), wheel, gamepad and touch input.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  const DEFAULT_BINDINGS = {
    forward: ["KeyW", "ArrowUp"],
    backward: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    jump: ["Space"],
    sprint: ["ShiftLeft", "ShiftRight"],
    crouch: ["ControlLeft", "ControlRight", "KeyC"],
    fire: ["Mouse0"],
    aim: ["Mouse2"],
    reload: ["KeyR"],
    interact: ["KeyE"],
    vehicle: ["KeyV"],
    weaponWheel: ["Tab"],
    squadWheel: ["KeyQ"],
    map: ["KeyM"],
    inventory: ["KeyI"],
    pause: ["Escape"],
    weapon1: ["Digit1"], weapon2: ["Digit2"], weapon3: ["Digit3"], weapon4: ["Digit4"],
    stats: ["F1"],
    skip: ["Enter"],
  };

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.pressed = new Set();      // edge: pressed this frame
      this.released = new Set();
      this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: [false, false, false] };
      this.mousePressed = [false, false, false];
      this.bindings = DEFAULT_BINDINGS;
      this.pointerLocked = false;
      this.sensitivity = 1;
      this.gamepadIndex = null;
      this.touch = { active: false, moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, fire: false, jump: false, sprint: false };
      this._touchMoveId = null;
      this._touchLookId = null;
      this._touchOrigin = { x: 0, y: 0 };
      this.enabled = true;
    }

    attach(domElement) {
      this.dom = domElement;

      window.addEventListener("keydown", (e) => {
        if (e.code === "Tab" || e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
        if (!this.keys.has(e.code)) this.pressed.add(e.code);
        this.keys.add(e.code);
      });
      window.addEventListener("keyup", (e) => {
        this.keys.delete(e.code);
        this.released.add(e.code);
      });
      window.addEventListener("blur", () => { this.keys.clear(); this.mouse.buttons = [false, false, false]; });

      domElement.addEventListener("mousedown", (e) => {
        if (e.button < 3) {
          if (!this.mouse.buttons[e.button]) this.mousePressed[e.button] = true;
          this.mouse.buttons[e.button] = true;
        }
      });
      window.addEventListener("mouseup", (e) => {
        if (e.button < 3) this.mouse.buttons[e.button] = false;
      });
      domElement.addEventListener("contextmenu", (e) => e.preventDefault());
      window.addEventListener("mousemove", (e) => {
        if (this.pointerLocked) {
          this.mouse.dx += e.movementX || 0;
          this.mouse.dy += e.movementY || 0;
        }
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener("wheel", (e) => {
        this.mouse.wheel += Math.sign(e.deltaY);
      }, { passive: true });

      document.addEventListener("pointerlockchange", () => {
        this.pointerLocked = document.pointerLockElement === domElement;
      });

      window.addEventListener("gamepadconnected", (e) => { this.gamepadIndex = e.gamepad.index; });
      window.addEventListener("gamepaddisconnected", () => { this.gamepadIndex = null; });

      /* ---- touch controls (mobile) ---- */
      domElement.addEventListener("touchstart", (e) => {
        this.touch.active = true;
        for (const t of e.changedTouches) {
          if (t.clientX < window.innerWidth * 0.5 && this._touchMoveId === null) {
            this._touchMoveId = t.identifier;
            this._touchOrigin.x = t.clientX; this._touchOrigin.y = t.clientY;
          } else if (this._touchLookId === null) {
            this._touchLookId = t.identifier;
            this._lastLook = { x: t.clientX, y: t.clientY };
          }
        }
        e.preventDefault();
      }, { passive: false });
      domElement.addEventListener("touchmove", (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === this._touchMoveId) {
            const dx = (t.clientX - this._touchOrigin.x) / 60;
            const dy = (t.clientY - this._touchOrigin.y) / 60;
            this.touch.moveX = MF.clamp(dx, -1, 1);
            this.touch.moveY = MF.clamp(-dy, -1, 1);
          } else if (t.identifier === this._touchLookId && this._lastLook) {
            this.touch.lookDX += t.clientX - this._lastLook.x;
            this.touch.lookDY += t.clientY - this._lastLook.y;
            this._lastLook = { x: t.clientX, y: t.clientY };
          }
        }
        e.preventDefault();
      }, { passive: false });
      domElement.addEventListener("touchend", (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === this._touchMoveId) {
            this._touchMoveId = null;
            this.touch.moveX = 0; this.touch.moveY = 0;
          }
          if (t.identifier === this._touchLookId) {
            this._touchLookId = null; this._lastLook = null;
          }
        }
        if (e.touches.length === 0) this.touch.active = false;
      });
    }

    requestPointerLock() {
      if (this.dom && this.dom.requestPointerLock) {
        const p = this.dom.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      }
    }
    exitPointerLock() {
      if (document.exitPointerLock) document.exitPointerLock();
    }

    /* Action queries */
    action(name) {
      const keys = this.bindings[name];
      if (!keys) return false;
      for (const k of keys) {
        if (k === "Mouse0" && this.mouse.buttons[0]) return true;
        if (k === "Mouse2" && this.mouse.buttons[2]) return true;
        if (this.keys.has(k)) return true;
      }
      if (name === "fire" && this.touch.fire) return true;
      if (name === "jump" && this.touch.jump) return true;
      if (name === "sprint" && this.touch.sprint) return true;
      return false;
    }
    actionPressed(name) {
      const keys = this.bindings[name];
      if (!keys) return false;
      for (const k of keys) {
        if (k === "Mouse0" && this.mousePressed[0]) return true;
        if (k === "Mouse2" && this.mousePressed[2]) return true;
        if (this.pressed.has(k)) return true;
      }
      return false;
    }
    actionReleased(name) {
      const keys = this.bindings[name];
      if (!keys) return false;
      for (const k of keys) if (this.released.has(k)) return true;
      return false;
    }

    /* Movement vector (x = strafe, y = forward) */
    getMoveVector() {
      let x = 0, y = 0;
      if (this.action("forward")) y += 1;
      if (this.action("backward")) y -= 1;
      if (this.action("right")) x += 1;
      if (this.action("left")) x -= 1;
      x += this.touch.moveX;
      y += this.touch.moveY;
      // gamepad left stick
      const gp = this.getGamepad();
      if (gp) {
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (Math.abs(ax) > 0.15) x += ax;
        if (Math.abs(ay) > 0.15) y -= ay;
      }
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    }

    getLookDelta() {
      let dx = this.mouse.dx + this.touch.lookDX;
      let dy = this.mouse.dy + this.touch.lookDY;
      const gp = this.getGamepad();
      if (gp) {
        const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
        if (Math.abs(rx) > 0.15) dx += rx * 14;
        if (Math.abs(ry) > 0.15) dy += ry * 14;
      }
      return { dx, dy };
    }

    getGamepad() {
      if (this.gamepadIndex === null || !navigator.getGamepads) return null;
      const pads = navigator.getGamepads();
      return pads[this.gamepadIndex] || null;
    }

    /* Called at the very end of each frame. */
    endFrame() {
      this.pressed.clear();
      this.released.clear();
      this.mouse.dx = 0;
      this.mouse.dy = 0;
      this.touch.lookDX = 0;
      this.touch.lookDY = 0;
      this.mouse.wheel = 0;
      this.mousePressed = [false, false, false];
      const gp = this.getGamepad();
      if (gp) {
        // gamepad buttons map onto actions each frame through action() reads
        if (gp.buttons[7] && gp.buttons[7].pressed) this.touch.fire = true;
        else if (!this.mouse.buttons[0]) this.touch.fire = false;
      }
    }
  }

  MF.InputManager = InputManager;
})();
