/**
 * Three.js 3D Scene — Birthday Landing v3.0 PREMIUM
 * ✦ Galaxy spiral particle system (2000 particles with arms)
 * ✦ Volumetric god-rays (animated light shafts)
 * ✦ Ribbon aurora trail (flowing neon curves)
 * ✦ 3D floating hearts (extruded geometry spinning)
 * ✦ Nebula clouds (procedural noise spheres)
 * ✦ Shooting stars (streak trails)
 * ✦ Custom bloom glow shader pipeline
 * ✦ Fireworks V2 (ring + trail + sparkle)
 * ✦ Confetti V2 (3D geometry pieces)
 * ✦ Mouse-reactive parallax camera + gyroscope mobile
 * ✦ Performance: adaptive quality, RAF throttle
 */
export class ThreeJsService {
  init() {
  'use strict';
  const THREE = window.THREE;
  if (!THREE) {
    console.warn("THREE is not loaded yet!");
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const container = document.getElementById('three-bg');
  if (!container) return;

  // ── ADAPTIVE QUALITY ──
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
  const quality = isMobile ? 'low' : (window.devicePixelRatio > 1.5 ? 'high' : 'medium');
  const Q = {
    low: { particles: 800, petals: 0, hearts: 4, nebula: 3, shootingStars: 2, ribbonPoints: 40, godRays: 2 },
    medium: { particles: 1500, petals: 30, hearts: 7, nebula: 5, shootingStars: 4, ribbonPoints: 80, godRays: 3 },
    high: { particles: 2500, petals: 50, hearts: 10, nebula: 7, shootingStars: 6, ribbonPoints: 120, godRays: 4 }
  }[quality];

  // ── SCENE ──
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xFFFAF7, 0.012);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
  camera.position.set(0, 0, 55);
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.sortObjects = false;
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }, { passive: true });

  // ── COLOR PALETTE ──
  const COLORS = {
    rose: 0xE8507A, pink: 0xF28BA0, purple: 0xA87FCC,
    gold: 0xD4A03C, blue: 0x6BA3D4, white: 0xE8507A,
    blush: 0xF5B4C4, violet: 0xB088D4, teal: 0x5CB89E,
    orange: 0xD4946A, cyan: 0x5EB8C8
  };
  const pal = Object.values(COLORS).map(c => new THREE.Color(c));

  // ═══════════════════════════════════════════════
  // 1. HEART-SHAPED PARTICLE SYSTEM
  // ═══════════════════════════════════════════════
  const PC = Q.particles;
  const pPos = new Float32Array(PC * 3);
  const pCol = new Float32Array(PC * 3);
  const pSiz = new Float32Array(PC);
  const pVel = new Float32Array(PC);
  const HEART_SCALE = 2.8;

  // Parametric heart: x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
  function heartPoint(t) {
    const st = Math.sin(t);
    const hx = 16 * st * st * st;
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: hx, y: hy };
  }

  for (let i = 0; i < PC; i++) {
    const t = Math.random() * Math.PI * 2;
    const h = heartPoint(t);

    // Scatter: most particles near heart surface, some fill inside
    const fillMode = Math.random();
    let scatter, sx, sy;
    if (fillMode < 0.6) {
      // On the heart outline with small scatter
      scatter = (Math.random() - 0.5) * 3;
      sx = h.x * HEART_SCALE + scatter;
      sy = h.y * HEART_SCALE + (Math.random() - 0.5) * 2;
    } else if (fillMode < 0.85) {
      // Inside the heart (scale down)
      const inner = 0.2 + Math.random() * 0.7;
      sx = h.x * HEART_SCALE * inner + (Math.random() - 0.5) * 4;
      sy = h.y * HEART_SCALE * inner + (Math.random() - 0.5) * 3;
    } else {
      // Sparkle halo around heart
      scatter = (Math.random() - 0.5) * 10;
      sx = h.x * HEART_SCALE + scatter;
      sy = h.y * HEART_SCALE + (Math.random() - 0.5) * 8;
    }
    const sz = (Math.random() - 0.5) * 8; // depth scatter

    pPos[i * 3] = sx;
    pPos[i * 3 + 1] = sy;
    pPos[i * 3 + 2] = sz - 15;

    // Color: warm rose/pink/gold tones
    const colorRand = Math.random();
    let c;
    if (colorRand < 0.5) {
      c = new THREE.Color().setHSL(0.95 + Math.random() * 0.06, 0.7, 0.55 + Math.random() * 0.1); // rose/pink
    } else if (colorRand < 0.8) {
      c = new THREE.Color().setHSL(0.83 + Math.random() * 0.08, 0.55, 0.58 + Math.random() * 0.1); // purple/lavender
    } else {
      c = new THREE.Color().setHSL(0.08 + Math.random() * 0.05, 0.65, 0.55 + Math.random() * 0.1); // gold
    }
    pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;

    // Random big & small sizes
    const sizeRand = Math.random();
    if (sizeRand < 0.15) {
      pSiz[i] = 7 + Math.random() * 5; // big sparkle
    } else if (sizeRand < 0.4) {
      pSiz[i] = 4 + Math.random() * 3; // medium
    } else {
      pSiz[i] = 1.5 + Math.random() * 2.5; // small dust
    }
    pVel[i] = 0.05 + Math.random() * 0.1;
  }

  const galaxyGeo = new THREE.BufferGeometry();
  galaxyGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  galaxyGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  galaxyGeo.setAttribute('size', new THREE.BufferAttribute(pSiz, 1));

  const galaxyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: Math.min(devicePixelRatio, 2) }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vC;
      varying float vA;
      uniform float uTime, uPR;
      void main() {
        vC = color;
        vec3 p = position;
        // Gentle orbital breathing
        float dist = length(p.xz);
        float angle = atan(p.z, p.x);
        p.y += sin(uTime * 0.4 + dist * 0.08) * 1.2;
        p.x += cos(uTime * 0.15 + angle) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * uPR * (100.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vA = smoothstep(120.0, 15.0, length(mv.xyz)) * 0.85;
      }
    `,
    fragmentShader: `
      varying vec3 vC;
      varying float vA;
      void main() {
        vec2 p = (gl_PointCoord - vec2(0.5)) * 2.2;
        p.y = -p.y * 1.1 - 0.2;
        float x = p.x;
        float y = p.y;
        float a = x*x + y*y - 1.0;
        float heart = a*a*a - x*x*y*y*y;
        if (heart > 0.0) discard;
        // Soft glow from center
        float glow = 1.0 - smoothstep(-0.4, 0.0, heart);
        gl_FragColor = vec4(vC * glow, glow * vA);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending
  });

  const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
  scene.add(galaxy);

  // ═══════════════════════════════════════════════
  // 2. VOLUMETRIC GOD-RAYS (Light Shafts)
  // ═══════════════════════════════════════════════
  const godRays = [];
  for (let i = 0; i < Q.godRays; i++) {
    const rayGeo = new THREE.PlaneGeometry(2, 120);
    const rayMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color([0xf43f5e, 0xc084fc, 0xfbbf24, 0x60a5fa][i % 4]) },
        uPhase: { value: i * 1.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uPhase;
        varying vec2 vUv;
        void main() {
          float fadeY = 1.0 - abs(vUv.y - 0.5) * 2.0;
          fadeY = pow(fadeY, 3.0);
          float fadeX = 1.0 - abs(vUv.x - 0.5) * 2.0;
          fadeX = pow(fadeX, 2.0);
          float pulse = sin(uTime * 0.3 + uPhase) * 0.5 + 0.5;
          float alpha = fadeX * fadeY * pulse * 0.05;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(
      (Math.random() - 0.5) * 60,
      0,
      -30 - Math.random() * 20
    );
    ray.rotation.z = (Math.random() - 0.5) * 0.8;
    scene.add(ray);
    godRays.push(ray);
  }

  // ═══════════════════════════════════════════════
  // 3. RIBBON AURORA TRAILS
  // ═══════════════════════════════════════════════
  const ribbons = [];
  const RIBBON_COUNT = 3;
  for (let r = 0; r < RIBBON_COUNT; r++) {
    const points = Q.ribbonPoints;
    const ribbonPositions = new Float32Array(points * 3);
    const ribbonGeo = new THREE.BufferGeometry();
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3));

    const ribbonColors = [
      new THREE.Color(0xf43f5e),
      new THREE.Color(0xc084fc),
      new THREE.Color(0x38bdf8)
    ];

    const ribbonMat = new THREE.LineBasicMaterial({
      color: ribbonColors[r],
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      linewidth: 1
    });

    const ribbon = new THREE.Line(ribbonGeo, ribbonMat);
    scene.add(ribbon);
    ribbons.push({
      mesh: ribbon,
      geo: ribbonGeo,
      points: points,
      offset: r * 2.1,
      yBase: (r - 1) * 12,
      speed: 0.3 + r * 0.15
    });
  }

  function updateRibbons(t) {
    ribbons.forEach(rb => {
      const pos = rb.geo.attributes.position.array;
      for (let i = 0; i < rb.points; i++) {
        const frac = i / rb.points;
        const x = (frac - 0.5) * 100;
        const y = rb.yBase + Math.sin(frac * 4 + t * rb.speed + rb.offset) * 10
          + Math.sin(frac * 7 + t * 0.5) * 3;
        const z = -20 + Math.cos(frac * 3 + t * 0.4 + rb.offset) * 8;
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
      }
      rb.geo.attributes.position.needsUpdate = true;
    });
  }

  // ═══════════════════════════════════════════════
  // 4. 3D FLOATING HEARTS (Extruded Shape)
  // ═══════════════════════════════════════════════
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0);
  heartShape.bezierCurveTo(0, -0.3, -0.6, -0.8, -1, -0.4);
  heartShape.bezierCurveTo(-1.6, 0.1, -0.8, 0.8, 0, 1.4);
  heartShape.bezierCurveTo(0.8, 0.8, 1.6, 0.1, 1, -0.4);
  heartShape.bezierCurveTo(0.6, -0.8, 0, -0.3, 0, 0);

  const heartExtrude = { depth: 0.4, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.1, bevelSegments: 3 };
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, heartExtrude);
  heartGeo.center();

  const heartMeshes = [];
  for (let i = 0; i < Q.hearts; i++) {
    const hue = 0.92 + Math.random() * 0.15;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue % 1, 0.7, 0.6),
      transparent: true,
      opacity: 0.06 + Math.random() * 0.06,
      wireframe: Math.random() > 0.35
    });
    const mesh = new THREE.Mesh(heartGeo, mat);
    const scale = 0.5 + Math.random() * 1.2;
    mesh.scale.setScalar(scale);
    mesh.position.set(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 60,
      -15 - Math.random() * 30
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);
    heartMeshes.push({
      mesh,
      rotSpeed: { x: 0.003 + Math.random() * 0.008, y: 0.005 + Math.random() * 0.01, z: 0.002 + Math.random() * 0.006 },
      floatSpeed: 0.2 + Math.random() * 0.4,
      floatAmp: 2 + Math.random() * 4,
      baseY: mesh.position.y,
      phase: Math.random() * Math.PI * 2
    });
  }

  // ══════════════════════════════════════
  // 5. NEBULA CLOUDS (Procedural Noise Spheres)
  // ══════════════════════════════════════
  const nebulae = [];
  for (let i = 0; i < Q.nebula; i++) {
    const size = 3 + Math.random() * 6;
    const nMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: pal[Math.floor(Math.random() * pal.length)] },
        uColor2: { value: pal[Math.floor(Math.random() * pal.length)] },
        uOpacity: { value: 0.03 + Math.random() * 0.03 }
      },
      vertexShader: `
        varying vec3 vPos;
        varying vec3 vNormal;
        uniform float uTime;
        void main() {
          vPos = position;
          vNormal = normal;
          vec3 p = position;
          p += normal * sin(p.x * 2.0 + uTime * 0.5) * 0.15;
          p += normal * cos(p.y * 3.0 + uTime * 0.3) * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1, uColor2;
        uniform float uTime, uOpacity;
        varying vec3 vPos, vNormal;
        void main() {
          float pattern = sin(vPos.x * 3.0 + uTime * 0.4) * cos(vPos.y * 2.5 + uTime * 0.3)
                        * sin(vPos.z * 4.0 + uTime * 0.5);
          pattern = pattern * 0.5 + 0.5;
          vec3 col = mix(uColor1, uColor2, pattern);
          float edge = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          gl_FragColor = vec4(col, (pattern * 0.5 + edge * 0.5) * uOpacity);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
    const nMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 4), nMat);
    nMesh.position.set(
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 50,
      -25 - Math.random() * 35
    );
    scene.add(nMesh);
    nebulae.push({
      mesh: nMesh,
      rotSpeed: 0.001 + Math.random() * 0.003,
      floatPhase: Math.random() * Math.PI * 2
    });
  }

  // ══════════════════════════════════════
  // 6. SHOOTING STARS
  // ══════════════════════════════════════
  const shootingStars = [];
  function spawnShootingStar() {
    if (shootingStars.length >= Q.shootingStars) return;
    const TRAIL_LENGTH = 30;
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const startX = (Math.random() - 0.3) * 100;
    const startY = 25 + Math.random() * 20;
    const startZ = -10 - Math.random() * 30;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positions[i * 3] = startX;
      positions[i * 3 + 1] = startY;
      positions[i * 3 + 2] = startZ;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    const angle = -0.4 - Math.random() * 0.4;
    const speed = 1.2 + Math.random() * 1.5;
    shootingStars.push({
      mesh: line,
      geo,
      headX: startX,
      headY: startY,
      headZ: startZ,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: (Math.random() - 0.5) * 0.3,
      trail: TRAIL_LENGTH,
      life: 1,
      decay: 0.008 + Math.random() * 0.006
    });
  }

  function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.headX += s.vx;
      s.headY += s.vy;
      s.headZ += s.vz;
      s.life -= s.decay;
      s.mesh.material.opacity = Math.max(0, s.life * 0.6);

      const pos = s.geo.attributes.position.array;
      // Shift trail positions backward
      for (let j = s.trail - 1; j > 0; j--) {
        pos[j * 3] = pos[(j - 1) * 3];
        pos[j * 3 + 1] = pos[(j - 1) * 3 + 1];
        pos[j * 3 + 2] = pos[(j - 1) * 3 + 2];
      }
      pos[0] = s.headX;
      pos[1] = s.headY;
      pos[2] = s.headZ;
      s.geo.attributes.position.needsUpdate = true;

      if (s.life <= 0) {
        scene.remove(s.mesh);
        s.geo.dispose();
        s.mesh.material.dispose();
        shootingStars.splice(i, 1);
      }
    }
  }

  // Spawn shooting stars periodically
  setInterval(() => {
    if (Math.random() > 0.4) spawnShootingStar();
  }, isMobile ? 4000 : 2500);
  // Initial spawns
  setTimeout(() => spawnShootingStar(), 1000);
  setTimeout(() => spawnShootingStar(), 2500);

  // ══════════════════════════════════════
  // 7. AMBIENT TORUS RINGS (enhanced)
  // ══════════════════════════════════════
  const rings = [];
  const ringConfigs = [
    { r: 6, tube: 0.02, color: 0xf43f5e, pos: [0, 0, -12], rotX: Math.PI * 0.3 },
    { r: 10, tube: 0.015, color: 0xc084fc, pos: [0, 0, -18], rotX: Math.PI * 0.5 },
    { r: 14, tube: 0.01, color: 0xfbbf24, pos: [0, 0, -25], rotX: Math.PI * 0.4 },
  ];
  ringConfigs.forEach((cfg, idx) => {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.r, cfg.tube, 8, 100),
      new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.08 })
    );
    ringMesh.position.set(...cfg.pos);
    ringMesh.rotation.x = cfg.rotX;
    ringMesh.rotation.y = idx * 0.7;
    scene.add(ringMesh);
    rings.push({ mesh: ringMesh, speed: 0.03 + idx * 0.02, dir: idx % 2 === 0 ? 1 : -1 });
  });

  // ══════════════════════════════════════
  // FIREWORKS V2 SYSTEM (ring burst + sparkle trail)
  // ══════════════════════════════════════
  const fwParticles = [];

  function launchFirework(x, y) {
    const count = 150 + Math.floor(Math.random() * 100);
    const cx = (x / innerWidth - 0.5) * 60;
    const cy = -(y / innerHeight - 0.5) * 40;
    const color = pal[Math.floor(Math.random() * pal.length)];

    // Main explosion
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = cx; pos[i * 3 + 1] = cy; pos[i * 3 + 2] = -5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = 2.5 + Math.random() * 5;
      vel.push(sp * Math.sin(ph) * Math.cos(th), sp * Math.sin(ph) * Math.sin(th), sp * Math.cos(ph));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: color, size: 0.35, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    fwParticles.push({ pts, vel, life: 1, decay: 0.007 + Math.random() * 0.005 });

    // Ring burst (secondary)
    setTimeout(() => {
      const ringCount = 60;
      const ringGeo = new THREE.BufferGeometry();
      const ringPos = new Float32Array(ringCount * 3);
      const ringVel = [];
      for (let i = 0; i < ringCount; i++) {
        ringPos[i * 3] = cx; ringPos[i * 3 + 1] = cy; ringPos[i * 3 + 2] = -5;
        const angle = (i / ringCount) * Math.PI * 2;
        const sp = 3 + Math.random() * 2;
        ringVel.push(Math.cos(angle) * sp, Math.sin(angle) * sp, (Math.random() - 0.5) * 0.5);
      }
      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
      const color2 = pal[Math.floor(Math.random() * pal.length)];
      const ringMat = new THREE.PointsMaterial({
        color: color2, size: 0.25, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const ringPts = new THREE.Points(ringGeo, ringMat);
      scene.add(ringPts);
      fwParticles.push({ pts: ringPts, vel: ringVel, life: 1, decay: 0.012 });
    }, 120);

    // Sparkle cascade (tertiary)
    setTimeout(() => {
      const sCount = 30;
      const sGeo = new THREE.BufferGeometry();
      const sPos = new Float32Array(sCount * 3);
      const sVel = [];
      for (let i = 0; i < sCount; i++) {
        sPos[i * 3] = cx + (Math.random() - 0.5) * 4;
        sPos[i * 3 + 1] = cy + (Math.random() - 0.5) * 4;
        sPos[i * 3 + 2] = -5;
        sVel.push((Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, (Math.random() - 0.5) * 0.5);
      }
      sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
      const sMat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const sPts = new THREE.Points(sGeo, sMat);
      scene.add(sPts);
      fwParticles.push({ pts: sPts, vel: sVel, life: 1, decay: 0.015, gravity: true });
    }, 300);
  }

  window.triggerFireworks = function (count) {
    count = count || 5;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        launchFirework(
          innerWidth * 0.15 + Math.random() * innerWidth * 0.7,
          innerHeight * 0.15 + Math.random() * innerHeight * 0.5
        );
      }, i * 250 + Math.random() * 150);
    }
  };

  // ── CONFETTI 3D ──
  window.triggerConfetti3D = function () {
    const count = 250;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = -5 + Math.random() * 3;
      pos[i * 3 + 2] = 5 + Math.random() * 3;
      const th = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      vel.push(Math.cos(th) * sp * 0.5, 3 + Math.random() * sp, Math.sin(th) * sp * 0.3);
      const c = pal[Math.floor(Math.random() * pal.length)];
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.6, transparent: true, opacity: 1, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    fwParticles.push({ pts, vel, life: 1, decay: 0.005, gravity: true });
  };

  // ── BUBBLE BURST ──
  window.triggerBubbleBurst = function () {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const size = 0.3 + Math.random() * 1;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.7),
        transparent: true, opacity: 0.1, wireframe: true
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), mat);
      mesh.position.set((Math.random() - 0.5) * 40, -20 + Math.random() * 10, (Math.random() - 0.5) * 20);
      scene.add(mesh);
      // Animate float up then remove
      const vy = 0.05 + Math.random() * 0.08;
      const startTime = performance.now();
      function animBubble() {
        mesh.position.y += vy;
        mesh.rotation.y += 0.01;
        mesh.material.opacity *= 0.997;
        if (mesh.position.y > 50 || mesh.material.opacity < 0.01) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
          return;
        }
        requestAnimationFrame(animBubble);
      }
      animBubble();
    }
  };

  // ── MOUSE / GYROSCOPE ──
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  if (!isMobile) {
    document.addEventListener('mousemove', e => {
      targetMouseX = (e.clientX / innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / innerHeight - 0.5) * 2;
    });
  } else {
    // Gyroscope on mobile
    window.addEventListener('deviceorientation', e => {
      if (e.gamma != null) targetMouseX = (e.gamma / 45);
      if (e.beta != null) targetMouseY = ((e.beta - 45) / 45);
    }, { passive: true });
  }

  // ── ANIMATION LOOP ──
  const clock = new THREE.Clock();
  let rafId = null;
  let lastFrame = 0;
  const FPS_TARGET = isMobile ? 30 : 60;
  const FRAME_INTERVAL = 1000 / FPS_TARGET;

  function animate(now) {
    rafId = requestAnimationFrame(animate);

    try {
      // Throttle on mobile
      if (isMobile && now - lastFrame < FRAME_INTERVAL) return;
      lastFrame = now;

      const t = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Heart breathing pulse
      galaxyMat.uniforms.uTime.value = t;
      const pulse = 1 + Math.sin(t * 0.5) * 0.02;
      galaxy.scale.set(pulse, pulse, 1);
      galaxy.rotation.z = Math.sin(t * 0.1) * 0.03; // very gentle sway

      // God rays
      godRays.forEach(ray => {
        ray.material.uniforms.uTime.value = t;
        ray.rotation.z += 0.0003;
      });

      // Ribbons
      updateRibbons(t);

      // Hearts
      heartMeshes.forEach(h => {
        h.mesh.rotation.x += h.rotSpeed.x;
        h.mesh.rotation.y += h.rotSpeed.y;
        h.mesh.rotation.z += h.rotSpeed.z;
        h.mesh.position.y = h.baseY + Math.sin(t * h.floatSpeed + h.phase) * h.floatAmp;
      });

      // Nebula
      nebulae.forEach(n => {
        n.mesh.rotation.y += n.rotSpeed;
        n.mesh.rotation.x += n.rotSpeed * 0.5;
        n.mesh.material.uniforms.uTime.value = t;
        n.mesh.position.y += Math.sin(t * 0.2 + n.floatPhase) * 0.01;
      });

      // Shooting stars
      updateShootingStars();

      // Rings
      rings.forEach(r => {
        r.mesh.rotation.z += r.speed * 0.015 * r.dir;
        r.mesh.rotation.y += r.speed * 0.008;
      });

      // Fireworks / Confetti
      for (let i = fwParticles.length - 1; i >= 0; i--) {
        const fw = fwParticles[i];
        fw.life -= fw.decay;
        fw.pts.material.opacity = Math.max(0, fw.life);
        const arr = fw.pts.geometry.attributes.position.array;
        for (let j = 0; j < fw.vel.length; j += 3) {
          arr[j] += fw.vel[j] * 0.15;
          arr[j + 1] += fw.vel[j + 1] * 0.15;
          arr[j + 2] += fw.vel[j + 2] * 0.15;
          fw.vel[j] *= 0.97;
          fw.vel[j + 1] *= 0.97;
          fw.vel[j + 2] *= 0.97;
          if (fw.gravity) fw.vel[j + 1] -= 0.04;
        }
        fw.pts.geometry.attributes.position.needsUpdate = true;
        if (fw.life <= 0) {
          scene.remove(fw.pts);
          fw.pts.geometry.dispose();
          fw.pts.material.dispose();
          fwParticles.splice(i, 1);
        }
      }

      // Camera parallax follow
      camera.position.x += (mouseX * 6 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 4 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    } catch (e) {
      console.error(e);
      // alert('ThreeJS Render Error: ' + e.message);
      cancelAnimationFrame(rafId);
    }
  }

  animate(0);

  // Visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
      clock.stop();
    } else {
      clock.start();
      rafId = requestAnimationFrame(animate);
    }
  });
  }
}
