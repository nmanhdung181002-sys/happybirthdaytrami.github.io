/**
 * CameraPath.js — Scroll-based Camera Animation System
 *
 * ✦ Camera follows CatmullRomCurve3 path with 10 control points
 * ✦ LookAt target interpolates along a separate curve
 * ✦ Wheel event accumulates scroll delta (bruno-simon.com style)
 * ✦ Smooth damping: lerp(current, target, 0.05) per frame
 * ✦ Mouse parallax: ±15° small rotation when not scrolling
 * ✦ 4 Chapters: ARRIVAL (0-25%), CAKE (25-50%), GIFTS (50-75%), WISH (75-100%)
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const SCROLL_SPEED = 0.00015;        // wheel delta → progress (gentler and more controlled)
const SCROLL_LERP = 0.035;           // smooth damping factor (liquid-smooth kinetic glide)
const MOUSE_PARALLAX_AMOUNT = 0.08; // ±rad parallax intensity
const MOUSE_LERP = 0.04;            // mouse parallax damping

// Camera path control points — designed to "fly through" scene
// 6 Chapters: ARRIVAL → ABOUT → CAKE → MEMORIES → GIFTS → WISH
const PATH_POINTS = [
  new THREE.Vector3(0, 22, 85),    // Start: far above, looking at island
  new THREE.Vector3(12, 16, 65),   // Glide in from right
  new THREE.Vector3(6, 11, 45),    // Descend, approach island
  new THREE.Vector3(-4, 7, 28),    // About: orbit left, gentle overview
  new THREE.Vector3(-10, 5, 18),   // About → Cake transition
  new THREE.Vector3(-7, 4, 10),    // Cake: close orbit
  new THREE.Vector3(-3, 3, 7),     // Cake: near view
  new THREE.Vector3(4, 3, 5),      // Memories: pan right
  new THREE.Vector3(8, 4, 9),      // Memories: rising slightly
  new THREE.Vector3(6, 2, 6),      // Gifts: close to ground
  new THREE.Vector3(9, 3, 12),     // Gifts: pan out
  new THREE.Vector3(4, 8, 22),     // Wish: rise up
  new THREE.Vector3(0, 16, 38),    // Final: panoramic view from above
];

// LookAt target path — where camera points at each stage
const LOOKAT_POINTS = [
  new THREE.Vector3(0, 0, 0),      // Looking at island center
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 2, 0),      // Slightly up as we approach
  new THREE.Vector3(0, 3, 0),      // About: looking at center
  new THREE.Vector3(0, 3, 0),      // Transition
  new THREE.Vector3(0, 3, 0),      // Cake focus
  new THREE.Vector3(0, 3, 0),      // Close cake
  new THREE.Vector3(0, 1, -1),     // Memories
  new THREE.Vector3(0, 2, 0),      // Memories pan
  new THREE.Vector3(0, 0, -2),     // Gifts on ground level
  new THREE.Vector3(0, 1, -2),     // Gifts area
  new THREE.Vector3(0, 2, 0),      // Rising: look back at island
  new THREE.Vector3(0, 0, 0),      // Final: center panoramic
];

// Chapter definitions (6 chapters)
const CHAPTERS = [
  { name: 'ARRIVAL',  start: 0.00, end: 0.18 },
  { name: 'ABOUT',    start: 0.18, end: 0.35 },
  { name: 'CAKE',     start: 0.35, end: 0.52 },
  { name: 'MEMORIES', start: 0.52, end: 0.68 },
  { name: 'GIFTS',    start: 0.68, end: 0.85 },
  { name: 'WISH',     start: 0.85, end: 1.00 },
];

export class CameraPath {
  constructor() {
    /** @type {THREE.CatmullRomCurve3} */
    this.cameraPath = null;
    /** @type {THREE.CatmullRomCurve3} */
    this.lookAtPath = null;

    // Scroll state
    this.scrollTarget = 0;   // Target progress (0–1)
    this.scrollCurrent = 0;  // Smoothed current progress (0–1)

    // Mouse parallax
    this.mouseTarget = { x: 0, y: 0 };
    this.mouseCurrent = { x: 0, y: 0 };

    // Touch support
    this.touchStartY = 0;

    // Current chapter
    this.currentChapter = 0;

    // Bound handlers (for cleanup)
    this._onWheel = null;
    this._onMouseMove = null;
    this._onTouchStart = null;
    this._onTouchMove = null;

    // Debug: path visualization
    this.pathLine = null;
  }

  /**
   * @param {THREE.Scene} scene — for optional debug visualization
   */
  init(scene) {
    // Build CatmullRom curves
    this.cameraPath = new THREE.CatmullRomCurve3(PATH_POINTS, false, 'catmullrom', 0.5);
    this.lookAtPath = new THREE.CatmullRomCurve3(LOOKAT_POINTS, false, 'catmullrom', 0.5);

    // Event listeners
    this._onWheel = this._handleWheel.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);

    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });

    // Optional: visualize path in debug mode
    // this._createPathVisualization(scene);
  }

  /**
   * Update camera position and lookAt each frame
   * @param {number} delta
   * @param {number} elapsed
   * @param {THREE.PerspectiveCamera} camera
   */
  update(delta, elapsed, camera) {
    // Smooth scroll interpolation
    this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * SCROLL_LERP;

    // Clamp to avoid floating point overshoot
    if (Math.abs(this.scrollTarget - this.scrollCurrent) < 0.0001) {
      this.scrollCurrent = this.scrollTarget;
    }

    // Get camera position from path
    const t = Math.max(0, Math.min(1, this.scrollCurrent));
    const cameraPos = this.cameraPath.getPointAt(t);
    const lookAtPos = this.lookAtPath.getPointAt(t);

    // Apply position
    camera.position.copy(cameraPos);

    // Mouse parallax offset
    this.mouseCurrent.x += (this.mouseTarget.x - this.mouseCurrent.x) * MOUSE_LERP;
    this.mouseCurrent.y += (this.mouseTarget.y - this.mouseCurrent.y) * MOUSE_LERP;

    // Offset lookAt by mouse parallax
    const parallaxOffset = new THREE.Vector3(
      this.mouseCurrent.x * MOUSE_PARALLAX_AMOUNT * 10,
      -this.mouseCurrent.y * MOUSE_PARALLAX_AMOUNT * 5,
      0
    );
    lookAtPos.add(parallaxOffset);

    camera.lookAt(lookAtPos);

    // Update current chapter
    this._updateChapter(t);
  }

  /**
   * Get current scroll progress (0–1)
   */
  getProgress() {
    return this.scrollCurrent;
  }

  /**
   * Get current chapter name
   */
  getCurrentChapter() {
    return CHAPTERS[this.currentChapter];
  }

  /**
   * Scroll camera smoothly to a specific chapter index
   * @param {number} index
   */
  scrollToChapter(index) {
    if (index >= 0 && index < CHAPTERS.length) {
      this.scrollTarget = CHAPTERS[index].start;
    }
  }

  // ── PRIVATE ──

  _handleWheel(e) {
    e.preventDefault();
    // Clamp the single scroll step to prevent huge leaps (max +/- 0.04 progress per event)
    const rawDelta = e.deltaY * SCROLL_SPEED;
    const clampedDelta = Math.max(-0.04, Math.min(0.04, rawDelta));
    this.scrollTarget += clampedDelta;
    this.scrollTarget = Math.max(0, Math.min(1, this.scrollTarget));
  }

  _handleMouseMove(e) {
    this.mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  _handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchStartY = e.touches[0].clientY;
    }
  }

  _handleTouchMove(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const deltaY = this.touchStartY - e.touches[0].clientY;
      this.touchStartY = e.touches[0].clientY;
      
      const rawDelta = deltaY * SCROLL_SPEED * 1.5;
      const clampedDelta = Math.max(-0.04, Math.min(0.04, rawDelta));
      this.scrollTarget += clampedDelta;
      this.scrollTarget = Math.max(0, Math.min(1, this.scrollTarget));
    }
  }

  _updateChapter(t) {
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (t >= CHAPTERS[i].start && t < CHAPTERS[i].end) {
        if (this.currentChapter !== i) {
          this.currentChapter = i;
          // Dispatch custom event for other systems to react
          window.dispatchEvent(new CustomEvent('chapterchange', {
            detail: { chapter: i, name: CHAPTERS[i].name }
          }));
        }
        break;
      }
    }
    // Handle exactly 1.0
    if (t >= 1.0 && this.currentChapter !== CHAPTERS.length - 1) {
      this.currentChapter = CHAPTERS.length - 1;
      window.dispatchEvent(new CustomEvent('chapterchange', {
        detail: { chapter: this.currentChapter, name: CHAPTERS[this.currentChapter].name }
      }));
    }
  }

  /**
   * Debug: visualize camera path as a line in scene
   */
  _createPathVisualization(scene) {
    const points = this.cameraPath.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.4
    });
    this.pathLine = new THREE.Line(geometry, material);
    scene.add(this.pathLine);
  }

  dispose() {
    if (this._onWheel) window.removeEventListener('wheel', this._onWheel);
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
    if (this._onTouchStart) window.removeEventListener('touchstart', this._onTouchStart);
    if (this._onTouchMove) window.removeEventListener('touchmove', this._onTouchMove);

    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      this.pathLine.material.dispose();
    }
  }
}
