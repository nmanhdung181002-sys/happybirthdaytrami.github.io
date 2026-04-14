export class Cake3DManager {
  constructor(scene) {
    this.scene = scene;
    this.cakeGroup = new window.THREE.Group();
    this.candles = [];
    this.initCake();
  }

  // Tiện ích tạo Texture canvas để viết chữ
  createDecalTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Nền tag màu tím xám pastel nhạt trong vắt giống hình
    ctx.fillStyle = '#9FA8DA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Viền trắng
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Chữ
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✨ ${text} ✨`, canvas.width / 2, canvas.height / 2 + 5);
    
    const texture = new window.THREE.CanvasTexture(canvas);
    return texture;
  }

  initCake() {
    const THREE = window.THREE;
    
    // -- CONFIG MÀU SẮC DỄ THƯƠNG (GIỐNG MOODBOARD ẢNH) --
    // Hình mẫu: Thân dưới trắng/hồng cực mịn, Top kem hồng dâu, Nến hồng.
    const COLOR_BODY = 0xFFECEF; 
    const COLOR_TOP = 0xD05D7C;  
    const COLOR_CANDLE = 0xD05D7C; 
    const COLOR_FLAME = 0xFFC107; 
    const COLOR_BASE = 0xF5F0E6; 

    // Bánh dẹt bề ngang rộng y hệt SVG
    const baseRadius = 6.5; 
    const baseHeight = 3.5; 
    
    let currentY = -12; 
    
    // 1. Đĩa lót đáy bánh 
    const plateGeo = new THREE.CylinderGeometry(baseRadius + 0.8, baseRadius + 1.2, 0.4, 64);
    const plateMat = new THREE.MeshStandardMaterial({ color: COLOR_BASE, roughness: 0.9 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = currentY - baseHeight/2 - 0.2;
    this.cakeGroup.add(plate);

    // 2. Thân bánh chính (Body)
    const bodyGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 64);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: COLOR_BODY, roughness: 1.0, metalness: 0.0
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = currentY;
    this.cakeGroup.add(bodyMesh);

    // Đường kem nhỏ viền xung quanh đáy
    for(let i=0; i<32; i++) {
        const MathAngle = (i/32) * Math.PI * 2;
        const puffGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const puffMat = new THREE.MeshStandardMaterial({ color: 0xFFFAFA, roughness: 0.8 });
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(Math.cos(MathAngle)*(baseRadius+0.1), currentY - baseHeight/2 + 0.2, Math.sin(MathAngle)*(baseRadius+0.1));
        puff.scale.y = 0.6; // Hơi dẹt
        this.cakeGroup.add(puff);
    }

    // 3. Lớp sơn kem đỉnh (Top Frosting / Drip)
    const topHeight = 0.8;
    const topGeo = new THREE.CylinderGeometry(baseRadius + 0.05, baseRadius + 0.05, topHeight, 64);
    const topMat = new THREE.MeshStandardMaterial({ 
      color: COLOR_TOP, roughness: 0.5, metalness: 0.0 
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = currentY + baseHeight/2 - topHeight/2;
    this.cakeGroup.add(topMesh);

    // Nhọt kem rơi (Drips)
    for(let i=0; i<18; i++) {
        if(Math.random() < 0.4) continue; // Phân bổ ngẫu nhiên
        const MathAngle = (i/18) * Math.PI * 2;
        const dripLen = 0.5 + Math.random() * 1.5;
        const dripGeo = new THREE.CapsuleGeometry(0.25, dripLen, 12, 12);
        const drip = new THREE.Mesh(dripGeo, topMat);
        drip.position.set(
            Math.cos(MathAngle)*(baseRadius + 0.05),
            currentY + baseHeight/2 - topHeight - dripLen/2 + 0.2,
            Math.sin(MathAngle)*(baseRadius + 0.05)
        );
        this.cakeGroup.add(drip);
    }

    // 4. Bảng dán Happy Birthday (PlaneGeometry map CanvasTexture)
    const tagWidth = 6.0;
    const tagHeight = 1.5;
    const tagGeo = new THREE.PlaneGeometry(tagWidth, tagHeight);
    const tagMat = new THREE.MeshBasicMaterial({ 
       map: this.createDecalTexture("Happy Birthday"),
       transparent: true,
       depthWrite: false
    });
    const tagMesh = new THREE.Mesh(tagGeo, tagMat);
    // Tính bán kính vòm để bo theo bánh mặt trước
    tagMesh.position.set(0, currentY + baseHeight/2 - topHeight/2, baseRadius + 0.1);
    this.cakeGroup.add(tagMesh);

    // 5. Ba cọng nến thon dài (3 Candles like in the picture)
    const candlePositions = [-2.2, 0, 2.2]; // Cắm 3 nến song song
    
    candlePositions.forEach(cx => {
        // Cây nến
        const candleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 16);
        const candleMat = new THREE.MeshStandardMaterial({ color: COLOR_CANDLE, roughness: 0.7 });
        const candle = new THREE.Mesh(candleGeo, candleMat);
        const cy = currentY + baseHeight/2 + 2.0/2;
        candle.position.set(cx, cy, 0);
        
        // Bấc nến xoắn bé tí
        const wickGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        const wickMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const wick = new THREE.Mesh(wickGeo, wickMat);
        wick.position.set(cx, cy + 2.0/2 + 0.1, 0);

        // Ngọn lửa bầu bĩnh ảo mộng
        const flameGeo = new THREE.ConeGeometry(0.18, 0.5, 16);
        const flameMat = new THREE.MeshBasicMaterial({ 
            color: COLOR_FLAME, transparent: true, opacity: 0.9 
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(cx, wick.position.y + 0.25, 0);
        
        // Vòng sáng hào quang (Halo Glow Additive Blending)
        const haloGeo = new THREE.SphereGeometry(0.6, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xFFB300, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        flame.add(halo);

        // Đèn chiếu toả sáng từ nến
        const light = new THREE.PointLight(0xFFCF54, 0.8, 30);
        light.position.set(cx, flame.position.y + 0.5, 1.0);
        
        this.cakeGroup.add(candle);
        this.cakeGroup.add(wick);
        this.cakeGroup.add(flame);
        this.cakeGroup.add(light);
        
        this.candles.push({ flame, light, halo });
    });
    
    // Kích thước chuẩn không cần scale do bán kính baseRadius = 6.5
    this.cakeGroup.scale.setScalar(1.5);
    
    // Nghiêng nhẹ mặt bánh xuống camera
    this.cakeGroup.rotation.x = 0.12;
    this.cakeGroup.position.set(0, -6, -25);
    
    this.scene.add(this.cakeGroup);
  }

  update(time) {
    // flicker nháy sáng ngọn nến tự nhiên (Candle Flicker)
    this.candles.forEach((c, idx) => {
      // Noise kết hợp index để 3 ngọn nhấp nháy khác nhịp
      const flicker = 1 + Math.sin(time * 20 + idx) * 0.05 + Math.random() * 0.05;
      c.light.intensity = 0.8 * flicker;
      c.flame.scale.setScalar(flicker);
      c.flame.rotation.y = time * 2;
      // Halo pulse
      const haloScale = 1 + Math.sin(time * 8 + idx) * 0.1;
      c.halo.scale.setScalar(haloScale);
    });
    
    // Đung đưa lềnh bềnh (không xoay vòng lố, chịn chu lượn qua lượn lại)
    this.cakeGroup.rotation.y = Math.sin(time * 0.5) * 0.3; 
    this.cakeGroup.position.y = -6 + Math.sin(time * 1.5) * 0.4;
  }
}
