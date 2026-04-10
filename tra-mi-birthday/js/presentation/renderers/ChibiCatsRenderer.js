/**
 * Chibi Cats Renderer — 2 em mèo chibi 2D chạy nhảy tương tác
 * Physics engine: gravity, bounce, walk, jump giữa các platforms
 * Render bằng SVG DOM, mỗi em có màu sắc & tính cách riêng
 */
export class ChibiCatsRenderer {
  init() {
    'use strict';

    const GRAVITY = 0.45;
    const BOUNCE = 0.3;
    const CAT_W = 90, CAT_H = 160;

    // Platform selectors (giống CatRenderer)
    const PLAT_SEL = '.wc, .polaroid, .tl-card, .stat, .trait, .photo-frame, .letter-card, .cd, .mo, .css-cake, .blow-btn, .love-btn, .nav-logo, .cd-wrap';

    // ─── BUILD SVG mèo ngồi (theo reference) ───
    function buildSVG(id, cfg) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 400 500');
      svg.setAttribute('width', CAT_W + '');
      svg.setAttribute('height', CAT_H + '');
      svg.style.cssText = 'display:block;overflow:visible;';

      const S = cfg.stroke || '#222';
      const B = cfg.body || 'white';
      const P1 = cfg.patch1 || '#fda55d'; // Orange
      const P2 = cfg.patch2 || '#4a3b32'; // Brown

      svg.innerHTML = `
        <!-- ĐUÔI -->
        <g class="chibi-tail" style="transform-origin: 290px 400px; animation: chibi-tail-wag 1.5s ease-in-out infinite alternate;">
          <path d="M 280 400 C 350 350, 360 210, 310 220 C 300 222, 290 235, 290 250 C 290 270, 310 280, 305 310 C 300 350, 260 380, 260 380" fill="${B}" stroke="${S}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 330 250 C 335 220, 295 210, 295 250 C 295 270, 315 280, 310 310 C 308 322, 295 330, 280 340 L 320 330 Z" fill="${P2}" opacity="0.8"/>
        </g>
        
        <!-- THÂN BEHIND (Patch đùi sau) -->
        <path d="M 275 350 C 330 380, 290 450, 220 440" fill="none" stroke="${S}" stroke-width="6" stroke-linecap="round"/>
        <path d="M 275 350 C 330 380, 290 450, 220 440 C 250 420, 260 380, 275 350 Z" fill="${P2}"/>

        <!-- THÂN CHÍNH -->
        <path d="M 120 180 C 60 300, 100 450, 200 440 C 250 435, 260 380, 260 350 C 260 310, 240 260, 220 180 Z" fill="${B}" stroke="${S}" stroke-width="6" stroke-linejoin="round"/>
        
        <!-- Patch Lưng -->
        <path d="M 120 180 C 60 300, 100 390, 150 400 C 180 350, 190 280, 220 180 Z" fill="${P1}"/>
        
        <!-- CHÂN TRƯỚC TRÁI -->
        <g class="chibi-leg-fl" style="transform-origin: 145px 330px">
          <path d="M 160 320 L 160 440 C 160 455, 130 455, 130 440 L 130 340" fill="${B}" stroke="${S}" stroke-width="6" stroke-linecap="round"/>
          <!-- Ngón chân -->
          <path d="M 140 440 L 140 430 M 150 440 L 150 430" stroke="${S}" stroke-width="4" stroke-linecap="round"/>
        </g>
        
        <!-- CHÂN TRƯỚC PHẢI -->
        <g class="chibi-leg-fr" style="transform-origin: 195px 330px">
          <path d="M 210 320 L 210 440 C 210 455, 180 455, 180 440 L 180 320" fill="${B}" stroke="${S}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 190 440 L 190 430 M 200 440 L 200 430" stroke="${S}" stroke-width="4" stroke-linecap="round"/>
        </g>

        <g class="chibi-leg-br">
          <!-- BÀN CHÂN SAU -->
          <path d="M 230 438 C 225 450, 255 455, 265 440" fill="${B}" stroke="${S}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 245 445 L 245 435 M 255 445 L 255 435" stroke="${S}" stroke-width="4" stroke-linecap="round"/>
        </g>

        <!-- VÒNG CỔ -->
        <path d="M 115 190 C 150 220, 230 220, 225 190" fill="none" stroke="${cfg.collar || '#e64c4c'}" stroke-width="15" stroke-linecap="round"/>
        <!-- CHUÔNG -->
        <circle cx="170" cy="215" r="15" fill="#fcdb5e" stroke="${S}" stroke-width="5"/>
        <circle cx="170" cy="222" r="4" fill="${S}"/>
        <path d="M 155 215 C 165 215, 175 215, 185 215" stroke="${S}" stroke-width="3" stroke-linecap="round"/>
        
        <!-- TAI TRÁI -->
        <g class="chibi-ear-left" style="transform-origin: 130px 60px">
          <path d="M 120 100 L 90 20 L 170 60 Z" fill="${P1}" stroke="${S}" stroke-width="6" stroke-linejoin="round"/>
          <path d="M 115 90 L 100 40 L 150 65 Z" fill="${cfg.earInner || '#ffbccc'}"/>
        </g>
        
        <!-- TAI PHẢI -->
        <g class="chibi-ear-right" style="transform-origin: 210px 60px">
          <path d="M 220 100 L 250 20 L 170 60 Z" fill="${P2}" stroke="${S}" stroke-width="6" stroke-linejoin="round"/>
          <path d="M 225 90 L 240 40 L 190 65 Z" fill="${cfg.earInner || '#ffbccc'}"/>
        </g>

        <!-- MẶT CHÍNH -->
        <path d="M 100 150 C 80 80, 260 80, 240 150 C 260 210, 80 210, 100 150 Z" fill="${B}" stroke="${S}" stroke-width="6" stroke-linejoin="round"/>
        
        <!-- Bảng màu đầu -->
        <path d="M 100 150 C 80 80, 170 80, 170 120 C 150 140, 130 160, 100 150 Z" fill="${P1}"/>
        <path d="M 240 150 C 260 80, 170 80, 170 120 C 190 140, 210 160, 240 150 Z" fill="${P2}"/>

        <!-- MẮT MỞ -->
        <g class="chibi-eyes-open">
          <circle cx="130" cy="140" r="10" fill="#222"/>
          <circle cx="127" cy="136" r="3" fill="white"/>
          <circle cx="210" cy="140" r="10" fill="#222"/>
          <circle cx="207" cy="136" r="3" fill="white"/>
        </g>

        <g class="chibi-eyes-happy" opacity="0">
          <path d="M 120 142 Q 130 130 140 142" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
          <path d="M 200 142 Q 210 130 220 142" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
        </g>

        <g class="chibi-eyes-blink" opacity="0">
          <path d="M 120 140 L 140 140" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
          <path d="M 200 140 L 220 140" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
        </g>

        <g class="chibi-eyes-sleep" opacity="0">
          <path d="M 120 138 L 140 138" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
          <path d="M 125 142 L 135 142" fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round"/>
          <path d="M 200 138 L 220 138" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
          <path d="M 205 142 L 215 142" fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round"/>
        </g>
        
        <!-- MŨI -->
        <path d="M 166 155 L 174 155 L 170 162 Z" fill="#ffbccc" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>
        
        <!-- MIỆNG (chữ W) -->
        <path d="M 155 170 Q 162.5 180 170 170 Q 177.5 180 185 170" fill="none" stroke="${S}" stroke-width="5" stroke-linecap="round"/>
        
        <!-- RÂU -->
        <path d="M 110 155 L 50 160 M 115 165 L 55 175 M 105 145 L 60 140" stroke="${S}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
        <path d="M 230 155 L 290 160 M 225 165 L 285 175 M 235 145 L 280 140" stroke="${S}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>

        <!-- HEART -->
        <path class="chibi-heart" opacity="0" d="M 170 50 C 170 50, 150 20, 130 30 C 110 40, 115 75, 170 100 C 225 75, 230 40, 210 30 C 190 20, 170 50, 170 50 Z" fill="#ff7090"/>

        <!-- ZZZ -->
        <g class="chibi-zzz" opacity="0">
          <text x="260" y="80" font-size="28" font-weight="900" fill="#8b9dc0">z</text>
          <text x="280" y="60" font-size="40" font-weight="900" fill="#8b9dc0">z</text>
          <text x="310" y="30" font-size="50" font-weight="900" fill="#8b9dc0">Z</text>
        </g>
      `;
      return svg;
    }
    // ─── Tạo 1 con mèo chạy nhảy ───
    function createChibiCat(id, cfg, startX) {
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.setAttribute('aria-hidden', 'true');
      wrap.style.cssText = `position:fixed;z-index:600;width:${CAT_W}px;height:${CAT_H}px;cursor:grab;touch-action:none;pointer-events:auto;filter:drop-shadow(0 4px 10px rgba(0,0,0,.18));transition:none;`;

      const svg = buildSVG(id, cfg);
      wrap.appendChild(svg);
      document.body.appendChild(wrap);

      // State
      const cat = {
        x: startX, y: window.innerHeight - CAT_H - 10,
        vx: 0, vy: 0,
        state: 'idle', dir: cfg.defaultDir || 1, frame: 0, stateTimer: 0,
        onGround: true, isDragging: false,
        dragOffX: 0, dragOffY: 0,
        walkTarget: -1, blinkTimer: 0, isBlinking: false,
        idleTime: 0, scrollCooldown: 0, currentPlatform: null,
      };

      // ─── EYE CONTROL ───
      const eyesOpen = svg.querySelector('.chibi-eyes-open');
      const eyesBlink = svg.querySelector('.chibi-eyes-blink');
      const eyesHappy = svg.querySelector('.chibi-eyes-happy');
      const eyesSleep = svg.querySelector('.chibi-eyes-sleep');
      const heart = svg.querySelector('.chibi-heart');
      const tail = svg.querySelector('.chibi-tail');
      const zzz = svg.querySelector('.chibi-zzz');

      function setEyes(mode) {
        eyesOpen.setAttribute('opacity', mode === 'open' ? '1' : '0');
        eyesBlink.setAttribute('opacity', mode === 'blink' ? '1' : '0');
        eyesHappy.setAttribute('opacity', mode === 'happy' ? '1' : '0');
        eyesSleep.setAttribute('opacity', mode === 'sleep' ? '1' : '0');
        heart.setAttribute('opacity', mode === 'happy' ? '0.85' : '0');
        if (zzz) zzz.setAttribute('opacity', mode === 'sleep' ? '1' : '0');
      }

      // ─── PLATFORMS ───
      function getPlatforms() {
        const ps = [];
        document.querySelectorAll(PLAT_SEL).forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 20 || r.bottom < 0 || r.top > window.innerHeight) return;
          ps.push({ left: r.left, right: r.right, top: r.top, width: r.width, el });
        });
        ps.push({ left: 0, right: window.innerWidth, top: window.innerHeight, width: window.innerWidth, el: null });
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

      // ─── ANIMATION ───
      function positionWrap() {
        wrap.style.left = cat.x + 'px';
        wrap.style.top = cat.y + 'px';
        // Flip direction
        svg.style.transform = cat.dir === -1 ? 'scaleX(-1)' : '';
      }

      // Leg elements
      const legFL = svg.querySelector('.chibi-leg-fl');
      const legFR = svg.querySelector('.chibi-leg-fr');
      const legBR = svg.querySelector('.chibi-leg-br');

      function setLegs(walking) {
        const sp = walking ? '0.35s' : '';
        const an = walking ? 'ease-in-out infinite' : '';
        if (legFL) legFL.style.animation = walking ? `chibi-step-fl ${sp} ${an}` : '';
        if (legFR) legFR.style.animation = walking ? `chibi-step-fr ${sp} ${an} 0.175s` : '';
        if (legBR) legBR.style.animation = walking ? `chibi-step-br ${sp} ${an}` : '';
      }

      function setState(s) {
        if (cat.state === s) return;
        cat.state = s; cat.stateTimer = 0; cat.frame = 0;

        // Eyes theo state
        if (s === 'sleep') setEyes('sleep');
        else if (s === 'pet') setEyes('happy');
        else setEyes('open');

        // Tail animation
        if (s === 'pet' || s === 'happy') {
          tail.style.animation = 'chibi-tail-wag 0.3s ease-in-out infinite alternate';
        } else if (s === 'walk') {
          tail.style.animation = 'chibi-tail-wag 0.6s ease-in-out infinite alternate';
        } else {
          tail.style.animation = 'chibi-tail-wag 1.5s ease-in-out infinite alternate';
        }

        // Legs animation
        setLegs(s === 'walk');

        // Bob animation
        if (s === 'walk') {
          svg.style.animation = 'chibi-walk 0.4s ease-in-out infinite';
        } else if (s === 'jump' || s === 'fall') {
          svg.style.animation = '';
        } else if (s === 'sleep') {
          svg.style.animation = 'chibi-snore 3s ease-in-out infinite';
        } else if (s === 'pet') {
          svg.style.animation = 'chibi-bounce 0.5s ease-in-out infinite';
        } else {
          svg.style.animation = 'chibi-bob 3s ease-in-out infinite';
        }
      }

      function jumpToRandom() {
        const p = getRandomPlatform();
        if (!p) {
          cat.vy = -8; cat.vx = (Math.random() - 0.5) * 6;
          cat.onGround = false; cat.currentPlatform = null;
          setState('jump');
          return;
        }
        const tx = p.left + Math.random() * (p.width - CAT_W);
        const dx = tx - cat.x, dy = (p.top - CAT_H) - cat.y;
        const jt = Math.max(20, Math.sqrt(Math.abs(dy) * 2 / GRAVITY + 400));
        cat.vx = Math.max(-12, Math.min(12, dx / jt * 1.8));
        cat.vy = Math.max(-14, Math.min(-5, dy / jt * 1.5 - 5));
        cat.onGround = false; cat.currentPlatform = null;
        cat.dir = cat.vx >= 0 ? 1 : -1;
        setState('jump');
      }

      // ─── UPDATE LOOP ───
      function update() {
        cat.stateTimer++; cat.frame++;
        cat.blinkTimer++;

        // Auto blink
        if (!cat.isBlinking && cat.state !== 'sleep' && cat.state !== 'pet' && cat.blinkTimer > 120 + Math.random() * 180) {
          cat.isBlinking = true; cat.blinkTimer = 0;
          setEyes('blink');
        }
        if (cat.isBlinking && cat.blinkTimer > 8) {
          cat.isBlinking = false; cat.blinkTimer = 0;
          if (cat.state !== 'sleep' && cat.state !== 'pet') setEyes('open');
        }

        if (cat.scrollCooldown > 0) cat.scrollCooldown--;
        if (cat.isDragging) { positionWrap(); return; }

        // Physics
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

          // Bounds
          if (cat.x < 0) { cat.x = 0; cat.vx = Math.abs(cat.vx) * 0.4; cat.dir = 1; }
          if (cat.x > window.innerWidth - CAT_W) { cat.x = window.innerWidth - CAT_W; cat.vx = -Math.abs(cat.vx) * 0.4; cat.dir = -1; }
          if (cat.y < 0) { cat.y = 0; cat.vy = Math.abs(cat.vy) * 0.3; }
          const ground = window.innerHeight - CAT_H;
          if (cat.y >= ground) { cat.y = ground; cat.onGround = true; cat.vy = 0; cat.vx *= 0.7; cat.currentPlatform = null; setState('idle'); }
          if (cat.vy > 2 && cat.state !== 'fall') setState('fall');
        } else {
          // On ground behavior
          cat.vx *= 0.88; if (Math.abs(cat.vx) < 0.2) cat.vx = 0;
          cat.x += cat.vx;

          // Track platform movement
          if (cat.currentPlatform && cat.currentPlatform.el) {
            const r = cat.currentPlatform.el.getBoundingClientRect();
            cat.currentPlatform.left = r.left; cat.currentPlatform.right = r.right; cat.currentPlatform.top = r.top;
            cat.y = r.top - CAT_H;
            if (cat.x + CAT_W * 0.5 < r.left - 5 || cat.x + CAT_W * 0.5 > r.right + 5) {
              cat.onGround = false; cat.currentPlatform = null; setState('fall');
            }
          }

          // Bounds
          if (cat.x < 0) { cat.x = 0; cat.dir = 1; }
          if (cat.x > window.innerWidth - CAT_W) { cat.x = window.innerWidth - CAT_W; cat.dir = -1; }

          cat.idleTime++;

          if (cat.state !== 'pet' && cat.state !== 'drag') {
            // AI behavior
            if (cat.state === 'idle' && cat.stateTimer > 80 + Math.random() * 120) {
              const r = Math.random();
              if (r < 0.35) {
                setState('walk');
                cat.walkTarget = cat.currentPlatform
                  ? cat.currentPlatform.left + Math.random() * (cat.currentPlatform.right - cat.currentPlatform.left - CAT_W)
                  : Math.random() * (window.innerWidth - CAT_W);
                cat.dir = cat.walkTarget > cat.x ? 1 : -1;
              } else if (r < 0.5) {
                jumpToRandom();
              } else if (cat.idleTime > 500 && r < 0.65) {
                setState('sleep');
              } else {
                cat.stateTimer = Math.random() * 40 | 0;
              }
            }

            if (cat.state === 'walk') {
              cat.x += cat.dir * 1.2;
              if (Math.abs(cat.x - cat.walkTarget) < 8 || cat.stateTimer > 200) setState('idle');
            }

            if (cat.state === 'sleep' && cat.stateTimer > 300 + Math.random() * 400) { setState('idle'); cat.idleTime = 0; }
          }

          if (cat.state === 'pet' && cat.stateTimer > 50) setState('idle');
        }

        positionWrap();
      }

      // ─── DRAG & DROP ───
      let dragHistory = [];
      function startDrag(cx, cy) {
        cat.isDragging = true; cat.dragOffX = cx - cat.x; cat.dragOffY = cy - cat.y;
        dragHistory = [{ x: cx, y: cy, t: Date.now() }];
        wrap.style.cursor = 'grabbing';
        setState('drag'); cat.onGround = false; cat.currentPlatform = null;
      }
      function moveDrag(cx, cy) {
        if (!cat.isDragging) return;
        cat.x = Math.max(0, Math.min(window.innerWidth - CAT_W, cx - cat.dragOffX));
        cat.y = Math.max(0, Math.min(window.innerHeight - CAT_H, cy - cat.dragOffY));
        dragHistory.push({ x: cx, y: cy, t: Date.now() });
        if (dragHistory.length > 6) dragHistory.shift();
      }
      function endDrag() {
        if (!cat.isDragging) return; cat.isDragging = false; wrap.style.cursor = 'grab';
        if (dragHistory.length >= 2) {
          const l = dragHistory[dragHistory.length - 1], p = dragHistory[Math.max(0, dragHistory.length - 3)];
          const dt = Math.max(1, l.t - p.t) / 16;
          cat.vx = Math.max(-15, Math.min(15, (l.x - p.x) / dt * 0.7));
          cat.vy = Math.max(-18, Math.min(15, (l.y - p.y) / dt * 0.7));
        }
        cat.onGround = false; cat.currentPlatform = null;
        cat.dir = cat.vx >= 0 ? 1 : -1;
        setState(cat.vy < 0 ? 'jump' : 'fall');
      }

      // Events
      wrap.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
      document.addEventListener('mousemove', e => { if (cat.isDragging) moveDrag(e.clientX, e.clientY); });
      document.addEventListener('mouseup', () => endDrag());
      wrap.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
      document.addEventListener('touchmove', e => { if (cat.isDragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      document.addEventListener('touchend', () => endDrag());

      // Pet (double click)
      wrap.addEventListener('dblclick', e => {
        e.preventDefault();
        setState('pet'); cat.idleTime = 0;
      });

      // Scroll jump
      let lastSY = window.scrollY;
      window.addEventListener('scroll', () => {
        const dy = Math.abs(window.scrollY - lastSY); lastSY = window.scrollY;
        if (dy > 80 && cat.scrollCooldown <= 0 && cat.onGround && !cat.isDragging) {
          cat.scrollCooldown = 90;
          jumpToRandom();
        }
      }, { passive: true });

      // Resize
      window.addEventListener('resize', () => {
        if (cat.y > window.innerHeight - CAT_H) cat.y = window.innerHeight - CAT_H;
        if (cat.x > window.innerWidth - CAT_W) cat.x = window.innerWidth - CAT_W;
      }, { passive: true });

      // Tooltip
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `position:fixed;z-index:602;background:rgba(8,6,20,.88);color:${cfg.tooltipColor};font-family:'Cormorant Garamond',serif;font-size:.8rem;font-style:italic;padding:.25rem .6rem;border-radius:.8rem;border:1px solid ${cfg.tooltipColor}33;pointer-events:none;opacity:0;transition:opacity .3s;backdrop-filter:blur(8px);white-space:nowrap;`;
      document.body.appendChild(tooltip);
      const meows = cfg.meows;
      let ttTimer = null;

      wrap.addEventListener('mouseenter', () => {
        tooltip.textContent = meows[Math.floor(Math.random() * meows.length)];
        tooltip.style.opacity = '1';
        clearTimeout(ttTimer);
        ttTimer = setTimeout(() => { tooltip.style.opacity = '0'; }, 2000);
      });
      wrap.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });

      function updateTooltip() {
        tooltip.style.left = (cat.x + CAT_W / 2 - 30) + 'px';
        tooltip.style.top = (cat.y - 22) + 'px';
        requestAnimationFrame(updateTooltip);
      }
      updateTooltip();

      // Start state
      setState('idle');

      // Game loop
      (function loop() { update(); requestAnimationFrame(loop); })();
    }

    // ─── INJECT CSS ANIMATIONS ───
    const style = document.createElement('style');
    style.textContent = `
      @keyframes chibi-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes chibi-walk { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-3px) rotate(2deg)} 75%{transform:translateY(-3px) rotate(-2deg)} }
      @keyframes chibi-bounce { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.05)} }
      @keyframes chibi-snore { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-2px) rotate(1deg)} }
      @keyframes chibi-tail-wag { 0%{transform:rotate(-8deg)} 100%{transform:rotate(8deg)} }

      /* Tai vẩy mạnh */
      @keyframes chibi-ear-twitch-l { 0%,70%,100%{transform:rotate(0)} 78%{transform:rotate(-25deg)} 86%{transform:rotate(8deg)} 92%{transform:rotate(-10deg)} }
      @keyframes chibi-ear-twitch-r { 0%,70%,100%{transform:rotate(0)} 78%{transform:rotate(25deg)} 86%{transform:rotate(-8deg)} 92%{transform:rotate(10deg)} }
      .chibi-ear-left  { animation: chibi-ear-twitch-l 2.5s ease-in-out infinite; }
      .chibi-ear-right { animation: chibi-ear-twitch-r 2.5s ease-in-out infinite 0.2s; }

      /* Chân bước khi đi */
      @keyframes chibi-step-fl { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-12deg)} }
      @keyframes chibi-step-fr { 0%,100%{transform:rotate(0)} 50%{transform:rotate(12deg)} }
      @keyframes chibi-step-br { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    `;
    document.head.appendChild(style);

    // ─── SPAWN 2 em mèo ───
    createChibiCat('chibi-1', {
      body: 'white',
      patch1: '#fda55d', // Cam lưng + tai trái
      patch2: '#4a3b32', // Đen / Nâu bắp đuôi + tai phải
      earInner: '#ffbccc',
      nose: '#ffbccc', accent: '#d08070',
      stroke: '#222',
      collar: '#e64c4c',                          
      whisker: '#333',
      defaultDir: -1,
      meows: ['Meo~ 🐱', 'Gừ gừ~ 😸', '*cuộn tròn* 🧡', 'Mi ơi~ 💛', 'Nyaa~ ✨'],
    }, window.innerWidth - 160);

    createChibiCat('chibi-2', {
      body: 'white',
      patch1: '#aeb3bc', // Xám sáng 
      patch2: '#5b616b', // Xám tối
      earInner: '#f0cdd6',
      nose: '#f0cdd6', accent: '#a08090',
      stroke: '#1a1f2b',
      collar: '#44bbff',                          
      whisker: '#333',
      defaultDir: 1,
      meows: ['Prr~ 😻', '*nhảy nhót* 🐾', 'Mew mew~ 💜', 'Hehe~ 🌙', '*liếm tay* 💕'],
    }, 80);
  }
}
