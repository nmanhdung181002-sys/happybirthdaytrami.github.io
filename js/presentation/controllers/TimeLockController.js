/**
 * Presentation Controller: Quản lý việc khoá/mở khoá các section trên giao diện.
 * Nếu chưa đến ngày sinh nhật thì một số section sẽ bị che bởi overlay khoá.
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
    }

    init() {
        if (!this.timeLockRule.isLocked()) {
            return;
        }

        this._applyLocks();
        this._lockNavLinks();
        this._startAntiTamper();
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
     * Chống xoá qua DevTools:
     * - MutationObserver theo dõi thay đổi DOM
     * - Kiểm tra định kỳ mỗi 2 giây
     */
    _startAntiTamper() {
        // MutationObserver: nếu overlay bị xoá hoặc section bị sửa → khôi phục
        this.lockedSectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;

            const observer = new MutationObserver(() => {
                const overlay = section.querySelector('.lock-overlay');
                if (!overlay) {
                    // Overlay bị xoá → xoá hết nội dung và chèn lại overlay
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
        });

        // Kiểm tra định kỳ mỗi 2 giây
        setInterval(() => {
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
                location.reload();
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
        setInterval(update, 1000);
    }
}
