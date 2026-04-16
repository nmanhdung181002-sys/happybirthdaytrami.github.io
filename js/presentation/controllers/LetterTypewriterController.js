/**
 * Presentation Controller: Hiệu ứng đánh máy (typewriter) cho phần Tâm Thư.
 * Khi người dùng cuộn xuống phần Letter, nội dung sẽ tự viết ra từng ký tự.
 */
export class LetterTypewriterController {
    constructor() {
        this._typed = false;
        this._speed = 30; // ms mỗi ký tự
        this._paragraphDelay = 400; // ms nghỉ giữa các đoạn
    }

    init() {
        const letterSection = document.getElementById('letter');
        if (!letterSection) return;

        const lcBody = letterSection.querySelector('.lc-body');
        const lcSig = letterSection.querySelector('.lc-sig');
        if (!lcBody) return;

        // Lưu nội dung gốc rồi ẩn text
        this._paragraphs = [];
        const children = Array.from(lcBody.children);
        children.forEach(el => {
            this._paragraphs.push({
                element: el,
                html: el.innerHTML,
                tag: el.tagName,
                className: el.className
            });
            el.innerHTML = '';
            el.style.visibility = 'hidden';
        });

        // Ẩn chữ ký
        if (lcSig) {
            this._sigElement = lcSig;
            lcSig.style.opacity = '0';
            lcSig.style.transform = 'translateY(15px)';
            lcSig.style.transition = 'opacity .8s ease, transform .8s ease';
        }

        // IntersectionObserver: khi section xuất hiện → bắt đầu gõ
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this._typed) {
                    this._typed = true;
                    observer.disconnect();
                    // Đợi 1 chút để animation reveal xong
                    setTimeout(() => this._startTyping(), 600);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(letterSection);
    }

    /**
     * Bắt đầu hiệu ứng đánh máy lần lượt từng đoạn
     */
    async _startTyping() {
        for (let i = 0; i < this._paragraphs.length; i++) {
            const p = this._paragraphs[i];
            p.element.style.visibility = 'visible';
            p.element.classList.add('typewriter-active');

            await this._typeHTML(p.element, p.html);

            p.element.classList.remove('typewriter-active');
            p.element.classList.add('typewriter-done');

            // Nghỉ giữa các đoạn
            if (i < this._paragraphs.length - 1) {
                await this._delay(this._paragraphDelay);
            }
        }

        // Hiện chữ ký sau khi gõ xong
        if (this._sigElement) {
            await this._delay(300);
            this._sigElement.style.opacity = '1';
            this._sigElement.style.transform = 'translateY(0)';
        }
    }

    /**
     * Gõ từng ký tự vào element, hỗ trợ HTML entities và emoji
     */
    _typeHTML(element, html) {
        return new Promise(resolve => {
            let i = 0;
            element.innerHTML = '';

            const type = () => {
                if (i >= html.length) {
                    resolve();
                    return;
                }

                let char = html[i];

                // Xử lý HTML entities (&amp; &hearts; v.v.)
                if (char === '&') {
                    const semicolonIdx = html.indexOf(';', i);
                    if (semicolonIdx !== -1 && semicolonIdx - i < 10) {
                        char = html.substring(i, semicolonIdx + 1);
                        i = semicolonIdx + 1;
                    } else {
                        i++;
                    }
                }
                // Xử lý HTML tags (<strong>, <em>, v.v.)
                else if (char === '<') {
                    const closeIdx = html.indexOf('>', i);
                    if (closeIdx !== -1) {
                        char = html.substring(i, closeIdx + 1);
                        i = closeIdx + 1;
                    } else {
                        i++;
                    }
                }
                // Xử lý emoji (surrogate pairs)
                else {
                    const code = html.charCodeAt(i);
                    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < html.length) {
                        char = html.substring(i, i + 2);
                        i += 2;
                    } else {
                        i++;
                    }
                }

                element.innerHTML += char;

                // Tốc độ gõ: chậm hơn ở dấu câu
                let speed = this._speed;
                const lastChar = char[char.length - 1];
                if (lastChar === '.' || lastChar === '!' || lastChar === '?') speed *= 6;
                else if (lastChar === ',' || lastChar === ';' || lastChar === ':') speed *= 3;
                else if (lastChar === '—' || lastChar === '–') speed *= 4;

                setTimeout(type, speed);
            };

            type();
        });
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
