/**
 * Presentation Controller: Quản lý nhận diện âm thanh thổi nến qua Microphone.
 * Tạo nút "Bật Mic để thổi" trực tiếp trong vùng bánh, không phụ thuộc blow-btn.
 */
export class MicBlowController {
    constructor() {
        this.cakeEl = document.querySelector('.css-cake');
        this.candles = document.getElementById('cake-candles');

        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isBlowing = false;

        // Threshold âm lượng để nhận diện tiếng thổi (0-255)
        this.blowThreshold = 200;
    }

    init() {
        if (!this.cakeEl || !this.candles) return;

        // Tạo container cho mic UI
        this._createMicUI();
    }

    /**
     * Tạo nút mic và trạng thái bên dưới bánh
     */
    _createMicUI() {
        // Nút bật mic
        const micBtn = document.createElement('button');
        micBtn.className = 'mic-btn';
        micBtn.innerHTML = '<i data-lucide="mic" aria-hidden="true"></i> nhấn vào để thổi nến';
        micBtn.onclick = () => {
            this._startMic();
            micBtn.style.display = 'none';
        };

        // Status text
        this.statusText = document.createElement('div');
        this.statusText.className = 'mic-status';
        this.statusText.textContent = '';

        this.cakeEl.appendChild(micBtn);
        this.cakeEl.appendChild(this.statusText);

        // Re-render lucide icons
        if (typeof lucide !== 'undefined') {
            try { lucide.createIcons(); } catch (e) { }
        }
    }

    _setMicStatus(text) {
        if (this.statusText) {
            this.statusText.textContent = text;
        }
    }

    async _startMic() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false
                }
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;

            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            this._setMicStatus('Đang nghe tiếng thổi... 🌬️');
            this._detectBlow();

        } catch (err) {
            console.warn('Mic access denied or error:', err);
            this._setMicStatus('Không thể mở mic.');
        }
    }

    _detectBlow() {
        if (!this.analyser) return;

        const loop = () => {
            requestAnimationFrame(loop);

            if (this.isBlowing) return;

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);

            // Tính trung bình âm lượng các dải tần số thấp (tiếng thổi thường dải thấp)
            let sum = 0;
            const lowFreqRange = Math.floor(bufferLength / 4);
            for (let i = 0; i < lowFreqRange; i++) {
                sum += dataArray[i];
            }
            const average = sum / lowFreqRange;

            if (average > this.blowThreshold) {
                this._handleBlow();
            }
        };

        loop();
    }

    /**
     * Xử lý khi phát hiện tiếng thổi - thổi nến trực tiếp
     */
    _handleBlow() {
        if (this.isBlowing || !this.candles) return;
        if (this.candles.classList.contains('blown')) return;

        this.isBlowing = true;
        this.candles.classList.add('blown');
        this._setMicStatus('Đã thổi! 🎂');

        // Trigger confetti nếu có
        if (typeof window.triggerConfetti3D === 'function') {
            window.triggerConfetti3D();
        }

        // Reset sau 5 giây
        setTimeout(() => {
            this.candles.classList.remove('blown');
            this.isBlowing = false;
            if (this.analyser) {
                this._setMicStatus('Đang nghe tiếng thổi... 🌬️');
            }
        }, 5000);
    }
}
