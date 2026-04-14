/**
 * Presentation Layer: Quản lý các sự kiện tương tác (Thổi nến, Gửi Yêu Thương)
 */
export class InteractiveController {
    constructor() {
        this.blowBtn = document.getElementById('blow-btn');
        this.candles = document.getElementById('cake-candles');
        
        this.loveBtn = document.getElementById('love-btn');
        this.loveNote = document.getElementById('love-note');
    }

    init() {
        if (this.blowBtn && this.candles) {
            this.blowBtn.addEventListener('click', () => this.handleBlowCandle());
        }

        if (this.loveBtn) {
            this.loveBtn.addEventListener('click', () => this.handleSendLove());
        }
    }

    handleBlowCandle() {
        if (this.candles.classList.contains('blown')) return;
        
        this.candles.classList.add('blown');
        this.blowBtn.disabled = true;
        this.blowBtn.textContent = '🎉 Đã thổi!';
        
        if (typeof window.triggerConfetti3D === 'function') {
            window.triggerConfetti3D();
        }
        
        setTimeout(() => {
            this.candles.classList.remove('blown');
            this.blowBtn.disabled = false;
            this.blowBtn.innerHTML = '<i data-lucide="wind" aria-hidden="true"></i> Thổi Nến';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 5000);
    }

    handleSendLove() {
        if (typeof window.triggerFireworks === 'function') {
            window.triggerFireworks(8);
        }
        
        if (typeof window.triggerBubbleBurst === 'function') {
            window.triggerBubbleBurst();
        }
        
        if (this.loveNote) {
            this.loveNote.hidden = false;
            setTimeout(() => { this.loveNote.hidden = true; }, 6000);
        }
    }
}
