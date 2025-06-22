class PanZoom {
  constructor(wrapper, container, options = {}) {
    this.wrapper = wrapper;
    this.container = container;
    this.options = options;
    this.offset = { x: 0, y: 0 };
    this.scale = 1;
    this.isDown = false;
    this.didPan = false;
    this.prevPos = { x: 0, y: 0 };
    this.prevPinchDist = null;
    this.onUpCallback = options.onUp || null;
    this.onUpdateCallback = options.onUpdate || null;
    this.bindEvents();
    this.wrapper.style.cursor = 'grab';
  }

  reset() {
    if (this.wrapper.clientWidth === 0) {
      this.options.retryCount = (this.options.retryCount || 0) + 1;
      if (this.options.retryCount < 20) {
        requestAnimationFrame(() => this.reset());
      } else {
        console.error("PanZoom reset failed: Wrapper has no dimensions.");
      }
      return;
    }
    delete this.options.retryCount;

    this.initialScale = 1;
    this.initialOffset = { x: 0, y: 0 };
    if (this.options.fit) {
      const wW = this.wrapper.clientWidth;
      const wH = this.wrapper.clientHeight;
      const cW = this.container.scrollWidth;
      const cH = this.container.scrollHeight;
      if (cW > 0 && cH > 0) {
        this.initialScale = Math.min(wW / cW, wH / cH);
        const oXP = (wW - (cW * this.initialScale)) / 2;
        const oYP = (wH - (cH * this.initialScale)) / 2;
        this.initialOffset.x = oXP / this.initialScale;
        this.initialOffset.y = oYP / this.initialScale;
      }
    }
    this.scale = this.initialScale;
    this.offset = { ...this.initialOffset };
    this.minScale = this.initialScale;
    this.maxScale = this.initialScale * (this.options.maxZoom || 4);
    this.updateTransform();
  }
  updateTransform() {
    const wW = this.wrapper.clientWidth;
    const wH = this.wrapper.clientHeight;
    const cW = this.container.scrollWidth;
    const cH = this.container.scrollHeight;
    const mX = Math.max(0, cW * this.scale - wW);
    const mY = Math.max(0, cH * this.scale - wH);
    const oX = mX / this.scale;
    const oY = mY / this.scale;
    this.offset.x = Math.max(-oX, Math.min(0, this.offset.x));
    this.offset.y = Math.max(-oY, Math.min(0, this.offset.y));
    this.container.style.transform = `scale(${this.scale}) translate(${this.offset.x}px, ${this.offset.y}px)`;

    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }
  bindEvents() {
    this.wrapper.addEventListener('mousedown', this.handleStart.bind(this));
    window.addEventListener('mousemove', this.handleMove.bind(this));
    window.addEventListener('mouseup', this.handleEnd.bind(this));
    this.wrapper.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
    this.wrapper.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.handleEnd.bind(this));
    this.wrapper.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
  }
  handleStart(e) {
    this.isDown = true;
    this.didPan = false;
    const point = e.touches ? e.touches[0] : e;
    this.prevPos = { x: point.clientX, y: point.clientY };
    this.wrapper.classList.add('grabbing');
    if (e.touches && e.touches.length === 2) {
      this.prevPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }
  handleMove(e) {
    if (!this.isDown) return;
    if (e.touches) e.preventDefault();

    if (e.touches && e.touches.length === 2 && this.prevPinchDist) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scaleChange = dist / this.prevPinchDist;
      const oldScale = this.scale;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, oldScale * scaleChange));

      const rect = this.wrapper.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      this.offset.x += (midX / this.scale) - (midX / oldScale);
      this.offset.y += (midY / this.scale) - (midY / oldScale);

      this.prevPinchDist = dist;
    } else {
      const point = e.touches ? e.touches[0] : e;
      this.didPan = true;
      this.offset.x += (point.clientX - this.prevPos.x) / this.scale;
      this.offset.y += (point.clientY - this.prevPos.y) / this.scale;
      this.prevPos = { x: point.clientX, y: point.clientY };
    }
    this.updateTransform();
  }
  handleEnd(e) {
    if (!this.isDown) return;
    this.isDown = false;
    this.wrapper.classList.remove('grabbing');
    this.prevPinchDist = null;
    if (!this.didPan && this.onUpCallback) {
      const point = e.changedTouches ? e.changedTouches[0] : e;
      this.onUpCallback(point);
    }
  }
  handleWheel(e) {
    e.preventDefault();
    const oldScale = this.scale;
    const scaleDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + scaleDelta * this.initialScale));
    if (oldScale === newScale) return;

    const rect = this.wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pointX = (mouseX / oldScale) - this.offset.x;
    const pointY = (mouseY / oldScale) - this.offset.y;

    this.offset.x = (mouseX / newScale) - pointX;
    this.offset.y = (mouseY / newScale) - pointY;

    this.scale = newScale;
    this.updateTransform();
  }
}