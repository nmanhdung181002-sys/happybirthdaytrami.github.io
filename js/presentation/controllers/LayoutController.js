/**
 * Presentation Layer: Quản lý Layout chung (Loader, Scroll, Parallax, Reveal)
 */
export class LayoutController {
    constructor() {
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.loader = document.getElementById('loader');
        this.nav = document.querySelector('.nav');
        this.hbgImg = document.getElementById('hbg');
    }

    init() {
        this.initIcons();
        this.setupLoader();
        this.setupNavScroll();
        this.setupHeroParallax();
        this.setupSmoothAnchor();
        this.setupTiltCards();
        this.setupPolaroids();
    }

    initIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    setupLoader() {
        const hideLoader = () => {
            if (!this.loader) return;
            this.loader.classList.add('done');
            if (this.hbgImg && !this.reduced) {
                requestAnimationFrame(() => this.hbgImg.classList.add('zi'));
            }
            if (!this.reduced) this.splitHeroText();
            this.revealAll();
            this.initIcons();
        };

        if (this.reduced) {
            if (this.loader) this.loader.style.display = 'none';
            this.splitHeroText();
            this.revealAll();
            this.initIcons();
        } else {
            if (document.readyState === 'complete') {
                setTimeout(hideLoader, 1200);
            } else {
                window.addEventListener('load', () => setTimeout(hideLoader, 1200), { once: true });
            }
        }
    }

    splitHeroText() {
        document.querySelectorAll('[data-split]').forEach(el => {
            const text = el.dataset.split || el.textContent;
            el.textContent = '';
            el.setAttribute('aria-label', text);
            [...text].forEach((char, i) => {
                const span = document.createElement('span');
                span.className = 'sc';
                span.textContent = char === ' ' ? '\u00A0' : char;
                span.style.transitionDelay = `${0.06 + i * 0.045}s`;
                el.appendChild(span);
            });
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.querySelectorAll('.sc').forEach(s => s.classList.add('in'));
                });
            });
        });
    }

    setupNavScroll() {
        if (!this.nav) return;
        window.addEventListener('scroll', () => {
            this.nav.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });
    }

    setupHeroParallax() {
        if (this.hbgImg && !this.reduced) {
            let ticking = false;
            window.addEventListener('scroll', () => {
                const sy = window.scrollY;
                if (!ticking) {
                    requestAnimationFrame(() => {
                        if (sy < window.innerHeight) {
                            this.hbgImg.style.transform = `scale(1.05) translateY(${sy * 0.28}px)`;
                        }
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        }
    }

    revealAll() {
        const els = document.querySelectorAll('.rev, .rfade');
        if (this.reduced) {
            els.forEach(e => e.classList.add('in'));
            return;
        }
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        els.forEach(e => obs.observe(e));
    }

    setupTiltCards() {
        const doSetup = () => {
            if (this.reduced || !window.matchMedia('(pointer:fine)').matches) return;
            document.querySelectorAll('.tilt-card').forEach(card => {
                card.addEventListener('mousemove', e => {
                    const r = card.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width - 0.5;
                    const y = (e.clientY - r.top) / r.height - 0.5;
                    card.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(8px) scale(1.02)`;
                    card.style.boxShadow = `${-x * 15}px ${-y * 15}px 40px rgba(0,0,0,.35)`;
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                });
            });
        };
        if ('requestIdleCallback' in window) requestIdleCallback(doSetup);
        else setTimeout(doSetup, 300);
    }

    setupSmoothAnchor() {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const id = a.getAttribute('href').slice(1);
                if (!id) return;
                const target = document.getElementById(id);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: this.reduced ? 'instant' : 'smooth' });
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            });
        });
    }

    setupPolaroids() {
        const randomize = () => {
            document.querySelectorAll('.polaroid').forEach(p => {
                const randY = (Math.random() - 0.5) * 12;
                p.style.marginTop = `${randY}px`;
            });
        };
        if ('requestIdleCallback' in window) requestIdleCallback(randomize);
        else setTimeout(randomize, 400);
    }
}
