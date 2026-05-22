/**
 * YukiCat.js — "Yuki" (White Sleeping Cat in Loaf Position)
 *
 * ✦ Stylized low-poly chibi: loaf position (bread loaf shape)
 * ✦ White/cream fur with subtle texture
 * ✦ Closed happy eyes, tiny pink nose, rosy cheeks
 * ✦ Tail curled around body
 * ✦ Sleeping animations: deep breathing, ear flick, tail twitch, ZZZ float
 *
 * Methods: init(scene), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const CAT_SCALE = 0.75;
const BODY_COLOR = 0xFAFAFA;
const CHEEK_COLOR = 0xFFE4E8;
const INNER_EAR_COLOR = 0xFFB6C1;
const NOSE_COLOR = 0xE8828C;
const EYE_COLOR = 0x8B7355;
const WHISKER_COLOR = 0xC8B8A0;

export class YukiCat {
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

    // ZZZ sprites
    /** @type {{ sprite: THREE.Sprite, startY: number }[]} */
    this.zzz = [];

    // Animation state
    this._nextEarFlick = 2 + Math.random() * 3;
    this._earFlickTimer = 0;
    this._earFlicking = false;
    this._earFlickProgress = 0;

    this._nextTailTwitch = 4 + Math.random() * 3;
    this._tailTwitchTimer = 0;
    this._tailTwitching = false;
    this._tailTwitchProgress = 0;

    // Toon gradient texture (shared)
    this._toonGradient = this._createToonGradient();

    // Shared materials
    this._bodyMat = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    // Create shared body material — soft matte fur feel
    this._bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      roughness: 0.92,
      metalness: 0.0,
      map: this._createFurTexture(),
      bumpMap: this._createBumpTexture(),
      bumpScale: 0.04,
    });

    this._createBody();
    this._createHead();
    this._createEars();
    this._createPaws();
    this._createTail();
    this._createShadowBlob();
    this._createZZZ();

    this.group.scale.setScalar(CAT_SCALE);
    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // TOON GRADIENT (kept for ear materials)
  // ═══════════════════════════════════════════════
  _createToonGradient() {
    const colors = new Uint8Array([40, 90, 140, 195, 255]);
    const texture = new THREE.DataTexture(colors, 5, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // BUMP TEXTURE (breaks smooth plastic look)
  // ═══════════════════════════════════════════════
  _createBumpTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Mid-gray base
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Dense fur-like noise strokes
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 10;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
      const brightness = Math.random() > 0.5 ? '#909090' : '#707070';

      ctx.strokeStyle = brightness;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
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
  // FUR TEXTURE (subtle white/cream canvas)
  // ═══════════════════════════════════════════════
  _createFurTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base warm cream (not pure white — avoids sterile look)
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, size, size);

    // Layer 1: warm undertone patches (visible!)
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 40 + Math.random() * 80;
      const hue = Math.random() > 0.5 ? '#FFF0DB' : '#F0E6D8';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hue;
      ctx.fill();
    }

    // Layer 2: Dense fur strokes (much more visible!)
    const furColors = ['#E0D8CC', '#D8D0C4', '#E8E2D8', '#D0C8BC'];
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 5 + Math.random() * 14;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;

      ctx.strokeStyle = furColors[Math.floor(Math.random() * furColors.length)];
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.15 + Math.random() * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Layer 3: Subtle pink-ish warmth near belly area
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#FFE8E0';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.7, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ═══════════════════════════════════════════════
  // BODY — Loaf shape (flattened sphere)
  // ═══════════════════════════════════════════════
  _createBody() {
    const bodyGeo = new THREE.SphereGeometry(0.55, 32, 32);
    this.body = new THREE.Mesh(bodyGeo, this._bodyMat);
    this.body.scale.set(1.3, 0.55, 0.95);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);
  }

  // ═══════════════════════════════════════════════
  // HEAD — with cheeks and face details
  // ═══════════════════════════════════════════════
  _createHead() {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.55, 0.55);
    this.headGroup.rotation.x = 0.3; // head nodding forward (sleeping)

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, this._bodyMat);
    headMesh.scale.set(1.0, 0.92, 1.0);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Rosy cheeks
    const cheekMat = new THREE.MeshStandardMaterial({
      color: CHEEK_COLOR,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });
    const cheekGeo = new THREE.SphereGeometry(0.22, 16, 16);

    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.scale.set(1.3, 0.8, 0.9);
    cheekL.position.set(-0.35, -0.1, 0.45);
    this.headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.scale.set(1.3, 0.8, 0.9);
    cheekR.position.set(0.35, -0.1, 0.45);
    this.headGroup.add(cheekR);

    // Closed eyes (happy arc curves)
    this._createClosedEyes();

    // Nose
    this._createNose();

    // Mouth (tiny happy smile)
    this._createMouth();

    // Whiskers
    this._createWhiskers();

    this.group.add(this.headGroup);
  }

  _createClosedEyes() {
    const eyeMat = new THREE.MeshBasicMaterial({ color: EYE_COLOR });

    // Create arc curve for closed eye shape
    const createEyeArc = (xOffset) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.09, 0.02, 0),
        new THREE.Vector3(0, -0.04, 0),
        new THREE.Vector3(0.09, 0.02, 0),
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.012, 6, false);
      const eye = new THREE.Mesh(tubeGeo, eyeMat);
      eye.position.set(xOffset, 0.05, 0.55);
      this.headGroup.add(eye);

      // Tiny eyelashes (3 small lines curving outward)
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.3;
        const point = curve.getPoint(t);
        const lashGeo = new THREE.CylinderGeometry(0.004, 0.002, 0.06, 4);
        const lash = new THREE.Mesh(lashGeo, eyeMat);
        lash.position.set(
          xOffset + point.x,
          0.05 + point.y + 0.03,
          0.55
        );
        lash.rotation.z = (xOffset > 0 ? -1 : 1) * (0.2 + i * 0.15);
        this.headGroup.add(lash);
      }
    };

    createEyeArc(-0.2); // left eye
    createEyeArc(0.2);  // right eye
  }

  _createNose() {
    // Tiny triangle nose
    const noseShape = new THREE.Shape();
    noseShape.moveTo(0, 0.03);
    noseShape.lineTo(-0.025, -0.015);
    noseShape.lineTo(0.025, -0.015);
    noseShape.closePath();

    const noseGeo = new THREE.ShapeGeometry(noseShape);
    const noseMat = new THREE.MeshBasicMaterial({ color: NOSE_COLOR });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.05, 0.59);
    this.headGroup.add(nose);
  }

  _createMouth() {
    // Tiny "w" smile
    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.05, 0, 0),
      new THREE.Vector3(0, -0.025, 0),
      new THREE.Vector3(0.05, 0, 0),
    );
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 8, 0.006, 4, false);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xC06070 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.1, 0.57);
    this.headGroup.add(mouth);
  }

  _createWhiskers() {
    const whiskerMat = new THREE.MeshBasicMaterial({ color: WHISKER_COLOR });

    // 4 visible whiskers (2 hidden under cheeks in sleeping pose)
    const configs = [
      // Left side
      { pos: [-0.28, -0.06, 0.5], rot: [0, 0, -0.1], len: 0.5 },
      { pos: [-0.28, -0.1, 0.5], rot: [0, 0, 0.05], len: 0.45 },
      // Right side
      { pos: [0.28, -0.06, 0.5], rot: [0, 0, 0.1], len: 0.5 },
      { pos: [0.28, -0.1, 0.5], rot: [0, 0, -0.05], len: 0.45 },
    ];

    configs.forEach(cfg => {
      const geo = new THREE.CylinderGeometry(0.004, 0.003, cfg.len, 4);
      geo.rotateZ(Math.PI / 2); // rotate to horizontal
      const whisker = new THREE.Mesh(geo, whiskerMat);
      whisker.position.set(...cfg.pos);
      whisker.rotation.set(...cfg.rot);
      // Slight droop for sleeping
      whisker.rotation.z += cfg.pos[0] < 0 ? -0.15 : 0.15;
      this.headGroup.add(whisker);
    });
  }

  // ═══════════════════════════════════════════════
  // EARS — small, rounded (British Shorthair style)
  // ═══════════════════════════════════════════════
  _createEars() {
    const earOuterMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      roughness: 0.9,
      metalness: 0.0,
    });
    const earInnerMat = new THREE.MeshStandardMaterial({
      color: INNER_EAR_COLOR,
      roughness: 0.85,
      metalness: 0.0,
    });

    const createEar = (xPos, zRot) => {
      const earGroup = new THREE.Group();

      // Outer ear
      const outerGeo = new THREE.ConeGeometry(0.24, 0.35, 3);
      const outer = new THREE.Mesh(outerGeo, earOuterMat);
      outer.scale.x = 1.1;
      earGroup.add(outer);

      // Inner ear (pink)
      const innerGeo = new THREE.ConeGeometry(0.13, 0.2, 3);
      const inner = new THREE.Mesh(innerGeo, earInnerMat);
      inner.position.z = 0.05;
      inner.position.y = -0.03;
      earGroup.add(inner);

      earGroup.position.set(xPos, 1.0, 0.55);
      earGroup.rotation.z = zRot;
      earGroup.rotation.x = 0.15; // tilted forward (head is nodding)

      return earGroup;
    };

    this.earLeft = createEar(-0.32, -0.1);
    this.earRight = createEar(0.32, 0.1);

    this.group.add(this.earLeft);
    this.group.add(this.earRight);
  }

  // ═══════════════════════════════════════════════
  // PAWS — barely visible (loaf position)
  // ═══════════════════════════════════════════════
  _createPaws() {
    const pawMat = this._bodyMat;
    const pawGeo = new THREE.SphereGeometry(0.18, 16, 16);

    // Front paws: just barely peeking out
    const pawL = new THREE.Mesh(pawGeo, pawMat);
    pawL.scale.set(1.0, 0.4, 1.0);
    pawL.position.set(-0.35, -0.28, 0.55);
    this.group.add(pawL);

    const pawR = new THREE.Mesh(pawGeo, pawMat);
    pawR.scale.set(1.0, 0.4, 1.0);
    pawR.position.set(0.35, -0.28, 0.55);
    this.group.add(pawR);

    // Contact shadow disc (flat bottom)
    const discGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.05, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xEEEEEE,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.32;
    this.group.add(disc);
  }

  // ═══════════════════════════════════════════════
  // TAIL — wraps around body
  // ═══════════════════════════════════════════════
  _createTail() {
    this.tailGroup = new THREE.Group();

    const tailPoints = [
      new THREE.Vector3(-0.5, -0.15, -0.4),
      new THREE.Vector3(-0.9, -0.2, 0.0),
      new THREE.Vector3(-0.7, -0.2, 0.5),
      new THREE.Vector3(-0.2, -0.22, 0.7),
      new THREE.Vector3(0.3, -0.22, 0.65),
    ];

    const tailCurve = new THREE.CatmullRomCurve3(tailPoints, false, 'catmullrom', 0.5);

    // Main tail tube
    const tailGeo = new THREE.TubeGeometry(tailCurve, 24, 0.09, 8, false);
    const tailMesh = new THREE.Mesh(tailGeo, this._bodyMat);
    tailMesh.castShadow = true;
    this.tailGroup.add(tailMesh);

    // Thinner tip section
    const tipPoints = [
      tailPoints[3].clone(),
      tailPoints[4].clone(),
      new THREE.Vector3(0.45, -0.22, 0.55),
    ];
    const tipCurve = new THREE.CatmullRomCurve3(tipPoints, false, 'catmullrom', 0.5);
    const tipGeo = new THREE.TubeGeometry(tipCurve, 12, 0.06, 6, false);
    const tipMesh = new THREE.Mesh(tipGeo, this._bodyMat);
    this.tailGroup.add(tipMesh);

    // Tail tip ball
    const tipBallGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const tipBall = new THREE.Mesh(tipBallGeo, this._bodyMat);
    tipBall.position.copy(tipPoints[2]);
    this.tailGroup.add(tipBall);

    this.group.add(this.tailGroup);
  }

  // ═══════════════════════════════════════════════
  // SHADOW BLOB (fake ground shadow)
  // ═══════════════════════════════════════════════
  _createShadowBlob() {
    const shadowGeo = new THREE.CircleGeometry(0.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = -0.34;
    this.group.add(shadowBlob);
  }

  // ═══════════════════════════════════════════════
  // ZZZ SPRITES (floating sleep text)
  // ═══════════════════════════════════════════════
  _createZZZ() {
    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 64, 64);
      ctx.font = `bold ${18 + i * 4}px DM Sans, sans-serif`;
      ctx.fillStyle = '#E6E6FA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.8;
      ctx.fillText('Z', 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      const scale = 0.2 + i * 0.08;
      sprite.scale.set(scale, scale, 1);

      const startY = 1.3 + i * 0.15;
      sprite.position.set(0.2 + i * 0.1, startY, 0.6);

      this.group.add(sprite);
      this.zzz.push({
        sprite,
        startY,
        phase: i * 1.2,
      });
    }
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    // ── Deep breathing (slow, sleeping) ──
    const breathe = Math.sin(elapsed * 0.8);
    if (this.body) {
      this.body.scale.y = 0.55 + breathe * 0.022;
      this.body.scale.x = 1.3 - breathe * 0.005;
    }

    // Head bob with breathing
    if (this.headGroup) {
      this.headGroup.position.y = 0.55 + breathe * 0.015;
    }

    // ── Ear flick (random trigger) ──
    this._earFlickTimer += delta;
    if (!this._earFlicking && this._earFlickTimer > this._nextEarFlick) {
      this._earFlicking = true;
      this._earFlickProgress = 0;
      this._earFlickTimer = 0;
      this._nextEarFlick = 2 + Math.random() * 3;
    }

    if (this._earFlicking) {
      this._earFlickProgress += delta / 0.3; // 0.3s duration
      if (this._earFlickProgress >= 1) {
        this._earFlicking = false;
        this._earFlickProgress = 0;
      } else {
        const flick = Math.sin(this._earFlickProgress * Math.PI) * 0.25;
        if (this.earLeft) {
          this.earLeft.rotation.z = -0.1 - flick;
        }
      }
    } else {
      // Resting position
      if (this.earLeft) this.earLeft.rotation.z = -0.1;
      if (this.earRight) this.earRight.rotation.z = 0.1;
    }

    // ── Tail dream twitch (random) ──
    this._tailTwitchTimer += delta;
    if (!this._tailTwitching && this._tailTwitchTimer > this._nextTailTwitch) {
      this._tailTwitching = true;
      this._tailTwitchProgress = 0;
      this._tailTwitchTimer = 0;
      this._nextTailTwitch = 4 + Math.random() * 3;
    }

    if (this._tailTwitching && this.tailGroup) {
      this._tailTwitchProgress += delta / 0.2; // 0.2s duration
      if (this._tailTwitchProgress >= 1) {
        this._tailTwitching = false;
        this._tailTwitchProgress = 0;
        this.tailGroup.rotation.z = 0;
      } else {
        const twitch = Math.sin(this._tailTwitchProgress * Math.PI * 2) * 0.12;
        this.tailGroup.rotation.z = twitch;
      }
    }

    // ── ZZZ floating text ──
    this.zzz.forEach((z, i) => {
      const loopDuration = 3.0;
      const t = ((elapsed * 0.5 + z.phase) % loopDuration) / loopDuration;

      z.sprite.position.y = z.startY + t * 1.0;
      z.sprite.position.x = 0.2 + i * 0.1 + Math.sin(elapsed * 0.8 + z.phase) * 0.05;

      // Fade in then out
      let opacity = 0;
      if (t < 0.2) {
        opacity = t / 0.2;
      } else if (t < 0.7) {
        opacity = 1;
      } else {
        opacity = 1 - (t - 0.7) / 0.3;
      }
      z.sprite.material.opacity = opacity * 0.6;
    });
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
