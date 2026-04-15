/**
 * Domain Rule: Kiểm tra xem nội dung có bị khoá hay không dựa trên ngày mục tiêu.
 * Nếu chưa đến ngày mục tiêu (30/6) thì nội dung sẽ bị khoá.
 * Sử dụng API thời gian online để chống người dùng chỉnh ngày hệ thống.
 */
export class TimeLockRule {
    /**
     * @param {number} month - Tháng mục tiêu (0-indexed, tháng 6 = 5)
     * @param {number} day - Ngày mục tiêu
     * @param {boolean|null} forceLock - true=luôn khoá, false=luôn mở, null=tự động theo ngày
     */
    constructor(month, day, forceLock = null) {
        this.month = month;
        this.day = day;
        this.forceLock = forceLock; // true/false/null
        this._serverTimeOffset = 0;
        this._verified = false;
    }

    /**
     * Lấy thời gian thật từ API online để tính offset so với đồng hồ hệ thống.
     * Nếu API lỗi, mặc định giữ khoá (an toàn).
     */
    async verifyServerTime() {
        const apis = [
            {
                url: 'https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh',
                parse: (data) => new Date(data.datetime)
            },
            {
                url: 'https://timeapi.io/api/time/current/zone?timeZone=Asia/Ho_Chi_Minh',
                parse: (data) => new Date(data.dateTime)
            }
        ];

        for (const api of apis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const res = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) continue;

                const data = await res.json();
                const serverTime = api.parse(data);

                if (!isNaN(serverTime.getTime())) {
                    this._serverTimeOffset = serverTime.getTime() - Date.now();
                    this._verified = true;
                    console.log('[TimeLock] Server time verified, offset:', this._serverTimeOffset, 'ms');
                    return;
                }
            } catch (e) {
                console.warn('[TimeLock] API failed:', api.url, e.message);
            }
        }

        // Nếu tất cả API đều lỗi, mặc định giữ khoá (an toàn)
        this._verified = false;
        console.warn('[TimeLock] Could not verify server time, defaulting to locked');
    }

    /**
     * Lấy thời gian thực (đã hiệu chỉnh theo server)
     * @returns {Date}
     */
    _getRealNow() {
        return new Date(Date.now() + this._serverTimeOffset);
    }

    /**
     * Kiểm tra xem hiện tại có bị khoá không
     * @returns {boolean} true nếu chưa đến ngày mục tiêu (bị khoá)
     */
    isLocked() {
        // Nếu đã set forceLock thì dùng giá trị đó (true/false)
        if (this.forceLock === true) return true;
        if (this.forceLock === false) return false;

        // Chế độ tự động: kiểm tra theo ngày
        const now = this._getRealNow();
        const currentYear = now.getFullYear();
        const unlockDate = new Date(currentYear, this.month, this.day, 0, 0, 0);

        // Nếu chưa verify được server time, mặc định khoá
        if (!this._verified) {
            return true;
        }

        return now < unlockDate;
    }

    /**
     * Lấy ngày mở khoá
     * @returns {Date}
     */
    getUnlockDate() {
        const now = this._getRealNow();
        const currentYear = now.getFullYear();
        return new Date(currentYear, this.month, this.day, 0, 0, 0);
    }
}
