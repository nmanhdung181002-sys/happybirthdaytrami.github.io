/**
 * Presentation Layer: Quản lý giao diện đếm ngược.
 * Khi countdown chạm 0, dispatch event 'birthday-unlocked' để các controller khác lắng nghe.
 */
export class CountdownController {
    constructor(getCountdownUseCase) {
        this.getCountdownUseCase = getCountdownUseCase;
        
        this.cdD = document.getElementById('cd-d');
        this.cdH = document.getElementById('cd-h');
        this.cdM = document.getElementById('cd-m');
        this.cdS = document.getElementById('cd-s');
        this._hasReachedZero = false;
    }

    init() {
        this.tick();
        setInterval(() => this.tick(), 1000);
    }

    tick() {
        if (!this.cdD) return;
        
        const timeDiff = this.getCountdownUseCase.execute();

        this.animateNum(this.cdD, timeDiff.days);
        this.animateNum(this.cdH, timeDiff.hours);
        this.animateNum(this.cdM, timeDiff.mins);
        this.animateNum(this.cdS, timeDiff.secs);

        // Kiểm tra đã hết thời gian chưa
        if (!this._hasReachedZero && 
            timeDiff.days === '00' && timeDiff.hours === '00' && 
            timeDiff.mins === '00' && timeDiff.secs === '00') {
            this._hasReachedZero = true;
            window.dispatchEvent(new CustomEvent('birthday-unlocked'));
        }
    }

    animateNum(el, val) {
        if (!el || el.textContent === val) return;
        el.style.transform = 'translateY(-4px)';
        el.style.opacity = '0.5';
        el.textContent = val;
        requestAnimationFrame(() => {
            el.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1), opacity .3s';
            el.style.transform = '';
            el.style.opacity = '';
        });
    }
}
