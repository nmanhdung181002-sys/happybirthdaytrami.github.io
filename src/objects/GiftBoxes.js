/**
 * GiftBoxes.js — 3D Gift Boxes on the Island
 *
 * ✦ 5 gift boxes: BoxGeometry + wrapped with ribbon
 * ✦ Glossy wrapping paper: MeshStandardMaterial with CanvasTexture patterns
 * ✦ Ribbon cross: thin BoxGeometry on top
 * ✦ Bow: TorusGeometry arcs
 * ✦ Subtle idle animation: gentle rotation + bob
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const GIFT_CONFIGS = [
  { size: [0.6, 0.5, 0.6], pos: [-1.8, 1.8, 0.8],  color: 0xFF69B4, ribbonColor: 0xFFD700, pattern: 'dots' },
  { size: [0.5, 0.7, 0.5], pos: [1.5, 1.7, 1.2],    color: 0x87CEEB, ribbonColor: 0xFF69B4, pattern: 'stripes' },
  { size: [0.7, 0.4, 0.7], pos: [0.8, 1.7, -1.5],   color: 0xFFD700, ribbonColor: 0xFF0000, pattern: 'stars' },
  { size: [0.4, 0.55, 0.4], pos: [-1.2, 1.75, -1.3], color: 0x98FB98, ribbonColor: 0xDDA0DD, pattern: 'dots' },
  { size: [0.55, 0.45, 0.55], pos: [2.0, 1.75, -0.5], color: 0xDDA0DD, ribbonColor: 0x87CEEB, pattern: 'stripes' },
];

export class GiftBoxes {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {{ mesh: THREE.Group, baseY: number, phase: number }[]} */
    this.gifts = [];
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    GIFT_CONFIGS.forEach((cfg, idx) => {
      const gift = this._createGift(cfg, idx);
      this.group.add(gift.mesh);
      this.gifts.push(gift);
    });

    scene.add(this.group);
  }

  _createGift(cfg, index) {
    const giftGroup = new THREE.Group();
    const [w, h, d] = cfg.size;

    // ── BOX BODY ──
    const boxGeo = new THREE.BoxGeometry(w, h, d);
    const boxMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.25,
      metalness: 0.05,
      map: this._createWrappingTexture(cfg.color, cfg.pattern)
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.castShadow = true;
    box.receiveShadow = true;
    giftGroup.add(box);

    // ── LID (slightly larger) ──
    const lidH = h * 0.15;
    const lidGeo = new THREE.BoxGeometry(w + 0.04, lidH, d + 0.04);
    const lidMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.2,
      metalness: 0.05
    });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = h / 2 + lidH / 2;
    lid.castShadow = true;
    giftGroup.add(lid);

    // ── RIBBON CROSS ──
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: cfg.ribbonColor,
      roughness: 0.2,
      metalness: 0.6,
      emissive: cfg.ribbonColor,
      emissiveIntensity: 0.08
    });

    // Horizontal ribbon (front-back)
    const ribbonH1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, h + lidH + 0.02, d + 0.06),
      ribbonMat
    );
    ribbonH1.position.y = lidH / 2;
    giftGroup.add(ribbonH1);

    // Horizontal ribbon (side-side)
    const ribbonH2 = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.06, h + lidH + 0.02, 0.06),
      ribbonMat
    );
    ribbonH2.position.y = lidH / 2;
    giftGroup.add(ribbonH2);

    // ── BOW ON TOP ──
    this._createBow(giftGroup, cfg.ribbonColor, h / 2 + lidH + 0.02, w * 0.3);

    // Position
    giftGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    // Random rotation
    giftGroup.rotation.y = index * 1.2 + Math.random() * 0.5;

    return {
      mesh: giftGroup,
      baseY: cfg.pos[1],
      phase: index * 1.3
    };
  }

  _createBow(parent, color, yPos, size) {
    const bowMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.6
    });

    // Left loop
    const loopGeo = new THREE.TorusGeometry(size * 0.5, 0.025, 8, 12, Math.PI);
    const left = new THREE.Mesh(loopGeo, bowMat);
    left.position.set(-size * 0.3, yPos + size * 0.3, 0);
    left.rotation.z = 0.6;
    parent.add(left);

    // Right loop
    const right = new THREE.Mesh(loopGeo, bowMat);
    right.position.set(size * 0.3, yPos + size * 0.3, 0);
    right.rotation.z = -0.6;
    right.rotation.y = Math.PI;
    parent.add(right);

    // Center knot
    const knotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const knot = new THREE.Mesh(knotGeo, bowMat);
    knot.position.set(0, yPos + size * 0.1, 0);
    parent.add(knot);
  }

  /**
   * Procedural wrapping paper texture
   */
  _createWrappingTexture(baseColor, pattern) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base color
    const color = new THREE.Color(baseColor);
    ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.15;

    if (pattern === 'dots') {
      // Polka dots
      for (let x = 20; x < size; x += 40) {
        for (let y = 20; y < size; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
    } else if (pattern === 'stripes') {
      // Diagonal stripes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      for (let i = -size; i < size * 2; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
      }
    } else if (pattern === 'stars') {
      // Stars
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      for (let x = 20; x < size; x += 45) {
        for (let y = 20; y < size; y += 45) {
          ctx.fillText('★', x, y);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    this.gifts.forEach((g) => {
      // Gentle bobbing
      g.mesh.position.y = g.baseY + Math.sin(elapsed * 0.7 + g.phase) * 0.04;
      // Subtle rotation
      g.mesh.rotation.y += delta * 0.08;
    });
  }

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
