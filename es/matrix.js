// Green letters falling down a dark panel, beside the consulting section on the home page: the
// same rain as the "matrix" backdrop of the 404 game. Decoration only. It runs while the panel is
// on screen, and stands still in calm mode and when the visitor asked for reduced motion.
(() => {
  const canvas = document.querySelector("canvas[data-matrix]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const GLYPHS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789{}<>/=+";
  const STEP = 18, ROW = 16, TRAIL = 14;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => motion.matches || document.documentElement.classList.contains("a11y-calm");
  const rand = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let W = 0, H = 0, clock = 7, last = 0, seen = false, running = false;
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint();
  }
  function paint() {
    ctx.fillStyle = "#04140b";
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px "IBM Plex Mono", Consolas, monospace';
    ctx.textAlign = "center";
    const span = H + TRAIL * ROW + 60;
    for (let column = 0; column * STEP < W + STEP; column++) {
      // two streams in every column, each at its own pace
      for (let stream = 0; stream < 2; stream++) {
        const seed = column + stream * 97;
        const fall = 26 + rand(seed) * 44; // pixels a second
        const head = ((clock * fall + rand(seed + 50) * span) % span) - 30;
        for (let row = 0; row < TRAIL; row++) {
          const y = head - row * ROW;
          if (y < -10 || y > H + 10) continue;
          ctx.fillStyle = row === 0 ? "#d5ffe6" : "#35d07f";
          ctx.globalAlpha = row === 0 ? 0.95 : Math.max(0.08, 0.7 - row * 0.05);
          ctx.fillText(GLYPHS[Math.floor(rand(seed * 31 + row * 7 + Math.floor(clock * 3 + column)) * GLYPHS.length)], column * STEP + 9, y);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function frame(time) {
    if (!running) return;
    clock += Math.min((time - last) / 1000, 0.1);
    last = time;
    paint();
    requestAnimationFrame(frame);
  }
  function update() {
    const should = seen && !document.hidden && !calm() && W > 0;
    if (should === running) return;
    running = should;
    if (running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      seen = entries[0].isIntersecting;
      update();
    }).observe(canvas);
  } else {
    seen = true;
  }
  addEventListener("resize", () => {
    resize();
    update();
  });
  addEventListener("a11y-change", update);
  document.addEventListener("visibilitychange", update);
  if (motion.addEventListener) motion.addEventListener("change", update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !running && W > 0 && paint());
  resize();
  update();
})();
