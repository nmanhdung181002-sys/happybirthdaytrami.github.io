import { TimeCalculator } from '../../domain/rules/TimeCalculator.js';
import { TimeLockRule } from '../../domain/rules/TimeLockRule.js';
import { GetCountdownUseCase } from '../../application/use-cases/GetCountdownUseCase.js';
import { ToggleMusicUseCase } from '../../application/use-cases/ToggleMusicUseCase.js';

import { BrowserAudioService } from '../services/BrowserAudioService.js';
import { ThreeJsService } from '../services/ThreeJsService.js';

import { CountdownController } from '../../presentation/controllers/CountdownController.js';
import { MusicController } from '../../presentation/controllers/MusicController.js';
import { LayoutController } from '../../presentation/controllers/LayoutController.js';
import { GalleryController } from '../../presentation/controllers/GalleryController.js';
import { InteractiveController } from '../../presentation/controllers/InteractiveController.js';
import { TimelineController } from '../../presentation/controllers/TimelineController.js';
import { TimeLockController } from '../../presentation/controllers/TimeLockController.js';
import { LetterTypewriterController } from '../../presentation/controllers/LetterTypewriterController.js';
import { MicBlowController } from '../../presentation/controllers/MicBlowController.js';
import { CatRenderer } from '../../presentation/renderers/CatRenderer.js';
import { ChibiCatsRenderer } from '../../presentation/renderers/ChibiCatsRenderer.js';

/**
 * Infrastructure Layer: Dependency Injection Container
 * Cung cấp một điểm duy nhất để wire các interface, use case và controllers lại với nhau.
 * Ngăn chặn dependency hell và tuân thủ chặt chẽ Clean Architecture.
 */
export const container = {
    /**
     * ═══════════════════════════════════════════════
     *  🔧 CẤU HÌNH KHOÁ — SỬA Ở ĐÂY ĐỂ BẬT/TẮT
     *  true  = LUÔN KHOÁ (ẩn nội dung)
     *  false = LUÔN MỞ   (hiện nội dung, dùng để debug)
     *  null  = TỰ ĐỘNG   (dựa theo ngày 30/6 + server time)
     * ═══════════════════════════════════════════════
     */
    FORCE_LOCK: null,

    init: async function () {
        // 1. Khởi tạo Infrastructure Services (Adapters)
        const audioService = new BrowserAudioService('bg-music');
        const threeJsService = new ThreeJsService();

        // 2. Khởi tạo Domain Rules
        const timeLockRule = new TimeLockRule(5, 30, this.FORCE_LOCK); // Tháng 6 (0-indexed = 5), Ngày 30

        // Verify thời gian thật từ server trước khi quyết định khoá/mở
        if (this.FORCE_LOCK === null) {
            await timeLockRule.verifyServerTime();
        }

        // 3. Khởi tạo Application Use Cases, inject qua Constructor
        const getCountdownUseCase = new GetCountdownUseCase(5, 30); // Tháng 6 là 5 (0-indexed), Ngày 30
        const toggleMusicUseCase = new ToggleMusicUseCase(audioService);

        // 4. Khởi tạo Presentation Controllers, inject Use Cases
        const layoutController = new LayoutController();
        const countdownController = new CountdownController(getCountdownUseCase);
        const musicController = new MusicController(toggleMusicUseCase);
        const galleryController = new GalleryController();
        const interactiveController = new InteractiveController();
        const timelineController = new TimelineController();
        const catRenderer = new CatRenderer();
        const chibiCatsRenderer = new ChibiCatsRenderer();
        const letterTypewriter = new LetterTypewriterController();
        const micBlowController = new MicBlowController();

        // TimeLock: khoá các section Gallery, Wishes, Letter, Send Love trước ngày 30/6
        const timeLockController = new TimeLockController(timeLockRule, [
            'faves',      // Những Điều Mi Thích
            'gallery',    // Kỷ Niệm Đẹp
            'wishes',     // Lời Chúc Từ Trái Tim
            'timeline',   // Her Story — Hành Trình Của Mi
            'letter',     // Tâm Thư
            'send-love',   // Gửi Yêu Thương
            'about'
        ]);

        // 5. Mount / Khởi chạy
        timeLockController.init(); // Phải chạy trước để khoá trước khi các controller khác khởi động
        layoutController.init();
        countdownController.init();
        musicController.init();
        galleryController.init();
        interactiveController.init();
        timelineController.init();
        letterTypewriter.init();
        micBlowController.init();

        // Khởi động renderers / background
        try {
            threeJsService.init();
        } catch (e) {
            console.warn('ThreeJS fallback failed', e);
        }

        try {
            catRenderer.init();
        } catch (e) {
            console.warn('CatRenderer fallback failed', e);
        }

        try {
            chibiCatsRenderer.init();
        } catch (e) {
            console.warn('ChibiCatsRenderer fallback failed', e);
        }
    }
};
