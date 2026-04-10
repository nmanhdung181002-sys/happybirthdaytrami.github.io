/**
 * Presentation Layer: Quản lý Gallery Lightbox.
 */
export class GalleryController {
    constructor() {
        this.lb = document.getElementById('lightbox');
        this.lbImg = document.getElementById('lb-img');
        this.lbCap = document.getElementById('lb-cap');
        this.lbClose = document.getElementById('lb-close');
        this.lbPrev = document.getElementById('lb-prev');
        this.lbNext = document.getElementById('lb-next');
        this.lbCounter = document.getElementById('lb-counter');
        this.items = [];
        this.currentIndex = 0;
    }

    init() {
        if (!this.lb) return;
        
        document.querySelectorAll('.mo').forEach((item, i) => {
            const img = item.querySelector('img');
            const cap = item.querySelector('.mo-cap');
            if (img) {
                this.items.push({
                    src: img.src.replace(/\d+\/\d+$/, '1200/1200'),
                    alt: img.alt,
                    caption: cap ? cap.textContent : ''
                });
            }
            item.addEventListener('click', () => this.openLb(i));
            item.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openLb(i);
                }
            });
        });

        if (this.lbClose) this.lbClose.addEventListener('click', () => this.closeLb());
        if (this.lbPrev) this.lbPrev.addEventListener('click', e => { e.stopPropagation(); this.prevImage(); });
        if (this.lbNext) this.lbNext.addEventListener('click', e => { e.stopPropagation(); this.nextImage(); });

        this.lb.addEventListener('click', e => {
            if (e.target === this.lb) this.closeLb();
        });

        document.addEventListener('keydown', e => {
            if (!this.lb.classList.contains('active')) return;
            if (e.key === 'Escape') this.closeLb();
            if (e.key === 'ArrowLeft') this.prevImage();
            if (e.key === 'ArrowRight') this.nextImage();
        });

        this.setupTouch();
    }

    setupTouch() {
        let touchStartX = 0, touchEndX = 0;
        this.lb.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        this.lb.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.nextImage();
                else this.prevImage();
            }
        }, { passive: true });
    }

    showImage(index, direction) {
        if (index < 0 || index >= this.items.length) return;
        this.currentIndex = index;
        const item = this.items[index];

        if (direction) {
            this.lbImg.classList.add(direction === 'left' ? 'lb-slide-left' : 'lb-slide-right');
            setTimeout(() => {
                this.lbImg.src = item.src;
                this.lbImg.alt = item.alt;
                this.lbCap.textContent = item.caption;
                this.lbImg.classList.remove('lb-slide-left', 'lb-slide-right');
            }, 200);
        } else {
            this.lbImg.src = item.src;
            this.lbImg.alt = item.alt;
            this.lbCap.textContent = item.caption;
        }

        if (this.lbCounter) {
            this.lbCounter.textContent = `${index + 1} / ${this.items.length}`;
        }

        if (this.lbPrev) this.lbPrev.style.opacity = index === 0 ? '0.3' : '1';
        if (this.lbNext) this.lbNext.style.opacity = index === this.items.length - 1 ? '0.3' : '1';
    }

    openLb(index) {
        this.currentIndex = index;
        this.showImage(index);
        this.lb.hidden = false;
        requestAnimationFrame(() => this.lb.classList.add('active'));
        document.body.style.overflow = 'hidden';
    }

    closeLb() {
        this.lb.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { this.lb.hidden = true; this.lbImg.src = ''; }, 350);
    }

    prevImage() {
        if (this.currentIndex > 0) this.showImage(this.currentIndex - 1, 'right');
    }

    nextImage() {
        if (this.currentIndex < this.items.length - 1) this.showImage(this.currentIndex + 1, 'left');
    }
}
