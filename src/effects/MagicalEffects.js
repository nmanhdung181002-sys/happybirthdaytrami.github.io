/**
 * MagicalEffects.js — Centralized magical shader effects
 *
 * ✦ Magic ring: glowing torus ring orbiting cake, holographic shimmer
 * ✦ Floating light orbs: small emissive spheres drifting lazily
 * ✦ Fairy dust trail: tiny sparkle particles in a spiral
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const RING_RADIUS = 3.5;
const RING_TUBE = 0.03;
const RING_Y = 4.0;

const ORB_COUNT = 20;
const ORB_SPREAD = 6;
const ORB_Y_CENTER = 4;

const FAIRY_COUNT = 600;
const FAIRY_SPIRAL_RADIUS = 2.5;
const FAIRY_HEIGHT = 6;

export class MagicalEffects {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {THREE.Mesh} */
    this.magicRing = null;
    /** @type {THREE.ShaderMaterial} */
    this.ringMaterial = null;

    /** @type {{ mesh: THREE.Mesh, phase: number, speed: number, radius: number }[]} */
    this.orbs = [];

    /** @type {THREE.Points} */
    this.fairyDust = null;
    /** @type {THREE.ShaderMaterial} */
    this.fairyMaterial = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this._createMagicRing();
    this._createFloatingOrbs();
    this._createFairyDust();

    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // 1. MAGIC RING — glowing torus orbiting cake
  // ═══════════════════════════════════════════════
  _createMagicRing() {
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 16, 100);

    this.ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        void main() {
          vUv = uv;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        vec3 hsl2rgb(float h, float s, float l) {
          vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
        }
        
        void main() {
          // Traveling rainbow along the ring
          float hue = fract(vUv.x * 2.0 - uTime * 0.15);
          vec3 color = hsl2rgb(hue, 0.8, 0.65);
          
          // Pulse brightness
          float pulse = sin(vUv.x * 30.0 - uTime * 5.0) * 0.3 + 0.7;
          
          // Sparkle
          float sparkle = pow(sin(vUv.x * 60.0 + uTime * 8.0) * 0.5 + 0.5, 8.0);
          
          color *= pulse;
          color += vec3(1.0) * sparkle * 0.5;
          
          // Alpha with glow at edges
          float alpha = 0.6 + sparkle * 0.4;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.magicRing = new THREE.Mesh(ringGeo, this.ringMaterial);
    this.magicRing.position.y = RING_Y;
    this.magicRing.rotation.x = Math.PI / 2;
    this.group.add(this.magicRing);

    // Second ring at an angle
    const ring2Geo = new THREE.TorusGeometry(RING_RADIUS * 1.1, RING_TUBE * 0.7, 16, 100);
    const ring2 = new THREE.Mesh(ring2Geo, this.ringMaterial);
    ring2.position.y = RING_Y;
    ring2.rotation.x = Math.PI / 2 + 0.3;
    ring2.rotation.z = 0.5;
    this.group.add(ring2);
  }

  // ═══════════════════════════════════════════════
  // 2. FLOATING LIGHT ORBS
  // ═══════════════════════════════════════════════
  _createFloatingOrbs() {
    const orbGeo = new THREE.SphereGeometry(0.08, 8, 8);

    for (let i = 0; i < ORB_COUNT; i++) {
      const hue = Math.random();
      const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
      const orbMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);

      // Random spherical position
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * ORB_SPREAD;
      const y = ORB_Y_CENTER - 1 + Math.random() * 4;

      orb.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      // Add glow sprite
      const glowCanvas = this._createGlowTexture(color);
      const glowMat = new THREE.SpriteMaterial({
        map: glowCanvas,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.4
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(0.6);
      orb.add(glow);

      this.group.add(orb);
      this.orbs.push({
        mesh: orb,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        radius: radius,
        angle: angle,
        baseY: y
      });
    }
  }

  _createGlowTexture(color) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.5)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  // ═══════════════════════════════════════════════
  // 3. FAIRY DUST — spiral particle system
  // ═══════════════════════════════════════════════
  _createFairyDust() {
    const positions = new Float32Array(FAIRY_COUNT * 3);
    const sizes = new Float32Array(FAIRY_COUNT);
    const phases = new Float32Array(FAIRY_COUNT);
    const colors = new Float32Array(FAIRY_COUNT * 3);

    for (let i = 0; i < FAIRY_COUNT; i++) {
      // Spiral distribution
      const t = i / FAIRY_COUNT;
      const spiralAngle = t * Math.PI * 8; // 4 full rotations
      const r = FAIRY_SPIRAL_RADIUS * (0.3 + t * 0.7) + (Math.random() - 0.5) * 1.0;
      const y = t * FAIRY_HEIGHT + 1.5 + (Math.random() - 0.5) * 1.0;

      positions[i * 3]     = Math.cos(spiralAngle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(spiralAngle) * r;

      sizes[i] = 1.0 + Math.random() * 3.0;
      phases[i] = Math.random() * Math.PI * 2;

      // Color: gold / pink / white sparkle
      const col = new THREE.Color();
      const ct = Math.random();
      if (ct < 0.4) {
        col.setHSL(0.12, 0.8, 0.7); // gold
      } else if (ct < 0.7) {
        col.setHSL(0.92, 0.6, 0.75); // pink
      } else {
        col.setHSL(0.0, 0.0, 0.95); // white
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.fairyMaterial = new THREE.ShaderMaterial({
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
          
          // Spiral motion — rotate over time
          vec3 pos = position;
          float angle = uTime * 0.3 + aPhase;
          float r = length(pos.xz);
          float currentAngle = atan(pos.z, pos.x) + angle;
          pos.x = cos(currentAngle) * r;
          pos.z = sin(currentAngle) * r;
          
          // Vertical oscillation
          pos.y += sin(uTime * 1.5 + aPhase) * 0.3;
          
          // Twinkle
          float twinkle = sin(uTime * 3.0 + aPhase * 5.0) * 0.5 + 0.5;
          vAlpha = 0.3 + twinkle * 0.7;
          
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (80.0 / -mvPos.z) * (0.5 + twinkle * 0.5);
          gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Star-shaped sparkle
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 2.0);
          
          // Cross sparkle pattern
          vec2 uv = gl_PointCoord - 0.5;
          float cross = exp(-abs(uv.x) * 15.0) + exp(-abs(uv.y) * 15.0);
          cross = min(cross, 1.0) * 0.3;
          
          gl_FragColor = vec4(vColor, (glow + cross) * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.fairyDust = new THREE.Points(geo, this.fairyMaterial);
    this.group.add(this.fairyDust);
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    // Magic ring rotation
    if (this.ringMaterial) {
      this.ringMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.magicRing) {
      this.magicRing.rotation.z = elapsed * 0.2;
    }

    // Floating orbs — lazy drift
    this.orbs.forEach(o => {
      const newAngle = o.angle + elapsed * 0.08;
      o.mesh.position.x = Math.cos(newAngle + o.phase) * o.radius;
      o.mesh.position.z = Math.sin(newAngle + o.phase) * o.radius;
      o.mesh.position.y = o.baseY + Math.sin(elapsed * o.speed + o.phase) * 0.5;

      // Pulse opacity
      const pulse = 0.4 + Math.sin(elapsed * 2 + o.phase) * 0.3;
      o.mesh.material.opacity = pulse;
    });

    // Fairy dust
    if (this.fairyMaterial) {
      this.fairyMaterial.uniforms.uTime.value = elapsed;
    }
  }

  // ═══════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════
  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}
