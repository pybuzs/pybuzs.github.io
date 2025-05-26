// 完整Raindrop类定义（含所有方法）
class Raindrop {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drops = [];
    this.lastFrameTime = 0;
    this.isAnimating = false;
    this.options = {
      density: 100,
      baseSpeed: 5,
      speedVariation: 3,
      baseLength: 20,
      lengthVariation: 15,
      baseWidth: 1,
      widthVariation: 0.5,
      color: 'rgba(180, 200, 255, 0.7)',
      wind: 0,
      gravity: 1,
      perspective: false,
      spawnInterval: 50,
      trailEffect: false,
      ...options
    };
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.isAnimating = false;
    } else if (!this.isAnimating) {
      this.isAnimating = true;
      this.startAnimation();
    }
  }

  createDrop() {
    return {
      x: Math.random() * this.canvas.width, // 随机水平位置
      y: -this.options.baseLength - Math.random() * 100, // 顶部随机起始位置
      speed: this.options.baseSpeed + Math.random() * this.options.speedVariation, // 随机速度
      length: this.options.baseLength + Math.random() * this.options.lengthVariation, // 随机长度
      width: this.options.baseWidth + Math.random() * this.options.widthVariation, // 随机宽度
      opacity: Math.random() * 0.5 + 0.5, // 随机透明度（0.5-1.0）
      sway: Math.random() * 0.2 - 0.1, // 摇摆幅度（-0.1到0.1）
      phase: Math.random() * Math.PI * 2 // 摇摆相位（0-2π）
    };
  }

  updateAndDraw(timestamp) {
    const deltaTime = timestamp - this.lastFrameTime; // 计算帧间隔
    this.lastFrameTime = timestamp;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // 清空画布

    // 生成新雨滴（控制密度）
    if (timestamp - this.lastSpawnTime > this.options.spawnInterval) {
      const neededDrops = this.options.density - this.drops.length;
      const dropsToAdd = Math.min(5, neededDrops); // 每次最多添加5滴
      for (let i = 0; i < dropsToAdd; i++) {
        this.drops.push(this.createDrop());
      }
      this.lastSpawnTime = timestamp; // 更新生成时间戳
    }

    // 遍历所有雨滴，更新物理状态并绘制
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];

      // 物理更新：垂直下落（速度+重力）、水平摇摆（风力+正弦运动）
      drop.y += drop.speed * (deltaTime / 16); // 基于16ms帧率的速度调整（模拟60fps）
      drop.x += this.options.wind + Math.sin(drop.phase + timestamp * 0.001) * drop.sway; // 水平偏移（风力+摇摆）
      drop.speed += this.options.gravity * (deltaTime / 16); // 重力加速度

      // 绘制雨滴
      this.ctx.beginPath();
      if (this.options.perspective) { // 透视效果：近大远小（基于垂直位置缩放）
        const scale = 1 - drop.y / (this.canvas.height * 1.5); // 缩放因子（0-1）
        this.ctx.moveTo(drop.x, drop.y);
        this.ctx.lineTo(drop.x, drop.y + drop.length * scale); // 长度缩放
        this.ctx.lineWidth = drop.width * scale; // 宽度缩放
      } else { // 无透视，固定长度和宽度
        this.ctx.moveTo(drop.x, drop.y);
        this.ctx.lineTo(drop.x, drop.y + drop.length);
        this.ctx.lineWidth = drop.width;
      }

      // 拖尾效果：根据垂直位置调整透明度（底部更透明，模拟拖尾）
      if (this.options.trailEffect) {
        const alpha = 0.2 + (drop.y / this.canvas.height) * 0.6; // 透明度0.2-0.8
        this.ctx.strokeStyle = this.options.color.replace('0.7', alpha.toString()); // 替换颜色透明度
      } else {
        this.ctx.strokeStyle = this.options.color; // 固定颜色
      }

      this.ctx.stroke(); // 绘制雨滴线条

      // 移除超出画布的雨滴（垂直超出、水平超出±50px）
      if (drop.y > this.canvas.height + drop.length || 
          drop.x < -50 || 
          drop.x > this.canvas.width + 50) {
        this.drops.splice(i, 1); // 从数组中移除
      }
    }

    // 继续动画循环（若仍在动画中）
    if (this.isAnimating) {
      requestAnimationFrame(this.updateAndDraw.bind(this));
    }
  }

  startAnimation() {
    this.isAnimating = true;
    this.lastFrameTime = performance.now(); // 初始化时间戳
    this.lastSpawnTime = this.lastFrameTime; // 初始化生成时间戳
    requestAnimationFrame(this.updateAndDraw.bind(this)); // 启动动画循环
  }

  stopAnimation() {
    this.isAnimating = false; // 停止动画标志
  }

  destroy() {
    this.stopAnimation(); // 停止动画
    window.removeEventListener('resize', this.resize); // 移除事件监听
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.canvas.remove(); // 移除Canvas元素
  }
}

// 智能初始化逻辑（适配移动端、动态主题颜色、风力变化）
const initRaindrop = () => {
  if (window.rainEffect) window.rainEffect.destroy(); // 销毁已有实例（避免重复）

  const canvas = document.createElement('canvas');
  canvas.id = 'raindrop-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1; // 层级低于页面内容
    pointer-events: none; // 不响应鼠标事件
  `;
  document.body.appendChild(canvas);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent); // 检测移动端

  window.rainEffect = new Raindrop(canvas, {
    density: isMobile ? 40 : 80, // 移动端减少雨滴密度
    baseSpeed: isMobile ? 3 : 4.5, // 移动端降低速度
    speedVariation: isMobile ? 1 : 2, // 移动端减少速度变化
    perspective: !isMobile, // 桌面端启用透视，移动端简化（提升性能）
    trailEffect: !isMobile, // 桌面端启用拖尾，移动端简化
    color: `rgba(${getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color-rgb')}, 0.6)`, // 动态获取主题颜色
    wind: Math.random() * 1.5 - 0.75 // 随机初始风力（-0.75到0.75）
  });

  // 动态风力效果：每5秒随机更新目标风力，平滑过渡
  let windTarget = 0;
  setInterval(() => {
    windTarget = Math.random() * 2 - 1; // 目标风力（-1到1）
  }, 5000);

  const updateWind = () => {
    const delta = windTarget - window.rainEffect.options.wind;
    window.rainEffect.options.wind += delta * 0.05; // 平滑过渡（每次更新5%）
    requestAnimationFrame(updateWind); // 持续更新
  };
  updateWind();
};

// 页面加载后初始化（尊重用户的减少运动偏好）
document.addEventListener('DOMContentLoaded', () => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initRaindrop(); // 初始化雨滴水效果
  }
});

// 页面可见性变化时暂停/恢复动画（性能优化）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.rainEffect?.stopAnimation(); // 页面不可见时停止
  } else {
    window.rainEffect?.startAnimation(); // 页面可见时恢复
  }
});