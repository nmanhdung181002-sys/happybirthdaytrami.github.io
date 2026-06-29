/**
 * SceneSetup.js — Renderer, Camera, Lights, Fog, Shadows
 * 
 * ✦ WebGLRenderer: antialias, alpha, high-performance
 * ✦ PerspectiveCamera: fov=60, near=0.1, far=1000
 * ✦ Dynamic sky: gradient changes based on real-world time
 * ✦ Time-of-day lighting: dawn → morning → noon → afternoon → sunset → dusk → night
 * ✦ FogExp2: atmospheric depth (color adapts to sky)
 * ✦ ACESFilmicToneMapping + PCFSoftShadowMap
 * ✦ HemisphereLight + DirectionalLight + PointLights + RectAreaLight
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// ── TIME-OF-DAY COLOR PRESETS ──
// Each preset defines: sky gradient, fog, hemisphere light, directional light, sun position
// Times are in hours (24h format). System smoothly interpolates between presets.

const TIME_PRESETS = [
  { // 0:00 — Deep Night (midnight)
    hour: 0,
    skyTop:    new THREE.Color(0x020012),
    skyMid:    new THREE.Color(0x0a0025),
    skyBottom: new THREE.Color(0x0f0035),
    fogColor:  new THREE.Color(0x050015),
    fogDensity: 0.005,
    hemiSky:   new THREE.Color(0x101040),
    hemiGround: new THREE.Color(0x050015),
    hemiIntensity: 0.25,
    dirColor:  new THREE.Color(0x8888cc),
    dirIntensity: 0.3,
    sunPos:    new THREE.Vector3(0, -20, 10),
    exposure: 0.8,
    starOpacity: 1.0,
  },
  { // 4:00 — Pre-dawn (trời còn tối nhưng bắt đầu hé sáng)
    hour: 4,
    skyTop:    new THREE.Color(0x0a0030),
    skyMid:    new THREE.Color(0x1a1050),
    skyBottom: new THREE.Color(0x2a1545),
    fogColor:  new THREE.Color(0x100828),
    fogDensity: 0.004,
    hemiSky:   new THREE.Color(0x201050),
    hemiGround: new THREE.Color(0x100828),
    hemiIntensity: 0.3,
    dirColor:  new THREE.Color(0x9988cc),
    dirIntensity: 0.4,
    sunPos:    new THREE.Vector3(-20, -5, 15),
    exposure: 0.85,
    starOpacity: 0.8,
  },
  { // 5:30 — Dawn / Bình minh (trời hồng cam)
    hour: 5.5,
    skyTop:    new THREE.Color(0x1a1050),
    skyMid:    new THREE.Color(0x4a2060),
    skyBottom: new THREE.Color(0xFF6B9D),
    fogColor:  new THREE.Color(0x3a1545),
    fogDensity: 0.004,
    hemiSky:   new THREE.Color(0xFFD6E8),
    hemiGround: new THREE.Color(0x3a1545),
    hemiIntensity: 0.5,
    dirColor:  new THREE.Color(0xffb090),
    dirIntensity: 1.0,
    sunPos:    new THREE.Vector3(-25, 5, 20),
    exposure: 1.0,
    starOpacity: 0.2,
  },
  { // 7:00 — Early Morning / Sáng sớm (nắng vàng ấm)
    hour: 7,
    skyTop:    new THREE.Color(0x3a7ecf),
    skyMid:    new THREE.Color(0x7cb8f0),
    skyBottom: new THREE.Color(0xFFeedd),
    fogColor:  new THREE.Color(0x8abbee),
    fogDensity: 0.003,
    hemiSky:   new THREE.Color(0xfff4e0),
    hemiGround: new THREE.Color(0x8caa60),
    hemiIntensity: 0.65,
    dirColor:  new THREE.Color(0xfff0d0),
    dirIntensity: 1.6,
    sunPos:    new THREE.Vector3(-20, 15, 20),
    exposure: 1.15,
    starOpacity: 0.0,
  },
  { // 10:00 — Late Morning (nắng trắng sáng)
    hour: 10,
    skyTop:    new THREE.Color(0x2070cc),
    skyMid:    new THREE.Color(0x60a8f0),
    skyBottom: new THREE.Color(0xc8e0ff),
    fogColor:  new THREE.Color(0x90c0ee),
    fogDensity: 0.002,
    hemiSky:   new THREE.Color(0xffffff),
    hemiGround: new THREE.Color(0x90aa70),
    hemiIntensity: 0.7,
    dirColor:  new THREE.Color(0xfff8f0),
    dirIntensity: 2.0,
    sunPos:    new THREE.Vector3(-10, 25, 15),
    exposure: 1.2,
    starOpacity: 0.0,
  },
  { // 12:00 — Noon / Giữa trưa (nắng gắt nhất)
    hour: 12,
    skyTop:    new THREE.Color(0x1868cc),
    skyMid:    new THREE.Color(0x50a0f0),
    skyBottom: new THREE.Color(0xd0e8ff),
    fogColor:  new THREE.Color(0xa0d0ff),
    fogDensity: 0.002,
    hemiSky:   new THREE.Color(0xffffff),
    hemiGround: new THREE.Color(0x88aa68),
    hemiIntensity: 0.75,
    dirColor:  new THREE.Color(0xffffff),
    dirIntensity: 2.2,
    sunPos:    new THREE.Vector3(0, 30, 10),
    exposure: 1.25,
    starOpacity: 0.0,
  },
  { // 15:00 — Afternoon / Xế chiều (nắng vàng nhẹ)
    hour: 15,
    skyTop:    new THREE.Color(0x2070cc),
    skyMid:    new THREE.Color(0x60a8f0),
    skyBottom: new THREE.Color(0xe0e8ff),
    fogColor:  new THREE.Color(0x90c0ee),
    fogDensity: 0.002,
    hemiSky:   new THREE.Color(0xfff8e0),
    hemiGround: new THREE.Color(0x90aa70),
    hemiIntensity: 0.7,
    dirColor:  new THREE.Color(0xfff0d0),
    dirIntensity: 1.8,
    sunPos:    new THREE.Vector3(15, 22, 18),
    exposure: 1.2,
    starOpacity: 0.0,
  },
  { // 17:30 — Sunset / Hoàng hôn (cam đỏ tuyệt đẹp)
    hour: 17.5,
    skyTop:    new THREE.Color(0x1a3080),
    skyMid:    new THREE.Color(0xc05020),
    skyBottom: new THREE.Color(0xFF6030),
    fogColor:  new THREE.Color(0x804020),
    fogDensity: 0.003,
    hemiSky:   new THREE.Color(0xffd0a0),
    hemiGround: new THREE.Color(0x604020),
    hemiIntensity: 0.55,
    dirColor:  new THREE.Color(0xff9050),
    dirIntensity: 1.2,
    sunPos:    new THREE.Vector3(25, 5, 15),
    exposure: 1.1,
    starOpacity: 0.05,
  },
  { // 19:00 — Dusk / Chạng vạng (tím hồng)
    hour: 19,
    skyTop:    new THREE.Color(0x0a0525),
    skyMid:    new THREE.Color(0x2a1050),
    skyBottom: new THREE.Color(0xcc5580),
    fogColor:  new THREE.Color(0x1a0830),
    fogDensity: 0.004,
    hemiSky:   new THREE.Color(0xaa7090),
    hemiGround: new THREE.Color(0x1a0830),
    hemiIntensity: 0.4,
    dirColor:  new THREE.Color(0xcc8888),
    dirIntensity: 0.6,
    sunPos:    new THREE.Vector3(25, -5, 10),
    exposure: 0.95,
    starOpacity: 0.4,
  },
  { // 20:30 — Early Night (đêm bắt đầu)
    hour: 20.5,
    skyTop:    new THREE.Color(0x050018),
    skyMid:    new THREE.Color(0x0f0030),
    skyBottom: new THREE.Color(0x301050),
    fogColor:  new THREE.Color(0x080020),
    fogDensity: 0.005,
    hemiSky:   new THREE.Color(0x201040),
    hemiGround: new THREE.Color(0x080020),
    hemiIntensity: 0.3,
    dirColor:  new THREE.Color(0x8888cc),
    dirIntensity: 0.35,
    sunPos:    new THREE.Vector3(10, -15, 10),
    exposure: 0.85,
    starOpacity: 0.85,
  },
  { // 23:59 — Late Night (trở lại midnight — wraps to hour 0)
    hour: 24,
    skyTop:    new THREE.Color(0x020012),
    skyMid:    new THREE.Color(0x0a0025),
    skyBottom: new THREE.Color(0x0f0035),
    fogColor:  new THREE.Color(0x050015),
    fogDensity: 0.005,
    hemiSky:   new THREE.Color(0x101040),
    hemiGround: new THREE.Color(0x050015),
    hemiIntensity: 0.25,
    dirColor:  new THREE.Color(0x8888cc),
    dirIntensity: 0.3,
    sunPos:    new THREE.Vector3(0, -20, 10),
    exposure: 0.8,
    starOpacity: 1.0,
  },
];

// ── LEGACY CONSTANTS ──
const POINT_LIGHTS_CONFIG = [
  { color: 0xFFD700, intensity: 1.0, distance: 40, pos: [8, 6, 5] },    // vàng nến
  { color: 0xFF69B4, intensity: 0.8, distance: 35, pos: [-10, 4, 8] },  // hồng kẹo
  { color: 0x6BA3FF, intensity: 0.6, distance: 30, pos: [5, -3, 12] },  // xanh lam
  { color: 0xE6E6FA, intensity: 0.5, distance: 25, pos: [-7, 8, -5] },  // lavender
];

const RECT_LIGHT_COLOR = 0x9B59B6;
const RECT_LIGHT_INTENSITY = 3;

const CAMERA_FOV = 60;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;
const CAMERA_INITIAL_POS = { x: 0, y: 5, z: 50 };

export class SceneSetup {
  constructor() {
    /** @type {THREE.Scene} */
    this.scene = null;
    /** @type {THREE.PerspectiveCamera} */
    this.camera = null;
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;
    /** @type {THREE.PointLight[]} */
    this.pointLights = [];
    /** @type {THREE.DirectionalLight} */
    this.dirLight = null;
    /** @type {THREE.HemisphereLight} */
    this.hemiLight = null;
    /** @type {boolean} */
    this.isMobile = false;
    /** @type {THREE.Mesh} */
    this.skyMesh = null;
    /** @type {number} Current star opacity based on time-of-day (for Environment to use) */
    this.currentStarOpacity = 1.0;
    /** @type {'auto' | 'light' | 'dark'} */
    this.timeMode = 'auto';
    /** @type {number} */
    this.currentHour = this._getCurrentHour();
    /** @type {number} */
    this.targetHour = this.currentHour;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;

    // ── SCENE ──
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050015, 0.004);

    // ── RENDERER ──
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !this.isMobile,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── CAMERA ──
    this.camera = new THREE.PerspectiveCamera(
      this.isMobile ? 75 : CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR
    );
    this.camera.position.set(
      CAMERA_INITIAL_POS.x,
      CAMERA_INITIAL_POS.y,
      CAMERA_INITIAL_POS.z
    );

    // ── SKY (Dynamic gradient shader sphere) ──
    this._createSky();

    // ── LIGHTS ──
    this._createLights();

    // ── Apply initial time-of-day ──
    this._applyTimeOfDay();

    // ── RESIZE ──
    this._onResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._onResize, { passive: true });
    this._handleResize();

    return { scene: this.scene, camera: this.camera, renderer: this.renderer };
  }

  // ═══════════════════════════════════════════════
  // TIME-OF-DAY INTERPOLATION
  // ═══════════════════════════════════════════════

  /**
   * Get current hour as a decimal (e.g. 14.5 = 2:30 PM)
   */
  _getCurrentHour() {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }

  /**
   * Find the two presets surrounding the current hour and interpolate
   */
  _getInterpolatedPreset(hour) {
    let presetA = TIME_PRESETS[0];
    let presetB = TIME_PRESETS[1];

    for (let i = 0; i < TIME_PRESETS.length - 1; i++) {
      if (hour >= TIME_PRESETS[i].hour && hour < TIME_PRESETS[i + 1].hour) {
        presetA = TIME_PRESETS[i];
        presetB = TIME_PRESETS[i + 1];
        break;
      }
    }

    const range = presetB.hour - presetA.hour;
    const t = range > 0 ? (hour - presetA.hour) / range : 0;

    // Smooth interpolation (ease in-out)
    const s = t * t * (3 - 2 * t);

    return {
      skyTop:    new THREE.Color().lerpColors(presetA.skyTop, presetB.skyTop, s),
      skyMid:    new THREE.Color().lerpColors(presetA.skyMid, presetB.skyMid, s),
      skyBottom: new THREE.Color().lerpColors(presetA.skyBottom, presetB.skyBottom, s),
      fogColor:  new THREE.Color().lerpColors(presetA.fogColor, presetB.fogColor, s),
      fogDensity: presetA.fogDensity + (presetB.fogDensity - presetA.fogDensity) * s,
      hemiSky:   new THREE.Color().lerpColors(presetA.hemiSky, presetB.hemiSky, s),
      hemiGround: new THREE.Color().lerpColors(presetA.hemiGround, presetB.hemiGround, s),
      hemiIntensity: presetA.hemiIntensity + (presetB.hemiIntensity - presetA.hemiIntensity) * s,
      dirColor:  new THREE.Color().lerpColors(presetA.dirColor, presetB.dirColor, s),
      dirIntensity: presetA.dirIntensity + (presetB.dirIntensity - presetA.dirIntensity) * s,
      sunPos:    new THREE.Vector3().lerpVectors(presetA.sunPos, presetB.sunPos, s),
      exposure:  presetA.exposure + (presetB.exposure - presetA.exposure) * s,
      starOpacity: presetA.starOpacity + (presetB.starOpacity - presetA.starOpacity) * s,
    };
  }

  /**
   * Apply time-of-day to sky, fog, lights
   * @param {number} [hour] - The hour to apply, defaults to currentHour
   */
  _applyTimeOfDay(hour) {
    if (hour === undefined) {
      hour = this.currentHour;
    }
    const p = this._getInterpolatedPreset(hour);

    // Update sky shader uniforms
    if (this.skyMesh) {
      const u = this.skyMesh.material.uniforms;
      u.uTopColor.value.copy(p.skyTop);
      u.uMidColor.value.copy(p.skyMid);
      u.uBottomColor.value.copy(p.skyBottom);
    }

    // Stars visibility — store for Environment to read
    this.currentStarOpacity = p.starOpacity;

    // Fog
    if (this.scene.fog) {
      this.scene.fog.color.copy(p.fogColor);
      this.scene.fog.density = p.fogDensity;
    }

    // Hemisphere light
    if (this.hemiLight) {
      this.hemiLight.color.copy(p.hemiSky);
      this.hemiLight.groundColor.copy(p.hemiGround);
      this.hemiLight.intensity = p.hemiIntensity;
    }

    // Directional light (sun/moon)
    if (this.dirLight) {
      this.dirLight.color.copy(p.dirColor);
      this.dirLight.intensity = p.dirIntensity;
      this.dirLight.position.copy(p.sunPos);
    }

    // Tone mapping exposure
    if (this.renderer) {
      this.renderer.toneMappingExposure = p.exposure;
    }
  }

  // ═══════════════════════════════════════════════
  // SKY — Dynamic gradient shader sphere
  // ═══════════════════════════════════════════════
  _createSky() {
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x020012) },
        uMidColor: { value: new THREE.Color(0x0a0025) },
        uBottomColor: { value: new THREE.Color(0x0f0035) },
        uOffset: { value: 20 },
        uExponent: { value: 0.6 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        uniform float uExponent;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition + uOffset).y;
          float t = pow(max(h, 0.0), uExponent);
          
          // Bottom → Mid → Top gradient
          vec3 color;
          if (h < 0.0) {
            color = mix(uBottomColor, uMidColor, clamp(h + 1.0, 0.0, 1.0));
          } else {
            color = mix(uMidColor, uTopColor, t);
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  // ═══════════════════════════════════════════════
  // LIGHTS
  // ═══════════════════════════════════════════════
  _createLights() {
    // Hemisphere — ambient sky fill
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x050015, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Directional — main sun/moon with shadows
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight.position.set(15, 25, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    this.dirLight.shadow.camera.left = -30;
    this.dirLight.shadow.camera.right = 30;
    this.dirLight.shadow.camera.top = 30;
    this.dirLight.shadow.camera.bottom = -30;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // Point Lights — birthday color accents with candle flicker
    POINT_LIGHTS_CONFIG.forEach(cfg => {
      const light = new THREE.PointLight(cfg.color, cfg.intensity, cfg.distance);
      light.position.set(...cfg.pos);
      this.scene.add(light);
      this.pointLights.push({
        light,
        baseIntensity: cfg.intensity,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2
      });
    });

    // RectAreaLight — purple rim light from below island
    try {
      RectAreaLightUniformsLib.init();
      const rectLight = new THREE.RectAreaLight(RECT_LIGHT_COLOR, RECT_LIGHT_INTENSITY, 20, 10);
      rectLight.position.set(0, -10, 0);
      rectLight.lookAt(0, 0, 0);
      this.scene.add(rectLight);
    } catch (e) {
      console.warn('RectAreaLight fallback:', e);
      const fallback = new THREE.PointLight(RECT_LIGHT_COLOR, 1.5, 50);
      fallback.position.set(0, -10, 0);
      this.scene.add(fallback);
    }
  }

  /**
   * Set the time mode and set target hour
   * @param {'auto' | 'light' | 'dark'} mode
   */
  setTimeMode(mode) {
    this.timeMode = mode;
    if (mode === 'auto') {
      this.targetHour = this._getCurrentHour();
    } else if (mode === 'light') {
      this.targetHour = 12.0; // Noon preset
    } else if (mode === 'dark') {
      this.targetHour = 20.5; // Early Night preset
    }
  }

  // ═══════════════════════════════════════════════
  // UPDATE — called every frame
  // ═══════════════════════════════════════════════
  update(delta, elapsed) {
    // Animate PointLights — candle flicker effect
    this.pointLights.forEach(p => {
      const flicker = Math.sin(elapsed * p.speed + p.phase) * 0.3 + 0.7;
      p.light.intensity = p.baseIntensity * flicker;
    });

    // Auto mode continuously updates targetHour to match clock
    if (this.timeMode === 'auto') {
      this.targetHour = this._getCurrentHour();
    }

    // Shortest-path 24-hour wrap around interpolation
    let diff = this.targetHour - this.currentHour;
    if (diff > 12.0) {
      diff -= 24.0;
    } else if (diff < -12.0) {
      diff += 24.0;
    }

    if (Math.abs(diff) > 0.001) {
      // Interpolate currentHour smoothly
      this.currentHour += diff * Math.min(delta * 2.2, 1.0);
      
      // Keep currentHour within [0, 24) range
      if (this.currentHour >= 24.0) {
        this.currentHour -= 24.0;
      } else if (this.currentHour < 0.0) {
        this.currentHour += 24.0;
      }
      
      this._applyTimeOfDay(this.currentHour);
    } else if (this.currentHour !== this.targetHour) {
      this.currentHour = this.targetHour;
      this._applyTimeOfDay(this.currentHour);
    } else {
      // Periodic check & sync
      if (!this._todTimer) this._todTimer = 0;
      this._todTimer += delta;
      if (this._todTimer > 2.0) {
        this._todTimer = 0;
        this._applyTimeOfDay(this.currentHour);
      }
    }
  }

  /**
   * Handle window resize
   */
  _handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;
    
    // Scale vertical FOV on narrow aspect ratios to maintain constant horizontal view
    if (aspect < 1) {
      const baseFovRad = (CAMERA_FOV * Math.PI) / 180;
      this.camera.fov = (2 * Math.atan(Math.tan(baseFovRad / 2) / aspect) * 180) / Math.PI;
    } else {
      this.camera.fov = CAMERA_FOV;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Cleanup
   */
  dispose() {
    window.removeEventListener('resize', this._onResize);

    if (this.skyMesh) {
      this.skyMesh.geometry.dispose();
      this.skyMesh.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
