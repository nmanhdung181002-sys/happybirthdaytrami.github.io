/**
 * SparkleTrail.js — Sparkle trail particles following camera path
 *
 * ✦ 300 sparkle particles that orbit and trail around the scene
 * ✦ Emitted near camera position, drift outward with fade
 * ✦ Cross-shaped sparkle shader with additive blending
 * ✦ Gold/pink/white color palette
 *
 * Methods: init(), update(delta, elapsed, camera), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const SPARKLE_COUNT = 300;
const SPARKLE_LIFETIME = 4.0; // seconds

export class SparkleTrail {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {THREE.Points} */
    this.sparkles = null;
    /** @type {THREE.ShaderMaterial} */
    this.material = null;

    // Per-particle state
    /** @type {Float32Array} */
    this.ages = null;
    /** @type {Float32Array} */
    this.lifetimes = null;
    /** @type {Float32Array} */
    this.velocitiesArray = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    const positions = new Float32Array(SPARKLE_COUNT * 3);
    const colors = new Float32Array(SPARKLE_COUNT * 3);
    const sizes = new Float32Array(SPARKLE_COUNT);
    const ages = new Float32Array(SPARKLE_COUNT);

    this.ages = new Float32Array(SPARKLE_COUNT);
    this.lifetimes = new Float32Array(SPARKLE_COUNT);
    this.velocitiesArray = new Float32Array(SPARKLE_COUNT * 3);

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      // Start at random positions around the scene
      this._resetParticle(i, positions, colors, sizes);
      // Stagger initial ages so not all spawn at once
      this.ages[i] = Math.random() * SPARKLE_LIFETIME;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAge;
        attribute vec3 color;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vAlpha;
        varying float vAge;
        
        void main() {
          vColor = color;
          vAge = aAge;
          
          // Fade in quickly, fade out slowly
          float life = aAge / ${SPARKLE_LIFETIME.toFixed(1)};
          vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.6, 1.0, life));
          
          // Twinkle
          float twinkle = sin(uTime * 8.0 + aAge * 20.0) * 0.3 + 0.7;
          vAlpha *= twinkle;
          
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float sizeMult = 1.0 - smoothstep(0.5, 1.0, life) * 0.5;
          gl_PointSize = aSize * uPixelRatio * sizeMult * (80.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vAge;
        
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          
          // Central glow
          float glow = exp(-dist * 6.0);
          
          // 4-pointed star cross pattern
          float cross = exp(-abs(uv.x) * 12.0) + exp(-abs(uv.y) * 12.0);
          cross = min(cross, 1.0);
          
          // Diagonal star arms
          vec2 rotUv = vec2(
            uv.x * 0.707 - uv.y * 0.707,
            uv.x * 0.707 + uv.y * 0.707
          );
          float diag = exp(-abs(rotUv.x) * 16.0) + exp(-abs(rotUv.y) * 16.0);
          diag = min(diag, 1.0) * 0.4;
          
          float intensity = glow + cross * 0.5 + diag;
          
          gl_FragColor = vec4(vColor * intensity, intensity * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.sparkles = new THREE.Points(geo, this.material);
    this.group.add(this.sparkles);
    scene.add(this.group);
  }

  _resetParticle(i, positions, colors, sizes) {
    // Spawn around center area
    const angle = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 5;
    const y = 2 + Math.random() * 8;

    if (positions) {
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }

    // Color: gold / pink / white
    const ct = Math.random();
    let c;
    if (ct < 0.35) {
      c = new THREE.Color().setHSL(0.12, 0.9, 0.7); // gold
    } else if (ct < 0.65) {
      c = new THREE.Color().setHSL(0.92, 0.7, 0.75); // pink
    } else if (ct < 0.85) {
      c = new THREE.Color().setHSL(0.55, 0.5, 0.75); // light blue
    } else {
      c = new THREE.Color(1, 1, 1); // white
    }

    if (colors) {
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    if (sizes) {
      sizes[i] = 1.5 + Math.random() * 3.0;
    }

    // Velocity: gentle upward drift + outward
    this.velocitiesArray[i * 3]     = (Math.random() - 0.5) * 0.5;
    this.velocitiesArray[i * 3 + 1] = 0.2 + Math.random() * 0.6;
    this.velocitiesArray[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    this.ages[i] = 0;
    this.lifetimes[i] = SPARKLE_LIFETIME * (0.5 + Math.random() * 0.5);
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   * @param {THREE.Camera} camera
   */
  update(delta, elapsed, camera) {
    if (!this.sparkles) return;

    this.material.uniforms.uTime.value = elapsed;

    const posAttr = this.sparkles.geometry.attributes.position;
    const ageAttr = this.sparkles.geometry.attributes.aAge;

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      this.ages[i] += delta;

      if (this.ages[i] >= this.lifetimes[i]) {
        // Reset particle
        const posArr = posAttr.array;
        const colorArr = this.sparkles.geometry.attributes.color.array;
        const sizeArr = this.sparkles.geometry.attributes.aSize.array;
        this._resetParticle(i, posArr, colorArr, sizeArr);
        this.sparkles.geometry.attributes.color.needsUpdate = true;
        this.sparkles.geometry.attributes.aSize.needsUpdate = true;
      } else {
        // Move particle
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        x += this.velocitiesArray[i * 3] * delta;
        y += this.velocitiesArray[i * 3 + 1] * delta;
        z += this.velocitiesArray[i * 3 + 2] * delta;

        // Gentle spiral
        const spiralStrength = 0.3;
        x += Math.sin(elapsed * 2 + i * 0.1) * spiralStrength * delta;
        z += Math.cos(elapsed * 2 + i * 0.1) * spiralStrength * delta;

        posAttr.setXYZ(i, x, y, z);
      }

      ageAttr.setX(i, this.ages[i]);
    }

    posAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
  }

  dispose() {
    if (this.sparkles) {
      this.sparkles.geometry.dispose();
      this.material.dispose();
    }
  }
}
