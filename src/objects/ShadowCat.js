/**
 * ShadowCat.js — "Shadow" (Sleek Black Cat)
 *
 * ✦ Stylized low-poly: tall, slim, mysterious
 * ✦ Pure dark fur with blue-purple fresnel rim light
 * ✦ Glowing neon-green eyes (emissive + bloom)
 * ✦ Standing pose, long elegant tail
 * ✦ Animations: slow breathing, head scan, eye glow pulse, lazy tail sway
 *
 * Methods: init(scene), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const CAT_SCALE = 0.85;
const BODY_COLOR = 0x111111;
const SNOUT_COLOR = 0x1a1a1a;
const IRIS_COLOR = 0x00FF88;
const NOSE_COLOR = 0xCC6677;
const WHISKER_COLOR = 0xE8E8E8;
const EAR_INNER_COLOR = 0x2a0a0a;
const FRESNEL_COLOR = new THREE.Color(0x1a4080);

export class ShadowCat {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    // Named parts for animation
    /** @type {THREE.Mesh} */
    this.body = null;
    /** @type {THREE.Group} */
    this.headGroup = null;
    /** @type {THREE.Mesh} */
    this.earLeft = null;
    /** @type {THREE.Mesh} */
    this.earRight = null;
    /** @type {THREE.Group} */
    this.tailGroup = null;
    /** @type {THREE.MeshBasicMaterial} */
    this.eyeMaterialL = null;
    /** @type {THREE.MeshBasicMaterial} */
    this.eyeMaterialR = null;

    // Animation state
    this._nextHeadRaise = 5 + Math.random() * 3;
    this._headRaiseTimer = 0;
    this._headRaising = false;
    this._headRaiseProgress = 0;

    // Shared materials
    this._bodyMat = null;
    this._fresnelMat = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    // Create shared body material — velvety dark fur (NOT shiny plastic!)
    this._bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      roughness: 0.88,
      metalness: 0.0,
      map: this._createDarkFurTexture(),
      bumpMap: this._createBumpTexture(),
      bumpScale: 0.035,
    });

    this._createBody();
    this._createHead();
    this._createEars();
    this._createLegs();
    this._createTail();
    this._createShadowBlob();

    // Slight body tilt (proud posture)
    this.group.rotation.x = -0.1;

    this.group.scale.setScalar(CAT_SCALE);
    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // DARK FUR TEXTURE (subtle variation on black)
  // ═══════════════════════════════════════════════
  _createDarkFurTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Very dark base
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    // Subtle warm dark patches (prevents flat look)
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 50 + Math.random() * 80;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? '#1a1210' : '#0e0a12';
      ctx.fill();
    }

    // Dense dark fur strokes
    const darkColors = ['#151515', '#0e0e0e', '#1a1a1a', '#121012'];
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 5 + Math.random() * 12;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;

      ctx.strokeStyle = darkColors[Math.floor(Math.random() * darkColors.length)];
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // BUMP TEXTURE (fur micro-detail)
  // ═══════════════════════════════════════════════
  _createBumpTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 700; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 3 + Math.random() * 8;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const brightness = Math.random() > 0.5 ? '#8a8a8a' : '#767676';

      ctx.strokeStyle = brightness;
      ctx.lineWidth = 0.5 + Math.random() * 1.0;
      ctx.globalAlpha = 0.25 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // FRESNEL SHADER (rim light overlay)
  // ═══════════════════════════════════════════════
  _createFresnelOverlay(geometry) {
    const fresnelMat = new THREE.ShaderMaterial({
      uniforms: {
        fresnelColor: { value: FRESNEL_COLOR },
        fresnelPower: { value: 3.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 fresnelColor;
        uniform float fresnelPower;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), fresnelPower);
          gl_FragColor = vec4(fresnelColor * fresnel * 1.2, fresnel * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    const overlay = new THREE.Mesh(geometry.clone(), fresnelMat);
    return overlay;
  }

  // ═══════════════════════════════════════════════
  // BODY — LatheGeometry (sleek silhouette)
  // ═══════════════════════════════════════════════
  _createBody() {
    // LatheGeometry for a smooth, cat-shaped torso
    const points = [
      new THREE.Vector2(0, -0.7),
      new THREE.Vector2(0.65, -0.5),
      new THREE.Vector2(0.58, 0),
      new THREE.Vector2(0.62, 0.4),
      new THREE.Vector2(0.5, 0.7),
      new THREE.Vector2(0, 0.7),
    ];

    const bodyGeo = new THREE.LatheGeometry(points, 32);
    this.body = new THREE.Mesh(bodyGeo, this._bodyMat);
    this.body.scale.set(0.85, 1.0, 0.75); // slim and sleek
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // Fresnel rim light overlay
    const fresnelOverlay = this._createFresnelOverlay(bodyGeo);
    fresnelOverlay.scale.copy(this.body.scale);
    this.group.add(fresnelOverlay);
  }

  // ═══════════════════════════════════════════════
  // HEAD — with snout, glowing eyes, whiskers
  // ═══════════════════════════════════════════════
  _createHead() {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.1, 0.1);

    // Head sphere (slightly elongated)
    const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, this._bodyMat);
    headMesh.scale.set(1.0, 0.95, 0.9);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Fresnel overlay for head
    const headFresnelOverlay = this._createFresnelOverlay(headGeo);
    headFresnelOverlay.scale.set(1.0, 0.95, 0.9);
    this.headGroup.add(headFresnelOverlay);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const snoutMat = new THREE.MeshStandardMaterial({
      color: SNOUT_COLOR,
      roughness: 0.85,
      metalness: 0.0,
    });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.scale.set(1.1, 0.7, 1.3);
    snout.position.set(0, -0.05, 0.5);
    this.headGroup.add(snout);

    // Eyes (3D spheres — glowing green)
    this._createEyes();

    // Nose
    this._createNose();

    // Mouth
    this._createMouth();

    // Whiskers
    this._createWhiskers();

    this.group.add(this.headGroup);
  }

  _createEyes() {
    const createEye = (xOffset) => {
      // Iris (glowing green sphere)
      const irisGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const irisMat = new THREE.MeshBasicMaterial({
        color: IRIS_COLOR,
        toneMapped: false, // ensure bloom picks it up
      });

      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(xOffset, 0.08, 0.48);
      this.headGroup.add(iris);

      // Vertical slit pupil (flat plane)
      const pupilGeo = new THREE.PlaneGeometry(0.04, 0.14);
      const pupilMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(xOffset, 0.08, 0.575);
      this.headGroup.add(pupil);

      // Tiny specular highlight
      const highlightGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(xOffset + 0.03, 0.11, 0.57);
      this.headGroup.add(highlight);

      return irisMat;
    };

    this.eyeMaterialL = createEye(-0.2);
    this.eyeMaterialR = createEye(0.2);
  }

  _createNose() {
    // Tiny pink plane nose
    const noseGeo = new THREE.PlaneGeometry(0.06, 0.04);
    const noseMat = new THREE.MeshBasicMaterial({
      color: NOSE_COLOR,
      side: THREE.DoubleSide,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.03, 0.63);

    // Rotate slightly to align with snout curve
    nose.rotation.x = -0.15;
    this.headGroup.add(nose);
  }

  _createMouth() {
    // Straight line (stoic, unlike Mochi's cute smile)
    const mouthPoints = [
      new THREE.Vector3(-0.05, 0, 0),
      new THREE.Vector3(0.05, 0, 0),
    ];
    const mouthCurve = new THREE.LineCurve3(mouthPoints[0], mouthPoints[1]);
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 4, 0.005, 4, false);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.1, 0.6);
    this.headGroup.add(mouth);
  }

  _createWhiskers() {
    const whiskerMat = new THREE.MeshBasicMaterial({ color: WHISKER_COLOR });

    // 6 whiskers — longer than Mochi (0.9 length)
    const configs = [
      // Left side
      { pos: [-0.3, -0.02, 0.55], rot: [0, 0, -0.15], len: 0.8 },
      { pos: [-0.3, -0.06, 0.55], rot: [0, 0,  0.0],  len: 0.9 },
      { pos: [-0.3, -0.10, 0.55], rot: [0, 0,  0.15], len: 0.75 },
      // Right side
      { pos: [0.3, -0.02, 0.55], rot: [0, 0,  0.15], len: 0.8 },
      { pos: [0.3, -0.06, 0.55], rot: [0, 0,  0.0],  len: 0.9 },
      { pos: [0.3, -0.10, 0.55], rot: [0, 0, -0.15], len: 0.75 },
    ];

    configs.forEach(cfg => {
      const geo = new THREE.CylinderGeometry(0.004, 0.002, cfg.len, 4);
      geo.rotateZ(Math.PI / 2); // rotate to horizontal
      const whisker = new THREE.Mesh(geo, whiskerMat);
      whisker.position.set(...cfg.pos);
      whisker.rotation.set(...cfg.rot);
      // Flip direction for left/right
      if (cfg.pos[0] < 0) {
        whisker.rotation.y = Math.PI;
      }
      this.headGroup.add(whisker);
    });

    // One curved whisker per side (top one) using TubeGeometry
    const createCurvedWhisker = (side) => {
      const dir = side === 'left' ? -1 : 1;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(dir * 0.4, 0.02, 0),
        new THREE.Vector3(dir * 0.8, 0.1, 0),
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.003, 4, false);
      const whisker = new THREE.Mesh(tubeGeo, whiskerMat);
      whisker.position.set(dir * 0.28, 0.0, 0.55);
      this.headGroup.add(whisker);
    };

    createCurvedWhisker('left');
    createCurvedWhisker('right');
  }

  // ═══════════════════════════════════════════════
  // EARS — tall, pointed, with ear tufts
  // ═══════════════════════════════════════════════
  _createEars() {
    const earOuterMat = this._bodyMat;
    const earInnerMat = new THREE.MeshStandardMaterial({
      color: EAR_INNER_COLOR,
      roughness: 0.5,
    });

    const createEar = (xPos, zRot) => {
      const earGroup = new THREE.Group();

      // Outer ear — taller and sharper than Mochi
      const outerGeo = new THREE.ConeGeometry(0.22, 0.55, 3);
      const outer = new THREE.Mesh(outerGeo, earOuterMat);
      earGroup.add(outer);

      // Inner ear
      const innerGeo = new THREE.ConeGeometry(0.1, 0.32, 3);
      const inner = new THREE.Mesh(innerGeo, earInnerMat);
      inner.position.z = 0.05;
      inner.position.y = -0.05;
      earGroup.add(inner);

      // Ear tufts (small hairs at tip)
      const tuftMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
      for (let i = 0; i < 3; i++) {
        const tuftGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.12, 4);
        const tuft = new THREE.Mesh(tuftGeo, tuftMat);
        tuft.position.y = 0.28 + i * 0.02;
        tuft.rotation.z = (i - 1) * 0.2;
        tuft.rotation.x = (Math.random() - 0.5) * 0.15;
        earGroup.add(tuft);
      }

      earGroup.position.set(xPos, 1.5, 0.1);
      earGroup.rotation.z = zRot;

      return earGroup;
    };

    this.earLeft = createEar(-0.32, -0.15);
    this.earRight = createEar(0.32, 0.15);

    this.group.add(this.earLeft);
    this.group.add(this.earRight);
  }

  // ═══════════════════════════════════════════════
  // LEGS — tall and slim (standing pose)
  // ═══════════════════════════════════════════════
  _createLegs() {
    const pawMat = this._bodyMat;

    const createLeg = (x, z, isBack) => {
      const legGroup = new THREE.Group();

      // Upper leg (cylinder)
      const upperGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.7, 16);
      const upper = new THREE.Mesh(upperGeo, pawMat);
      upper.position.y = -0.35;
      upper.castShadow = true;
      legGroup.add(upper);

      // Paw (flattened sphere)
      const pawGeo = new THREE.SphereGeometry(0.17, 16, 16);
      const paw = new THREE.Mesh(pawGeo, pawMat);
      paw.scale.set(1.0, 0.6, 1.3);
      paw.position.y = -0.72;
      paw.castShadow = true;
      legGroup.add(paw);

      legGroup.position.set(x, -0.7, z);

      // Slight inward tilt
      if (x < 0) legGroup.rotation.z = 0.08;
      else legGroup.rotation.z = -0.08;

      return legGroup;
    };

    // Front legs
    this.group.add(createLeg(-0.35, 0.4, false));
    this.group.add(createLeg(0.35, 0.4, false));

    // Back legs (slightly wider)
    this.group.add(createLeg(-0.32, -0.35, true));
    this.group.add(createLeg(0.32, -0.35, true));
  }

  // ═══════════════════════════════════════════════
  // TAIL — long, elegant with slight curve at tip
  // ═══════════════════════════════════════════════
  _createTail() {
    this.tailGroup = new THREE.Group();

    const tailPoints = [
      new THREE.Vector3(0, 0, -0.7),
      new THREE.Vector3(0, 0.3, -1.3),
      new THREE.Vector3(0, 0.8, -1.8),
      new THREE.Vector3(0.3, 1.4, -1.6),
      new THREE.Vector3(0.5, 1.8, -1.2),
    ];

    const tailCurve = new THREE.CatmullRomCurve3(tailPoints, false, 'catmullrom', 0.5);

    // Main tail tube (thinner than Mochi)
    const tailGeo = new THREE.TubeGeometry(tailCurve, 20, 0.08, 8, false);
    const tailMesh = new THREE.Mesh(tailGeo, this._bodyMat);
    tailMesh.castShadow = true;
    this.tailGroup.add(tailMesh);

    // Fresnel overlay on tail for that blue sheen
    const tailFresnelOverlay = this._createFresnelOverlay(tailGeo);
    this.tailGroup.add(tailFresnelOverlay);

    // Tapered tip section
    const tipPoints = [
      tailPoints[3].clone(),
      tailPoints[4].clone(),
      new THREE.Vector3(0.6, 2.0, -0.9),
    ];
    const tipCurve = new THREE.CatmullRomCurve3(tipPoints, false, 'catmullrom', 0.5);
    const tipGeo = new THREE.TubeGeometry(tipCurve, 12, 0.05, 6, false);
    const tipMesh = new THREE.Mesh(tipGeo, this._bodyMat);
    this.tailGroup.add(tipMesh);

    this.group.add(this.tailGroup);
  }

  // ═══════════════════════════════════════════════
  // SHADOW BLOB (fake ground shadow)
  // ═══════════════════════════════════════════════
  _createShadowBlob() {
    const shadowGeo = new THREE.CircleGeometry(0.55, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = -1.42; // at feet level
    this.group.add(shadowBlob);
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    // ── Subtle breathing (calm, composed) ──
    if (this.body) {
      this.body.scale.y = 1.0 + Math.sin(elapsed * 0.9) * 0.015;
    }

    // ── Head sweeping scan (slow, wide) ──
    if (this.headGroup) {
      this.headGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.35;
    }

    // ── Occasional head raise (sniff air) ──
    this._headRaiseTimer += delta;
    if (!this._headRaising && this._headRaiseTimer > this._nextHeadRaise) {
      this._headRaising = true;
      this._headRaiseProgress = 0;
      this._headRaiseTimer = 0;
      this._nextHeadRaise = 5 + Math.random() * 3;
    }

    if (this._headRaising && this.headGroup) {
      this._headRaiseProgress += delta / 1.5; // 1.5s duration
      if (this._headRaiseProgress >= 1) {
        this._headRaising = false;
        this._headRaiseProgress = 0;
        this.headGroup.rotation.x = 0;
      } else {
        const raise = Math.sin(this._headRaiseProgress * Math.PI) * -0.2;
        this.headGroup.rotation.x = raise;
      }
    }

    // ── Eye glow pulse ──
    const glowIntensity = 0.8 + Math.sin(elapsed * 2.0) * 0.2;
    const glowColor = new THREE.Color(IRIS_COLOR).multiplyScalar(glowIntensity);
    if (this.eyeMaterialL) {
      this.eyeMaterialL.color.copy(glowColor);
    }
    if (this.eyeMaterialR) {
      this.eyeMaterialR.color.copy(glowColor);
    }

    // ── Tail: slow S-curve sway ──
    if (this.tailGroup) {
      this.tailGroup.rotation.z = Math.sin(elapsed * 0.6) * 0.2;
      this.tailGroup.rotation.y = Math.sin(elapsed * 0.4 + 1.0) * 0.15;
    }

    // ── Ear micro-movement ──
    if (this.earLeft) {
      this.earLeft.rotation.z = -0.15 + Math.sin(elapsed * 1.2) * 0.03;
    }
    if (this.earRight) {
      this.earRight.rotation.z = 0.15 + Math.sin(elapsed * 1.2 + 0.5) * 0.03;
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
        if (child.material.uniforms) {
          // Shader materials may have textures in uniforms
        }
        child.material.dispose();
      }
    });
  }
}
