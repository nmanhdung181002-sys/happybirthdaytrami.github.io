/**
 * MicBlowDetector.js — Microphone-based candle blow detection for 3D cake
 *
 * ✦ Floating mic button UI overlay on the 3D scene
 * ✦ Web Audio API: analyses low-frequency energy to detect blowing
 * ✦ Triggers cake.blowOut() + confetti burst when blow detected
 * ✦ Candles auto-relight after 6 seconds
 *
 * Methods: init(cake, confetti, interactions), dispose()
 */

import * as THREE from 'three';

// ── CONSTANTS ──
const BLOW_THRESHOLD = 150;       // avg low-freq amplitude to trigger (0–255)
const BLOW_SUSTAIN_MS = 300;      // must sustain above threshold for this long
const RELIGHT_DELAY_MS = 6000;    // auto-relight after blow-out
const FFT_SIZE = 512;

export class MicBlowDetector {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioContext = null;
    /** @type {AnalyserNode|null} */
    this.analyser = null;
    /** @type {MediaStream|null} */
    this.stream = null;

    // References
    this.cake = null;
    this.confetti = null;
    this.interactions = null;

    // State
    this.isListening = false;
    this.isBlownOut = false;
    this.blowStartTime = 0;
    this.rafId = null;

    // UI elements
    this.container = null;
    this.micBtn = null;
    this.statusEl = null;
    this.meterEl = null;
  }

  /**
   * @param {import('../objects/BirthdayCake.js').BirthdayCake} cake
   * @param {import('./ConfettiSystem.js').ConfettiSystem} confetti
   * @param {import('./InteractionManager.js').InteractionManager} interactions
   */
  init(cake, confetti, interactions) {
    this.cake = cake;
    this.confetti = confetti;
    this.interactions = interactions;

    this._createUI();
    this._injectStyles();

    this._onChapterChange = (e) => {
      if (e.detail.name === 'CAKE') {
        this.container.classList.add('visible-chapter');
      } else {
        this.container.classList.remove('visible-chapter');
        this._stopMic();
      }
    };
    window.addEventListener('chapterchange', this._onChapterChange);
  }

  // ═══════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════
  _createUI() {
    // Container — fixed overlay bottom-left
    this.container = document.createElement('div');
    this.container.className = 'mic-blow-container';

    // Mic button
    this.micBtn = document.createElement('button');
    this.micBtn.className = 'mic-blow-btn';
    this.micBtn.innerHTML = `
      <i class="mic-blow-icon" data-lucide="mic"></i>
      <span class="mic-blow-label">Thổi nến</span>
    `;
    this.micBtn.addEventListener('click', () => this._toggleMic());

    // Status text
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'mic-blow-status';
    this.statusEl.textContent = '';

    // Volume meter
    this.meterEl = document.createElement('div');
    this.meterEl.className = 'mic-blow-meter';
    this.meterEl.innerHTML = '<div class="mic-blow-meter-fill"></div>';

    this.container.appendChild(this.micBtn);
    this.container.appendChild(this.meterEl);
    this.container.appendChild(this.statusEl);
    document.body.appendChild(this.container);

    // Initialize Lucide Icons for dynamic element
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── MIC BLOW CONTAINER ── */
      .mic-blow-container {
        position: fixed;
        bottom: 24px;
        left: 20px;
        z-index: 55;
        display: none;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        pointer-events: auto;
      }
      .mic-blow-container.visible-chapter {
        display: flex !important;
      }

      /* ── MIC BUTTON ── */
      .mic-blow-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 28px;
        background: rgba(10,0,21,0.65);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: rgba(255,255,255,0.75);
        font-family: var(--font-body, 'DM Sans', sans-serif);
        font-size: 0.8rem;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.35s ease;
        user-select: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      .mic-blow-btn:hover {
        border-color: var(--candy-pink, #FF69B4);
        color: #fff;
        background: rgba(255,105,180,0.12);
        box-shadow: 0 4px 28px rgba(255,105,180,0.2);
        transform: translateY(-1px);
      }
      .mic-blow-btn.listening {
        border-color: #34d399;
        color: #34d399;
        background: rgba(52,211,153,0.1);
        animation: mic-pulse 1.5s ease-in-out infinite;
      }
      .mic-blow-btn.blown-out {
        border-color: var(--gold, #FFD700);
        color: var(--gold, #FFD700);
        background: rgba(255,215,0,0.08);
        animation: none;
      }
      @keyframes mic-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.3); }
        50% { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
      }

      .mic-blow-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .mic-blow-label {
        white-space: nowrap;
      }

      /* ── VOLUME METER ── */
      .mic-blow-meter {
        width: 140px;
        height: 4px;
        background: rgba(255,255,255,0.08);
        border-radius: 4px;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .mic-blow-meter.visible {
        opacity: 1;
      }
      .mic-blow-meter-fill {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #34d399, #fbbf24, #f43f5e);
        border-radius: 4px;
        transition: width 0.05s linear;
      }

      /* ── STATUS TEXT ── */
      .mic-blow-status {
        font-size: 0.7rem;
        color: rgba(255,255,255,0.45);
        letter-spacing: 0.5px;
        text-align: center;
        min-height: 1em;
        transition: all 0.3s ease;
      }
      .mic-blow-status.success {
        color: var(--gold, #FFD700);
        font-weight: 500;
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 768px) {
        .mic-blow-container {
          left: 50% !important;
          bottom: 240px !important;
          transform: translateX(-50%) !important;
          align-items: center !important;
          width: 90% !important;
          max-width: 320px !important;
        }
        .mic-blow-btn {
          margin: 0 auto !important;
        }
        .mic-blow-meter {
          margin: 0 auto !important;
        }
        .mic-blow-status {
          text-align: center !important;
        }
      }

      @media (max-width: 480px) {
        .mic-blow-container {
          bottom: 230px !important;
        }
        .mic-blow-btn {
          padding: 8px 16px;
          font-size: 0.72rem;
        }
        .mic-blow-meter {
          width: 110px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════
  // MIC CONTROL
  // ═══════════════════════════════════════════════
  async _toggleMic() {
    if (this.isListening) {
      this._stopMic();
    } else {
      await this._startMic();
    }
  }

  async _startMic() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      this.isListening = true;
      this.micBtn.classList.add('listening');
      this.micBtn.querySelector('.mic-blow-label').textContent = ' Đang nghe...';
      this.meterEl.classList.add('visible');
      this._setStatus('Hãy thổi vào mic để tắt nến! ');

      this._detectLoop();

    } catch (err) {
      console.warn('Mic access denied:', err);
      this._setStatus('Không thể truy cập microphone');
    }
  }

  _stopMic() {
    this.isListening = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => { });
      this.audioContext = null;
      this.analyser = null;
    }

    this.micBtn.classList.remove('listening');
    this.micBtn.querySelector('.mic-blow-label').textContent = 'Thổi nến';
    this.meterEl.classList.remove('visible');
    this._setStatus('');
  }

  // ═══════════════════════════════════════════════
  // DETECTION LOOP
  // ═══════════════════════════════════════════════
  _detectLoop() {
    if (!this.isListening || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const loop = () => {
      if (!this.isListening) return;
      this.rafId = requestAnimationFrame(loop);

      if (this.isBlownOut) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average of low-frequency bins (blowing is low-freq noise)
      const lowFreqBins = Math.floor(bufferLength / 4);
      let sum = 0;
      for (let i = 0; i < lowFreqBins; i++) {
        sum += dataArray[i];
      }
      const average = sum / lowFreqBins;

      // Update meter visual
      const meterPct = Math.min(100, (average / 255) * 100);
      const fill = this.meterEl.querySelector('.mic-blow-meter-fill');
      if (fill) fill.style.width = meterPct + '%';

      // Check blow
      if (average > BLOW_THRESHOLD) {
        if (this.blowStartTime === 0) {
          this.blowStartTime = performance.now();
        }
        const elapsed = performance.now() - this.blowStartTime;
        if (elapsed >= BLOW_SUSTAIN_MS) {
          this._handleBlow();
        }
      } else {
        this.blowStartTime = 0;
      }
    };

    loop();
  }

  // ═══════════════════════════════════════════════
  // BLOW HANDLER — triggers 3D cake candle blow-out
  // ═══════════════════════════════════════════════
  _handleBlow() {
    if (this.isBlownOut || !this.cake) return;
    this.isBlownOut = true;

    // Update UI
    this.micBtn.classList.remove('listening');
    this.micBtn.classList.add('blown-out');
    this.micBtn.querySelector('.mic-blow-label').textContent = 'chúc mừng nhé!';
    this.statusEl.classList.add('success');
    this._setStatus('Nến đã tắt! Hãy ước một điều thật đẹp');

    // ── Blow out each candle (staggered) ──
    const cake = this.cake;
    if (cake.candles && cake.candles.length > 0) {
      cake.candles.forEach((c, idx) => {
        const delay = idx * 120; // stagger each candle
        setTimeout(() => {
          this._animateFlameOut(c, 500);
        }, delay);
      });
    }

    // Mark in InteractionManager to prevent double blow-out by click
    if (this.interactions) {
      this.interactions.cakeBlownOut = true;
    }

    // Confetti burst after all candles are out
    const totalBlowTime = (cake.candles ? cake.candles.length : 8) * 120 + 500;
    setTimeout(() => {
      this._triggerCelebration();
    }, totalBlowTime);

    // Auto-relight after delay
    setTimeout(() => {
      this._relightCandles();
    }, RELIGHT_DELAY_MS);
  }

  /**
   * Animate a single candle flame shrinking to 0
   */
  _animateFlameOut(candle, duration) {
    const startTime = performance.now();
    const originalFlameScale = candle.flame.scale.clone();
    const originalLightIntensity = candle.light.intensity;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Eased shrink: fast at first, then slow
      const eased = 1 - Math.pow(progress, 0.5);

      // Shrink flame
      candle.flame.scale.copy(originalFlameScale).multiplyScalar(eased);

      // Dim light
      candle.light.intensity = originalLightIntensity * eased;

      // Wobble flame sideways as it dies
      const wobble = Math.sin(progress * 20) * (1 - progress) * 0.15;
      candle.flame.rotation.z = wobble;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fully out
        candle.flame.scale.setScalar(0);
        candle.light.intensity = 0;
        candle.flame.rotation.z = 0;

        // Create smoke wisp at flame position
        this._createSmokePuff(candle);
      }
    };
    animate();
  }

  /**
   * Create a small smoke puff above the extinguished candle
   */
  _createSmokePuff(candle) {
    if (!this.cake || !this.cake.group) return;

    // Smoke puff using a tiny sprite-like sphere
    const smokeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);

    // Position at flame tip
    const flameWorldPos = new THREE.Vector3();
    candle.flame.getWorldPosition(flameWorldPos);

    // Convert to cake group local space
    this.cake.group.worldToLocal(flameWorldPos);
    smoke.position.copy(flameWorldPos);

    this.cake.group.add(smoke);

    // Animate smoke rising + fading
    const startTime = performance.now();
    const startY = smoke.position.y;

    const animSmoke = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / 1500);

      smoke.position.y = startY + progress * 0.8;
      smoke.position.x += (Math.random() - 0.5) * 0.003;
      smokeMat.opacity = 0.4 * (1 - progress);
      const scale = 1 + progress * 2;
      smoke.scale.setScalar(scale);

      if (progress < 1) {
        requestAnimationFrame(animSmoke);
      } else {
        this.cake.group.remove(smoke);
        smokeGeo.dispose();
        smokeMat.dispose();
      }
    };
    animSmoke();
  }

  /**
   * Trigger confetti/celebration after blow-out
   */
  _triggerCelebration() {
    // Show wish message overlay
    const msg = document.createElement('div');
    msg.className = 'mic-blow-wish-msg';
    msg.innerHTML = `
      <span class="wish-sparkle">✨</span>
      <span class="wish-text">Happy Birthday, Trà Mi! 🎂💕</span>
      <span class="wish-sparkle">✨</span>
    `;
    document.body.appendChild(msg);

    // Animate in
    requestAnimationFrame(() => {
      msg.style.opacity = '1';
      msg.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Remove after 3s
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transform = 'translate(-50%, -50%) scale(0.9) translateY(-20px)';
      setTimeout(() => msg.remove(), 500);
    }, 3000);

    // Inject wish message styles if not already
    if (!document.getElementById('mic-blow-wish-style')) {
      const s = document.createElement('style');
      s.id = 'mic-blow-wish-style';
      s.textContent = `
        .mic-blow-wish-msg {
          position: fixed;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          z-index: 200;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: rgba(10,0,21,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,215,0,0.3);
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(255,215,0,0.15);
          opacity: 0;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
        }
        .wish-text {
          font-family: var(--font-display, 'Playfair Display', serif);
          font-size: 1.3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #FF69B4, #FFD700, #E6E6FA);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .wish-sparkle {
          font-size: 1.4rem;
          animation: mic-wish-sparkle 1s ease-in-out infinite alternate;
        }
        @keyframes mic-wish-sparkle {
          0% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1.2) rotate(10deg); }
        }
        @media (max-width: 480px) {
          .wish-text { font-size: 1rem; }
          .mic-blow-wish-msg { padding: 12px 20px; gap: 8px; }
        }
      `;
      document.head.appendChild(s);
    }
  }

  /**
   * Re-light all candles after timeout
   */
  _relightCandles() {
    this.isBlownOut = false;
    this.blowStartTime = 0;

    const cake = this.cake;
    if (cake && cake.candles) {
      cake.candles.forEach((c, idx) => {
        const delay = idx * 80;
        setTimeout(() => {
          // Animate scale back to 1
          const startTime = performance.now();
          const animRelight = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / 400);
            // Bounce ease
            const eased = 1 - Math.pow(1 - progress, 3);
            c.flame.scale.setScalar(eased);
            c.light.intensity = 0.4 * eased;
            if (progress < 1) requestAnimationFrame(animRelight);
          };
          animRelight();
        }, delay);
      });
    }

    if (this.interactions) {
      this.interactions.cakeBlownOut = false;
    }

    // Reset UI
    if (this.isListening) {
      this.micBtn.classList.remove('blown-out');
      this.micBtn.classList.add('listening');
      this.micBtn.querySelector('.mic-blow-label').textContent = 'Đang nghe...';
      this.statusEl.classList.remove('success');
      this._setStatus('Hãy thổi vào mic để tắt nến!');
    } else {
      this.micBtn.classList.remove('blown-out');
      this.micBtn.querySelector('.mic-blow-label').textContent = 'Thổi nến';
      this._setStatus('');
    }
  }

  // ═══════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════
  _setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  dispose() {
    this._stopMic();
    if (this.container) this.container.remove();
    if (this._onChapterChange) {
      window.removeEventListener('chapterchange', this._onChapterChange);
    }
  }
}
