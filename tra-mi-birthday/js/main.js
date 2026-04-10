import { container } from './infrastructure/di/container.js';

/**
 * Entry point của ứng dụng
 */
document.addEventListener('DOMContentLoaded', () => {
    container.init();
});
