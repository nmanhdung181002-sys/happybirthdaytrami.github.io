/**
 * ScrollStory.js — Scroll-based storytelling with chapter overlays
 *
 * ✦ 6 chapters with rich poetic Vietnamese text overlays
 * ✦ Fade in/out based on scroll progress
 * ✦ Progress bar indicator + chapter dots
 * ✦ Image galleries, decorative elements, icons
 * ✦ Smooth parallax-like slide transitions
 *
 * Methods: init(), update(progress), dispose()
 */

// ── CHAPTER DATA ──
const CHAPTERS = [
  {
    id: 'chapter-arrival',
    icon: '🌸',
    title: 'Xin Chào, Trà Mi',
    subtitle: 'Hãy cùng bước vào thế giới sinh nhật — nơi mọi điều kỳ diệu đang chờ đợi cô…',
    extra: `
      <div class="story-deco">
        <span class="story-star">✦</span>
        <svg class="story-svg-divider" width="80" height="8" viewBox="0 0 80 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 4 Q 20 0, 40 4 T 80 4" stroke="url(#decoGrad1)" stroke-width="1.5" stroke-linecap="round"/>
          <defs>
            <linearGradient id="decoGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255, 105, 180, 0)" />
              <stop offset="50%" stop-color="#ffd700" />
              <stop offset="100%" stop-color="rgba(255, 105, 180, 0)" />
            </linearGradient>
          </defs>
        </svg>
        <span class="story-star">✦</span>
      </div>
      <p class="story-hint">↓ Cuộn để khám phá ↓</p>
    `,
    range: [0.0, 0.18],
    fadeRange: [0.0, 0.04, 0.14, 0.18],
    align: 'center'
  },
  {
    id: 'chapter-about',
    icon: '💫',
    title: 'Về Trà Mi',
    subtitle: 'Một cô gái dịu dàng mà mạnh mẽ, mang theo nụ cười nhẹ nhàng có thể làm sáng cả ngày u ám nhất.',
    extra: `
      <div class="story-traits">
        <span class="story-trait">🤍 Tâm hồn nhân hậu</span>
        <span class="story-trait">⭐ Luôn tỏa sáng</span>
        <span class="story-trait">🎵 Yêu âm nhạc & mèo</span>
      </div>
      <div class="story-img-frame">
        <img src="images/about-img.jpg" alt="Trà Mi" class="story-img" loading="lazy">
        <div class="story-img-glow"></div>
      </div>
    `,
    range: [0.18, 0.35],
    fadeRange: [0.18, 0.22, 0.31, 0.35],
    align: 'left'
  },
  {
    id: 'chapter-cake',
    icon: '🎂',
    title: 'Chiếc Bánh Ngọt Ngào',
    subtitle: 'Một chiếc bánh sinh nhật dành riêng cho cô — ngọt ngào như chính nụ cười ấy. Hãy nhắm mắt và ước điều gì đó thật đẹp nhé!',
    extra: `
      <div class="story-deco">
        <span class="story-candle">🕯️</span>
        <span class="story-candle">🕯️</span>
        <span class="story-candle">🕯️</span>
      </div>
      <p class="story-quote">"Mỗi ngọn nến là một ước mơ — hãy thổi thật mạnh!"</p>
    `,
    range: [0.35, 0.52],
    fadeRange: [0.35, 0.39, 0.48, 0.52],
    align: 'right'
  },
  {
    id: 'chapter-memories',
    icon: '📸',
    title: 'Kỷ Niệm Đẹp',
    subtitle: 'Mỗi khoảnh khắc bên cô ấy đều nhẹ nhàng như cánh hoa mùa xuân — đáng trân trọng và không thể quên.',
    extra: `
      <div class="story-gallery">
        <div class="story-polaroid" style="--rot:-4deg">
          <img src="images/gallery-1.jpg" alt="Kỷ niệm 1" loading="lazy">
          <span>Khoảnh khắc yêu 🌸</span>
        </div>
        <div class="story-polaroid" style="--rot:3deg">
          <img src="images/gallery-2.jpg" alt="Kỷ niệm 2" loading="lazy">
          <span>Ngày tháng rực rỡ ✨</span>
        </div>
        <div class="story-polaroid" style="--rot:-2deg">
          <img src="images/gallery-3-v2.jpg" alt="Kỷ niệm 3" loading="lazy">
          <span>Nụ cười rạng rỡ 💕</span>
        </div>
      </div>
    `,
    range: [0.52, 0.68],
    fadeRange: [0.52, 0.56, 0.64, 0.68],
    align: 'center'
  },
  {
    id: 'chapter-gifts',
    icon: '🎁',
    title: 'Những Món Quà Nhỏ',
    subtitle: 'Mỗi hộp quà mang một lời chúc rất thật — gửi từ trái tim đến cô.',
    extra: `
      <div class="story-wishes-grid">
        <div class="story-wish-card" style="--ac:#f43f5e">
          <span class="swc-icon">❤️</span>
          <span class="swc-label">Sức Khỏe</span>
          <span class="swc-text">Luôn mạnh mẽ bước đi trên mọi hành trình</span>
        </div>
        <div class="story-wish-card" style="--ac:#c084fc">
          <span class="swc-icon">💜</span>
          <span class="swc-label">Hạnh Phúc</span>
          <span class="swc-text">Được yêu thương đúng cách</span>
        </div>
        <div class="story-wish-card" style="--ac:#fbbf24">
          <span class="swc-icon">⭐</span>
          <span class="swc-label">Thành Công</span>
          <span class="swc-text">Mọi ước mơ đều thành hiện thực</span>
        </div>
        <div class="story-wish-card" style="--ac:#34d399">
          <span class="swc-icon">🍃</span>
          <span class="swc-label">Bình Yên</span>
          <span class="swc-text">Sống thư thái, yêu bản thân</span>
        </div>
      </div>
    `,
    range: [0.68, 0.85],
    fadeRange: [0.68, 0.72, 0.81, 0.85],
    align: 'left'
  },
  {
    id: 'chapter-wish',
    icon: '💕',
    title: 'Gửi Trà Mi Thân Mến',
    subtitle: '',
    extra: `
      <div class="story-letter">
        <p class="story-letter-body">
          Sinh nhật không chỉ là thêm một tuổi — đó là một chương mới trong câu chuyện đẹp của cậu.<br><br>
          Tớ muốn cậu biết: cậu được yêu thương rất nhiều. Không phải vì cậu hoàn hảo, mà vì cậu là chính mình — chân thật và đáng trân trọng.<br><br>
          Hãy luôn giữ nụ cười đó nhé, Trà Mi ơi! 🌸
        </p>
        <div class="story-letter-sig">
          <div class="story-sig-content">
            <div class="story-sig-text">
              <span class="story-sig-name">Với tất cả tình yêu thương 💕</span>
              <span class="story-sig-date">Ngày 30 tháng 6</span>
            </div>
            <svg class="wax-seal" viewBox="0 0 100 100" width="55" height="55">
              <defs>
                <radialGradient id="sealGrad" cx="45%" cy="45%" r="50%">
                  <stop offset="0%" stop-color="#ff4d6d" />
                  <stop offset="70%" stop-color="#c9184a" />
                  <stop offset="100%" stop-color="#800f2f" />
                </radialGradient>
                <filter id="sealShadow" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
                </filter>
              </defs>
              <path d="M 50 12 C 27 10, 10 27, 12 50 C 10 73, 27 90, 50 88 C 73 90, 90 73, 88 50 C 90 27, 73 10, 50 12 Z" fill="url(#sealGrad)" filter="url(#sealShadow)"/>
              <path d="M 50 20 C 33 20, 20 33, 20 50 C 20 67, 33 80, 50 80 C 67 80, 80 67, 80 50 C 80 33, 67 20, 50 20 Z" fill="none" stroke="#590d22" stroke-width="1.2" opacity="0.5"/>
              <path d="M 50 63 C 50 63, 36 52, 36 43 C 36 36, 42 32, 47 32 C 50 32, 50 35, 50 35 C 50 35, 50 32, 53 32 C 58 32, 64 36, 64 43 C 64 52, 50 63, 50 63 Z" fill="#ffb5a7" opacity="0.8" filter="drop-shadow(0px 1px 1px #590d22)"/>
            </svg>
          </div>
        </div>
      </div>
      <p class="story-final-wish">Chúc Trà Mi tuổi mới luôn hạnh phúc, tỏa sáng và yêu đời ✨</p>
    `,
    range: [0.85, 1.0],
    fadeRange: [0.85, 0.88, 0.96, 1.01],
    align: 'center'
  }
];

export class ScrollStory {
  constructor() {
    /** @type {HTMLElement[]} */
    this.overlays = [];
    /** @type {HTMLElement} */
    this.progressBar = null;
    /** @type {HTMLElement} */
    this.chapterDots = null;
    /** @type {HTMLElement} */
    this.toggleBtn = null;
    this.currentChapter = -1;
    this.overlaysVisible = true; // default: show overlays
    this.cameraPath = null;      // Link to active camera system
  }

  init(cameraPath = null) {
    this.cameraPath = cameraPath;
    this._createOverlays();
    this._createProgressBar();
    this._createChapterDots();
    this._createToggleButton();
    this._injectStyles();
  }

  _createOverlays() {
    CHAPTERS.forEach(ch => {
      const el = document.createElement('div');
      el.id = ch.id;
      el.className = `story-overlay story-${ch.align}`;
      el.innerHTML = `
        <div class="story-icon">${ch.icon}</div>
        <h2 class="story-title">${ch.title}</h2>
        ${ch.subtitle ? `<p class="story-subtitle">${ch.subtitle}</p>` : ''}
        ${ch.extra || ''}
      `;
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      this.overlays.push(el);
    });
  }

  _createProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.innerHTML = '<div class="scroll-progress-fill"></div>';
    document.body.appendChild(bar);
    this.progressBar = bar.querySelector('.scroll-progress-fill');
  }

  _createChapterDots() {
    const container = document.createElement('div');
    container.className = 'chapter-dots';

    CHAPTERS.forEach((ch, i) => {
      const dot = document.createElement('div');
      dot.className = 'chapter-dot';
      dot.title = ch.title;
      dot.dataset.index = i;
      dot.innerHTML = `<span class="dot-tooltip">${ch.icon} ${ch.title}</span>`;
      
      dot.addEventListener('click', () => {
        if (this.cameraPath) {
          this.cameraPath.scrollToChapter(i);
        }
      });

      container.appendChild(dot);
    });

    document.body.appendChild(container);
    this.chapterDots = container;
  }

  /**
   * Inject extra CSS styles for the rich story overlays
   */
  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── STORY ICON ── */
      .story-icon {
        font-size: 2rem;
        margin-bottom: 8px;
        filter: drop-shadow(0 0 6px rgba(255,105,180,0.4));
        animation: story-icon-float 3s ease-in-out infinite;
      }
      @keyframes story-icon-float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-4px) scale(1.05); }
      }

      /* ── STORY OVERLAY ENHANCED ── */
      .story-overlay {
        max-width: 520px;
        padding: 28px 36px;
      }

      /* ── DECORATIVE LINE ── */
      .story-deco {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 12px 0;
      }
      .story-star {
        color: var(--gold);
        font-size: 0.7rem;
        opacity: 0.8;
        animation: story-sparkle 2s ease-in-out infinite alternate;
      }
      @keyframes story-sparkle {
        0% { opacity: 0.5; transform: scale(1); }
        100% { opacity: 1; transform: scale(1.2); }
      }
      .story-line {
        width: 40px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
      }

      /* ── SCROLL HINT ── */
      .story-hint {
        font-size: 0.7rem;
        color: rgba(255,255,255,0.35);
        letter-spacing: 2px;
        margin-top: 8px;
        animation: story-hint-pulse 2s ease-in-out infinite;
      }
      @keyframes story-hint-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }

      /* ── TRAITS PILLS ── */
      .story-traits {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0;
      }
      .story-trait {
        font-size: 0.72rem;
        padding: 5px 12px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        color: rgba(255,255,255,0.75);
        letter-spacing: 0.5px;
        backdrop-filter: blur(4px);
      }

      /* ── IMAGE IN OVERLAY ── */
      .story-img-frame {
        position: relative;
        width: 160px;
        height: 200px;
        margin: 16px auto 0;
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid rgba(255,255,255,0.1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      }
      .story-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .story-img-glow {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,105,180,0.15), transparent, rgba(255,215,0,0.1));
        pointer-events: none;
      }

      /* ── CANDLES ── */
      .story-candle {
        font-size: 1.4rem;
        animation: candle-flicker 1.5s ease-in-out infinite alternate;
      }
      .story-candle:nth-child(2) { animation-delay: 0.3s; }
      .story-candle:nth-child(3) { animation-delay: 0.7s; }
      @keyframes candle-flicker {
        0% { transform: scale(1) rotate(0deg); opacity: 0.7; }
        100% { transform: scale(1.15) rotate(3deg); opacity: 1; }
      }

      /* ── QUOTE ── */
      .story-quote {
        font-family: var(--font-display);
        font-style: italic;
        font-size: 0.85rem;
        color: rgba(255,255,255,0.6);
        margin-top: 10px;
        padding: 8px 16px;
        border-left: 2px solid var(--candy-pink);
        line-height: 1.6;
      }

      /* ── POLAROID GALLERY ── */
      .story-gallery {
        display: flex;
        gap: 10px;
        margin: 16px 0 4px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .story-polaroid {
        width: 100px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        padding: 6px 6px 20px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.12), inset 0 0 8px rgba(255, 255, 255, 0.05);
        transform: rotate(var(--rot, 0deg));
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
      }
      .story-polaroid:hover {
        transform: scale(1.15) rotate(0deg);
        box-shadow: 0 12px 40px rgba(255, 105, 180, 0.25), inset 0 0 12px rgba(255, 255, 255, 0.1);
        z-index: 10;
        cursor: pointer;
      }
      .story-polaroid img {
        width: 100%;
        height: 80px;
        object-fit: cover;
        display: block;
        border-radius: 3px;
      }
      .story-polaroid span {
        display: block;
        text-align: center;
        font-size: 0.58rem;
        color: rgba(255, 255, 255, 0.85);
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        margin-top: 6px;
        font-family: var(--font-body);
        font-weight: 400;
        letter-spacing: 0.5px;
      }

      /* ── WISH CARDS GRID ── */
      .story-wishes-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 14px 0 4px;
      }
      .story-wish-card {
        padding: 10px 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        text-align: center;
        border-top: 2px solid var(--ac, var(--candy-pink));
        backdrop-filter: blur(6px);
      }
      .swc-icon {
        font-size: 1.2rem;
        display: block;
        margin-bottom: 4px;
      }
      .swc-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 500;
        color: rgba(255,255,255,0.9);
        margin-bottom: 2px;
      }
      .swc-text {
        display: block;
        font-size: 0.6rem;
        color: rgba(255,255,255,0.45);
        line-height: 1.4;
      }

      /* ── LETTER ── */
      .story-letter {
        margin: 18px 0;
        padding: 24px 28px;
        background: rgba(253, 246, 227, 0.07);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 105, 180, 0.20);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 0 24px rgba(255, 105, 180, 0.04);
        position: relative;
        overflow: hidden;
      }
      .story-letter::before {
        content: '✉️';
        position: absolute;
        top: 6px;
        left: 12px;
        font-size: 1.1rem;
        opacity: 0.5;
      }
      .story-letter-body {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.8;
        font-weight: 300;
        text-align: left;
        letter-spacing: 0.3px;
      }
      .story-letter-sig {
        margin-top: 18px;
        border-top: 1px dashed rgba(255, 105, 180, 0.25);
        padding-top: 14px;
      }
      .story-sig-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .story-sig-text {
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .story-sig-name {
        font-family: var(--font-display);
        font-size: 0.95rem;
        font-style: italic;
        color: var(--candy-pink);
        text-shadow: 0 0 8px rgba(255, 105, 180, 0.3);
      }
      .story-sig-date {
        font-size: 0.68rem;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 0.5px;
      }
      .wax-seal {
        flex-shrink: 0;
        cursor: pointer;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.4s ease;
      }
      .wax-seal:hover {
        transform: scale(1.15) rotate(8deg);
        filter: drop-shadow(0px 8px 12px rgba(128, 15, 47, 0.6));
      }
      
      /* ── SVG WAVY DIVIDER ── */
      .story-svg-divider {
        display: inline-block;
        vertical-align: middle;
        opacity: 0.85;
      }

      /* ── FINAL WISH ── */
      .story-final-wish {
        font-family: var(--font-display);
        font-size: 1.1rem;
        font-weight: 700;
        background: linear-gradient(135deg, var(--candy-pink), var(--gold), var(--lavender));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-align: center;
        margin-top: 10px;
        animation: final-wish-glow 2s ease-in-out infinite alternate;
      }
      @keyframes final-wish-glow {
        0% { filter: brightness(0.9); }
        100% { filter: brightness(1.3); }
      }

      /* ── DOT TOOLTIP ── */
      .dot-tooltip {
        position: absolute;
        right: 18px;
        top: 50%;
        transform: translateY(-50%);
        white-space: nowrap;
        font-size: 0.65rem;
        color: rgba(255,255,255,0.7);
        background: rgba(10,0,21,0.8);
        backdrop-filter: blur(8px);
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.08);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .chapter-dot {
        position: relative;
      }
      .chapter-dot:hover .dot-tooltip {
        opacity: 1;
        transform: translateY(-50%) translateX(-4px);
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 768px) {
        .story-overlay {
          max-width: 88vw;
          padding: 18px 20px;
        }
        .story-gallery {
          gap: 6px;
        }
        .story-polaroid {
          width: 80px;
        }
        .story-polaroid img {
          height: 60px;
        }
        .story-wishes-grid {
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .story-img-frame {
          width: 120px;
          height: 150px;
        }
      }

      @media (max-width: 480px) {
        .story-title {
          font-size: 1.2rem;
        }
        .story-subtitle {
          font-size: 0.75rem;
        }
        .story-wishes-grid {
          grid-template-columns: 1fr;
        }
        .story-polaroid {
          width: 70px;
        }
      }

      /* ── TOGGLE BUTTON ── */
      .story-toggle-btn {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 55;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 24px;
        background: rgba(10,0,21,0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: rgba(255,255,255,0.65);
        font-family: var(--font-body);
        font-size: 0.7rem;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
      }
      .story-toggle-btn:hover {
        border-color: var(--candy-pink);
        color: var(--candy-pink);
        background: rgba(255,105,180,0.08);
      }
      .story-toggle-btn.hidden-mode {
        border-color: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.35);
      }
      .story-toggle-btn.hidden-mode:hover {
        border-color: var(--gold);
        color: var(--gold);
      }
      .story-toggle-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .story-toggle-label {
        white-space: nowrap;
      }

      @media (max-width: 480px) {
        .story-toggle-btn {
          padding: 7px 10px;
          font-size: 0;
          gap: 0;
        }
        .story-toggle-label {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the toggle button to show/hide story overlays
   */
  _createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'story-toggle-btn';
    btn.setAttribute('aria-label', 'Ẩn/hiện lời chúc');
    btn.innerHTML = `
      <i class="story-toggle-icon" data-lucide="eye"></i>
      <span class="story-toggle-label">Ẩn lời chúc</span>
    `;
    document.body.appendChild(btn);
    this.toggleBtn = btn;

    // Initialize Lucide Icons for dynamic element
    if (window.lucide) {
      window.lucide.createIcons();
    }

    btn.addEventListener('click', () => {
      this.overlaysVisible = !this.overlaysVisible;
      this._applyVisibility();
    });
  }

  /**
   * Apply visibility state to overlays, dots, progress bar
   */
  _applyVisibility() {
    const btn = this.toggleBtn;
    const label = btn.querySelector('.story-toggle-label');
    const icon = btn.querySelector('.story-toggle-icon');

    if (this.overlaysVisible) {
      // Show overlays
      btn.classList.remove('hidden-mode');
      if (label) label.textContent = 'Ẩn lời chúc';
      if (icon) {
        icon.setAttribute('data-lucide', 'eye');
      }

      // Restore overlays visibility (update() will handle opacity)
      this.overlays.forEach(el => { el.style.display = ''; });
      if (this.chapterDots) this.chapterDots.style.display = '';
      if (this.progressBar) this.progressBar.parentElement.style.display = '';
    } else {
      // Hide overlays
      btn.classList.add('hidden-mode');
      if (label) label.textContent = 'Hiện lời chúc';
      if (icon) {
        icon.setAttribute('data-lucide', 'eye-off');
      }

      this.overlays.forEach(el => {
        el.style.opacity = '0';
        el.style.display = 'none';
      });
      if (this.chapterDots) this.chapterDots.style.display = 'none';
      if (this.progressBar) this.progressBar.parentElement.style.display = 'none';
    }

    // Refresh Lucide Icons to render the updated toggle icon
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * @param {number} progress — scroll progress 0–1
   */
  update(progress) {
    // Skip overlay updates when hidden
    if (!this.overlaysVisible) return;

    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${progress * 100}%`;
    }

    // Update each chapter overlay
    CHAPTERS.forEach((ch, i) => {
      const el = this.overlays[i];
      if (!el) return;

      const [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] = ch.fadeRange;

      let opacity = 0;
      if (progress >= fadeInStart && progress <= fadeInEnd) {
        // Fading in
        opacity = (progress - fadeInStart) / (fadeInEnd - fadeInStart);
      } else if (progress > fadeInEnd && progress < fadeOutStart) {
        // Fully visible
        opacity = 1;
      } else if (progress >= fadeOutStart && progress <= fadeOutEnd) {
        // Fading out
        opacity = 1 - (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart);
      }

      opacity = Math.max(0, Math.min(1, opacity));
      el.style.opacity = opacity.toFixed(3);

      // Slide-in + scale transform for smooth entrance
      const translateY = (1 - opacity) * 25;
      const scale = 0.95 + opacity * 0.05;
      
      if (ch.align === 'center') {
        el.style.transform = `translate(-50%, calc(-50% + ${translateY}px)) scale(${scale.toFixed(3)})`;
      } else {
        el.style.transform = `translateY(${translateY}px) scale(${scale.toFixed(3)})`;
      }
    });

    // Update chapter dots
    let activeChapter = -1;
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (progress >= CHAPTERS[i].range[0] && progress <= CHAPTERS[i].range[1]) {
        activeChapter = i;
        break;
      }
    }

    if (this.chapterDots) {
      const dots = this.chapterDots.querySelectorAll('.chapter-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeChapter);
        dot.classList.toggle('passed', i < activeChapter);
      });
    }

    this.currentChapter = activeChapter;
  }

  dispose() {
    this.overlays.forEach(el => el.remove());
    if (this.progressBar) this.progressBar.parentElement.remove();
    if (this.chapterDots) this.chapterDots.remove();
    if (this.toggleBtn) this.toggleBtn.remove();
  }
}
