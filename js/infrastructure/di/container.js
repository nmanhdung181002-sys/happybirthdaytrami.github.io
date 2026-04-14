import { TimeCalculator } from '../../domain/rules/TimeCalculator.js';
import { GetCountdownUseCase } from '../../application/use-cases/GetCountdownUseCase.js';
import { ToggleMusicUseCase } from '../../application/use-cases/ToggleMusicUseCase.js';

import { BrowserAudioService } from '../services/BrowserAudioService.js';
import { ThreeJsService } from '../services/ThreeJsService.js';

import { CountdownController } from '../../presentation/controllers/CountdownController.js';
import { MusicController } from '../../presentation/controllers/MusicController.js';
import { LayoutController } from '../../presentation/controllers/LayoutController.js';
import { GalleryController } from '../../presentation/controllers/GalleryController.js';
import { InteractiveController } from '../../presentation/controllers/InteractiveController.js';
import { CatRenderer } from '../../presentation/renderers/CatRenderer.js';
import { ChibiCatsRenderer } from '../../presentation/renderers/ChibiCatsRenderer.js';

/**
 * Infrastructure Layer: Dependency Injection Container
 * Cung cấp một điểm duy nhất để wire các interface, use case và controllers lại với nhau.
 * Ngăn chặn dependency hell và tuân thủ chặt chẽ Clean Architecture.
 */
export const container = {
    init: () => {
        // 1. Khởi tạo Infrastructure Services (Adapters)
        const audioService = new BrowserAudioService('bg-music');
        const threeJsService = new ThreeJsService();

        // 2. Khởi tạo Application Use Cases, inject qua Constructor
        const getCountdownUseCase = new GetCountdownUseCase(5, 30); // Tháng 6 là 5 (0-indexed), Ngày 30
        const toggleMusicUseCase = new ToggleMusicUseCase(audioService);

        // 3. Khởi tạo Presentation Controllers, inject Use Cases
        const layoutController = new LayoutController();
        const countdownController = new CountdownController(getCountdownUseCase);
        const musicController = new MusicController(toggleMusicUseCase);
        const galleryController = new GalleryController();
        const interactiveController = new InteractiveController();
        const catRenderer = new CatRenderer();
        const chibiCatsRenderer = new ChibiCatsRenderer();

        // 4. Mount / Khởi chạy
        layoutController.init();
        countdownController.init();
        musicController.init();
        galleryController.init();
        interactiveController.init();
        
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
