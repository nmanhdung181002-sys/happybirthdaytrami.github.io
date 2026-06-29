/**
 * main.js — Entry point for 3D Birthday Website
 * 
 * ✦ Initializes SceneSetup (renderer, camera, lights, sky)
 * ✦ RAF animation loop with delta time
 * ✦ Loading screen management
 * ✦ Visibility change (pause/resume)
 * ✦ Music player toggle
 */

import * as THREE from 'three';
import { SceneSetup } from './scene/SceneSetup.js?v=2';
import { Environment } from './scene/Environment.js?v=2';
import { CameraPath } from './scene/CameraPath.js?v=2';
import { BirthdayCake } from './objects/BirthdayCake.js?v=2';
import { BirthdayText } from './objects/BirthdayText.js?v=2';
import { Balloons } from './objects/Balloons.js?v=2';
import { GiftBoxes } from './objects/GiftBoxes.js?v=2';
import { MagicalEffects } from './effects/MagicalEffects.js?v=2';
import { ConfettiSystem } from './effects/ConfettiSystem.js?v=2';
import { SparkleTrail } from './effects/SparkleTrail.js?v=2';
import { PostProcessing } from './effects/PostProcessing.js?v=2';
import { ScrollStory } from './effects/ScrollStory.js?v=2';
import { InteractionManager } from './effects/InteractionManager.js?v=2';
import { MicBlowDetector } from './effects/MicBlowDetector.js?v=2';
import { YukiCat } from './objects/YukiCat.js?v=2';
import { ShadowCat } from './objects/ShadowCat.js?v=2';
import { MochiCat } from './objects/MochiCat.js?v=2';

// ── LOADING PROGRESS ──
const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');

function setLoadProgress(pct) {
  if (loaderBar) loaderBar.style.width = pct + '%';
}

function hideLoader() {
  if (loaderEl) {
    loaderEl.classList.add('fade-out');
    setTimeout(() => {
      loaderEl.style.display = 'none';
      // Show scroll hint
      const hint = document.getElementById('scroll-hint');
      if (hint) hint.hidden = false;
      // Initialize Lucide Icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 800);
  }
}

// ── INIT ──
async function init() {
  // Detect reduced motion preference for accessibility
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  setLoadProgress(10);

  const canvas = document.getElementById('scene-canvas');
  if (!canvas) {
    console.error('Canvas #scene-canvas not found');
    return;
  }

  // 1. Scene Setup
  setLoadProgress(30);
  const sceneSetup = new SceneSetup();
  const { scene, camera, renderer } = sceneSetup.init(canvas);

  setLoadProgress(50);

  // 2. Environment (Starfield, Island, Grass, Clouds)
  const environment = new Environment();
  environment.init(scene);

  setLoadProgress(70);

  // 3. Camera Path (scroll-based camera system)
  const cameraPath = new CameraPath();
  cameraPath.init(scene);

  setLoadProgress(85);

  // 4. Birthday Cake
  const cake = new BirthdayCake();
  cake.init(scene);

  // 5. Birthday Text (3D TextGeometry + holographic shader)
  const birthdayText = new BirthdayText();
  birthdayText.init(scene);

  // 6. Balloons
  const balloons = new Balloons();
  balloons.init(scene);

  // 7. Gift Boxes
  const giftBoxes = new GiftBoxes();
  giftBoxes.init(scene);

  // 8. Magical Effects (rings, orbs, fairy dust)
  const magicFx = new MagicalEffects();
  magicFx.init(scene);

  // ── CATS — parented to islandGroup so they float with the island ──
  // Island local top surface Y = ISLAND_HEIGHT/2 + 0.4 (half of 0.8 thick top cylinder)
  const ISLAND_SURFACE_Y = 2.9; // in island-local space
  const ISLAND_ROAM_RADIUS = 8;  // stay within this radius

  // All cats get added to islandGroup instead of scene
  const islandGroup = environment.islandGroup;

  // Yuki — sleeping loaf, stays still near front
  const yukiCat = new YukiCat();
  yukiCat.init(scene);
  // Re-parent: remove from scene, add to islandGroup
  scene.remove(yukiCat.group);
  islandGroup.add(yukiCat.group);
  yukiCat.group.position.set(1.5, ISLAND_SURFACE_Y, 4.0);
  yukiCat.group.rotation.y = Math.PI * 0.05;

  // Shadow — standing, roams slowly & mysteriously
  const shadowCat = new ShadowCat();
  shadowCat.init(scene);
  scene.remove(shadowCat.group);
  islandGroup.add(shadowCat.group);
  shadowCat.group.position.set(3.0, ISLAND_SURFACE_Y, -2.0);
  shadowCat.group.rotation.y = -Math.PI * 0.3;

  // Mochi — chubby, waddles around cheerfully
  const mochiCat = new MochiCat();
  mochiCat.init(scene);
  scene.remove(mochiCat.group);
  islandGroup.add(mochiCat.group);
  mochiCat.group.position.set(-3.5, ISLAND_SURFACE_Y, 1.5);
  mochiCat.group.rotation.y = Math.PI * 0.15;

  // ── Cat Roaming System ──
  // Each roaming cat picks random waypoints and walks there
  const catRoamers = [
    {
      cat: mochiCat,
      speed: 0.8,           // Mochi waddles fast
      target: new THREE.Vector3(-3.5, ISLAND_SURFACE_Y, 1.5),
      waitTimer: 0,
      waitDuration: 2 + Math.random() * 3,
      state: 'idle',        // 'idle' | 'walking'
      bobPhase: 0,          // walking bob animation
    },
    {
      cat: shadowCat,
      speed: 0.5,           // Shadow moves slowly, deliberately
      target: new THREE.Vector3(3.0, ISLAND_SURFACE_Y, -2.0),
      waitTimer: 0,
      waitDuration: 4 + Math.random() * 4,
      state: 'idle',
      bobPhase: 0,
    },
  ];

  function pickNewTarget(roamer) {
    const angle = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * (ISLAND_ROAM_RADIUS - 2);
    roamer.target.set(
      Math.cos(angle) * r,
      ISLAND_SURFACE_Y,
      Math.sin(angle) * r,
    );
    roamer.state = 'walking';
    roamer.bobPhase = 0;
  }

  function updateCatRoaming(delta) {
    catRoamers.forEach(roamer => {
      const group = roamer.cat.group;
      const pos = group.position;

      if (roamer.state === 'idle') {
        // Wait at current spot
        roamer.waitTimer += delta;
        if (roamer.waitTimer >= roamer.waitDuration) {
          roamer.waitTimer = 0;
          roamer.waitDuration = 2 + Math.random() * 4;
          pickNewTarget(roamer);
        }
      } else if (roamer.state === 'walking') {
        // Move toward target
        const dx = roamer.target.x - pos.x;
        const dz = roamer.target.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.2) {
          // Arrived at target
          roamer.state = 'idle';
          roamer.waitTimer = 0;
          // Reset Y to surface
          pos.y = ISLAND_SURFACE_Y;
          return;
        }

        // Smooth rotation toward target (face direction of movement)
        const targetAngle = Math.atan2(dx, dz);
        let currentAngle = group.rotation.y;
        // Shortest angle diff
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        group.rotation.y += angleDiff * Math.min(delta * 3.0, 1.0);

        // Move forward
        const moveSpeed = roamer.speed * delta;
        const moveX = (dx / dist) * moveSpeed;
        const moveZ = (dz / dist) * moveSpeed;
        pos.x += moveX;
        pos.z += moveZ;

        // Walking bob (up-down bounce)
        roamer.bobPhase += delta * roamer.speed * 8;
        const bob = Math.abs(Math.sin(roamer.bobPhase)) * 0.08;
        pos.y = ISLAND_SURFACE_Y + bob;

        // Clamp to island radius
        const fromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (fromCenter > ISLAND_ROAM_RADIUS) {
          pos.x *= ISLAND_ROAM_RADIUS / fromCenter;
          pos.z *= ISLAND_ROAM_RADIUS / fromCenter;
          // Pick new target back toward center
          pickNewTarget(roamer);
          roamer.target.set(
            (Math.random() - 0.5) * 4,
            ISLAND_SURFACE_Y,
            (Math.random() - 0.5) * 4,
          );
        }
      }
    });
  }

  // 9. Confetti particles (skip if reduced motion)
  const confetti = new ConfettiSystem();
  if (!prefersReducedMotion) {
    confetti.init(scene);
  }

  // 10. Sparkle trail (skip if reduced motion)
  const sparkleTrail = new SparkleTrail();
  if (!prefersReducedMotion) {
    sparkleTrail.init(scene);
  }

  // 11. Post-processing (bloom + film grain + vignette)
  const postFx = new PostProcessing();
  postFx.init(renderer, scene, camera);

  // 12. Scroll Story (chapter overlays + progress bar)
  const scrollStory = new ScrollStory();
  scrollStory.init(cameraPath);

  // 13. Interactions (raycasting + hover + click)
  const interactions = new InteractionManager();
  interactions.init(scene, camera, {
    balloons,
    giftBoxes,
    cake,
    confetti
  });

  // 14. Mic Blow Detection (blow out candles via microphone)
  const micBlow = new MicBlowDetector();
  micBlow.init(cake, confetti, interactions);

  // Resize handler for post-processing composer
  window.addEventListener('resize', () => {
    postFx.resize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  setLoadProgress(90);

  // 9. Music Player
  _initMusicPlayer();

  // 10. Countdown Timer
  _initCountdown();

  // 11. Share Button
  _initShareButton();

  // 12. Time Controls
  _initTimeControls(sceneSetup);

  // 13. Keyboard Navigation
  _initKeyboardNav(cameraPath);

  // 10. Animation Loop
  let rafId = null;
  let lastTime = 0;
  const clock = { elapsed: 0 };

  // Disable mouse parallax if reduced motion
  if (prefersReducedMotion) {
    cameraPath.mouseTarget = { x: 0, y: 0 };
    cameraPath.mouseCurrent = { x: 0, y: 0 };
    // Override mouse handler to do nothing
    if (cameraPath._onMouseMove) {
      window.removeEventListener('mousemove', cameraPath._onMouseMove);
    }
  }

  function animate(now) {
    rafId = requestAnimationFrame(animate);

    const delta = Math.min((now - lastTime) / 1000, 0.1); // cap delta at 100ms
    lastTime = now;
    clock.elapsed += delta;

    // ── ESSENTIAL UPDATES (always run) ──
    cameraPath.update(delta, clock.elapsed, camera);
    sceneSetup.update(delta, clock.elapsed);
    // Sync star visibility from time-of-day to Environment starfield
    if (environment.starMaterial) {
      environment.starMaterial.uniforms.uGlobalOpacity.value = sceneSetup.currentStarOpacity;
    }
    // Interactions (raycasting, hover, click)
    interactions.update(delta, clock.elapsed, camera);
    // Scroll story overlays
    scrollStory.update(cameraPath.getProgress());

    if (prefersReducedMotion) {
      // ── REDUCED MOTION: static scene, no particles/bouncing/floating ──
      // Clouds still billboard (face camera) — essential for visual coherence
      environment.clouds.forEach(c => {
        if (camera) c.mesh.lookAt(camera.position);
      });
      // Starfield twinkle (shader-based, subtle, not motion-triggering)
      if (environment.starMaterial) {
        environment.starMaterial.uniforms.uTime.value = clock.elapsed;
      }
      // Birthday text billboard (face camera, no sway)
      if (birthdayText.mainTextMesh && camera) {
        const lookDir = new THREE.Vector3().subVectors(camera.position, birthdayText.group.position).normalize();
        lookDir.y = 0;
        birthdayText.mainTextMesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
      }
      // Cake candle flames still flicker (subtle glowing, not motion-sickness)
      cake.flameMaterials.forEach(mat => {
        mat.uniforms.uTime.value = clock.elapsed;
      });
    } else {
      // ── FULL MOTION: all animations ──
      environment.update(delta, clock.elapsed, camera);
      cake.update(delta, clock.elapsed);
      birthdayText.update(delta, clock.elapsed, camera);
      balloons.update(delta, clock.elapsed);
      giftBoxes.update(delta, clock.elapsed);
      magicFx.update(delta, clock.elapsed);
      confetti.update(delta, clock.elapsed);
      sparkleTrail.update(delta, clock.elapsed, camera);
      yukiCat.update(delta, clock.elapsed);
      shadowCat.update(delta, clock.elapsed);
      mochiCat.update(delta, clock.elapsed);
      updateCatRoaming(delta);
    }

    // Post-processing update + render
    postFx.update(clock.elapsed);
    postFx.render();
  }

  // 11. Visibility Change (pause/resume)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  });

  // 12. Start
  setLoadProgress(100);
  await _delay(300); // let progress bar fill visually
  hideLoader();

  lastTime = performance.now();
  rafId = requestAnimationFrame(animate);
}

// ── MUSIC PLAYER ──
function _initMusicPlayer() {
  const toggleBtn = document.getElementById('music-toggle');
  const audio = document.getElementById('bg-music');
  const iconOff = document.getElementById('music-icon-off');
  const iconOn = document.getElementById('music-icon-on');

  if (!toggleBtn || !audio) return;

  let isPlaying = false;

  toggleBtn.addEventListener('click', () => {
    if (isPlaying) {
      audio.pause();
      toggleBtn.classList.remove('playing');
      if (iconOff) iconOff.style.display = '';
      if (iconOn) iconOn.style.display = 'none';
    } else {
      audio.play().catch(() => {});
      toggleBtn.classList.add('playing');
      if (iconOff) iconOff.style.display = 'none';
      if (iconOn) iconOn.style.display = '';
    }
    isPlaying = !isPlaying;
  });
}

// ── COUNTDOWN TIMER ──
function _initCountdown() {
  const container = document.getElementById('countdown-timer');
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (!container) return;

  function getTargetDate() {
    const now = new Date();
    let year = now.getFullYear();
    // Target: June 30 this year, or next year if already passed
    let target = new Date(year, 5, 30, 0, 0, 0); // June = month 5 (0-indexed)
    if (now > target) {
      // If today IS June 30, show "Happy Birthday"
      const endOfDay = new Date(year, 5, 30, 23, 59, 59);
      if (now <= endOfDay) {
        return null; // birthday today!
      }
      // Past June 30 → target next year
      target = new Date(year + 1, 5, 30, 0, 0, 0);
    }
    return target;
  }

  function updateCountdown() {
    const target = getTargetDate();
    
    if (target === null) {
      // It's the birthday!
      container.classList.add('birthday-reached');
      const label = container.querySelector('.countdown-label');
      if (label) label.innerHTML = '🎉 Hôm nay là sinh nhật! 🎉';
      if (daysEl) daysEl.textContent = '🎂';
      if (hoursEl) hoursEl.textContent = '🎉';
      if (minsEl) minsEl.textContent = '💕';
      if (secsEl) secsEl.textContent = '✨';
      return;
    }

    const now = new Date();
    const diff = target - now;
    
    if (diff <= 0) {
      // Just hit birthday!
      updateCountdown();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
  }

  // Show the container
  container.hidden = false;

  // Update immediately + every second
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ── SHARE BUTTON ──
function _initShareButton() {
  const shareBtn = document.getElementById('share-btn');
  const toast = document.getElementById('share-toast');
  if (!shareBtn) return;

  shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: 'Happy Birthday ✦ Trà Mi',
      text: 'Gửi lời chúc sinh nhật đặc biệt đến Trà Mi — một trải nghiệm 3D đầy cảm xúc 🎂✨',
      url: window.location.href
    };

    try {
      // Try native Web Share API first (mobile/desktop support)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      // User cancelled or API not available — fall through to clipboard
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (toast) {
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 2500);
      }
    } catch (e) {
      // Final fallback: prompt
      prompt('Copy link này:', window.location.href);
    }
  });
}

// ── KEYBOARD NAVIGATION ──
function _initKeyboardNav(cameraPath) {
  const SCROLL_STEP = 0.03;      // per keypress
  const SCROLL_PAGE_STEP = 0.15; // Page Up/Down

  window.addEventListener('keydown', (e) => {
    if (!cameraPath) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        cameraPath.scrollTarget = Math.min(1, cameraPath.scrollTarget + SCROLL_STEP);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        cameraPath.scrollTarget = Math.max(0, cameraPath.scrollTarget - SCROLL_STEP);
        break;
      case 'PageDown':
        e.preventDefault();
        cameraPath.scrollTarget = Math.min(1, cameraPath.scrollTarget + SCROLL_PAGE_STEP);
        break;
      case 'PageUp':
        e.preventDefault();
        cameraPath.scrollTarget = Math.max(0, cameraPath.scrollTarget - SCROLL_PAGE_STEP);
        break;
      case 'Home':
        e.preventDefault();
        cameraPath.scrollTarget = 0;
        break;
      case 'End':
        e.preventDefault();
        cameraPath.scrollTarget = 1;
        break;
    }
  });
}

// ── TIME OF DAY CONTROLLER ──
function _initTimeControls(sceneSetup) {
  const toggleBtn = document.getElementById('time-toggle-btn');
  const toggleIcon = document.getElementById('time-toggle-icon');
  const toggleLabel = document.getElementById('time-toggle-label');
  
  const btnLight = document.getElementById('time-btn-light');
  const btnDark = document.getElementById('time-btn-dark');
  const btnAuto = document.getElementById('time-btn-auto');

  if (!sceneSetup) return;

  // Check if system time hour is day or night
  const startHour = new Date().getHours();
  const startIsDay = startHour >= 6 && startHour < 18;
  
  let currentMode = 'auto'; // 'auto' | 'light' | 'dark'
  let toggleState = startIsDay ? 'light' : 'dark';

  function updateUI() {
    if (btnLight) btnLight.classList.remove('active');
    if (btnDark) btnDark.classList.remove('active');
    if (btnAuto) btnAuto.classList.remove('active');

    if (currentMode === 'light') {
      if (btnLight) btnLight.classList.add('active');
      toggleState = 'light';
    } else if (currentMode === 'dark') {
      if (btnDark) btnDark.classList.add('active');
      toggleState = 'dark';
    } else if (currentMode === 'auto') {
      if (btnAuto) btnAuto.classList.add('active');
      const h = new Date().getHours();
      toggleState = (h >= 6 && h < 18) ? 'light' : 'dark';
    }

    if (toggleBtn) {
      if (toggleState === 'light') {
        if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'sun');
        if (toggleLabel) toggleLabel.textContent = currentMode === 'auto' ? 'Tự động (Sáng)' : 'Thủ công (Sáng)';
        toggleBtn.classList.remove('active-night');
        toggleBtn.classList.add('active-day');
      } else {
        if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'moon');
        if (toggleLabel) toggleLabel.textContent = currentMode === 'auto' ? 'Tự động (Tối)' : 'Thủ công (Tối)';
        toggleBtn.classList.remove('active-day');
        toggleBtn.classList.add('active-night');
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Set initial auto state
  sceneSetup.setTimeMode('auto');
  updateUI();

  // Register events
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const nextState = toggleState === 'light' ? 'dark' : 'light';
      currentMode = nextState;
      sceneSetup.setTimeMode(nextState);
      updateUI();
    });
  }

  if (btnLight) {
    btnLight.addEventListener('click', () => {
      currentMode = 'light';
      sceneSetup.setTimeMode('light');
      updateUI();
    });
  }

  if (btnDark) {
    btnDark.addEventListener('click', () => {
      currentMode = 'dark';
      sceneSetup.setTimeMode('dark');
      updateUI();
    });
  }

  if (btnAuto) {
    btnAuto.addEventListener('click', () => {
      currentMode = 'auto';
      sceneSetup.setTimeMode('auto');
      updateUI();
    });
  }
}

// ── UTILS ──
function _delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── START ──
init().catch(console.error);
