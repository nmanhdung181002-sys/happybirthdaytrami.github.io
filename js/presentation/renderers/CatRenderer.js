/**
 * Interactive Cat Companion v3 — White British Shorthair
 * ✦ 3D volumetric canvas rendering with radial gradients
 * ✦ Round face, chubby cheeks, short ears, stocky body
 * ✦ Platform system: cat jumps onto visible cards/divs
 * ✦ Physics: gravity, bounce, momentum
 * ✦ Drag & drop with throw velocity
 * ✦ Pet detection + purr hearts
 * ✦ Scroll-triggered jumps
 */
export class CatRenderer {
  init() {
  'use strict';

  const CAT_W = 90, CAT_H = 80;
  const GRAVITY = 0.5;
  const BOUNCE = 0.35;

  // ── DOM ──
  const wrap = document.createElement('div');
  wrap.id = 'cat-companion';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = `position:fixed;z-index:601;width:${CAT_W}px;height:${CAT_H}px;cursor:grab;touch-action:none;pointer-events:auto;filter:drop-shadow(0 4px 12px rgba(0,0,0,.35));`;

  const canvas = document.createElement('canvas');
  canvas.width = CAT_W * 2;
  canvas.height = CAT_H * 2;
  canvas.style.cssText = 'width:100%;height:100%;';
  wrap.appendChild(canvas);
  document.body.appendChild(wrap);

  const ctx = canvas.getContext('2d');
  const S = 2;

  // ── PLATFORM SELECTORS ──
  const PLAT_SEL = '.wc, .polaroid, .tl-card, .stat, .trait, .photo-frame, .letter-card, .cd, .mo, .css-cake, .blow-btn, .love-btn, .nav-logo, .cd-wrap';

  // ── STATE ──
  const cat = {
    x: 100, y: window.innerHeight - CAT_H - 10,
    vx: 0, vy: 0,
    state: 'idle', dir: 1, frame: 0, stateTimer: 0,
    onGround: true, isDragging: false,
    dragOffX: 0, dragOffY: 0,
    walkTarget: -1,
    blinkTimer: 0, isBlinking: false,
    tailPhase: 0, purrs: [],
    idleTime: 0, scrollCooldown: 0,
    currentPlatform: null,
    earWiggle: 0, breathe: 0,
  };

  // ══════════════════════════════════════
  // PLATFORMS
  // ══════════════════════════════════════
  function getPlatforms() {
    const ps = [];
    document.querySelectorAll(PLAT_SEL).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 20 || r.bottom < 0 || r.top > window.innerHeight) return;
      ps.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, el });
    });
    ps.push({ left: 0, right: window.innerWidth, top: window.innerHeight, bottom: window.innerHeight + 50, width: window.innerWidth, el: null });
    return ps;
  }

  function findPlatformBelow(x, y) {
    let best = null, bestDist = Infinity;
    for (const p of getPlatforms()) {
      if (x + CAT_W * 0.3 > p.left && x + CAT_W * 0.7 < p.right) {
        const sy = p.top - CAT_H;
        if (sy >= y - 2 && sy > y) {
          const d = sy - y;
          if (d < bestDist) { bestDist = d; best = p; }
        }
      }
    }
    return best;
  }

  function getRandomPlatform() {
    const ps = getPlatforms().filter(p => p.el !== null && p.width > CAT_W);
    return ps.length ? ps[Math.floor(Math.random() * ps.length)] : null;
  }

  // ══════════════════════════════════════
  // 3D HELPERS
  // ══════════════════════════════════════
  function sphere(cx, cy, rx, ry, base, hi, shadow) {
    const g = ctx.createRadialGradient(cx - rx * 0.28, cy - ry * 0.32, 0, cx, cy, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, hi);
    g.addColorStop(0.45, base);
    g.addColorStop(1, shadow);
    return g;
  }

  // ══════════════════════════════════════
  // DRAW — White British Shorthair
  // ══════════════════════════════════════
  function drawCat() {
    ctx.clearRect(0, 0, CAT_W * S, CAT_H * S);
    ctx.save();
    ctx.scale(S, S);
    if (cat.dir === -1) { ctx.translate(CAT_W, 0); ctx.scale(-1, 1); }

    const t = performance.now() * 0.001;
    cat.tailPhase += 0.09;
    cat.breathe = Math.sin(t * 1.5) * 0.7;
    cat.earWiggle = Math.sin(t * 2.5) * (cat.state === 'pet' ? 3.5 : 1.2);

    const bodyY = cat.state === 'walk' ? Math.sin(cat.frame * 0.45) * 2 : cat.breathe;
    const headY = bodyY * 0.5 + (cat.state === 'sleep' ? 3 : 0);
    const petSq = cat.state === 'pet' ? Math.sin(t * 6) * 1.2 : 0;

    // ── Colors (British Shorthair White) ──
    const furBase = '#f0ece8';
    const furHi = '#fefefe';
    const furShadow = '#c8c0b8';
    const furDark = '#b0a89e';
    const skinPink = '#fbb8c4';
    const nosePink = '#e8899a';

    // ── GROUND SHADOW ──
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(45, 72, 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── TAIL ──
    const tw = Math.sin(cat.tailPhase) * (cat.state === 'pet' ? 16 : cat.state === 'walk' ? 11 : 6);
    // tail shadow
    ctx.strokeStyle = 'rgba(160,150,140,0.4)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 48 + bodyY);
    ctx.bezierCurveTo(5, 38 + bodyY + tw * 0.3, 1, 26 + tw * 0.5, 7, 14 + tw);
    ctx.stroke();
    // tail main
    ctx.strokeStyle = furBase;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, 46 + bodyY);
    ctx.bezierCurveTo(5, 36 + bodyY + tw * 0.3, 1, 24 + tw * 0.5, 7, 12 + tw);
    ctx.stroke();
    // tail highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 45 + bodyY);
    ctx.bezierCurveTo(6, 35 + bodyY + tw * 0.3, 2, 23 + tw * 0.5, 8, 11 + tw);
    ctx.stroke();
    // fluffy tail tip
    ctx.fillStyle = sphere(7, 11 + tw, 6, 5, furBase, furHi, furShadow);
    ctx.beginPath();
    ctx.ellipse(7, 11 + tw, 6, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── BACK LEGS ──
    const la = cat.state === 'walk' ? Math.sin(cat.frame * 0.45) * 5 : 0;
    drawLeg(20, 54 + bodyY, -la, false);
    drawLeg(48, 54 + bodyY, la, false);

    // ── BODY (stocky British Shorthair) ──
    const bx = 42, by = 46 + bodyY + petSq * 0.3;
    const brx = 23, bry = 16 - petSq * 0.4;
    // shadow
    ctx.fillStyle = 'rgba(140,130,120,0.15)';
    ctx.beginPath(); ctx.ellipse(bx + 1, by + 3, brx + 1, bry + 1, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = sphere(bx, by, brx, bry, furBase, furHi, furShadow);
    ctx.beginPath(); ctx.ellipse(bx, by, brx, bry, 0, 0, Math.PI * 2); ctx.fill();
    // rim light
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx, by, brx - 1, bry - 1, 0, Math.PI + 0.4, -0.4); ctx.stroke();
    // belly
    const bellyG = ctx.createRadialGradient(bx - 2, by + 3, 0, bx, by + 5, 12);
    bellyG.addColorStop(0, '#fffcf8');
    bellyG.addColorStop(0.6, '#f8f4f0');
    bellyG.addColorStop(1, 'rgba(200,192,184,0.2)');
    ctx.fillStyle = bellyG;
    ctx.beginPath(); ctx.ellipse(bx, by + 4, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    // fur texture lines
    ctx.strokeStyle = 'rgba(200,192,184,0.2)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const fx = 28 + i * 7;
      ctx.beginPath();
      ctx.moveTo(fx, 36 + bodyY);
      ctx.quadraticCurveTo(fx + 0.5, 40 + bodyY, fx - 0.5, 44 + bodyY);
      ctx.stroke();
    }

    // ── FRONT LEGS ──
    drawLeg(26, 54 + bodyY, la, true);
    drawLeg(50, 54 + bodyY, -la, true);

    // ── HEAD (big round British Shorthair face) ──
    const hx = 50, hy = 24 + headY;
    const headRx = 20, headRy = 18;

    // head shadow
    ctx.fillStyle = 'rgba(140,130,120,0.12)';
    ctx.beginPath(); ctx.ellipse(hx + 1, hy + 5, headRx + 1, headRy + 1, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = sphere(hx, hy + 2, headRx, headRy, furBase, furHi, furShadow);
    ctx.beginPath(); ctx.ellipse(hx, hy + 2, headRx, headRy, 0, 0, Math.PI * 2); ctx.fill();
    // specular
    const specG = ctx.createRadialGradient(hx - 5, hy - 5, 0, hx - 3, hy - 2, 14);
    specG.addColorStop(0, 'rgba(255,255,255,0.3)');
    specG.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specG;
    ctx.beginPath(); ctx.ellipse(hx - 3, hy - 2, 13, 10, -0.2, 0, Math.PI * 2); ctx.fill();
    // rim
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(hx, hy + 2, headRy - 1, Math.PI + 0.5, -0.5); ctx.stroke();

    // Chubby cheeks (characteristic!)
    ctx.fillStyle = sphere(hx - 16, hy + 7, 7, 6, furBase, furHi, furShadow);
    ctx.beginPath(); ctx.ellipse(hx - 16, hy + 7, 7, 6, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sphere(hx + 16, hy + 7, 7, 6, furBase, furHi, furShadow);
    ctx.beginPath(); ctx.ellipse(hx + 16, hy + 7, 7, 6, 0.15, 0, Math.PI * 2); ctx.fill();

    // ── EARS (small, rounded — British Shorthair style) ──
    drawEar(hx - 14, hy - 12, -0.25 + cat.earWiggle * 0.015);
    drawEar(hx + 14, hy - 12, 0.25 - cat.earWiggle * 0.015);

    // ── EYES (big, round, copper/amber — classic British Shorthair) ──
    const blinking = cat.isBlinking || cat.state === 'sleep';
    const eL = { x: hx - 7, y: hy + 1 };
    const eR = { x: hx + 7, y: hy + 1 };

    if (blinking || cat.state === 'sleep') {
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(eL.x, eL.y, 4, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(eR.x, eR.y, 4, 0.1, Math.PI - 0.1); ctx.stroke();
      if (cat.state === 'sleep') {
        ctx.fillStyle = 'rgba(192,132,252,0.55)';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('z', hx + 20, hy - 10 + Math.sin(t * 2) * 3);
        ctx.font = 'bold 7px Inter, sans-serif';
        ctx.fillText('z', hx + 26, hy - 16 + Math.sin(t * 2 + 1) * 3);
      }
    } else {
      // Eye socket shadow
      ctx.fillStyle = 'rgba(100,80,60,0.08)';
      ctx.beginPath(); ctx.ellipse(eL.x, eL.y, 6.5, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(eR.x, eR.y, 6.5, 7, 0, 0, Math.PI * 2); ctx.fill();

      // Eye white
      const ewG = ctx.createRadialGradient(eL.x - 1, eL.y - 1, 0, eL.x, eL.y, 6);
      ewG.addColorStop(0, '#ffffff'); ewG.addColorStop(1, '#eae6e2');
      ctx.fillStyle = ewG;
      ctx.beginPath(); ctx.ellipse(eL.x, eL.y, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill();
      const ewG2 = ctx.createRadialGradient(eR.x - 1, eR.y - 1, 0, eR.x, eR.y, 6);
      ewG2.addColorStop(0, '#ffffff'); ewG2.addColorStop(1, '#eae6e2');
      ctx.fillStyle = ewG2;
      ctx.beginPath(); ctx.ellipse(eR.x, eR.y, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill();

      // Iris — copper/amber (British Shorthair signature)
      const iBase = cat.state === 'pet' ? '#e07090' : '#d4882a';
      const iHi = cat.state === 'pet' ? '#f8b0c8' : '#f0c060';
      const iDark = cat.state === 'pet' ? '#a03050' : '#8a5510';
      // Left iris
      const iG = ctx.createRadialGradient(eL.x - 0.5, eL.y - 1, 0, eL.x, eL.y, 5);
      iG.addColorStop(0, iHi); iG.addColorStop(0.4, iBase); iG.addColorStop(1, iDark);
      ctx.fillStyle = iG;
      ctx.beginPath(); ctx.ellipse(eL.x + 0.3, eL.y + 0.2, 4, 4.8, 0, 0, Math.PI * 2); ctx.fill();
      // Right iris
      const iG2 = ctx.createRadialGradient(eR.x - 0.5, eR.y - 1, 0, eR.x, eR.y, 5);
      iG2.addColorStop(0, iHi); iG2.addColorStop(0.4, iBase); iG2.addColorStop(1, iDark);
      ctx.fillStyle = iG2;
      ctx.beginPath(); ctx.ellipse(eR.x + 0.3, eR.y + 0.2, 4, 4.8, 0, 0, Math.PI * 2); ctx.fill();

      // Pupil (vertical slit)
      ctx.fillStyle = '#0a0a14';
      const pw = cat.state === 'pet' ? 2.8 : 1.6;
      ctx.beginPath(); ctx.ellipse(eL.x + 0.3, eL.y + 0.5, pw, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(eR.x + 0.3, eR.y + 0.5, pw, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // Eye shine (glossy 3D)
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(eL.x - 1.5, eL.y - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eR.x - 1.5, eR.y - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(eL.x + 2, eL.y + 2, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eR.x + 2, eR.y + 2, 1, 0, Math.PI * 2); ctx.fill();

      // Eye outline
      ctx.strokeStyle = '#4a3a2a';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(eL.x, eL.y, 5.5, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(eR.x, eR.y, 5.5, 6, 0, 0, Math.PI * 2); ctx.stroke();

      // Eyelash hint (top)
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(eL.x, eL.y, 5.5, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(eR.x, eR.y, 5.5, Math.PI + 0.3, -0.3); ctx.stroke();
    }

    // ── NOSE (pink, cat heart-shape) ──
    const ny = hy + 7;
    const nG = ctx.createRadialGradient(hx - 0.5, ny - 1, 0, hx, ny, 3.5);
    nG.addColorStop(0, '#ffaabb'); nG.addColorStop(0.5, nosePink); nG.addColorStop(1, '#c06878');
    ctx.fillStyle = nG;
    ctx.beginPath();
    ctx.moveTo(hx, ny + 2);
    ctx.bezierCurveTo(hx - 3.5, ny, hx - 3.5, ny - 3, hx - 1.5, ny - 3);
    ctx.bezierCurveTo(hx - 0.4, ny - 3, hx, ny - 1.8, hx, ny - 1.5);
    ctx.bezierCurveTo(hx, ny - 1.8, hx + 0.4, ny - 3, hx + 1.5, ny - 3);
    ctx.bezierCurveTo(hx + 3.5, ny - 3, hx + 3.5, ny, hx, ny + 2);
    ctx.fill();
    // nose shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(hx - 0.8, ny - 1.5, 1.2, 0.8, -0.3, 0, Math.PI * 2); ctx.fill();

    // ── MOUTH (W shape — cat smile) ──
    ctx.strokeStyle = '#9a7a68';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, ny + 2); ctx.lineTo(hx, ny + 3.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx - 3.5, ny + 3, 3.5, -0.25, Math.PI * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + 3.5, ny + 3, 3.5, Math.PI * 0.6, Math.PI + 0.25); ctx.stroke();

    // ── WHISKERS (long, graceful) ──
    ctx.strokeStyle = 'rgba(180,170,160,0.5)';
    ctx.lineWidth = 0.9;
    const wb = ny + 1;
    // left
    ctx.beginPath(); ctx.moveTo(hx - 12, wb - 2); ctx.quadraticCurveTo(hx - 22, wb - 5, hx - 30, wb - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 12, wb);     ctx.quadraticCurveTo(hx - 24, wb - 1, hx - 32, wb + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 12, wb + 2); ctx.quadraticCurveTo(hx - 22, wb + 4, hx - 28, wb + 6); ctx.stroke();
    // right
    ctx.beginPath(); ctx.moveTo(hx + 12, wb - 2); ctx.quadraticCurveTo(hx + 22, wb - 5, hx + 30, wb - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 12, wb);     ctx.quadraticCurveTo(hx + 24, wb - 1, hx + 32, wb + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 12, wb + 2); ctx.quadraticCurveTo(hx + 22, wb + 4, hx + 28, wb + 6); ctx.stroke();

    // ── BLUSH when petted ──
    if (cat.state === 'pet') {
      const bG = ctx.createRadialGradient(hx - 12, hy + 6, 0, hx - 12, hy + 6, 6);
      bG.addColorStop(0, 'rgba(253,164,175,0.4)'); bG.addColorStop(1, 'rgba(253,164,175,0)');
      ctx.fillStyle = bG;
      ctx.beginPath(); ctx.ellipse(hx - 12, hy + 6, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      const bG2 = ctx.createRadialGradient(hx + 12, hy + 6, 0, hx + 12, hy + 6, 6);
      bG2.addColorStop(0, 'rgba(253,164,175,0.4)'); bG2.addColorStop(1, 'rgba(253,164,175,0)');
      ctx.fillStyle = bG2;
      ctx.beginPath(); ctx.ellipse(hx + 12, hy + 6, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();

    // ── PURR HEARTS ──
    cat.purrs.forEach(p => {
      ctx.save(); ctx.scale(S, S);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.font = `${10 + p.size * 7}px serif`;
      ctx.fillText('♥', p.x - cat.x, p.y - cat.y);
      ctx.restore();
    });
  }

  function drawLeg(x, y, anim, isFront) {
    const len = 12 + (cat.state === 'sit' ? -5 : 0);
    const off = anim * 0.4;
    // shadow
    ctx.fillStyle = 'rgba(140,130,120,0.12)';
    ctx.beginPath(); ctx.roundRect(x - 3, y + off + 1, 8, len - off * 0.3, 3); ctx.fill();
    // leg gradient
    const lG = ctx.createLinearGradient(x - 4, 0, x + 5, 0);
    lG.addColorStop(0, isFront ? '#d8d0c8' : '#c8c0b8');
    lG.addColorStop(0.3, isFront ? '#f0ece8' : '#e0d8d0');
    lG.addColorStop(0.7, isFront ? '#fefefe' : '#f0ece8');
    lG.addColorStop(1, isFront ? '#d8d0c8' : '#c8c0b8');
    ctx.fillStyle = lG;
    ctx.beginPath(); ctx.roundRect(x - 3.5, y + off, 8, len - off * 0.3, 3); ctx.fill();
    // paw
    const py = y + len + off * 0.3;
    ctx.fillStyle = sphere(x, py, 5.5, 4, '#f8f4f0', '#ffffff', '#d8d0c8');
    ctx.beginPath(); ctx.ellipse(x, py, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    // paw pads
    if (isFront) {
      ctx.fillStyle = '#fbb8c4';
      ctx.beginPath(); ctx.arc(x - 1.8, py - 0.3, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 1.8, py - 0.3, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8899a';
      ctx.beginPath(); ctx.arc(x, py + 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
      // pad shine
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(x - 0.3, py + 1, 0.7, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawEar(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // ear shadow
    ctx.fillStyle = 'rgba(140,130,120,0.12)';
    ctx.beginPath(); ctx.moveTo(-5, 5); ctx.quadraticCurveTo(0, -9 + cat.earWiggle, 6, 5); ctx.closePath(); ctx.fill();
    // outer ear (short, rounded — British Shorthair)
    const eG = ctx.createLinearGradient(-5, 4, 5, -8);
    eG.addColorStop(0, '#c8c0b8'); eG.addColorStop(0.5, '#e8e4e0'); eG.addColorStop(1, '#f8f4f0');
    ctx.fillStyle = eG;
    ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(0, -10 + cat.earWiggle, 6, 4); ctx.closePath(); ctx.fill();
    // inner ear
    const iG = ctx.createLinearGradient(-3, 3, 2, -5);
    iG.addColorStop(0, '#e0a0aa'); iG.addColorStop(0.4, '#fbb8c4'); iG.addColorStop(1, '#fdd0d8');
    ctx.fillStyle = iG;
    ctx.beginPath(); ctx.moveTo(-3, 3); ctx.quadraticCurveTo(0, -6 + cat.earWiggle, 3.5, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ══════════════════════════════════════
  // PHYSICS & STATE MACHINE
  // ══════════════════════════════════════
  function update() {
    cat.stateTimer++; cat.frame++; cat.blinkTimer++;

    if (!cat.isBlinking && cat.blinkTimer > 100 + Math.random() * 160) { cat.isBlinking = true; cat.blinkTimer = 0; }
    if (cat.isBlinking && cat.blinkTimer > 8) { cat.isBlinking = false; cat.blinkTimer = 0; }
    if (cat.scrollCooldown > 0) cat.scrollCooldown--;
    if (cat.isDragging) { positionWrap(); drawCat(); return; }

    if (!cat.onGround) {
      cat.vy += GRAVITY;
      cat.x += cat.vx;
      cat.y += cat.vy;
      if (cat.vy >= 0) {
        const p = findPlatformBelow(cat.x, cat.y);
        if (p) {
          const sy = p.top - CAT_H;
          if (cat.y >= sy - 2) {
            cat.y = sy; cat.onGround = true; cat.currentPlatform = p;
            if (Math.abs(cat.vy) > 4) {
              cat.vy = -cat.vy * BOUNCE; cat.vx *= 0.85;
              if (Math.abs(cat.vy) < 2) cat.vy = 0;
              cat.onGround = Math.abs(cat.vy) < 2;
            } else { cat.vy = 0; cat.vx *= 0.7; setState('idle'); }
          }
        }
      }
      if (cat.x < 0) { cat.x = 0; cat.vx = Math.abs(cat.vx) * 0.4; cat.dir = 1; }
      if (cat.x > window.innerWidth - CAT_W) { cat.x = window.innerWidth - CAT_W; cat.vx = -Math.abs(cat.vx) * 0.4; cat.dir = -1; }
      if (cat.y < 0) { cat.y = 0; cat.vy = Math.abs(cat.vy) * 0.3; }
      const ag = window.innerHeight - CAT_H;
      if (cat.y >= ag) { cat.y = ag; cat.onGround = true; cat.vy = 0; cat.vx *= 0.7; cat.currentPlatform = null; setState('idle'); }
      if (cat.vy > 2 && cat.state !== 'fall') setState('fall');
    } else {
      cat.vx *= 0.88; if (Math.abs(cat.vx) < 0.2) cat.vx = 0;
      cat.x += cat.vx;
      if (cat.currentPlatform && cat.currentPlatform.el) {
        const r = cat.currentPlatform.el.getBoundingClientRect();
        cat.currentPlatform.left = r.left; cat.currentPlatform.right = r.right; cat.currentPlatform.top = r.top;
        cat.y = r.top - CAT_H;
        if (cat.x + CAT_W * 0.5 < r.left - 5 || cat.x + CAT_W * 0.5 > r.right + 5) {
          cat.onGround = false; cat.currentPlatform = null; setState('fall');
        }
      }
      if (cat.x < 0) { cat.x = 0; cat.dir = 1; }
      if (cat.x > window.innerWidth - CAT_W) { cat.x = window.innerWidth - CAT_W; cat.dir = -1; }
      cat.idleTime++;
      if (cat.state !== 'pet' && cat.state !== 'drag') {
        if (cat.state === 'idle' && cat.stateTimer > 60 + Math.random() * 100) {
          const r = Math.random();
          if (r < 0.3) {
            setState('walk');
            cat.walkTarget = cat.currentPlatform
              ? cat.currentPlatform.left + Math.random() * (cat.currentPlatform.right - cat.currentPlatform.left - CAT_W)
              : Math.random() * (window.innerWidth - CAT_W);
            cat.dir = cat.walkTarget > cat.x ? 1 : -1;
          } else if (r < 0.45) { jumpToRandom(); }
          else if (r < 0.6) { setState('sit'); }
          else if (cat.idleTime > 400 && r < 0.72) { setState('sleep'); }
          else { cat.stateTimer = Math.random() * 40 | 0; }
        }
        if (cat.state === 'walk') {
          cat.x += cat.dir * 1.5;
          if (Math.abs(cat.x - cat.walkTarget) < 8 || cat.stateTimer > 180) setState('idle');
        }
        if (cat.state === 'sit' && cat.stateTimer > 120 + Math.random() * 180) setState('idle');
        if (cat.state === 'sleep' && cat.stateTimer > 250 + Math.random() * 350) { setState('idle'); cat.idleTime = 0; }
      }
      if (cat.state === 'pet' && cat.stateTimer > 50) setState('idle');
    }
    for (let i = cat.purrs.length - 1; i >= 0; i--) {
      const p = cat.purrs[i]; p.y -= 0.9; p.x += Math.sin(p.phase) * 0.4; p.phase += 0.09; p.life -= 0.018;
      if (p.life <= 0) cat.purrs.splice(i, 1);
    }
    positionWrap(); drawCat();
  }

  function jumpToRandom() {
    const p = getRandomPlatform();
    if (!p) { setState('jump'); cat.vy = -8; cat.vx = (Math.random() - 0.5) * 6; cat.onGround = false; cat.currentPlatform = null; return; }
    const tx = p.left + Math.random() * (p.width - CAT_W);
    const dx = tx - cat.x, dy = (p.top - CAT_H) - cat.y;
    const jt = Math.max(20, Math.sqrt(Math.abs(dy) * 2 / GRAVITY + 400));
    cat.vx = Math.max(-15, Math.min(15, dx / jt * 1.8));
    cat.vy = Math.max(-16, Math.min(-6, dy / jt * 1.5 - 5));
    cat.onGround = false; cat.currentPlatform = null; cat.dir = cat.vx >= 0 ? 1 : -1; setState('jump');
  }

  function setState(s) { if (cat.state === s) return; cat.state = s; cat.stateTimer = 0; cat.frame = 0; }
  function positionWrap() { wrap.style.left = cat.x + 'px'; wrap.style.top = cat.y + 'px'; }

  // ══════════════════════════════════════
  // INTERACTIONS
  // ══════════════════════════════════════
  let dragHistory = [];
  function startDrag(cx, cy) {
    cat.isDragging = true; cat.dragOffX = cx - cat.x; cat.dragOffY = cy - cat.y;
    dragHistory = [{ x: cx, y: cy, t: Date.now() }]; wrap.style.cursor = 'grabbing';
    setState('drag'); cat.onGround = false; cat.currentPlatform = null;
  }
  function moveDrag(cx, cy) {
    if (!cat.isDragging) return;
    cat.x = Math.max(0, Math.min(window.innerWidth - CAT_W, cx - cat.dragOffX));
    cat.y = Math.max(0, Math.min(window.innerHeight - CAT_H, cy - cat.dragOffY));
    dragHistory.push({ x: cx, y: cy, t: Date.now() }); if (dragHistory.length > 6) dragHistory.shift();
  }
  function endDrag() {
    if (!cat.isDragging) return; cat.isDragging = false; wrap.style.cursor = 'grab';
    if (dragHistory.length >= 2) {
      const l = dragHistory[dragHistory.length - 1], p = dragHistory[Math.max(0, dragHistory.length - 3)];
      const dt = Math.max(1, l.t - p.t) / 16;
      cat.vx = Math.max(-18, Math.min(18, (l.x - p.x) / dt * 0.7));
      cat.vy = Math.max(-22, Math.min(18, (l.y - p.y) / dt * 0.7));
    }
    cat.onGround = false; cat.currentPlatform = null; cat.dir = cat.vx >= 0 ? 1 : -1;
    setState(cat.vy < 0 ? 'jump' : 'fall');
  }

  wrap.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => { if (cat.isDragging) moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', () => endDrag());
  wrap.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  document.addEventListener('touchmove', e => { if (cat.isDragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener('touchend', () => endDrag());

  // Petting
  let petStrokes = 0, petTimer = null;
  const heartCols = ['#f43f5e', '#fda4af', '#c084fc', '#fbbf24', '#fb923c', '#a78bfa'];
  function petTheCat() {
    setState('pet'); cat.idleTime = 0;
    for (let i = 0; i < 3; i++) {
      cat.purrs.push({
        x: cat.x + CAT_W * 0.5 + (Math.random() - 0.5) * 28, y: cat.y,
        life: 1, phase: Math.random() * Math.PI * 2, size: 0.4 + Math.random() * 0.6,
        color: heartCols[Math.floor(Math.random() * heartCols.length)]
      });
    }
  }
  wrap.addEventListener('dblclick', e => { e.preventDefault(); petTheCat(); });
  wrap.addEventListener('mousemove', e => {
    if (cat.isDragging) return; petStrokes++;
    clearTimeout(petTimer); petTimer = setTimeout(() => { petStrokes = 0; }, 400);
    if (petStrokes > 6) { petTheCat(); petStrokes = 0; }
  });

  // Scroll jump
  let lastSY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = Math.abs(window.scrollY - lastSY); lastSY = window.scrollY;
    if (dy > 60 && cat.scrollCooldown <= 0 && cat.onGround && !cat.isDragging) { cat.scrollCooldown = 70; jumpToRandom(); }
  }, { passive: true });

  // Resize
  window.addEventListener('resize', () => {
    if (cat.y > window.innerHeight - CAT_H) cat.y = window.innerHeight - CAT_H;
    if (cat.x > window.innerWidth - CAT_W) cat.x = window.innerWidth - CAT_W;
  }, { passive: true });

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `position:fixed;z-index:602;background:rgba(8,6,20,.88);color:#fda4af;font-family:'Cormorant Garamond',serif;font-size:.85rem;font-style:italic;padding:.3rem .8rem;border-radius:1rem;border:1px solid rgba(253,164,175,.2);pointer-events:none;opacity:0;transition:opacity .3s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);white-space:nowrap;`;
  document.body.appendChild(tooltip);
  const meows = ['Meow~ 🐱', 'Meo meo~ 💕', 'Purrr... 😺', 'Nyaa~ 🌸', '*nuzzle* ♥', 'Mi yêu~ 💖', 'Mrrrow~ ✨'];
  let ttTimer = null;
  wrap.addEventListener('mouseenter', () => {
    tooltip.textContent = meows[Math.floor(Math.random() * meows.length)];
    tooltip.style.opacity = '1'; clearTimeout(ttTimer); ttTimer = setTimeout(() => { tooltip.style.opacity = '0'; }, 2200);
  });
  wrap.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
  function updateTooltip() {
    tooltip.style.left = (cat.x + CAT_W / 2 - 40) + 'px'; tooltip.style.top = (cat.y - 26) + 'px';
    requestAnimationFrame(updateTooltip);
  }
  updateTooltip();

  // Game loop
  (function loop() { update(); requestAnimationFrame(loop); })();
  }
}
