/**
 * InteractionManager.js — Raycasting + Hover + Click Interactions
 *
 * Step 11: Interactive 3D elements
 *
 * ✦ Raycaster: casts from mouse/touch → scene objects
 * ✦ Hover: glow scale-up on balloons, bounce on gifts, sparkle on cake
 * ✦ Click: balloons pop → confetti burst, gifts jiggle → particle reveal,
 *          cake → candle blow-out animation
 * ✦ Custom cursor: pointer on hover, sparkle trail on click
 * ✦ Tooltip: floating label appears on hover
 * ✦ Optimized: throttled raycasting, object pooling for particles
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const RAYCAST_THROTTLE = 50; // ms between raycasts
const HOVER_SCALE = 1.15;
const HOVER_LERP = 0.1;
const GLOW_INTENSITY = 0.25;
const POP_PARTICLE_COUNT = 30;
const GIFT_PARTICLE_COUNT = 20;
const INTERACTION_DISTANCE = 60; // max raycast distance

// Colors for burst particles
const BURST_COLORS = [
  0xFF69B4, 0xFFD700, 0xFF6347, 0x87CEEB,
  0x98FB98, 0xDDA0DD, 0xFF8C00, 0xE6E6FA,
];

export class InteractionManager {
  constructor() {
    /** @type {THREE.Raycaster} */
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = INTERACTION_DISTANCE;

    /** @type {THREE.Vector2} */
    this.mouse = new THREE.Vector2(-10, -10); // offscreen initially

    // References to interactive objects (set from outside)
    /** @type {{ balloons: any, giftBoxes: any, cake: any, confetti: any }} */
    this.targets = { balloons: null, giftBoxes: null, cake: null, confetti: null };

    // Internal state
    /** @type {THREE.Object3D|null} */
    this.hoveredObject = null;
    this.hoveredType = null; // 'balloon' | 'gift' | 'cake'
    this.lastRaycastTime = 0;

    // Hover animation state per object
    /** @type {Map<THREE.Object3D, { scale: number, glow: number, originalScale: THREE.Vector3 }>} */
    this.hoverStates = new Map();

    // Pop/click animations in progress
    /** @type {{ mesh: THREE.Group, particles: THREE.Points, startTime: number, type: string }[]} */
    this.activeAnimations = [];

    // Scene reference
    /** @type {THREE.Scene} */
    this.scene = null;
    /** @type {THREE.Camera} */
    this.camera = null;

    // Interactive meshes registry (for fast raycast)
    /** @type {THREE.Object3D[]} */
    this.interactables = [];
    /** @type {Map<THREE.Object3D, { type: string, parent: THREE.Group, index: number }>} */
    this.objectMap = new Map();

    // DOM elements
    this.tooltip = null;
    this.cursor = null;

    // Bound handlers
    this._onMouseMove = null;
    this._onClick = null;
    this._onTouchStart = null;

    // Popped balloons track
    this.poppedBalloons = new Set();
    this.openedGifts = new Set();
    this.cakeBlownOut = false;
  }

  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {{ balloons: any, giftBoxes: any, cake: any, confetti: any }} targets
   */
  init(scene, camera, targets) {
    this.scene = scene;
    this.camera = camera;
    this.targets = targets;

    this._createUI();
    this._registerInteractables();
    this._bindEvents();
  }

  // ═══════════════════════════════════════════════
  // UI: Tooltip + Custom Cursor
  // ═══════════════════════════════════════════════
  _createUI() {
    // Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'interaction-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 100;
      padding: 6px 14px;
      background: rgba(10, 0, 21, 0.75);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 105, 180, 0.25);
      border-radius: 20px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 1px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      white-space: nowrap;
    `;
    document.body.appendChild(this.tooltip);

    // Cursor ring (magnetic effect)
    this.cursor = document.createElement('div');
    this.cursor.className = 'interaction-cursor';
    this.cursor.style.cssText = `
      position: fixed;
      z-index: 99;
      width: 32px;
      height: 32px;
      border: 1.5px solid rgba(255, 105, 180, 0.0);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: width 0.3s ease, height 0.3s ease, border-color 0.3s ease, background 0.3s ease;
    `;
    document.body.appendChild(this.cursor);

    // Click ripple container
    this.rippleContainer = document.createElement('div');
    this.rippleContainer.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 98;
      pointer-events: none;
      overflow: hidden;
    `;
    document.body.appendChild(this.rippleContainer);
  }

  // ═══════════════════════════════════════════════
  // REGISTER interactive objects for raycasting
  // ═══════════════════════════════════════════════
  _registerInteractables() {
    // Balloons
    if (this.targets.balloons && this.targets.balloons.balloons) {
      this.targets.balloons.balloons.forEach((b, idx) => {
        // Register the body mesh (first child) of each balloon group
        b.mesh.traverse(child => {
          if (child.isMesh) {
            this.interactables.push(child);
            this.objectMap.set(child, { type: 'balloon', parent: b.mesh, index: idx });
          }
        });
      });
    }

    // Gift Boxes
    if (this.targets.giftBoxes && this.targets.giftBoxes.gifts) {
      this.targets.giftBoxes.gifts.forEach((g, idx) => {
        g.mesh.traverse(child => {
          if (child.isMesh) {
            this.interactables.push(child);
            this.objectMap.set(child, { type: 'gift', parent: g.mesh, index: idx });
          }
        });
      });
    }

    // Cake
    if (this.targets.cake && this.targets.cake.group) {
      this.targets.cake.group.traverse(child => {
        if (child.isMesh && !child.material.transparent) {
          this.interactables.push(child);
          this.objectMap.set(child, { type: 'cake', parent: this.targets.cake.group, index: 0 });
        }
      });
    }
  }

  // ═══════════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════════
  _bindEvents() {
    this._onMouseMove = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._screenPos = { x: e.clientX, y: e.clientY };

      // Move cursor ring
      if (this.cursor) {
        this.cursor.style.left = e.clientX + 'px';
        this.cursor.style.top = e.clientY + 'px';
      }
    };

    this._onClick = (e) => {
      this._handleClick(e);
    };

    this._onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
        this._screenPos = { x: t.clientX, y: t.clientY };

        // Perform immediate raycast + click on touch
        this._performRaycast();
        if (this.hoveredObject) {
          this._handleClick(e);
        }
      }
    };

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('click', this._onClick, { passive: true });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
  }

  // ═══════════════════════════════════════════════
  // RAYCAST (throttled)
  // ═══════════════════════════════════════════════
  _performRaycast() {
    if (this.interactables.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const info = this.objectMap.get(hit);

      if (info) {
        // Skip already-popped balloons or opened gifts
        if (info.type === 'balloon' && this.poppedBalloons.has(info.index)) {
          this._clearHover();
          return;
        }
        if (info.type === 'gift' && this.openedGifts.has(info.index)) {
          this._clearHover();
          return;
        }

        if (this.hoveredObject !== info.parent) {
          this._clearHover();
          this.hoveredObject = info.parent;
          this.hoveredType = info.type;
          this._onHoverEnter(info);
        }
      }
    } else {
      if (this.hoveredObject) {
        this._clearHover();
      }
    }
  }

  // ═══════════════════════════════════════════════
  // HOVER: Enter / Exit
  // ═══════════════════════════════════════════════
  _onHoverEnter(info) {
    const parent = info.parent;

    // Store original scale if not already saved
    if (!this.hoverStates.has(parent)) {
      this.hoverStates.set(parent, {
        scale: 1,
        glow: 0,
        originalScale: parent.scale.clone()
      });
    }

    // Cursor → pointer + glow ring
    document.body.style.cursor = 'pointer';
    if (this.cursor) {
      this.cursor.style.width = '48px';
      this.cursor.style.height = '48px';
      this.cursor.style.borderColor = 'rgba(255, 105, 180, 0.5)';
      this.cursor.style.background = 'rgba(255, 105, 180, 0.06)';
    }

    // Show tooltip
    const labels = {
      balloon: '🎈 Click to pop!',
      gift: '🎁 Click to open!',
      cake: '🎂 Click to make a wish!'
    };
    if (this.tooltip && labels[info.type]) {
      this.tooltip.textContent = labels[info.type];
      this.tooltip.style.opacity = '1';
      this.tooltip.style.transform = 'translateY(0)';
    }
  }

  _clearHover() {
    if (!this.hoveredObject) return;

    // Reset cursor
    document.body.style.cursor = '';
    if (this.cursor) {
      this.cursor.style.width = '32px';
      this.cursor.style.height = '32px';
      this.cursor.style.borderColor = 'rgba(255, 105, 180, 0.0)';
      this.cursor.style.background = 'transparent';
    }

    // Hide tooltip
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.transform = 'translateY(6px)';
    }

    this.hoveredObject = null;
    this.hoveredType = null;
  }

  // ═══════════════════════════════════════════════
  // CLICK HANDLER
  // ═══════════════════════════════════════════════
  _handleClick(e) {
    if (!this.hoveredObject || !this.hoveredType) return;

    const info = this.objectMap.get(
      [...this.objectMap.entries()].find(([_, v]) => v.parent === this.hoveredObject)?.[0]
    );
    if (!info) return;

    // Create screen ripple
    if (this._screenPos) {
      this._createClickRipple(this._screenPos.x, this._screenPos.y);
    }

    switch (info.type) {
      case 'balloon':
        this._popBalloon(info);
        break;
      case 'gift':
        this._openGift(info);
        break;
      case 'cake':
        this._wishCake(info);
        break;
    }
  }

  // ═══════════════════════════════════════════════
  // BALLOON POP
  // ═══════════════════════════════════════════════
  _popBalloon(info) {
    if (this.poppedBalloons.has(info.index)) return;
    this.poppedBalloons.add(info.index);

    const balloon = info.parent;
    const worldPos = new THREE.Vector3();
    balloon.getWorldPosition(worldPos);

    // Get balloon color from the first child mesh
    let balloonColor = 0xFF69B4;
    balloon.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        balloonColor = child.material.color.getHex();
      }
    });

    // Create pop particles at balloon position
    this._createBurstParticles(worldPos, balloonColor, POP_PARTICLE_COUNT);

    // Quick scale-down + fade animation
    const startScale = balloon.scale.clone();
    const popAnim = {
      mesh: balloon,
      startTime: performance.now(),
      duration: 350,
      type: 'pop',
      startScale,
      update: (progress) => {
        // Expand quickly then shrink to 0
        const expand = 1 + Math.sin(progress * Math.PI) * 0.3;
        const shrink = 1 - progress;
        const s = expand * shrink;
        balloon.scale.copy(startScale).multiplyScalar(Math.max(s, 0));
        balloon.traverse(child => {
          if (child.material && child.material.opacity !== undefined) {
            child.material.transparent = true;
            child.material.opacity = 1 - progress;
          }
        });
      },
      onComplete: () => {
        balloon.visible = false;
      }
    };
    this.activeAnimations.push(popAnim);
    this._clearHover();
  }

  // ═══════════════════════════════════════════════
  // GIFT OPEN
  // ═══════════════════════════════════════════════
  _openGift(info) {
    if (this.openedGifts.has(info.index)) return;
    this.openedGifts.add(info.index);

    const gift = info.parent;
    const worldPos = new THREE.Vector3();
    gift.getWorldPosition(worldPos);

    // Get gift color
    let giftColor = 0xFFD700;
    gift.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        giftColor = child.material.color.getHex();
      }
    });

    // Create sparkle burst
    this._createBurstParticles(worldPos, giftColor, GIFT_PARTICLE_COUNT);

    // Jiggle then lid opens animation
    const startY = gift.position.y;
    const openAnim = {
      mesh: gift,
      startTime: performance.now(),
      duration: 1200,
      type: 'open',
      update: (progress) => {
        if (progress < 0.3) {
          // Jiggle phase
          const jiggle = Math.sin(progress * 30) * 0.12 * (1 - progress / 0.3);
          gift.rotation.z = jiggle;
          gift.position.y = startY + Math.sin(progress * 20) * 0.05;
        } else {
          // Open phase — lid flies up
          const openT = (progress - 0.3) / 0.7;
          gift.rotation.z = 0;

          // Find lid (second mesh child, slightly larger)
          let lidFound = false;
          gift.children.forEach(child => {
            if (child.isMesh && !lidFound && child.position.y > 0) {
              lidFound = true;
              child.position.y += openT * 0.03;
              child.rotation.x = -openT * 0.8;
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 1 - openT * 0.5;
              }
            }
          });

          // Emit continuous sparkles during opening
          if (Math.random() < 0.15) {
            const sparklePos = worldPos.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.5 + 0.3,
                (Math.random() - 0.5) * 0.5
              )
            );
            this._createBurstParticles(sparklePos, giftColor, 3);
          }
        }
      },
      onComplete: () => {
        // Gift stays open, don't hide it
      }
    };
    this.activeAnimations.push(openAnim);
    this._clearHover();
  }

  // ═══════════════════════════════════════════════
  // CAKE WISH — Blow out candles
  // ═══════════════════════════════════════════════
  _wishCake(info) {
    if (this.cakeBlownOut) return;
    this.cakeBlownOut = true;

    const cake = this.targets.cake;
    if (!cake || !cake.candles) return;

    const worldPos = new THREE.Vector3();
    cake.group.getWorldPosition(worldPos);

    // Create golden sparkle burst above cake
    const burstPos = worldPos.clone().add(new THREE.Vector3(0, 3, 0));
    this._createBurstParticles(burstPos, 0xFFD700, 40);

    // Animate candle flames shrinking
    const blowAnim = {
      mesh: cake.group,
      startTime: performance.now(),
      duration: 2000,
      type: 'blow',
      update: (progress) => {
        if (!cake.candles) return;
        cake.candles.forEach((c, idx) => {
          // Staggered blow-out: each candle slightly delayed
          const delay = idx * 0.08;
          const localProgress = Math.max(0, (progress - delay) / (1 - delay));

          if (localProgress > 0) {
            // Shrink flame
            const flameScale = Math.max(0, 1 - localProgress * 1.5);
            c.flame.scale.setScalar(flameScale);

            // Dim light
            c.light.intensity = 0.4 * flameScale;

            // Add a small smoke puff at the moment of blow-out
            if (localProgress > 0.6 && !c._smokeEmitted) {
              c._smokeEmitted = true;
              const flameWorldPos = new THREE.Vector3();
              c.flame.getWorldPosition(flameWorldPos);
              this._createSmokeParticle(flameWorldPos);
            }
          }
        });
      },
      onComplete: () => {
        // After blow-out, show a "Make a wish" message
        this._showWishMessage();
        // Auto-relight candles after 5 seconds
        setTimeout(() => {
          this.cakeBlownOut = false;
          if (cake.candles) {
            cake.candles.forEach(c => {
              c.flame.scale.setScalar(1);
              c.light.intensity = 0.4;
              c._smokeEmitted = false;
            });
          }
        }, 5000);
      }
    };
    this.activeAnimations.push(blowAnim);
    this._clearHover();
  }

  // ═══════════════════════════════════════════════
  // PARTICLE BURST — Confetti/sparkle explosion
  // ═══════════════════════════════════════════════
  _createBurstParticles(position, color, count) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const baseColor = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Random outward velocity (sphere burst)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 4;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 1.5; // bias upward
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      // Color variation
      const variant = new THREE.Color(
        BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)]
      );
      const mix = 0.5 + Math.random() * 0.5;
      const finalColor = baseColor.clone().lerp(variant, 1 - mix);
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;

      sizes[i] = 3 + Math.random() * 5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute vec3 color;
        uniform float uPixelRatio;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (80.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 12.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vColor;
        
        void main() {
          // Soft circle
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.2, d) * uOpacity;
          
          // Bright glow core
          float core = smoothstep(0.3, 0.0, d) * 0.5;
          vec3 color = vColor + core;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    // Track animation
    this.activeAnimations.push({
      mesh: points,
      startTime: performance.now(),
      duration: 1500,
      type: 'burst',
      velocities,
      gravity: -3.5,
      update: (progress) => {
        const posAttr = points.geometry.attributes.position;
        const dt = 0.016; // approximate frame time

        for (let i = 0; i < count; i++) {
          let x = posAttr.getX(i);
          let y = posAttr.getY(i);
          let z = posAttr.getZ(i);

          // Apply velocity with decay
          const decay = 1 - progress * 0.5;
          x += velocities[i * 3] * dt * decay;
          y += velocities[i * 3 + 1] * dt * decay;
          z += velocities[i * 3 + 2] * dt * decay;

          // Gravity
          velocities[i * 3 + 1] += -3.5 * dt;

          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;

        // Fade out
        mat.uniforms.uOpacity.value = 1 - Math.pow(progress, 2);
      },
      onComplete: () => {
        this.scene.remove(points);
        geo.dispose();
        mat.dispose();
      }
    });
  }

  // ═══════════════════════════════════════════════
  // SMOKE PARTICLE (for candle blow-out)
  // ═══════════════════════════════════════════════
  _createSmokeParticle(position) {
    const count = 5;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.1;
      sizes[i] = 2 + Math.random() * 3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.5 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uPixelRatio;
        
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (60.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 10.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * uOpacity;
          gl_FragColor = vec4(0.7, 0.7, 0.75, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const smoke = new THREE.Points(geo, mat);
    this.scene.add(smoke);

    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = 0.5 + Math.random() * 0.5; // rise up
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    this.activeAnimations.push({
      mesh: smoke,
      startTime: performance.now(),
      duration: 1200,
      type: 'smoke',
      velocities,
      update: (progress) => {
        const posAttr = smoke.geometry.attributes.position;
        const dt = 0.016;

        for (let i = 0; i < count; i++) {
          let x = posAttr.getX(i);
          let y = posAttr.getY(i);
          let z = posAttr.getZ(i);

          x += velocities[i * 3] * dt;
          y += velocities[i * 3 + 1] * dt;
          z += velocities[i * 3 + 2] * dt;

          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;

        mat.uniforms.uOpacity.value = 0.5 * (1 - progress);
      },
      onComplete: () => {
        this.scene.remove(smoke);
        geo.dispose();
        mat.dispose();
      }
    });
  }

  // ═══════════════════════════════════════════════
  // CLICK RIPPLE (screen-space 2D effect)
  // ═══════════════════════════════════════════════
  _createClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 105, 180, 0.5);
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: interaction-ripple 0.8s ease-out forwards;
    `;
    this.rippleContainer.appendChild(ripple);

    // Add a second inner ripple (gold)
    const ripple2 = document.createElement('div');
    ripple2.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      border: 1px solid rgba(255, 215, 0, 0.4);
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: interaction-ripple 0.8s 0.1s ease-out forwards;
    `;
    this.rippleContainer.appendChild(ripple2);

    setTimeout(() => {
      ripple.remove();
      ripple2.remove();
    }, 1000);
  }

  // ═══════════════════════════════════════════════
  // WISH MESSAGE overlay
  // ═══════════════════════════════════════════════
  _showWishMessage() {
    const msg = document.createElement('div');
    msg.className = 'wish-message';
    msg.innerHTML = `
      <div class="wish-stars">✧ ✦ ✧</div>
      <div class="wish-text">Make a wish!</div>
      <div class="wish-sub">The candles will relight in a moment...</div>
    `;
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      z-index: 200;
      text-align: center;
      opacity: 0;
      pointer-events: none;
      animation: wish-appear 0.6s 0.5s ease-out forwards;
    `;
    document.body.appendChild(msg);

    // Style inner elements
    const stars = msg.querySelector('.wish-stars');
    stars.style.cssText = `
      font-size: 1.5rem;
      color: #FFD700;
      margin-bottom: 12px;
      letter-spacing: 8px;
      animation: wish-sparkle 1.5s ease-in-out infinite;
    `;

    const text = msg.querySelector('.wish-text');
    text.style.cssText = `
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #FF69B4, #FFD700, #E6E6FA);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    `;

    const sub = msg.querySelector('.wish-sub');
    sub.style.cssText = `
      font-family: 'DM Sans', sans-serif;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
      font-weight: 300;
    `;

    // Auto-remove after 4 seconds
    setTimeout(() => {
      msg.style.animation = 'wish-disappear 0.5s ease-in forwards';
      setTimeout(() => msg.remove(), 600);
    }, 4000);
  }

  // ═══════════════════════════════════════════════
  // UPDATE (called every frame from main.js)
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   * @param {THREE.Camera} camera
   */
  update(delta, elapsed, camera) {
    this.camera = camera;

    // Throttled raycast
    const now = performance.now();
    if (now - this.lastRaycastTime > RAYCAST_THROTTLE) {
      this.lastRaycastTime = now;
      this._performRaycast();
    }

    // Update hover animations (smooth scale)
    this.hoverStates.forEach((state, obj) => {
      const isHovered = (obj === this.hoveredObject);
      const targetScale = isHovered ? HOVER_SCALE : 1;

      state.scale += (targetScale - state.scale) * HOVER_LERP;
      state.glow += ((isHovered ? GLOW_INTENSITY : 0) - state.glow) * HOVER_LERP;

      // Apply scale
      const s = state.scale;
      obj.scale.copy(state.originalScale).multiplyScalar(s);

      // Apply emissive glow
      if (isHovered) {
        obj.traverse(child => {
          if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = state.glow;
          }
        });
      }

      // Cleanup if returned to normal
      if (!isHovered && Math.abs(state.scale - 1) < 0.001) {
        obj.scale.copy(state.originalScale);
        obj.traverse(child => {
          if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 0.05;
          }
        });
        this.hoverStates.delete(obj);
      }
    });

    // Update tooltip position
    if (this.tooltip && this._screenPos && this.hoveredObject) {
      this.tooltip.style.left = (this._screenPos.x + 16) + 'px';
      this.tooltip.style.top = (this._screenPos.y - 30) + 'px';
    }

    // Update active animations
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      const elapsed = performance.now() - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (anim.update) {
        anim.update(progress);
      }

      if (progress >= 1) {
        if (anim.onComplete) anim.onComplete();
        this.activeAnimations.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════
  dispose() {
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
    if (this._onClick) window.removeEventListener('click', this._onClick);
    if (this._onTouchStart) window.removeEventListener('touchstart', this._onTouchStart);

    if (this.tooltip) this.tooltip.remove();
    if (this.cursor) this.cursor.remove();
    if (this.rippleContainer) this.rippleContainer.remove();

    // Clean up active animations
    this.activeAnimations.forEach(anim => {
      if (anim.onComplete) anim.onComplete();
    });
    this.activeAnimations = [];
    this.hoverStates.clear();
    this.objectMap.clear();
    this.interactables = [];
  }
}
