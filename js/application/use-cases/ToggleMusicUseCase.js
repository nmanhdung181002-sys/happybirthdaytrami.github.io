/**
 * Application Layer: Điều phối logic bật tắt nhạc.
 * Dependency Inversion: UseCase nhận AudioService qua hàm khởi tạo.
 */
export class ToggleMusicUseCase {
    constructor(audioService) {
        this.audioService = audioService;
    }

    execute() {
        if (this.audioService.isCurrentlyPlaying()) {
            this.audioService.pause();
            return { playing: false };
        } else {
            this.audioService.play();
            return { playing: true };
        }
    }
}
