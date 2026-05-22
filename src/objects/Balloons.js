/**
 * Balloons.js — Floating Birthday Balloons
 *
 * ✦ 12 colorful balloons with SphereGeometry + glossy material
 * ✦ Strings: thin CylinderGeometry or Line
 * ✦ Float animation: sine-based bobbing + gentle drift
 * ✦ Scattered around the cake
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const BALLOON_COUNT = 12;
const BALLOON_RADIUS = 0.35;
const STRING_LENGTH = 1.5;

const BALLOON_COLORS = [
  0xFF69B4, // hot pink
  0xFF6347, // tomato red
  0xFFD700, // gold
  0x87CEEB, // sky blue
  0x98FB98, // pale green
  0xDDA0DD, // plum
  0xFF8C00, // dark orange
  0x00CED1, // dark cyan
  0xFFA0B4, // light pink
  0xADD8E6, // light blue
  0xFFB6C1, // light pink
  0xE6E6FA, // lavender
];

// Positions around the cake (radius ~2-4 from center, varying height)
const BALLOON_POSITIONS = [
  { x: -2.5, z: -1.5, baseY: 4.5 },
  { x: 2.8, z: -0.8, baseY: 5.0 },
  { x: -1.8, z: 2.2, baseY: 4.8 },
  { x: 1.5, z: 2.5, baseY: 5.2 },
  { x: -3.2, z: 0.5, baseY: 4.2 },
  { x: 3.0, z: 1.5, baseY: 4.6 },
  { x: 0.5, z: -3.0, baseY: 5.5 },
  { x: -0.8, z: 3.0, baseY: 4.9 },
  { x: 2.2, z: -2.5, baseY: 5.1 },
  { x: -2.0, z: -2.8, baseY: 4.4 },
  { x: 3.5, z: 0.0, baseY: 4.7 },
  { x: -1.0, z: -0.5, baseY: 5.8 },
];

export class Balloons {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {{ mesh: THREE.Group, baseY: number, phase: number }[]} */
    this.balloons = [];
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    for (let i = 0; i < BALLOON_COUNT; i++) {
      const balloon = this._createBalloon(i);
      this.group.add(balloon.mesh);
      this.balloons.push(balloon);
    }

    scene.add(this.group);
  }

  _createBalloon(index) {
    const pos = BALLOON_POSITIONS[index];
    const color = BALLOON_COLORS[index];
    const balloonGroup = new THREE.Group();

    // Balloon body — slightly squished sphere (taller than wide)
    const bodyGeo = new THREE.SphereGeometry(BALLOON_RADIUS, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.15,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(1, 1.25, 1); // stretch vertically
    body.castShadow = true;
    balloonGroup.add(body);

    // Knot at bottom
    const knotGeo = new THREE.ConeGeometry(0.06, 0.12, 6);
    const knotMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.y = -BALLOON_RADIUS * 1.25 - 0.05;
    knot.rotation.x = Math.PI; // flip cone
    balloonGroup.add(knot);

    // String — curved line
    const stringPoints = [];
    const segments = 12;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const y = -BALLOON_RADIUS * 1.25 - 0.12 - t * STRING_LENGTH;
      const x = Math.sin(t * Math.PI * 2) * 0.08;
      const z = Math.cos(t * Math.PI * 1.5) * 0.05;
      stringPoints.push(new THREE.Vector3(x, y, z));
    }
    const stringCurve = new THREE.CatmullRomCurve3(stringPoints);
    const stringGeo = new THREE.TubeGeometry(stringCurve, 12, 0.008, 4, false);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const string = new THREE.Mesh(stringGeo, stringMat);
    balloonGroup.add(string);

    // Highlight reflection (small white sphere on top)
    const highlightGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.set(-0.1, BALLOON_RADIUS * 0.8, 0.1);
    balloonGroup.add(highlight);

    // Position
    balloonGroup.position.set(pos.x, pos.baseY, pos.z);

    return {
      mesh: balloonGroup,
      baseY: pos.baseY,
      phase: index * 0.7 + Math.random() * 0.5
    };
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    this.balloons.forEach((b) => {
      // Bobbing motion
      b.mesh.position.y = b.baseY + Math.sin(elapsed * 0.8 + b.phase) * 0.15;

      // Gentle swaying
      b.mesh.rotation.z = Math.sin(elapsed * 0.5 + b.phase) * 0.06;
      b.mesh.rotation.x = Math.cos(elapsed * 0.4 + b.phase * 0.7) * 0.04;
    });
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
