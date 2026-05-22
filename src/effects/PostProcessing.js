/**
 * PostProcessing.js — Bloom + Film Grain + Vignette
 *
 * ✦ UnrealBloomPass: dreamy glow on emissive objects (flames, sparkles, rings)
 * ✦ Custom Film Grain: subtle noise overlay for cinematic feel
 * ✦ Vignette: darkened edges for focus on center
 *
 * Uses EffectComposer pipeline replacing direct renderer.render()
 *
 * Methods: init(renderer, scene, camera), resize(w, h), render(), update(elapsed), dispose()
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ── Film Grain + Vignette combined shader ──
const FilmVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrainIntensity: { value: 0.06 },
    uVignetteStrength: { value: 0.35 },
    uVignetteRadius: { value: 0.85 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainIntensity;
    uniform float uVignetteStrength;
    uniform float uVignetteRadius;
    
    varying vec2 vUv;
    
    // Simple hash noise
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // ── Film Grain ──
      float grain = rand(vUv * 1000.0 + uTime * 100.0) - 0.5;
      color.rgb += grain * uGrainIntensity;
      
      // ── Vignette ──
      vec2 uv = vUv - 0.5;
      float dist = length(uv);
      float vignette = 1.0 - smoothstep(uVignetteRadius * 0.5, uVignetteRadius, dist);
      color.rgb *= mix(1.0 - uVignetteStrength, 1.0, vignette);
      
      // ── Subtle color grading (warm shift) ──
      color.r *= 1.02;
      color.b *= 0.97;
      
      gl_FragColor = color;
    }
  `
};

export class PostProcessing {
  constructor() {
    /** @type {EffectComposer} */
    this.composer = null;
    /** @type {UnrealBloomPass} */
    this.bloomPass = null;
    /** @type {ShaderPass} */
    this.filmPass = null;
  }

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  init(renderer, scene, camera) {
    // Create composer
    this.composer = new EffectComposer(renderer);

    // 1. Render pass (base scene)
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom pass — dreamy glow
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.6, 0.4, 0.85);
    // strength=0.6, radius=0.4, threshold=0.85
    this.composer.addPass(this.bloomPass);

    // 3. Film grain + vignette pass
    this.filmPass = new ShaderPass(FilmVignetteShader);
    this.composer.addPass(this.filmPass);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  /**
   * @param {number} elapsed
   */
  update(elapsed) {
    if (this.filmPass) {
      this.filmPass.uniforms.uTime.value = elapsed;
    }
  }

  /**
   * Render scene through post-processing pipeline
   */
  render() {
    if (this.composer) {
      this.composer.render();
    }
  }

  dispose() {
    if (this.composer) {
      this.composer.passes.forEach(pass => {
        if (pass.dispose) pass.dispose();
      });
    }
  }
}
