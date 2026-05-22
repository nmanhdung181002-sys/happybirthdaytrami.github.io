/**
 * BirthdayText.js — 3D Birthday Text with Holographic Shader
 *
 * ✦ Main text "Happy Birthday!" — Canvas texture on PlaneGeometry
 * ✦ Holographic iridescent ShaderMaterial (Fresnel + HSL rainbow shift)
 * ✦ Sub-text "Trà Mi" via Canvas billboard sprite  
 * ✦ Floating above cake, gentle Y sway + scale pulse
 *
 * Methods: init(), update(delta, elapsed), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const MAIN_TEXT = 'Happy Birthday!';
const SUB_TEXT = 'Trà Mi';
const TEXT_Y = 5.2;
const TEXT_ROTATE_SPEED = 0.15;

export class BirthdayText {
  constructor() {
    /** @type {THREE.Group} */
    this.group = new THREE.Group();

    /** @type {THREE.Mesh|null} */
    this.mainTextMesh = null;
    /** @type {THREE.ShaderMaterial|null} */
    this.holoMaterial = null;

    /** @type {THREE.Sprite|null} */
    this.subTextSprite = null;
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this.group.position.set(0, TEXT_Y, 0);
    scene.add(this.group);

    this._createMainText();
    this._createSubText();
  }

  // ═══════════════════════════════════════════════
  // MAIN TEXT — Canvas texture + holographic shader plane
  // ═══════════════════════════════════════════════
  _createMainText() {
    // Create high-res canvas texture for text
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text with glow layers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Outer glow
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 40;
    ctx.font = 'bold 120px Playfair Display, serif';
    ctx.fillStyle = 'rgba(255, 105, 180, 0.4)';
    ctx.fillText(MAIN_TEXT, cx, cy);

    // Main text
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(MAIN_TEXT, cx, cy);

    // No shadow crisp layer
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFAF0';
    ctx.fillText(MAIN_TEXT, cx, cy);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create holographic shader material with the text texture
    this.holoMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform sampler2D uTexture;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        
        // HSL to RGB
        vec3 hsl2rgb(float h, float s, float l) {
          vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
        }
        
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          
          // Discard fully transparent pixels
          if (texColor.a < 0.05) discard;
          
          // Fresnel-based rainbow shift
          float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          fresnel = pow(fresnel, 1.5);
          
          // Rainbow hue
          float hue = fract(
            fresnel * 1.2 
            + uTime * 0.08 
            + vUv.x * 0.3
          );
          vec3 rainbow = hsl2rgb(hue, 0.8, 0.65);
          
          // Mix text color with holographic rainbow
          vec3 color = mix(texColor.rgb, rainbow, 0.35 + fresnel * 0.3);
          
          // Shimmer
          float shimmer = sin(vWorldPos.x * 15.0 + uTime * 4.0) * 0.5 + 0.5;
          shimmer *= sin(vUv.y * 20.0 + uTime * 3.0) * 0.5 + 0.5;
          color += vec3(1.0, 0.95, 0.9) * shimmer * 0.15;
          
          // Edge glow
          float edgeGlow = fresnel * 0.4;
          color += rainbow * edgeGlow;
          
          gl_FragColor = vec4(color, texColor.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const geo = new THREE.PlaneGeometry(6, 1.5);
    this.mainTextMesh = new THREE.Mesh(geo, this.holoMaterial);
    this.group.add(this.mainTextMesh);
  }

  // ═══════════════════════════════════════════════
  // SUB-TEXT — "Trà Mi" billboard sprite
  // ═══════════════════════════════════════════════
  _createSubText() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glow
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 15;

    // Name text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'italic bold 60px Playfair Display, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ ' + SUB_TEXT + ' ✦', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    this.subTextSprite = new THREE.Sprite(spriteMat);
    this.subTextSprite.scale.set(4, 1, 1);
    this.subTextSprite.position.set(0, -1.2, 0);
    this.group.add(this.subTextSprite);
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
    // Gentle rotation sway
    if (this.mainTextMesh) {
      this.mainTextMesh.rotation.y = Math.sin(elapsed * TEXT_ROTATE_SPEED) * 0.15;
    }

    // Update holographic shader
    if (this.holoMaterial) {
      this.holoMaterial.uniforms.uTime.value = elapsed;
    }

    // Float the whole text group
    this.group.position.y = TEXT_Y + Math.sin(elapsed * 0.6) * 0.2;

    // Sub-text pulse scale
    if (this.subTextSprite) {
      const pulse = 1 + Math.sin(elapsed * 1.5) * 0.03;
      this.subTextSprite.scale.set(4 * pulse, 1 * pulse, 1);
    }

    // Billboard: face camera
    if (this.mainTextMesh && camera) {
      // Make text always partially face the camera
      const lookDir = new THREE.Vector3();
      lookDir.subVectors(camera.position, this.group.position).normalize();
      lookDir.y = 0; // keep upright
      const angle = Math.atan2(lookDir.x, lookDir.z);
      this.mainTextMesh.rotation.y = angle + Math.sin(elapsed * TEXT_ROTATE_SPEED) * 0.1;
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
