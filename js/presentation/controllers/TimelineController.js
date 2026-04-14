/**
 * Presentation Layer: Quản lý giao diện Timeline 3D Coverflow
 */
export class TimelineController {
    init() {
        // Khởi tạo Swiper 3D khi thư viện đã sẵn sàng
        if (typeof Swiper !== 'undefined') {
            const timelineSwiper = document.querySelector('.timeline-swiper');
            if (!timelineSwiper) return;

            this.swiper = new Swiper('.timeline-swiper', {
                effect: 'coverflow',
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: 'auto',
                coverflowEffect: {
                    rotate: 35, // Độ xoay của thẻ 3D
                    stretch: 0, 
                    depth: 180, // Độ sâu 3D
                    modifier: 1,
                    slideShadows: false,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                initialSlide: 1, // Để ảnh đầu tiên nằm giữa là phần Thanh Xuân
                keyboard: {
                    enabled: true,
                }
            });
        }
    }
}
