/**
 * ConfettiSystem.js — Continuous confetti particles falling from above
 *
 * ✦ 400 confetti pieces: tiny rectangles in festive colors
 * ✦ Physics: gravity + wind drift + tumble rotation
 * ✦ Recycled: pieces that fall below threshold reset to top
 * ✦ Custom ShaderMaterial with per-particle color, size, rotation
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const CONFETTI_COUNT = 400;
const SPAWN_HEIGHT = 12;
const FALL_ZONE = 15; // total fall distance before reset
const SPREAD = 10;

const CONFETTI_COLORS = [
  new THREE.Color(0xFF69B4), // hot pink
  new THREE.Color(0xFFD700), // gold
  new THREE.Color(0xFF6347), // red
  new THREE.Color(0x87CEEB), // sky blue
  new THREE.Color(0x98FB98), // pale green
  new THREE.Color(0xDDA0DD), // plum
  new THREE.Color(0xFF8C00), // orange
  new THREE.Color(0xE6E6FA), // lavender
  new THREE.Color(0x00CED1), // teal
  new THREE.Color(0xFFA500), // orange
];

export class ConfettiSystem {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {THREE.Points} */
    this.confetti = null;
    /** @type {THREE.ShaderMaterial} */
    this.material = null;

    // Per-particle state arrays
    /** @type {Float32Array} */
    this.velocities = null;
    /** @type {Float32Array} */
    this.rotations = null;
    /** @type {Float32Array} */
    this.rotSpeeds = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    const positions = new Float32Array(CONFETTI_COUNT * 3);
    const colors = new Float32Array(CONFETTI_COUNT * 3);
    const sizes = new Float32Array(CONFETTI_COUNT);
    const phases = new Float32Array(CONFETTI_COUNT);
    this.velocities = new Float32Array(CONFETTI_COUNT * 3);
    this.rotations = new Float32Array(CONFETTI_COUNT);
    this.rotSpeeds = new Float32Array(CONFETTI_COUNT);

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      // Random initial position scattered in air
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 1] = Math.random() * FALL_ZONE + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;

      // Random color from palette
      const c = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Size variation
      sizes[i] = 2.0 + Math.random() * 4.0;

      // Phase for wind oscillation
      phases[i] = Math.random() * Math.PI * 2;

      // Velocity: slow downward + slight drift
      this.velocities[i * 3]     = (Math.random() - 0.5) * 0.3; // x drift
      this.velocities[i * 3 + 1] = -(0.8 + Math.random() * 1.2); // y fall speed
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3; // z drift

      // Rotation
      this.rotations[i] = Math.random() * Math.PI * 2;
      this.rotSpeeds[i] = (Math.random() - 0.5) * 5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 color;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = color;
          
          // Tumbling flash effect
          float flash = abs(sin(uTime * 3.0 + aPhase * 2.0));
          vAlpha = 0.6 + flash * 0.4;
          
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 10.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // Rectangle shape (confetti piece)
          vec2 uv = gl_PointCoord - 0.5;
          
          // Rotated rectangle
          float rect = step(abs(uv.x), 0.35) * step(abs(uv.y), 0.2);
          if (rect < 0.5) discard;
          
          // Slight glossy highlight
          float highlight = smoothstep(0.0, 0.15, uv.y + 0.2) * 0.3;
          
          gl_FragColor = vec4(vColor + highlight, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.confetti = new THREE.Points(geo, this.material);
    this.group.add(this.confetti);
    scene.add(this.group);
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    if (!this.confetti) return;

    this.material.uniforms.uTime.value = elapsed;

    const posAttr = this.confetti.geometry.attributes.position;
    const phaseAttr = this.confetti.geometry.attributes.aPhase;

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);
      const phase = phaseAttr.getX(i);

      // Apply velocity
      x += this.velocities[i * 3] * delta;
      y += this.velocities[i * 3 + 1] * delta;
      z += this.velocities[i * 3 + 2] * delta;

      // Wind sway
      x += Math.sin(elapsed * 1.5 + phase) * 0.01;
      z += Math.cos(elapsed * 1.2 + phase * 0.7) * 0.008;

      // Reset if fallen below threshold
      if (y < -2) {
        x = (Math.random() - 0.5) * SPREAD;
        y = SPAWN_HEIGHT + Math.random() * 3;
        z = (Math.random() - 0.5) * SPREAD;
      }

      posAttr.setXYZ(i, x, y, z);
    }

    posAttr.needsUpdate = true;
  }

  dispose() {
    if (this.confetti) {
      this.confetti.geometry.dispose();
      this.material.dispose();
    }
  }
}
