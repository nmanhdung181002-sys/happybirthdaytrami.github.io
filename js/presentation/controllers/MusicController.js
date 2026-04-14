/**
 * Presentation Layer: Giao diện điều khiển Âm nhạc.
 */
export class MusicController {
    constructor(toggleMusicUseCase) {
        this.toggleMusicUseCase = toggleMusicUseCase;
        
        this.musicToggle = document.getElementById('music-toggle');
        this.musicBars = document.getElementById('music-bars');
        this.iconOff = document.getElementById('music-icon-off');
        this.iconOn = document.getElementById('music-icon-on');
    }

    init() {
        if (!this.musicToggle) return;
        
        this.musicToggle.addEventListener('click', () => {
            const result = this.toggleMusicUseCase.execute();
            this.updateUI(result.playing);
        });
    }

    updateUI(isPlaying) {
        if (!isPlaying) {
            this.musicBars.classList.remove('playing');
            if (this.iconOff) this.iconOff.style.display = '';
            if (this.iconOn) this.iconOn.style.display = 'none';
        } else {
            this.musicBars.classList.add('playing');
            if (this.iconOff) this.iconOff.style.display = 'none';
            if (this.iconOn) this.iconOn.style.display = '';
        }
    }
}
