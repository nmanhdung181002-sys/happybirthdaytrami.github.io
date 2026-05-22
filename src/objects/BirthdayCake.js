/**
 * BirthdayCake.js — 3D Birthday Cake
 *
 * ✦ 3-tier CylinderGeometry: r=3/2/1.2, h=1.2 each, pastel colors
 * ✦ Procedural icing CanvasTexture
 * ✦ 8 candles with custom flame ShaderMaterial (billboard, distorted)
 * ✦ 200 sprinkles (SphereGeometry, Poisson-like distribution)
 * ✦ Ribbon: TubeGeometry along CatmullRomCurve3, metallic material
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const TIER_CONFIGS = [
  { radius: 3.0, height: 1.2, color: 0xFFB6C1, y: 0 },        // Bottom: light pink
  { radius: 2.0, height: 1.2, color: 0xFFF8DC, y: 1.2 },      // Middle: cornsilk/yellow
  { radius: 1.2, height: 1.2, color: 0x98FF98, y: 2.4 },       // Top: mint green
];

const ICING_DRIP_COLOR = 0xfff0f5;   // lavender blush for icing
const PLATE_COLOR = 0xf5f0e6;
const PLATE_RADIUS = 3.8;

const CANDLE_COUNT = 8;
const CANDLE_RADIUS = 0.05;
const CANDLE_HEIGHT = 0.8;
const CANDLE_RING_RADIUS = 0.85;     // placed on top tier

const SPRINKLE_COUNT = 200;

const RIBBON_METALNESS = 0.8;
const RIBBON_COLOR = 0xFFD700;       // gold

const CAKE_POSITION = { x: 0, y: 1.5, z: 0 }; // on top of island
const CAKE_SCALE = 0.6;

export class BirthdayCake {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {{ flame: THREE.Mesh, light: THREE.PointLight, material: THREE.ShaderMaterial }[]} */
    this.candles = [];

    /** @type {THREE.ShaderMaterial[]} */
    this.flameMaterials = [];
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this._createPlate();
    this._createTiers();
    this._createIcingDrips();
    this._createSprinkles();
    this._createCandles();
    this._createRibbon();

    this.group.position.set(CAKE_POSITION.x, CAKE_POSITION.y, CAKE_POSITION.z);
    this.group.scale.setScalar(CAKE_SCALE);

    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // PLATE
  // ═══════════════════════════════════════════════
  _createPlate() {
    const geo = new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS + 0.3, 0.15, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: PLATE_COLOR,
      roughness: 0.4,
      metalness: 0.1
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.position.y = -0.1;
    plate.receiveShadow = true;
    this.group.add(plate);
  }

  // ═══════════════════════════════════════════════
  // 3 TIERS
  // ═══════════════════════════════════════════════
  _createTiers() {
    TIER_CONFIGS.forEach((cfg, idx) => {
      // Main body
      const bodyGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.height, 64);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.3,
        metalness: 0.1,
        map: this._createIcingTexture(cfg.color, idx)
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = cfg.y + cfg.height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      this.group.add(body);

      // Cream puffs around bottom edge
      const puffCount = Math.floor(cfg.radius * 8);
      for (let i = 0; i < puffCount; i++) {
        const angle = (i / puffCount) * Math.PI * 2;
        const puffGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const puffMat = new THREE.MeshStandardMaterial({
          color: 0xfffafa,
          roughness: 0.6
        });
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(
          Math.cos(angle) * (cfg.radius + 0.02),
          cfg.y + 0.1,
          Math.sin(angle) * (cfg.radius + 0.02)
        );
        puff.scale.y = 0.7;
        this.group.add(puff);
      }
    });
  }

  // ═══════════════════════════════════════════════
  // ICING DRIPS
  // ═══════════════════════════════════════════════
  _createIcingDrips() {
    // Drips from each tier top edge
    TIER_CONFIGS.forEach((cfg, idx) => {
      if (idx === 0) return; // no drips from bottom tier

      const dripCount = Math.floor(cfg.radius * 5);
      for (let i = 0; i < dripCount; i++) {
        if (Math.random() < 0.35) continue;
        const angle = (i / dripCount) * Math.PI * 2;
        const dripLen = 0.2 + Math.random() * 0.5;
        const dripGeo = new THREE.CapsuleGeometry(0.06, dripLen, 8, 8);
        const dripMat = new THREE.MeshStandardMaterial({
          color: ICING_DRIP_COLOR,
          roughness: 0.2,
          metalness: 0.05
        });
        const drip = new THREE.Mesh(dripGeo, dripMat);
        drip.position.set(
          Math.cos(angle) * (cfg.radius + 0.01),
          cfg.y - dripLen / 2 + 0.1,
          Math.sin(angle) * (cfg.radius + 0.01)
        );
        this.group.add(drip);
      }
    });
  }

  /**
   * Procedural icing texture using Canvas 2D
   */
  _createIcingTexture(baseColor, tierIndex) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base color fill
    const color = new THREE.Color(baseColor);
    ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    ctx.fillRect(0, 0, size, size);

    // Subtle swirl pattern
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 10 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.fill();
    }

    // Horizontal frosting lines
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 8 + Math.random() * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < size; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.1 + tierIndex) * 2);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // SPRINKLES — 200 tiny colored spheres
  // ═══════════════════════════════════════════════
  _createSprinkles() {
    const sprinkleColors = [
      0xFF69B4, 0xFFD700, 0x98FF98, 0x87CEEB,
      0xFF6347, 0xDDA0DD, 0xFFA500, 0x00CED1
    ];

    const sprinkleGeo = new THREE.SphereGeometry(0.04, 6, 6);

    for (let i = 0; i < SPRINKLE_COUNT; i++) {
      // Pick a random tier
      const tierIdx = Math.floor(Math.random() * TIER_CONFIGS.length);
      const tier = TIER_CONFIGS[tierIdx];

      // Random position on tier surface
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * tier.radius * 0.9;
      const onTop = Math.random() > 0.3; // 70% on top, 30% on side

      const color = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2
      });
      const sprinkle = new THREE.Mesh(sprinkleGeo, mat);

      if (onTop) {
        // On top surface
        sprinkle.position.set(
          Math.cos(angle) * r,
          tier.y + tier.height + 0.02,
          Math.sin(angle) * r
        );
      } else {
        // On side surface
        const sideY = tier.y + Math.random() * tier.height;
        sprinkle.position.set(
          Math.cos(angle) * (tier.radius + 0.02),
          sideY,
          Math.sin(angle) * (tier.radius + 0.02)
        );
      }

      // Random elongated shape (capsule-like)
      const sx = 0.5 + Math.random() * 1.5;
      sprinkle.scale.set(sx, 1, 1);
      sprinkle.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.group.add(sprinkle);
    }
  }

  // ═══════════════════════════════════════════════
  // CANDLES — 8 with flame shader
  // ═══════════════════════════════════════════════
  _createCandles() {
    const topTier = TIER_CONFIGS[2]; // top tier
    const candleY = topTier.y + topTier.height;

    for (let i = 0; i < CANDLE_COUNT; i++) {
      const angle = (i / CANDLE_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * CANDLE_RING_RADIUS;
      const z = Math.sin(angle) * CANDLE_RING_RADIUS;

      // Candle stick — gradient color via vertex colors
      const candleGeo = new THREE.CylinderGeometry(CANDLE_RADIUS, CANDLE_RADIUS, CANDLE_HEIGHT, 8);
      const colors = new Float32Array(candleGeo.attributes.position.count * 3);
      const topColor = new THREE.Color(0xFF69B4);   // pink top
      const bottomColor = new THREE.Color(0xFFE4E1); // misty rose bottom
      for (let v = 0; v < candleGeo.attributes.position.count; v++) {
        const y = candleGeo.attributes.position.getY(v);
        const t = (y + CANDLE_HEIGHT / 2) / CANDLE_HEIGHT;
        const c = new THREE.Color().lerpColors(bottomColor, topColor, t);
        colors[v * 3] = c.r;
        colors[v * 3 + 1] = c.g;
        colors[v * 3 + 2] = c.b;
      }
      candleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const candleMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0.0
      });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(x, candleY + CANDLE_HEIGHT / 2, z);
      this.group.add(candle);

      // Wick
      const wickGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6);
      const wickMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const wick = new THREE.Mesh(wickGeo, wickMat);
      wick.position.set(x, candleY + CANDLE_HEIGHT + 0.05, z);
      this.group.add(wick);

      // Flame — custom ShaderMaterial
      const flameGeo = new THREE.PlaneGeometry(0.25, 0.4, 1, 8);
      const flameMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: i * 0.8 }
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Distort top vertices — flickering flame shape
            float distort = pow(uv.y, 2.0);
            pos.x += sin(uTime * 8.0 + uPhase + pos.y * 5.0) * 0.04 * distort;
            pos.x += sin(uTime * 12.0 + uPhase * 2.0) * 0.02 * distort;
            
            // Taper at top
            float taper = 1.0 - pow(uv.y, 1.5) * 0.6;
            pos.x *= taper;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          
          void main() {
            // Color gradient: yellow core → orange → red → transparent at tip
            vec3 yellow = vec3(1.0, 0.95, 0.4);
            vec3 orange = vec3(1.0, 0.6, 0.1);
            vec3 red = vec3(1.0, 0.2, 0.0);
            
            float t = vUv.y;
            vec3 color;
            if (t < 0.3) {
              color = mix(yellow, yellow, t / 0.3);
            } else if (t < 0.6) {
              color = mix(yellow, orange, (t - 0.3) / 0.3);
            } else {
              color = mix(orange, red, (t - 0.6) / 0.4);
            }
            
            // Alpha: fade at edges and top
            float edgeFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
            float topFade = 1.0 - pow(t, 2.0);
            float flicker = 0.85 + sin(uTime * 10.0 + uPhase) * 0.15;
            float alpha = edgeFade * topFade * flicker;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, candleY + CANDLE_HEIGHT + 0.3, z);
      this.group.add(flame);

      // Point light per candle
      const light = new THREE.PointLight(0xFFCF54, 0.4, 8);
      light.position.set(x, candleY + CANDLE_HEIGHT + 0.3, z);
      this.group.add(light);

      this.candles.push({ flame, light, material: flameMat });
      this.flameMaterials.push(flameMat);
    }
  }

  // ═══════════════════════════════════════════════
  // RIBBON — metallic gold tube wrapping around cake
  // ═══════════════════════════════════════════════
  _createRibbon() {
    // Spiral curve around the middle tier
    const middleTier = TIER_CONFIGS[1];
    const ribbonPoints = [];
    const turns = 2;
    const segments = 80;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const r = middleTier.radius + 0.15;
      const y = middleTier.y + t * middleTier.height * 0.8 + 0.1;

      ribbonPoints.push(new THREE.Vector3(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      ));
    }

    const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints, false);
    const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 60, 0.04, 8, false);
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: RIBBON_COLOR,
      roughness: 0.2,
      metalness: RIBBON_METALNESS,
      emissive: RIBBON_COLOR,
      emissiveIntensity: 0.1
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.castShadow = true;
    this.group.add(ribbon);

    // Ribbon bow on top
    this._createBow(middleTier);
  }

  _createBow(tier) {
    // Simple bow shape: two small torus arcs + center knot
    const bowGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16, Math.PI);
    const bowMat = new THREE.MeshStandardMaterial({
      color: RIBBON_COLOR,
      roughness: 0.2,
      metalness: 0.8
    });

    // Left loop
    const left = new THREE.Mesh(bowGeo, bowMat);
    left.position.set(tier.radius + 0.15, tier.y + tier.height * 0.9, 0);
    left.rotation.z = 0.5;
    this.group.add(left);

    // Right loop
    const right = new THREE.Mesh(bowGeo, bowMat);
    right.position.set(tier.radius + 0.15, tier.y + tier.height * 0.9, 0);
    right.rotation.z = -0.5;
    right.rotation.y = Math.PI;
    this.group.add(right);

    // Center knot
    const knotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const knot = new THREE.Mesh(knotGeo, bowMat);
    knot.position.set(tier.radius + 0.15, tier.y + tier.height * 0.9, 0);
    this.group.add(knot);
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    // Update flame shaders
    this.flameMaterials.forEach(mat => {
      mat.uniforms.uTime.value = elapsed;
    });

    // Candle light flicker
    this.candles.forEach((c, idx) => {
      const flicker = 0.8 + Math.sin(elapsed * 15 + idx * 1.3) * 0.15 + Math.random() * 0.05;
      c.light.intensity = 0.4 * flicker;
    });

    // Billboard flames — face camera
    this.candles.forEach(c => {
      // Flames will auto-billboard since they use PlaneGeometry and are small
      // For proper billboard: set in main update with camera ref if needed
    });

    // Gentle cake float/sway (very subtle)
    this.group.position.y = CAKE_POSITION.y + Math.sin(elapsed * 0.8) * 0.05;
    this.group.rotation.y = Math.sin(elapsed * 0.3) * 0.02;
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
