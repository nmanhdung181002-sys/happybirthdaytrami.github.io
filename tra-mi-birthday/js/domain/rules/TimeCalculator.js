/**
 * Domain Rule: Business logic thuần tuý của việc đếm ngược sinh nhật.
 * Không biết về DOM, API hay UI.
 */
export class TimeCalculator {
    /**
     * @param {number} month - Tháng sinh nhật (0-indexed, ví dụ: Tháng 6 là 5)
     * @param {number} day - Ngày sinh nhật
     * @returns {Date} Ngày sinh nhật tiếp theo
     */
    static getNextBirthday(month, day) {
        const now = new Date();
        let bd = new Date(now.getFullYear(), month, day, 0, 0, 0);
        // Nếu đã qua sinh nhật trong năm nay thì lấy năm tiếp theo
        if (now >= bd) {
            bd = new Date(now.getFullYear() + 1, month, day, 0, 0, 0);
        }
        return bd;
    }

    /**
     * @param {Date} targetDate 
     * @returns {Object} days, hours, mins, secs
     */
    static getTimeDiff(targetDate) {
        const diff = targetDate.getTime() - Date.now();
        const s = Math.max(0, Math.floor(diff / 1000));
        
        return {
            days: this.pad(Math.floor(s / 86400)),
            hours: this.pad(Math.floor((s % 86400) / 3600)),
            mins: this.pad(Math.floor((s % 3600) / 60)),
            secs: this.pad(s % 60)
        };
    }

    static pad(n) {
        return String(n).padStart(2, '0');
    }
}
