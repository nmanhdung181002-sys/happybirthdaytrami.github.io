/**
 * GLBCatManager.js — Loads and manages 6 GLB cat models on the island
 *
 * ✦ Uses GLTFLoader to load .glb files from /models/
 * ✦ Automatically plays embedded animations (idle, walk) via AnimationMixer
 * ✦ Roaming system: cats pick random waypoints and walk there
 * ✦ Configurable per-cat: scale, speed, behavior, position
 *
 * Methods: init(parentGroup), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── CAT DEFINITIONS ──
// Each cat has: file, name, scale, startPos, behavior, speed
const CAT_DEFS = [
  {
    file: 'models/cat1.glb',
    name: 'Cat 1',
    scale: 1.2,
    startPos: [2.5, 0, 5.0],
    startRot: Math.PI * 0.1,
    behavior: 'roam',   // 'roam' | 'idle' | 'sleep'
    speed: 0.6,
  },
  {
    file: 'models/cat2.glb',
    name: 'Cat 2',
    scale: 1.0,
    startPos: [-3.0, 0, 3.0],
    startRot: -Math.PI * 0.3,
    behavior: 'roam',
    speed: 0.8,
  },
  {
    file: 'models/catloaf.glb',
    name: 'Cat Loaf',
    scale: 1.5,
    startPos: [1.0, 0, 4.5],
    startRot: Math.PI * 0.05,
    behavior: 'sleep',    // stays still, breathing only
    speed: 0,
  },
  {
    file: 'models/cougar.glb',
    name: 'Cougar',
    scale: 0.8,
    startPos: [4.5, 0, -3.0],
    startRot: -Math.PI * 0.4,
    behavior: 'roam',
    speed: 0.5,
  },
  {
    file: 'models/dingus.glb',
    name: 'Dingus',
    scale: 1.0,
    startPos: [-4.0, 0, -2.0],
    startRot: Math.PI * 0.6,
    behavior: 'roam',
    speed: 0.7,
  },
  {
    file: 'models/marsey.glb',
    name: 'Marsey',
    scale: 1.0,
    startPos: [-2.0, 0, 6.0],
    startRot: Math.PI * 0.2,
    behavior: 'roam',
    speed: 0.9,
  },
];

const ISLAND_SURFACE_Y = 2.9;  // matches main.js island surface
const ISLAND_ROAM_RADIUS = 8;

export class GLBCatManager {
  constructor() {
    /** @type {{ group: THREE.Group, mixer: THREE.AnimationMixer|null, def: object, roamState: object }[]} */
    this.cats = [];
    this._loader = new GLTFLoader();
    this._loadedCount = 0;
    this._totalCount = CAT_DEFS.length;
  }

  /**
   * Load all cat models and add them to the parent group (islandGroup).
   * Returns a Promise that resolves when all cats are loaded.
   * @param {THREE.Group} parentGroup - The island group to parent cats to
   * @param {Function} [onProgress] - Called with (loaded, total) for progress tracking
   * @returns {Promise<void>}
   */
  async init(parentGroup, onProgress) {
    const promises = CAT_DEFS.map((def, index) => {
      return this._loadCat(def, parentGroup, onProgress).catch(err => {
        console.warn(`[GLBCatManager] Failed to load ${def.file}:`, err);
        // Create a colored placeholder sphere as fallback
        this._createFallback(def, parentGroup);
      });
    });

    await Promise.all(promises);
    console.log(`[GLBCatManager] Loaded ${this._loadedCount}/${this._totalCount} cats`);
  }

  /**
   * @param {object} def
   * @param {THREE.Group} parentGroup
   * @param {Function} [onProgress]
   */
  _loadCat(def, parentGroup, onProgress) {
    return new Promise((resolve, reject) => {
      this._loader.load(
        def.file,
        (gltf) => {
          const model = gltf.scene;

          // ── Auto-detect scale ──
          // Compute bounding box to normalize size
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          // Target cat height: ~1.0 unit, then apply per-cat scale
          const baseScale = (1.0 / maxDim) * def.scale;
          model.scale.setScalar(baseScale);

          // ── Position on island surface ──
          // Re-compute box after scaling to find ground offset
          const scaledBox = new THREE.Box3().setFromObject(model);
          const yOffset = -scaledBox.min.y; // push bottom to y=0

          const catGroup = new THREE.Group();
          catGroup.add(model);
          model.position.y = yOffset;

          catGroup.position.set(
            def.startPos[0],
            ISLAND_SURFACE_Y,
            def.startPos[2],
          );
          catGroup.rotation.y = def.startRot;

          // ── Enable shadows ──
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // ── Animation Mixer ──
          let mixer = null;
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            // Play all animations (idle, walk, etc.)
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.play();
            });
          }

          // ── Store base scale for procedural animation reference ──
          model.userData._baseScaleX = model.scale.x;
          model.userData._baseScaleY = model.scale.y;
          model.userData._baseScaleZ = model.scale.z;

          // ── Add to parent ──
          parentGroup.add(catGroup);

          // ── Roaming state ──
          const roamState = {
            target: new THREE.Vector3(def.startPos[0], ISLAND_SURFACE_Y, def.startPos[2]),
            waitTimer: 0,
            waitDuration: 2 + Math.random() * 3,
            state: 'idle',
            bobPhase: 0,
          };

          this.cats.push({
            group: catGroup,
            mixer,
            def,
            roamState,
          });

          this._loadedCount++;
          if (onProgress) onProgress(this._loadedCount, this._totalCount);

          resolve();
        },
        undefined, // onProgress (per-file)
        (error) => {
          reject(error);
        },
      );
    });
  }

  /**
   * Create a simple colored sphere as a fallback when model fails to load
   * @param {object} def
   * @param {THREE.Group} parentGroup
   */
  _createFallback(def, parentGroup) {
    const fallbackColors = [0xFF8844, 0xFFFFFF, 0x222222, 0xBB8844, 0x88BBFF, 0xFF88CC];
    const colorIndex = CAT_DEFS.indexOf(def) % fallbackColors.length;

    const geo = new THREE.SphereGeometry(0.3, 12, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: fallbackColors[colorIndex],
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.userData._baseScaleX = 1;
    mesh.userData._baseScaleY = 1;
    mesh.userData._baseScaleZ = 1;

    const catGroup = new THREE.Group();
    catGroup.add(mesh);
    catGroup.position.set(
      def.startPos[0],
      ISLAND_SURFACE_Y + 0.3,
      def.startPos[2],
    );

    parentGroup.add(catGroup);

    this.cats.push({
      group: catGroup,
      mixer: null,
      def,
      roamState: {
        target: new THREE.Vector3(def.startPos[0], ISLAND_SURFACE_Y, def.startPos[2]),
        waitTimer: 0,
        waitDuration: 2 + Math.random() * 3,
        state: 'idle',
        bobPhase: 0,
      },
    });

    this._loadedCount++;
  }

  /**
   * Pick a new random waypoint on the island
   * @param {{ roamState: object }} catEntry
   */
  _pickNewTarget(catEntry) {
    const angle = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * (ISLAND_ROAM_RADIUS - 2);
    catEntry.roamState.target.set(
      Math.cos(angle) * r,
      ISLAND_SURFACE_Y,
      Math.sin(angle) * r,
    );
    catEntry.roamState.state = 'walking';
    catEntry.roamState.bobPhase = 0;
  }

  /**
   * Update all cats: animations, roaming, procedural walk cycle
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    this.cats.forEach((catEntry, catIndex) => {
      // ── Update AnimationMixer (if model has embedded anims) ──
      if (catEntry.mixer) {
        catEntry.mixer.update(delta);
      }

      const { group, def, roamState } = catEntry;
      const pos = group.position;
      const model = group.children[0]; // the actual 3D model inside the group

      // ── Behavior: sleep — gentle breathing ──
      if (def.behavior === 'sleep') {
        if (model) {
          const breathe = Math.sin(elapsed * 0.8 + catIndex) * 0.015;
          // Subtle scale breathing (ribs expand)
          model.scale.y = model.userData._baseScaleY * (1 + breathe);
          model.scale.x = model.userData._baseScaleX * (1 - breathe * 0.3);
        }
        return;
      }

      // ── Behavior: idle — look around naturally ──
      if (def.behavior === 'idle') {
        // Slow head/body turn side to side
        const lookPhase = elapsed * 0.25 + catIndex * 2.0;
        group.rotation.y += Math.sin(lookPhase) * 0.003;
        // Subtle breathing even when idle
        if (model) {
          const breathe = Math.sin(elapsed * 1.0 + catIndex) * 0.01;
          model.scale.y = model.userData._baseScaleY * (1 + breathe);
        }
        return;
      }

      // ── Behavior: roam — walk between waypoints with natural gait ──

      if (roamState.state === 'idle') {
        // ── IDLE at waypoint: look around, breathe, gradually reset body tilt ──
        roamState.waitTimer += delta;

        // Smoothly reset body tilt to upright
        if (model) {
          model.rotation.x *= 0.95; // ease back to 0
          model.rotation.z *= 0.95;
          // Idle breathing
          const breathe = Math.sin(elapsed * 1.0 + catIndex) * 0.01;
          model.scale.y = model.userData._baseScaleY * (1 + breathe);
        }

        // Subtle idle look-around
        const idleLook = Math.sin(elapsed * 0.4 + catIndex * 1.5) * 0.15;
        // Don't override main rotation, just add a gentle oscillation
        // (we can't easily separate head from body without skeleton, so rotate whole model slightly)
        if (model) {
          model.rotation.y = idleLook;
        }

        if (roamState.waitTimer >= roamState.waitDuration) {
          roamState.waitTimer = 0;
          roamState.waitDuration = 2 + Math.random() * 4;
          this._pickNewTarget(catEntry);
        }
      } else if (roamState.state === 'walking') {
        // ── WALKING: natural cat gait ──
        const dx = roamState.target.x - pos.x;
        const dz = roamState.target.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.3) {
          // Arrived at target
          roamState.state = 'idle';
          roamState.waitTimer = 0;
          pos.y = ISLAND_SURFACE_Y;
          // Reset model rotation smoothly (will ease in idle branch)
          return;
        }

        // ── Face direction of movement (smooth turn) ──
        const targetAngle = Math.atan2(dx, dz);
        let angleDiff = targetAngle - group.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        group.rotation.y += angleDiff * Math.min(delta * 3.0, 1.0);

        // ── Move position forward ──
        const moveSpeed = def.speed * delta;
        pos.x += (dx / dist) * moveSpeed;
        pos.z += (dz / dist) * moveSpeed;

        // ── Procedural walk cycle on the model ──
        roamState.bobPhase += delta * def.speed * 10; // gait frequency
        const gaitPhase = roamState.bobPhase;

        if (model) {
          // 1) Forward lean — cats lean slightly forward when walking
          model.rotation.x = 0.06;

          // 2) Side-to-side hip sway — cats' hips sway as they walk
          //    This is the most recognizable part of a cat's gait
          model.rotation.z = Math.sin(gaitPhase) * 0.04;

          // 3) Very subtle vertical bounce — real cat gait has tiny up-down
          //    Much smaller than before (was 0.06, now 0.015)
          const stepBounce = Math.abs(Math.sin(gaitPhase * 2)) * 0.015;
          pos.y = ISLAND_SURFACE_Y + stepBounce;

          // 4) Subtle body roll (cats' shoulders alternate slightly)
          model.rotation.y = Math.sin(gaitPhase * 0.5) * 0.03;

          // 5) Slight scale pulse (simulates muscle movement)
          model.scale.x = model.userData._baseScaleX * (1 + Math.sin(gaitPhase * 2) * 0.008);
        } else {
          // No model child — just smooth glide
          pos.y = ISLAND_SURFACE_Y;
        }

        // ── Clamp to island radius ──
        const fromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (fromCenter > ISLAND_ROAM_RADIUS) {
          pos.x *= ISLAND_ROAM_RADIUS / fromCenter;
          pos.z *= ISLAND_ROAM_RADIUS / fromCenter;
          this._pickNewTarget(catEntry);
          catEntry.roamState.target.set(
            (Math.random() - 0.5) * 4,
            ISLAND_SURFACE_Y,
            (Math.random() - 0.5) * 4,
          );
        }
      }
    });
  }

  /**
   * Dispose all loaded models
   */
  dispose() {
    this.cats.forEach((catEntry) => {
      if (catEntry.mixer) {
        catEntry.mixer.stopAllAction();
      }
      catEntry.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
    });
    this.cats = [];
  }
}
