/**
 * Infrastructure Layer: Thao tác trực tiếp với HTMLAudioElement.
 */
export class BrowserAudioService {
    constructor(audioElementId) {
        this.audioElement = document.getElementById(audioElementId);
        if (this.audioElement) {
            this.audioElement.volume = 0.3;
        }
        this.isPlaying = false;
    }

    play() {
        if (!this.audioElement) return;
        this.audioElement.play().catch(() => {});
        this.isPlaying = true;
    }

    pause() {
        if (!this.audioElement) return;
        this.audioElement.pause();
        this.isPlaying = false;
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }
}
