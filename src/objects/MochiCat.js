/**
 * MochiCat.js — "Mochi" (Realistic Orange Tabby Cat)
 *
 * ✦ Anatomically proportioned cat body — elongated torso, flexible spine
 * ✦ Properly shaped head with muzzle, jaw, brow ridge
 * ✦ Jointed legs with shoulders, elbows, paws
 * ✦ Detailed face: 3D eyes with iris/pupil, nose, ears
 * ✦ Rich orange tabby fur texture with bump map
 * ✦ Smooth animations: breathing, head turn, tail sway, walking bob
 *
 * Methods: init(scene), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const CAT_SCALE = 0.8;

// Realistic colors
const FUR_ORANGE    = 0xD4854A;
const FUR_DARK      = 0x9C5E2A;
const FUR_LIGHT     = 0xF0C8A0;
const BELLY_COLOR   = 0xF5E6D0;
const NOSE_COLOR    = 0xE8A0A0;
const EYE_IRIS      = 0xC8A832;   // amber/golden
const PUPIL_COLOR   = 0x1A1008;
const INNER_EAR     = 0xE8B8B0;
const PAW_PAD       = 0xD4948C;
const WHISKER_COLOR = 0xE8E0D0;

export class MochiCat {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    // Named parts for animation
    /** @type {THREE.Group} */
    this.bodyGroup = null;
    /** @type {THREE.Group} */
    this.headGroup = null;
    /** @type {THREE.Group} */
    this.earLeftGroup = null;
    /** @type {THREE.Group} */
    this.earRightGroup = null;
    /** @type {THREE.Group} */
    this.tailGroup = null;
    /** @type {THREE.Group[]} */
    this.legs = [];

    // Blink state
    this._nextBlink = 3 + Math.random() * 2;
    this._blinkTimer = 0;
    this._blinking = false;
    this._blinkProgress = 0;
    /** @type {THREE.Mesh[]} */
    this._eyelidMeshes = [];

    // Materials
    this._furMat = null;
    this._bellyMat = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this._furMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
      map: this._createFurTexture(),
      bumpMap: this._createBumpTexture(),
      bumpScale: 0.18,
    });

    this._bellyMat = new THREE.MeshStandardMaterial({
      color: BELLY_COLOR,
      roughness: 0.95,
      metalness: 0.0,
      bumpMap: this._createBumpTexture(),
      bumpScale: 0.15,
    });

    // White fur for head
    this._headMat = new THREE.MeshStandardMaterial({
      color: 0xFAFAFA,
      roughness: 0.88,
      metalness: 0.0,
      bumpMap: this._createBumpTexture(),
      bumpScale: 0.14,
    });

    this._buildBody();
    this._buildHead();
    this._buildEars();
    this._buildLegs();
    this._buildTail();
    this._buildShadowBlob();

    this.group.scale.setScalar(CAT_SCALE);
    scene.add(this.group);
  }

  // ═══════════════════════════════════════════════
  // TEXTURES
  // ═══════════════════════════════════════════════
  _createFurTexture() {
    const s = 512;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base warm orange
    ctx.fillStyle = '#D4854A';
    ctx.fillRect(0, 0, s, s);

    // Subtle orange variation
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#C07030' : '#E0A060';
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 30 + Math.random() * 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tabby stripes (darker streaks)
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#7A3A10';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const x = s * 0.1 + i * s * 0.07;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + 20 * (Math.random() - 0.5), s * 0.3,
        x + 30 * (Math.random() - 0.5), s * 0.6,
        x + 15 * (Math.random() - 0.5), s
      );
      ctx.stroke();
    }

    // Dense individual fur strokes
    const furTones = ['#B06828', '#C07838', '#A06020', '#D09050'];
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const len = 3 + Math.random() * 8;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      ctx.strokeStyle = furTones[Math.floor(Math.random() * furTones.length)];
      ctx.lineWidth = 0.3 + Math.random() * 0.8;
      ctx.globalAlpha = 0.1 + Math.random() * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _createBumpTexture() {
    const s = 512;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);

    for (let i = 0; i < 800; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const len = 2 + Math.random() * 6;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
      ctx.strokeStyle = Math.random() > 0.5 ? '#8c8c8c' : '#747474';
      ctx.lineWidth = 0.3 + Math.random() * 1.0;
      ctx.globalAlpha = 0.25 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // ═══════════════════════════════════════════════
  // BODY — Elongated, realistic cat torso
  // Uses LatheGeometry with proper cat silhouette
  // ═══════════════════════════════════════════════
  _buildBody() {
    this.bodyGroup = new THREE.Group();

    // Main torso — LatheGeometry with cat profile
    // Profile: narrow chest → wider ribs → narrow waist → wider hips
    const profile = [
      new THREE.Vector2(0,    -1.0),   // tail end (closed)
      new THREE.Vector2(0.32, -0.9),   // hip start
      new THREE.Vector2(0.42, -0.7),   // hip widest
      new THREE.Vector2(0.38, -0.4),   // waist
      new THREE.Vector2(0.36, -0.1),   // lower ribs
      new THREE.Vector2(0.40,  0.2),   // ribcage widest
      new THREE.Vector2(0.38,  0.5),   // upper chest
      new THREE.Vector2(0.32,  0.7),   // shoulders
      new THREE.Vector2(0.22,  0.85),  // neck base
      new THREE.Vector2(0.15,  0.95),  // neck
      new THREE.Vector2(0,     1.0),   // neck top (closed)
    ];

    const torsoGeo = new THREE.LatheGeometry(profile, 24);
    this._applyTabbyColors(torsoGeo);
    const torso = new THREE.Mesh(torsoGeo, this._furMat);
    torso.rotation.x = Math.PI / 2; // lay horizontal
    torso.scale.set(1.0, 1.0, 0.85); // slightly flatten sides
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Add fur shell layers on top of torso
    this._addFurShells(torso);

    // Belly underside — lighter colored patch
    const bellyGeo = new THREE.SphereGeometry(0.35, 20, 12, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4);
    const belly = new THREE.Mesh(bellyGeo, this._bellyMat);
    belly.scale.set(1.0, 0.7, 1.8);
    belly.position.set(0, -0.15, -0.1);
    belly.rotation.x = -0.1;
    this.bodyGroup.add(belly);

    // Chest/throat — lighter area
    const chestGeo = new THREE.SphereGeometry(0.22, 16, 10);
    const chest = new THREE.Mesh(chestGeo, this._bellyMat);
    chest.scale.set(0.9, 0.8, 0.7);
    chest.position.set(0, -0.05, 0.75);
    this.bodyGroup.add(chest);

    // Spine ridge — subtle raised line on back
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.38, -0.8),
      new THREE.Vector3(0, 0.42, -0.3),
      new THREE.Vector3(0, 0.40,  0.2),
      new THREE.Vector3(0, 0.35,  0.7),
    ]);
    const spineGeo = new THREE.TubeGeometry(spineCurve, 16, 0.04, 6, false);
    const spine = new THREE.Mesh(spineGeo, this._furMat);
    this.bodyGroup.add(spine);

    // Position body: center of cat is at body center
    this.bodyGroup.position.y = 0.65;
    this.group.add(this.bodyGroup);
  }

  // ═══════════════════════════════════════════════
  // HEAD — Anatomically shaped skull with muzzle
  // ═══════════════════════════════════════════════
  _buildHead() {
    this.headGroup = new THREE.Group();

    // Skull (main head shape — NOT a sphere, more like a rounded box)
    const skullGeo = new THREE.SphereGeometry(0.38, 24, 20);
    // Flatten top & slightly elongate
    const skullPos = skullGeo.attributes.position;
    for (let i = 0; i < skullPos.count; i++) {
      let x = skullPos.getX(i);
      let y = skullPos.getY(i);
      let z = skullPos.getZ(i);
      // Flatten top of head slightly
      if (y > 0.15) y *= 0.9;
      // Widen cheeks
      if (y < 0 && y > -0.2) x *= 1.1;
      // Push muzzle forward
      if (z > 0.2 && y < 0) z *= 1.15;
      skullPos.setXYZ(i, x, y, z);
    }
    skullGeo.computeVertexNormals();
    const skull = new THREE.Mesh(skullGeo, this._headMat);
    skull.castShadow = true;
    this.headGroup.add(skull);

    // Muzzle (protruding snout area)
    const muzzleGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const muzzle = new THREE.Mesh(muzzleGeo, this._headMat);
    muzzle.scale.set(0.9, 0.65, 1.1);
    muzzle.position.set(0, -0.12, 0.3);
    this.headGroup.add(muzzle);

    // Chin
    const chinGeo = new THREE.SphereGeometry(0.1, 12, 8);
    const chin = new THREE.Mesh(chinGeo, this._bellyMat);
    chin.scale.set(0.8, 0.5, 0.7);
    chin.position.set(0, -0.22, 0.22);
    this.headGroup.add(chin);

    // Brow ridge (slight bump above eyes)
    const browGeo = new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const browL = new THREE.Mesh(browGeo, this._headMat);
    browL.scale.set(1.3, 0.4, 0.8);
    browL.position.set(-0.13, 0.12, 0.28);
    this.headGroup.add(browL);
    const browR = browL.clone();
    browR.position.x = 0.13;
    this.headGroup.add(browR);

    // Eyes
    this._buildEyes();

    // Nose
    this._buildNose();

    // Mouth
    this._buildMouth();

    // Whiskers
    this._buildWhiskers();

    // Neck connection (tube from head to body)
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.35, 12);
    const neck = new THREE.Mesh(neckGeo, this._headMat);
    neck.position.set(0, -0.05, -0.28);
    neck.rotation.x = 0.4;
    this.headGroup.add(neck);

    // Position head above body
    this.headGroup.position.set(0, 0.3, 0.85);
    this.bodyGroup.add(this.headGroup);
  }

  _buildEyes() {
    const createEye = (xOffset) => {
      const eyeGroup = new THREE.Group();

      // Eye socket (slight depression)
      const socketGeo = new THREE.SphereGeometry(0.085, 12, 10);
      const socketMat = new THREE.MeshStandardMaterial({
        color: 0x3A2810, roughness: 0.8, metalness: 0,
      });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      eyeGroup.add(socket);

      // Sclera (white of eye)
      const scleraGeo = new THREE.SphereGeometry(0.07, 16, 12);
      const scleraMat = new THREE.MeshStandardMaterial({
        color: 0xF8F4F0, roughness: 0.3, metalness: 0.05,
      });
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.position.z = 0.02;
      eyeGroup.add(sclera);

      // Iris (golden amber)
      const irisGeo = new THREE.SphereGeometry(0.045, 16, 12);
      const irisMat = new THREE.MeshStandardMaterial({
        color: EYE_IRIS, roughness: 0.15, metalness: 0.1,
        emissive: EYE_IRIS, emissiveIntensity: 0.08,
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.055;
      eyeGroup.add(iris);

      // Pupil (vertical slit)
      const pupilGeo = new THREE.PlaneGeometry(0.02, 0.065);
      const pupilMat = new THREE.MeshBasicMaterial({
        color: PUPIL_COLOR, side: THREE.DoubleSide,
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.095;
      eyeGroup.add(pupil);

      // Specular highlight
      const highlightGeo = new THREE.SphereGeometry(0.012, 8, 6);
      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.015, 0.015, 0.095);
      eyeGroup.add(highlight);

      // Eyelid (for blink)
      const lidGeo = new THREE.SphereGeometry(0.078, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const lidMat = new THREE.MeshStandardMaterial({
        color: 0xFAFAFA, roughness: 0.9, metalness: 0,
        transparent: true, opacity: 0,
      });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.rotation.x = Math.PI;
      lid.position.z = 0.01;
      lid.scale.y = 0.01; // starts open
      eyeGroup.add(lid);
      this._eyelidMeshes.push(lid);

      eyeGroup.position.set(xOffset, 0.06, 0.28);
      // Slight outward angle (realistic eye placement)
      eyeGroup.rotation.y = xOffset > 0 ? 0.15 : -0.15;
      this.headGroup.add(eyeGroup);
    };

    createEye(-0.14);
    createEye(0.14);
  }

  _buildNose() {
    // Nose — heart/triangle shape
    const noseShape = new THREE.Shape();
    noseShape.moveTo(0, 0.025);
    noseShape.bezierCurveTo(-0.02, 0.025, -0.035, 0.01, -0.035, -0.005);
    noseShape.bezierCurveTo(-0.035, -0.02, -0.015, -0.025, 0, -0.015);
    noseShape.bezierCurveTo(0.015, -0.025, 0.035, -0.02, 0.035, -0.005);
    noseShape.bezierCurveTo(0.035, 0.01, 0.02, 0.025, 0, 0.025);

    const noseGeo = new THREE.ExtrudeGeometry(noseShape, {
      depth: 0.015, bevelEnabled: true, bevelThickness: 0.005,
      bevelSize: 0.003, bevelSegments: 3,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: NOSE_COLOR, roughness: 0.4, metalness: 0.05,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.06, 0.42);
    this.headGroup.add(nose);

    // Nostrils (two tiny dark dots)
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x4A2020 });
    const nostrilGeo = new THREE.SphereGeometry(0.006, 6, 4);
    [-1, 1].forEach(side => {
      const n = new THREE.Mesh(nostrilGeo, nostrilMat);
      n.position.set(side * 0.015, -0.07, 0.44);
      this.headGroup.add(n);
    });
  }

  _buildMouth() {
    // Philtrum line (nose to lip)
    const philtrumCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, -0.08, 0.43),
      new THREE.Vector3(0, -0.12, 0.40),
    );
    const philGeo = new THREE.TubeGeometry(philtrumCurve, 4, 0.003, 4, false);
    const philMat = new THREE.MeshBasicMaterial({ color: 0x8A5040 });
    this.headGroup.add(new THREE.Mesh(philGeo, philMat));

    // Mouth line — gentle curved line
    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.06, -0.13, 0.38),
      new THREE.Vector3(0, -0.14, 0.40),
      new THREE.Vector3(0.06, -0.13, 0.38),
    );
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 10, 0.003, 4, false);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x7A4030 });
    this.headGroup.add(new THREE.Mesh(mouthGeo, mouthMat));
  }

  _buildWhiskers() {
    const mat = new THREE.MeshBasicMaterial({ color: WHISKER_COLOR });

    // 6 whiskers per side, with subtle curve
    const sides = [-1, 1];
    sides.forEach(side => {
      for (let i = 0; i < 3; i++) {
        const yOff = -0.08 - i * 0.025;
        const angleSpread = (i - 1) * 0.12;

        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(side * 0.35, angleSpread * 0.5, 0.05),
          new THREE.Vector3(side * 0.7, angleSpread, -0.05 + Math.random() * 0.08),
        );
        const geo = new THREE.TubeGeometry(curve, 10, 0.003, 3, false);
        const whisker = new THREE.Mesh(geo, mat);
        whisker.position.set(side * 0.12, yOff, 0.35);
        this.headGroup.add(whisker);
      }
    });
  }

  // ═══════════════════════════════════════════════
  // EARS — Proper triangular with inner detail
  // ═══════════════════════════════════════════════
  _buildEars() {
    const createEar = (side) => {
      const earGroup = new THREE.Group();

      // Outer ear — custom shape (not a cone)
      // Use LatheGeometry for a more natural ear curve
      const earProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.12, 0.05),
        new THREE.Vector2(0.16, 0.15),
        new THREE.Vector2(0.14, 0.28),
        new THREE.Vector2(0.08, 0.38),
        new THREE.Vector2(0, 0.42),
      ];
      const earGeo = new THREE.LatheGeometry(earProfile, 8);
      // Flatten into ear shape
      const earPos = earGeo.attributes.position;
      for (let i = 0; i < earPos.count; i++) {
        let z = earPos.getZ(i);
        earPos.setZ(i, z * 0.3); // make flat
      }
      earGeo.computeVertexNormals();
      const ear = new THREE.Mesh(earGeo, this._furMat);
      earGroup.add(ear);

      // Inner ear (pink)
      const innerGeo = new THREE.LatheGeometry(
        earProfile.map(p => new THREE.Vector2(p.x * 0.7, p.y * 0.85)), 6
      );
      const innerPos = innerGeo.attributes.position;
      for (let i = 0; i < innerPos.count; i++) {
        innerPos.setZ(i, innerPos.getZ(i) * 0.2 + 0.03);
      }
      innerGeo.computeVertexNormals();
      const innerMat = new THREE.MeshStandardMaterial({
        color: INNER_EAR, roughness: 0.85, metalness: 0,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      earGroup.add(inner);

      // Position on head
      const xPos = side * 0.2;
      earGroup.position.set(xPos, 0.32, 0.05);
      earGroup.rotation.z = side * -0.2;
      earGroup.rotation.x = -0.15;

      return earGroup;
    };

    this.earLeftGroup = createEar(-1);
    this.earRightGroup = createEar(1);
    this.headGroup.add(this.earLeftGroup);
    this.headGroup.add(this.earRightGroup);
  }

  // ═══════════════════════════════════════════════
  // LEGS — Jointed with proper pivot points
  // Diagonal gait: FL↔BR, FR↔BL
  // ═══════════════════════════════════════════════
  _buildLegs() {
    // legs[] stores { shoulderGroup, kneeGroup } for animation
    this.legs = [];

    const createLeg = (x, z, isFront) => {
      // shoulderGroup is the pivot — positioned at the shoulder/hip joint
      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(x, 0, z);

      if (isFront) {
        // ── Upper arm: geometry shifted DOWN so pivot is at top ──
        const upperGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.4, 10);
        const upper = new THREE.Mesh(upperGeo, this._furMat);
        upper.position.y = -0.2; // half-length down → pivot at shoulder
        upper.rotation.z = x > 0 ? -0.05 : 0.05;
        upper.castShadow = true;
        shoulderGroup.add(upper);

        // ── Knee group: pivot at the bottom of upper arm ──
        const kneeGroup = new THREE.Group();
        kneeGroup.position.y = -0.4; // end of upper arm
        shoulderGroup.add(kneeGroup);

        // Forearm shifted down from knee pivot
        const foreGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.35, 10);
        const fore = new THREE.Mesh(foreGeo, this._furMat);
        fore.position.y = -0.175; // half of 0.35
        fore.castShadow = true;
        kneeGroup.add(fore);

        // Paw
        const pawGeo = new THREE.SphereGeometry(0.08, 12, 8);
        const paw = new THREE.Mesh(pawGeo, this._furMat);
        paw.scale.set(0.9, 0.45, 1.15);
        paw.position.y = -0.36;
        paw.castShadow = true;
        kneeGroup.add(paw);

        // Paw pad
        const padGeo = new THREE.CircleGeometry(0.05, 8);
        const padMat = new THREE.MeshStandardMaterial({
          color: PAW_PAD, roughness: 0.7, metalness: 0,
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = -0.39;
        kneeGroup.add(pad);

        // Toes
        for (let t = 0; t < 4; t++) {
          const toeGeo = new THREE.SphereGeometry(0.02, 6, 4);
          const toe = new THREE.Mesh(toeGeo, this._furMat);
          toe.position.set((t - 1.5) * 0.025, -0.37, 0.06);
          kneeGroup.add(toe);
        }

        this.legs.push({ shoulderGroup, kneeGroup });
      } else {
        // ── Back leg: thigh shifted down from hip pivot ──
        const thighGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.38, 10);
        const thigh = new THREE.Mesh(thighGeo, this._furMat);
        thigh.position.set(0, -0.19, 0.05);
        thigh.rotation.z = x > 0 ? -0.08 : 0.08;
        thigh.castShadow = true;
        shoulderGroup.add(thigh);

        // ── Knee group at bottom of thigh ──
        const kneeGroup = new THREE.Group();
        kneeGroup.position.y = -0.38;
        shoulderGroup.add(kneeGroup);

        // Shin
        const shinGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.4, 10);
        const shin = new THREE.Mesh(shinGeo, this._furMat);
        shin.position.y = -0.2;
        shin.castShadow = true;
        kneeGroup.add(shin);

        // Back paw
        const pawGeo = new THREE.SphereGeometry(0.085, 12, 8);
        const paw = new THREE.Mesh(pawGeo, this._furMat);
        paw.scale.set(0.85, 0.42, 1.25);
        paw.position.y = -0.38;
        paw.castShadow = true;
        kneeGroup.add(paw);

        // Paw pad
        const padGeo = new THREE.CircleGeometry(0.055, 8);
        const padMat = new THREE.MeshStandardMaterial({
          color: PAW_PAD, roughness: 0.7, metalness: 0,
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = -0.41;
        kneeGroup.add(pad);

        this.legs.push({ shoulderGroup, kneeGroup });
      }

      return shoulderGroup;
    };

    // Front legs: FL (index 0), FR (index 1)
    this.bodyGroup.add(createLeg(-0.22, 0.65, true));
    this.bodyGroup.add(createLeg(0.22, 0.65, true));

    // Back legs: BL (index 2), BR (index 3)
    this.bodyGroup.add(createLeg(-0.25, -0.65, false));
    this.bodyGroup.add(createLeg(0.25, -0.65, false));
  }

  // ═══════════════════════════════════════════════
  // TAIL — Gracefully curved
  // ═══════════════════════════════════════════════
  _buildTail() {
    this.tailGroup = new THREE.Group();

    const tailPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.1, 0.15, -0.4),
      new THREE.Vector3(-0.2, 0.35, -0.8),
      new THREE.Vector3(-0.15, 0.55, -1.1),
      new THREE.Vector3(0.05, 0.7, -1.3),
      new THREE.Vector3(0.2, 0.8, -1.35),
    ];

    const tailCurve = new THREE.CatmullRomCurve3(tailPoints, false, 'catmullrom', 0.5);

    // Tail with tapering radius — use multiple tube sections
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const r0 = 0.06 * (1 - t0 * 0.6); // taper from thick to thin
      const r1 = 0.06 * (1 - t1 * 0.6);

      const subPoints = [];
      for (let j = 0; j <= 4; j++) {
        const t = t0 + (t1 - t0) * (j / 4);
        subPoints.push(tailCurve.getPoint(t));
      }
      const subCurve = new THREE.CatmullRomCurve3(subPoints);
      const tubeGeo = new THREE.TubeGeometry(subCurve, 6, (r0 + r1) / 2, 8, false);
      const tube = new THREE.Mesh(tubeGeo, this._furMat);
      tube.castShadow = true;
      this.tailGroup.add(tube);
    }

    // Tail tip ball (very small)
    const tipGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const tip = new THREE.Mesh(tipGeo, this._furMat);
    tip.position.copy(tailPoints[tailPoints.length - 1]);
    this.tailGroup.add(tip);

    this.tailGroup.position.set(0, 0.1, -0.9);
    this.bodyGroup.add(this.tailGroup);
  }

  // ═══════════════════════════════════════════════
  // SHADOW BLOB
  // ═══════════════════════════════════════════════
  _buildShadowBlob() {
    const geo = new THREE.CircleGeometry(0.6, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true,
      opacity: 0.18, depthWrite: false,
    });
    const blob = new THREE.Mesh(geo, mat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = -0.12;
    this.group.add(blob);
  }

  // ═══════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════
  update(delta, elapsed) {
    // ── Natural breathing ──
    if (this.bodyGroup) {
      const breathe = Math.sin(elapsed * 1.0);
      // Ribcage expansion
      this.bodyGroup.children[0].scale.x = 1.0 + breathe * 0.015;
      this.bodyGroup.children[0].scale.z = 0.85 + breathe * 0.01;
    }

    // ── Head movement (subtle look around) ──
    if (this.headGroup) {
      this.headGroup.rotation.y = Math.sin(elapsed * 0.6) * 0.2;
      this.headGroup.rotation.z = Math.sin(elapsed * 0.4) * 0.04;
      // Slight head bob
      this.headGroup.rotation.x = Math.sin(elapsed * 0.8) * 0.03;
    }

    // ── Ear micro-movements ──
    if (this.earLeftGroup) {
      this.earLeftGroup.rotation.z = -0.2 + Math.sin(elapsed * 1.8 + 0.5) * 0.06;
    }
    if (this.earRightGroup) {
      this.earRightGroup.rotation.z = 0.2 + Math.sin(elapsed * 1.8) * 0.06;
    }

    // ── Tail sway ──
    if (this.tailGroup) {
      this.tailGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.25;
      this.tailGroup.rotation.y = Math.sin(elapsed * 0.8 + 0.5) * 0.1;
    }

    // ── Walk cycle — diagonal gait (FL↔BR in phase, FR↔BL in phase) ──
    // Phase offsets: [FL, FR, BL, BR] = [0, π, π, 0]
    const PHASE_OFFSETS = [0, Math.PI, Math.PI, 0];
    if (this.legs.length === 4) {
      this.legs.forEach(({ shoulderGroup, kneeGroup }, i) => {
        const phase = elapsed * 4.0 + PHASE_OFFSETS[i];
        // Shoulder swing (forward/backward)
        shoulderGroup.rotation.x = Math.sin(phase) * 0.35;
        // Knee bend — only when leg lifts (positive half of sine)
        kneeGroup.rotation.x = Math.max(0, Math.sin(phase)) * 0.5;
      });
    }

    // ── Blink ──
    this._blinkTimer += delta;
    if (!this._blinking && this._blinkTimer > this._nextBlink) {
      this._blinking = true;
      this._blinkProgress = 0;
      this._blinkTimer = 0;
      this._nextBlink = 3 + Math.random() * 2;
    }

    if (this._blinking) {
      this._blinkProgress += delta / 0.15;
      if (this._blinkProgress >= 1) {
        this._blinking = false;
        this._blinkProgress = 0;
        this._eyelidMeshes.forEach(lid => {
          lid.material.opacity = 0;
          lid.scale.y = 0.01;
        });
      } else {
        const close = Math.sin(this._blinkProgress * Math.PI);
        this._eyelidMeshes.forEach(lid => {
          lid.material.opacity = close * 0.95;
          lid.scale.y = 0.01 + close * 0.8;
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // FUR SHELL LAYERS
  // ═══════════════════════════════════════════════
  _addFurShells(baseMesh) {
    const SHELLS = 8;
    for (let s = 1; s <= SHELLS; s++) {
      const t = s / SHELLS;
      const shellGeo = baseMesh.geometry.clone();

      // Push vertices outward along normals
      const pos = shellGeo.attributes.position;
      const norm = shellGeo.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i,
          pos.getX(i) + norm.getX(i) * t * 0.04,
          pos.getY(i) + norm.getY(i) * t * 0.04,
          pos.getZ(i) + norm.getZ(i) * t * 0.04,
        );
      }
      pos.needsUpdate = true;

      const shellMat = new THREE.MeshStandardMaterial({
        color: FUR_ORANGE,
        alphaMap: this._createFurAlphaMap(t),
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        opacity: 1.0 - t * 0.3,
        roughness: 0.95,
      });

      const shell = new THREE.Mesh(shellGeo, shellMat);
      // Copy the rotation/scale from base mesh
      shell.rotation.copy(baseMesh.rotation);
      shell.scale.copy(baseMesh.scale);
      this.bodyGroup.add(shell);
    }
  }

  _createFurAlphaMap(thickness) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 256, 256);

    // Fur strand density decreases with thickness (outer shells are sparser)
    const density = 1.0 - thickness * 0.7;
    const count = Math.floor(256 * 256 * density * 0.15);
    for (let i = 0; i < count; i++) {
      const px = Math.random() * 256 | 0;
      const py = Math.random() * 256 | 0;
      const alpha = 0.6 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(px, py, 1, 2); // vertical pixel = fur strand
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // ═══════════════════════════════════════════════
  // TABBY VERTEX COLORS
  // ═══════════════════════════════════════════════
  _applyTabbyColors(geometry) {
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    const bellyCol = new THREE.Color(BELLY_COLOR);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Tabby stripes along body axis (Y in LatheGeo = along spine)
      const stripePattern = Math.sin(y * 8.0) * 0.5 + 0.5;
      // Belly factor — lighter underneath (X < 0 in the lathe = bottom)
      const bellyFactor = Math.max(0, -x) * 0.6;

      if (stripePattern > 0.6) {
        color.setHex(FUR_DARK);
      } else {
        color.setHex(FUR_ORANGE);
      }

      // Blend toward belly color on underside
      color.lerp(bellyCol, bellyFactor);

      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // ═══════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════
  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (child.material.bumpMap) child.material.bumpMap.dispose();
        child.material.dispose();
      }
    });
  }
}
