/**
 * Presentation Controller: Quản lý việc khoá/mở khoá các section trên giao diện.
 * Nếu chưa đến ngày sinh nhật thì một số section sẽ bị che bởi overlay khoá.
 * 
 * Khi countdown hero chạm 0 → hiệu ứng mở khoá đặc biệt + khôi phục nội dung.
 * 
 * Bảo vệ chống xoá qua DevTools (F12):
 * - Ẩn nội dung gốc, không chỉ đè overlay
 * - MutationObserver tự khôi phục overlay nếu bị xoá
 * - Kiểm tra định kỳ
 */
export class TimeLockController {
    /**
     * @param {import('../../domain/rules/TimeLockRule.js').TimeLockRule} timeLockRule
     * @param {string[]} lockedSectionIds - mảng ID các section cần khoá
     */
    constructor(timeLockRule, lockedSectionIds) {
        this.timeLockRule = timeLockRule;
        this.lockedSectionIds = lockedSectionIds;
        this._originalContents = new Map(); // Lưu nội dung gốc
        this._observers = [];
        this._antiTamperInterval = null;
        this._lockCountdownInterval = null;
        this._unlocked = false;
    }

    init() {
        if (!this.timeLockRule.isLocked()) {
            return;
        }

        this._applyLocks();
        this._lockNavLinks();
        this._startAntiTamper();

        // Lắng nghe sự kiện mở khoá từ CountdownController
        window.addEventListener('birthday-unlocked', () => this._performUnlock(), { once: true });
    }

    /**
     * Áp dụng khoá: ẩn nội dung gốc và thay bằng overlay
     */
    _applyLocks() {
        this.lockedSectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;

            // Lưu nội dung gốc rồi xoá hết con bên trong
            this._originalContents.set(sectionId, section.innerHTML);

            // Xoá hết nội dung gốc
            section.innerHTML = '';

            // Thêm class locked
            section.classList.add('section-locked');

            // Tạo overlay khoá (giờ là nội dung duy nhất trong section)
            this._insertLockOverlay(section, sectionId);
        });

        this._startLockCountdown();
    }

    /**
     * Chèn overlay khoá vào section
     */
    _insertLockOverlay(section, sectionId) {
        const overlay = document.createElement('div');
        overlay.className = 'lock-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('data-lock-id', sectionId);

        overlay.innerHTML = `
            <div class="lock-content">
                <div class="lock-icon-wrapper">
                    <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <div class="lock-pulse"></div>
                </div>
                <p class="lock-title">Nội dung bị khoá</p>
                <p class="lock-subtitle">Mở khoá vào ngày <strong>30 tháng 6</strong></p>
                <div class="lock-countdown" id="lock-cd-${sectionId}"></div>
            </div>
        `;

        section.appendChild(overlay);
    }

    /**
     * Khoá các nav link trỏ đến section bị khoá
     */
    _lockNavLinks() {
        this.lockedSectionIds.forEach(sectionId => {
            const navLink = document.querySelector(`.nav a[href="#${sectionId}"]`);
            if (!navLink) return;

            navLink.classList.add('nav-locked');
            const lockBadge = document.createElement('span');
            lockBadge.className = 'nav-lock-badge';
            lockBadge.innerHTML = '✦';
            lockBadge.setAttribute('aria-hidden', 'true');
            navLink.appendChild(lockBadge);

            navLink.addEventListener('click', (e) => {
                if (this._unlocked) return; // Cho phép click nếu đã mở khoá
                e.preventDefault();
                this._showLockToast();
            });
        });
    }

    /**
     * Hiện toast thông báo
     */
    _showLockToast() {
        const existing = document.querySelector('.lock-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'lock-toast';
        toast.innerHTML = `
            <span class="lock-toast-icon">✦</span>
            <span>Nội dung này sẽ mở khoá vào <strong>30/06</strong> nhé!</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('lock-toast-show');
        });

        setTimeout(() => {
            toast.classList.remove('lock-toast-show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    /**
     * Chống xoá qua DevTools
     */
    _startAntiTamper() {
        this.lockedSectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;

            const observer = new MutationObserver(() => {
                if (this._unlocked) return; // Bỏ qua nếu đã mở khoá
                const overlay = section.querySelector('.lock-overlay');
                if (!overlay) {
                    section.innerHTML = '';
                    section.classList.add('section-locked');
                    this._insertLockOverlay(section, sectionId);
                }
            });

            observer.observe(section, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });

            this._observers.push(observer);
        });

        this._antiTamperInterval = setInterval(() => {
            if (this._unlocked) return;
            this.lockedSectionIds.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (!section) return;

                const overlay = section.querySelector('.lock-overlay');
                if (!overlay || !section.classList.contains('section-locked')) {
                    section.innerHTML = '';
                    section.classList.add('section-locked');
                    this._insertLockOverlay(section, sectionId);
                }
            });
        }, 2000);
    }

    /**
     * Đếm ngược trên overlay
     */
    _startLockCountdown() {
        const update = () => {
            const now = new Date();
            const unlock = this.timeLockRule.getUnlockDate();
            const diff = unlock.getTime() - now.getTime();

            if (diff <= 0) {
                // Dispatch event để trigger unlock
                window.dispatchEvent(new CustomEvent('birthday-unlocked'));
                return;
            }

            const s = Math.floor(diff / 1000);
            const days = Math.floor(s / 86400);
            const hours = Math.floor((s % 86400) / 3600);
            const mins = Math.floor((s % 3600) / 60);
            const secs = s % 60;

            const pad = n => String(n).padStart(2, '0');
            const text = `${pad(days)} ngày ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

            this.lockedSectionIds.forEach(id => {
                const el = document.getElementById(`lock-cd-${id}`);
                if (el) el.textContent = text;
            });
        };

        update();
        this._lockCountdownInterval = setInterval(update, 1000);
    }

    // ═══════════════════════════════════════
    //  🎉 MỞ KHOÁ VỚI HIỆU ỨNG ĐẶC BIỆT
    // ═══════════════════════════════════════

    /**
     * Thực hiện mở khoá tất cả sections với hiệu ứng celebration
     */
    _performUnlock() {
        if (this._unlocked) return;
        this._unlocked = true;

        // 1. Tắt anti-tamper
        this._observers.forEach(o => o.disconnect());
        this._observers = [];
        if (this._antiTamperInterval) clearInterval(this._antiTamperInterval);
        if (this._lockCountdownInterval) clearInterval(this._lockCountdownInterval);

        // 2. Hiển thị celebration overlay toàn màn hình
        this._showCelebrationOverlay();

        // 3. Sau hiệu ứng celebration, mở khoá từng section
        setTimeout(() => {
            this._unlockAllSections();
            this._unlockNavLinks();
        }, 2800);
    }

    /**
     * Tạo celebration overlay toàn màn hình
     */
    _showCelebrationOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'celebration-overlay';
        overlay.id = 'celebration-overlay';

        // Tạo particles
        let particles = '';
        const emojis = ['🎉', '🎊', '🌸', '💖', '✨', '🎂', '🎁', '💕', '⭐', '🌟', '🎆', '🎇'];
        for (let i = 0; i < 40; i++) {
            const emoji = emojis[i % emojis.length];
            const x = Math.random() * 100;
            const delay = Math.random() * 2;
            const dur = 2 + Math.random() * 2;
            const size = 0.8 + Math.random() * 1.2;
            particles += `<span class="celeb-particle" style="left:${x}%;animation-delay:${delay}s;animation-duration:${dur}s;font-size:${size}rem">${emoji}</span>`;
        }

        overlay.innerHTML = `
            <div class="celeb-particles">${particles}</div>
            <div class="celeb-content">
                <div class="celeb-sparkle">✨</div>
                <h2 class="celeb-title">🎂 Happy Birthday! 🎂</h2>
                <p class="celeb-subtitle">Nội dung đã được mở khoá!</p>
                <p class="celeb-name">✦ Chúc mừng sinh nhật Trà Mi ✦</p>
                <div class="celeb-hearts">💖💕💖</div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('celeb-active'));

        // Trigger confetti/fireworks nếu có
        if (typeof window.triggerConfetti3D === 'function') {
            window.triggerConfetti3D();
        }
        if (typeof window.triggerFireworks === 'function') {
            setTimeout(() => window.triggerFireworks(12), 500);
        }

        // Ẩn celebration sau 5 giây
        setTimeout(() => {
            overlay.classList.add('celeb-fadeout');
            setTimeout(() => overlay.remove(), 1000);
        }, 5000);
    }

    /**
     * Mở khoá tất cả sections: xoá overlay, khôi phục nội dung gốc
     */
    _unlockAllSections() {
        this.lockedSectionIds.forEach((sectionId, index) => {
            const section = document.getElementById(sectionId);
            if (!section) return;

            // Delay stagger cho mỗi section
            setTimeout(() => {
                // Khôi phục nội dung gốc
                const original = this._originalContents.get(sectionId);
                if (original) {
                    section.innerHTML = original;
                }

                // Xoá class locked
                section.classList.remove('section-locked');

                // Thêm animation mở khoá
                section.classList.add('section-unlocking');
                setTimeout(() => section.classList.remove('section-unlocking'), 1200);

                // Re-init lucide icons cho section mới khôi phục
                if (typeof lucide !== 'undefined') {
                    try { lucide.createIcons({ nodes: [section] }); } catch(e) {}
                }
            }, index * 200);
        });
    }

    /**
     * Mở khoá nav links
     */
    _unlockNavLinks() {
        this.lockedSectionIds.forEach(sectionId => {
            const navLink = document.querySelector(`.nav a[href="#${sectionId}"]`);
            if (!navLink) return;

            navLink.classList.remove('nav-locked');
            const badge = navLink.querySelector('.nav-lock-badge');
            if (badge) badge.remove();
        });
    }
}
