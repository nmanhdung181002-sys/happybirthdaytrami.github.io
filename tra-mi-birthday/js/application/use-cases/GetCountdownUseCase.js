import { TimeCalculator } from '../../domain/rules/TimeCalculator.js';

/**
 * UseCase: Lấy số liệu đếm ngược hiện tại.
 */
export class GetCountdownUseCase {
    constructor(month, day) {
        this.month = month;
        this.day = day;
        this.targetDate = TimeCalculator.getNextBirthday(month, day);
    }

    execute() {
        return TimeCalculator.getTimeDiff(this.targetDate);
    }
}
