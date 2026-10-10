/* ============================================================
   METEORFALL — SceneManager.js
   Scene graph helpers: registration, LOD distance toggles,
   frustum-culling helpers and shared object pools.
   ============================================================ */
(function () {
  "use strict";
  const MF = window.MF;

  class SceneManager {
    constructor(scene) {
      this.scene = scene;
      this.lodEntries = [];      // {obj, maxDist, minDist}
      this.dynamicObjects = [];
      this.frustum = new THREE.Frustum();
      this.projScreen = new THREE.Matrix4();
    }

    add(obj) { this.scene.add(obj); return obj; }
    remove(obj) {
      this.scene.remove(obj);
      const i = this.dynamicObjects.indexOf(obj);
      if (i >= 0) this.dynamicObjects.splice(i, 1);
    }

    registerLOD(obj, maxDist, minDist) {
      this.lodEntries.push({ obj, maxDist: maxDist || 300, minDist: minDist || 0 });
    }

    /* Distance-based visibility (cheap LOD). */
    updateLOD(cameraPos) {
      for (let i = 0; i < this.lodEntries.length; i++) {
        const e = this.lodEntries[i];
        const p = e.obj.position;
        const d = Math.hypot(p.x - cameraPos.x, p.z - cameraPos.z);
        const visible = d <= e.maxDist && d >= e.minDist;
        if (e.obj.visible !== visible) e.obj.visible = visible;
      }
    }

    updateFrustum(camera) {
      this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreen);
    }

    isInFrustum(obj) {
      if (!obj.geometry) return true;
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      const sph = obj.geometry.boundingSphere.clone();
      sph.applyMatrix4(obj.matrixWorld);
      return this.frustum.intersectsSphere(sph);
    }

    /* Generic pool for meshes created/destroyed at runtime. */
    makeMeshPool(factory, reset, size) {
      return new MF.ObjectPool(factory, reset, size || 12);
    }
  }

  MF.SceneManager = SceneManager;
})();
