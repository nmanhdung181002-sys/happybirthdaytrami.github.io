/**
 * Environment.js — Sky, Stars, Clouds, Floating Island
 *
 * ✦ Starfield: 8000 particles in sphere radius=500, twinkle shader
 * ✦ Floating Island: combined geometries (cylinder + sphere) + grass wind shader
 * ✦ Volumetric clouds: billboard sprite planes below island
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const STAR_COUNT = 8000;
const STAR_SPHERE_RADIUS = 500;
const STAR_MIN_SIZE = 0.5;
const STAR_MAX_SIZE = 3.0;

const ISLAND_RADIUS_TOP = 12;
const ISLAND_RADIUS_BOTTOM = 8;
const ISLAND_HEIGHT = 4;
const ISLAND_Y = -2;

const GRASS_COUNT = 300;
const GRASS_SPREAD = 10;
const GRASS_HEIGHT = 0.6;

const CLOUD_COUNT = 18;
const CLOUD_Y_RANGE = 5;
const CLOUD_SPREAD = 18;

export class Environment {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {THREE.Points} */
    this.starfield = null;
    /** @type {THREE.ShaderMaterial} */
    this.starMaterial = null;

    /** @type {THREE.Group} */
    this.islandGroup = null;

    /** @type {THREE.Mesh} */
    this.grassMesh = null;
    /** @type {THREE.ShaderMaterial} */
    this.grassMaterial = null;

    /** @type {{ mesh: THREE.Mesh, speed: number, phase: number, baseY: number }[]} */
    this.clouds = [];

    /** @type {{ mesh: THREE.Mesh, baseIntensity: number, glowSpeed: number, glowPhase: number }[]} */
    this.crystals = [];
    /** @type {{ light: THREE.PointLight, baseIntensity: number, glowSpeed: number, glowPhase: number }[]} */
    this.crystalLights = [];
    /** @type {THREE.Points} */
    this.fireflies = null;
    /** @type {THREE.ShaderMaterial} */
    this.fireflyMaterial = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this._createStarfield();
    this._createIsland();
    this._createGrass();
    this._createClouds();
    this._createMagicalCrystals();
    this._createFireflies();

    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // 1. STARFIELD — 8000 particles, twinkle shader
  // ═══════════════════════════════════════════════
  _createStarfield() {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT); // for twinkle

    for (let i = 0; i < STAR_COUNT; i++) {
      // Random position on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = STAR_SPHERE_RADIUS * (0.3 + Math.random() * 0.7);

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Gradient color: white cold → warm yellow → light purple
      const colorType = Math.random();
      const c = new THREE.Color();
      if (colorType < 0.4) {
        // Cool white / blue-white
        c.setHSL(0.6 + Math.random() * 0.1, 0.1 + Math.random() * 0.2, 0.8 + Math.random() * 0.2);
      } else if (colorType < 0.7) {
        // Warm yellow / gold
        c.setHSL(0.1 + Math.random() * 0.05, 0.4 + Math.random() * 0.3, 0.7 + Math.random() * 0.2);
      } else {
        // Light purple / lavender
        c.setHSL(0.75 + Math.random() * 0.1, 0.3 + Math.random() * 0.3, 0.7 + Math.random() * 0.2);
      }
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Random size
      sizes[i] = STAR_MIN_SIZE + Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE);

      // Random phase for twinkle
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uGlobalOpacity: { value: 1.0 }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 color;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        void main() {
          vColor = color;
          
          // Twinkle: sin(time + randomOffset) modulates opacity
          float twinkle = sin(uTime * 0.8 + aPhase) * 0.4 + 0.6;
          vAlpha = twinkle;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uGlobalOpacity;
        
        void main() {
          // Soft circular point
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          
          gl_FragColor = vec4(vColor, glow * vAlpha * 0.9 * uGlobalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geometry, this.starMaterial);
    this.group.add(this.starfield);
  }

  // ═══════════════════════════════════════════════
  // 2. FLOATING ISLAND — combined geometries
  // ═══════════════════════════════════════════════
  _createIsland() {
    this.islandGroup = new THREE.Group();
    this.islandGroup.position.y = ISLAND_Y;

    // Main platform — top surface (flat cylinder top)
    const topGeo = new THREE.CylinderGeometry(
      ISLAND_RADIUS_TOP, ISLAND_RADIUS_TOP, 0.8, 64
    );
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x3d6b3d,    // dark green grass
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = ISLAND_HEIGHT / 2;
    topMesh.receiveShadow = true;
    this.islandGroup.add(topMesh);

    // Rocky body — tapered cylinder (island cliff)
    const bodyGeo = new THREE.CylinderGeometry(
      ISLAND_RADIUS_TOP, ISLAND_RADIUS_BOTTOM, ISLAND_HEIGHT, 32, 4
    );
    // Distort vertices for rocky look
    const bodyPos = bodyGeo.attributes.position;
    for (let i = 0; i < bodyPos.count; i++) {
      const x = bodyPos.getX(i);
      const y = bodyPos.getY(i);
      const z = bodyPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 1) {
        const noise = Math.sin(x * 2.3 + y * 1.7) * 0.5
                    + Math.cos(z * 3.1 + y * 0.8) * 0.3;
        bodyPos.setX(i, x + noise);
        bodyPos.setZ(i, z + noise * 0.8);
      }
    }
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x6b5b45,    // earthy brown
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.islandGroup.add(bodyMesh);

    // Bottom stalactites — pointed cones hanging
    const stalactiteCount = 5;
    for (let i = 0; i < stalactiteCount; i++) {
      const angle = (i / stalactiteCount) * Math.PI * 2 + Math.random() * 0.5;
      const r = ISLAND_RADIUS_BOTTOM * (0.3 + Math.random() * 0.4);
      const height = 2 + Math.random() * 3;
      const radius = 0.8 + Math.random() * 1.5;

      const coneGeo = new THREE.ConeGeometry(radius, height, 6);
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0x5a4a3a,
        roughness: 1.0,
        flatShading: true
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(
        Math.cos(angle) * r,
        -ISLAND_HEIGHT / 2 - height / 2,
        Math.sin(angle) * r
      );
      cone.rotation.x = Math.PI; // point downward
      cone.castShadow = true;
      this.islandGroup.add(cone);
    }

    // Edge rocks — scattered boulders for natural look
    const rockCount = 8;
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.3;
      const r = ISLAND_RADIUS_TOP * (0.7 + Math.random() * 0.35);
      const size = 0.4 + Math.random() * 0.8;

      const rockGeo = new THREE.DodecahedronGeometry(size, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.2 + Math.random() * 0.2, 0.3 + Math.random() * 0.15),
        roughness: 1.0,
        flatShading: true
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        Math.cos(angle) * r,
        ISLAND_HEIGHT / 2 + size * 0.2,
        Math.sin(angle) * r
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this.islandGroup.add(rock);
    }

    this.group.add(this.islandGroup);
  }

  // ═══════════════════════════════════════════════
  // 3. GRASS — instanced planes with wind shader
  // ═══════════════════════════════════════════════
  _createGrass() {
    const grassGeo = new THREE.PlaneGeometry(0.1, GRASS_HEIGHT, 1, 4);
    // Shift pivot to bottom
    grassGeo.translate(0, GRASS_HEIGHT / 2, 0);

    this.grassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x1a4a12) }, // deep green base
        uColor2: { value: new THREE.Color(0x5aaf3b) }, // bright green mid
        uColor3: { value: new THREE.Color(0x8adf5b) }, // yellow-green tip
        uWindStrength: { value: 0.2 }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWindStrength;
        
        varying float vHeight;
        varying float vInstanceHash;
        
        void main() {
          vHeight = uv.y;
          
          // Instance-based variation seed
          float ix = instanceMatrix[3][0];
          float iz = instanceMatrix[3][2];
          vInstanceHash = fract(sin(ix * 12.9898 + iz * 78.233) * 43758.5453);
          
          vec3 pos = position;
          
          // Multi-frequency wind for natural grass motion
          float windFactor = pow(uv.y, 2.0);
          
          // Primary wind wave
          float wind1 = sin(uTime * 2.0 + ix * 0.5 + iz * 0.3) * uWindStrength;
          // Secondary faster gust
          float wind2 = sin(uTime * 4.5 + ix * 1.2 + iz * 0.8) * uWindStrength * 0.3;
          // Tertiary slow sway
          float wind3 = sin(uTime * 0.8 + ix * 0.15 + iz * 0.2) * uWindStrength * 0.5;
          
          pos.x += (wind1 + wind2 + wind3) * windFactor;
          pos.z += cos(uTime * 1.5 + ix * 0.3 + iz * 0.5) * uWindStrength * 0.4 * windFactor;
          
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        
        varying float vHeight;
        varying float vInstanceHash;
        
        void main() {
          // Tri-color gradient: base → mid → tip
          vec3 color;
          if (vHeight < 0.5) {
            color = mix(uColor1, uColor2, vHeight * 2.0);
          } else {
            color = mix(uColor2, uColor3, (vHeight - 0.5) * 2.0);
          }
          
          // Per-instance color variation (subtle warmth/coolness)
          color *= 0.85 + vInstanceHash * 0.3;
          
          // Alpha fade at blade tips for soft look
          float alpha = 1.0 - smoothstep(0.7, 1.0, vHeight) * 0.4;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.grassMesh = new THREE.InstancedMesh(grassGeo, this.grassMaterial, GRASS_COUNT);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < GRASS_COUNT; i++) {
      // Random position on island top surface (circular distribution)
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * GRASS_SPREAD;
      
      dummy.position.set(
        Math.cos(angle) * radius,
        ISLAND_Y + ISLAND_HEIGHT / 2 + 0.35,
        Math.sin(angle) * radius
      );
      dummy.rotation.y = Math.random() * Math.PI;
      const scale = 0.7 + Math.random() * 0.6;
      dummy.scale.set(scale, scale + Math.random() * 0.5, scale);
      dummy.updateMatrix();

      this.grassMesh.setMatrixAt(i, dummy.matrix);
    }

    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.grassMesh);
  }

  // ═══════════════════════════════════════════════
  // 4. VOLUMETRIC CLOUDS — billboard sprites below island
  // ═══════════════════════════════════════════════
  _createClouds() {
    // Generate cloud texture procedurally
    const cloudTexture = this._generateCloudTexture();

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const size = 6 + Math.random() * 10;
      const cloudGeo = new THREE.PlaneGeometry(size, size * 0.6);
      const cloudMat = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.15,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      });

      const cloud = new THREE.Mesh(cloudGeo, cloudMat);

      // Position: scattered below island
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * CLOUD_SPREAD;
      const y = ISLAND_Y - ISLAND_HEIGHT / 2 - 2 - Math.random() * CLOUD_Y_RANGE;

      cloud.position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );

      // Billboard: face camera (set onBeforeRender in update)
      cloud.lookAt(0, y, 100); // initial face toward camera

      this.clouds.push({
        mesh: cloud,
        speed: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        baseY: y,
        driftSpeed: 0.02 + Math.random() * 0.03,
        driftPhase: Math.random() * Math.PI * 2
      });

      this.group.add(cloud);
    }
  }

  /**
   * Generate procedural cloud texture using Canvas 2D
   * @returns {THREE.CanvasTexture}
   */
  _generateCloudTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Radial gradient — soft cloud puff
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(200, 180, 220, 1)');     // lavender center
    gradient.addColorStop(0.3, 'rgba(180, 160, 200, 0.7)');
    gradient.addColorStop(0.6, 'rgba(160, 140, 180, 0.3)');
    gradient.addColorStop(1, 'rgba(140, 120, 160, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add some noise puffs
    for (let i = 0; i < 5; i++) {
      const x = size / 2 + (Math.random() - 0.5) * size * 0.4;
      const y = size / 2 + (Math.random() - 0.5) * size * 0.3;
      const r = 20 + Math.random() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(210, 190, 230, 0.5)');
      g.addColorStop(1, 'rgba(180, 160, 200, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   * @param {THREE.Camera} camera
   */
  update(delta, elapsed, camera) {
    // Starfield twinkle
    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = elapsed;
    }

    // Grass wind
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uTime.value = elapsed;
    }

    // Island gentle float
    if (this.islandGroup) {
      this.islandGroup.position.y = ISLAND_Y + Math.sin(elapsed * 0.4) * 0.5;
      this.islandGroup.rotation.y = Math.sin(elapsed * 0.15) * 0.05;
    }

    // Clouds: billboard + drift
    this.clouds.forEach(c => {
      // Billboard: face camera
      if (camera) {
        c.mesh.lookAt(camera.position);
      }
      // Gentle Y drift
      c.mesh.position.y = c.baseY + Math.sin(elapsed * c.speed + c.phase) * 0.8;
      // Lateral drift
      c.mesh.position.x += Math.sin(elapsed * c.driftSpeed + c.driftPhase) * 0.002;
    });

    // Update magical crystals pulsation
    if (this.crystals) {
      this.crystals.forEach(c => {
        c.mesh.material.emissiveIntensity = c.baseIntensity * (0.6 + Math.sin(elapsed * c.glowSpeed + c.glowPhase) * 0.4);
      });
    }

    if (this.crystalLights) {
      this.crystalLights.forEach(l => {
        l.light.intensity = l.baseIntensity * (0.7 + Math.sin(elapsed * l.glowSpeed + l.glowPhase) * 0.3);
      });
    }

    // Update fireflies time uniform
    if (this.fireflyMaterial) {
      this.fireflyMaterial.uniforms.uTime.value = elapsed;
    }
  }

  // ═══════════════════════════════════════════════
  // 5. MAGICAL CRYSTALS — 8 clusters on island edges
  // ═══════════════════════════════════════════════
  _createMagicalCrystals() {
    this.crystals = [];
    this.crystalLights = [];

    const crystalColors = [
      { color: 0x00ffcc, emissive: 0x00ffcc }, // Neon Emerald
      { color: 0xff007f, emissive: 0xff007f }, // Magenta / Deep Pink
      { color: 0xffaa00, emissive: 0xffaa00 }  // Amber / Gold
    ];

    const clusterCount = 8;
    for (let i = 0; i < clusterCount; i++) {
      const colorInfo = crystalColors[i % crystalColors.length];
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.3;
      const r = ISLAND_RADIUS_TOP - 0.7; // near the edge of the island top
      
      const baseX = Math.cos(angle) * r;
      const baseZ = Math.sin(angle) * r;
      const baseY = ISLAND_HEIGHT / 2 + 0.1; // on top surface

      // Create a small group for this cluster
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(baseX, baseY, baseZ);

      // Create 2-3 crystals per cluster
      const crystalCountInCluster = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < crystalCountInCluster; j++) {
        const height = 0.6 + Math.random() * 0.8;
        const radius = 0.15 + Math.random() * 0.15;
        
        // 5-sided cone looks exactly like a natural quartz crystal tip
        const crystalGeo = new THREE.ConeGeometry(radius, height, 5);
        crystalGeo.translate(0, height / 2, 0); // pivot at bottom

        const crystalMat = new THREE.MeshStandardMaterial({
          color: colorInfo.color,
          emissive: colorInfo.emissive,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
          flatShading: true
        });

        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        
        // Random slight offsets and tilt within cluster
        const ox = (j === 0) ? 0 : (Math.random() - 0.5) * 0.4;
        const oz = (j === 0) ? 0 : (Math.random() - 0.5) * 0.4;
        crystal.position.set(ox, 0, oz);
        
        crystal.rotation.set(
          (Math.random() - 0.5) * 0.3,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        );

        crystal.castShadow = true;
        crystal.receiveShadow = true;
        clusterGroup.add(crystal);

        // Store for animation
        this.crystals.push({
          mesh: crystal,
          baseIntensity: 0.8,
          glowSpeed: 1.0 + Math.random() * 1.5,
          glowPhase: Math.random() * Math.PI * 2
        });
      }

      // Add a PointLight inside the cluster
      const light = new THREE.PointLight(colorInfo.color, 1.2, 5);
      light.position.set(0, 0.4, 0);
      light.castShadow = false; // PointLight shadows are expensive, disable to keep 60fps
      clusterGroup.add(light);

      this.crystalLights.push({
        light: light,
        baseIntensity: 1.2,
        glowSpeed: 1.0 + Math.random() * 1.5,
        glowPhase: Math.random() * Math.PI * 2
      });

      // Add cluster group to islandGroup so it floats in sync
      this.islandGroup.add(clusterGroup);
    }
  }

  // ═══════════════════════════════════════════════
  // 6. FLOATING FIREFLIES — particles moving in 3D
  // ═══════════════════════════════════════════════
  _createFireflies() {
    const fireflyCount = 45;
    const positions = new Float32Array(fireflyCount * 3);
    const phases = new Float32Array(fireflyCount);
    const speeds = new Float32Array(fireflyCount);
    const randomScales = new Float32Array(fireflyCount);

    for (let i = 0; i < fireflyCount; i++) {
      // Position around the island top (radius up to 10)
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 8;
      // Height between 3 and 7 (floating above island surface)
      const y = 3 + Math.random() * 4.5;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 0.8;
      randomScales[i] = 0.5 + Math.random() * 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(randomScales, 1));

    this.fireflyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aScale;
        
        varying float vTwinkle;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        void main() {
          vec3 pos = position;
          
          // Sinusoidal movement in 3D
          pos.y += sin(uTime * 0.8 * aSpeed + aPhase) * 0.4;
          pos.x += sin(uTime * 0.5 * aSpeed + aPhase) * 0.6;
          pos.z += cos(uTime * 0.6 * aSpeed + aPhase) * 0.6;
          
          // Output twinkle value to fragment shader
          vTwinkle = sin(uTime * 1.5 * aSpeed + aPhase) * 0.4 + 0.6;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Point size based on distance and scale
          gl_PointSize = aScale * 8.0 * uPixelRatio * (20.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 16.0);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vTwinkle;
        
        void main() {
          // Circular soft glow particle
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Soft edge glow
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 2.0); // sharp center, soft outer glow
          
          // Warm gold/yellow-green firefly color
          vec3 fireflyColor = vec3(0.85, 0.95, 0.2); // glowing yellow-green
          
          gl_FragColor = vec4(fireflyColor, glow * vTwinkle * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.fireflies = new THREE.Points(geometry, this.fireflyMaterial);
    
    // Add to islandGroup so they float with the island
    this.islandGroup.add(this.fireflies);
  }

  // ═══════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════
  dispose() {
    if (this.starfield) {
      this.starfield.geometry.dispose();
      this.starMaterial.dispose();
    }
    if (this.grassMesh) {
      this.grassMesh.geometry.dispose();
      this.grassMaterial.dispose();
    }
    this.clouds.forEach(c => {
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    });
    if (this.crystals) {
      this.crystals.forEach(c => {
        c.mesh.geometry.dispose();
        c.mesh.material.dispose();
      });
    }
    if (this.fireflies) {
      this.fireflies.geometry.dispose();
      this.fireflyMaterial.dispose();
    }
  }
}
