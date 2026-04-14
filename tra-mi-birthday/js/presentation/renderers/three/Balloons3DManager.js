export class Balloons3DManager {
  constructor(scene, count = 20) {
    this.scene = scene;
    this.count = count;
    this.dummy = new window.THREE.Object3D();
    this.stringDummy = new window.THREE.Object3D();
    this.balloonsData = [];
    this.initBalloons();
  }

  initBalloons() {
    const THREE = window.THREE;
    
    // Geometry: Hình cầu được scale trục Y để giống bong bóng
    const geo = new THREE.SphereGeometry(1, 24, 24);
    geo.translate(0, 0.5, 0); // Kéo center xuống ngòi để khi lắc nó lắc quanh gốc
    geo.scale(1, 1.25, 1);
    
    // Material: Bề mặt cao su trơn bóng (Roughness thấp, metalness vừa)
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.15, 
      metalness: 0.35,
      transparent: true,
      opacity: 0.88
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.count);
    
    // String Geometry: Dây bóng bay
    const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 4, 8);
    // Đẩy dây dịch xuống bằng bán kính Cylinder (tâm Y sẽ sát lên mép trên) 
    stringGeo.translate(0, -2, 0);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 });
    this.stringInstancedMesh = new THREE.InstancedMesh(stringGeo, stringMat, this.count);
    
    // Bảng màu kẹo sặc sỡ, đủ 7 sắc cầu vồng
    const colors = [0xE8507A, 0x00E5FF, 0x8A2BE2, 0x6BA3D4, 0xFFE600, 0x5CB89E, 0xFF3366, 0x00FA9A, 0xFF6347];
    const colorObj = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
       // Phát tán ngẫu nhiên hình học trụ xung quanh tâm
       const radius = 10 + Math.random() * 50;
       const angle = Math.random() * Math.PI * 2;
       
       const x = Math.cos(angle) * radius;
       const z = -15 - Math.sin(angle) * 35;
       const y = -40 - Math.random() * 80; // Bắt đầu sâu dưới cảnh để bay dần lên
       
       const s = 1.5 + Math.random() * 1.5; // Kích thước

       this.dummy.position.set(x, y, z);
       this.dummy.scale.set(s, s, s);
       this.dummy.updateMatrix();
       this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
       
       colorObj.setHex(colors[Math.floor(Math.random() * colors.length)]);
       this.instancedMesh.setColorAt(i, colorObj);
       
       // Dây bay cũng random màu đôi chút (nhờ vào Color)
       this.stringInstancedMesh.setColorAt(i, new THREE.Color(0xffffff));

       this.balloonsData.push({
         originX: x, originY: y, originZ: z,
         x, y, z, s,
         phaseX: Math.random() * Math.PI*2,
         phaseY: Math.random() * Math.PI*2,
         oscSpeedX: 0.3 + Math.random() * 0.5,
         floatUpSpeed: 0.04 + Math.random() * 0.08,
         wiggleSpeed: 2 + Math.random() * 2
       });
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate = true;
    this.stringInstancedMesh.instanceMatrix.needsUpdate = true;
    
    this.scene.add(this.instancedMesh);
    this.scene.add(this.stringInstancedMesh);
  }

  update(time) {
    for (let i = 0; i < this.count; i++) {
       const d = this.balloonsData[i];
       
       // Trôi lên liên tục
       d.y += d.floatUpSpeed;
       
       // Đung đưa lắc hình chóp
       const offsetX = Math.sin(time * d.oscSpeedX + d.phaseX) * 2;
       const wiggleZ = Math.cos(time * d.wiggleSpeed + d.phaseY) * 0.15;
       const wiggleX = Math.sin(time * d.wiggleSpeed + d.phaseX) * 0.15;
       
       // Loop bay lại từ đáy nếu vượt trần
       if (d.y > 60) {
          d.y = -50 - Math.random() * 20;
          d.x = d.originX + (Math.random() - 0.5) * 10;
       }

       this.dummy.position.set(d.x + offsetX, d.y, d.z);
       this.dummy.scale.set(d.s, d.s, d.s);
       // Bóng lắc nghiêng nhẹ khi bay
       this.dummy.rotation.set(wiggleZ, 0, -wiggleX);
       this.dummy.updateMatrix();
       this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

       // Dây di chuyển ăn theo dummy, lắc nhẹ thân dây ngược hướng phần bóng một chút để có tính uyển chuyển  
       this.stringDummy.position.set(d.x + offsetX, d.y - d.s/2, d.z); // Start near bottom node
       this.stringDummy.scale.set(1, d.s, 1);
       this.stringDummy.rotation.set(wiggleZ * 1.5, 0, -wiggleX * 1.5);
       this.stringDummy.updateMatrix();
       this.stringInstancedMesh.setMatrixAt(i, this.stringDummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.stringInstancedMesh.instanceMatrix.needsUpdate = true;
  }
}
