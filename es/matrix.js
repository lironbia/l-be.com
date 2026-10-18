// Green letters falling down a dark panel, behind the call to action of the consulting section on
// the home page: the same rain as the "matrix" backdrop of the 404 game. Decoration only. It runs
// while the panel is on screen, and stands still in calm mode and when the visitor asked for
// reduced motion.
(() => {
  const canvas = document.querySelector("canvas[data-matrix]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const GLYPHS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789{}<>/=+";
  // What the rain spells: the business, and lines about automation (the same ones that drift across the 404 game)
  const RAIN = [
    "L-Be", "Liron Bialkovich", "Implementación de CRM", "Sistemas de IA para empresas", "Agentes de IA", "Automatización empresarial", "Integraciones", "Especificación de sistemas", "Consultoría para empresas", "Hands On",
    "Lo que se repite, es cosa de la automatización",
    "La automatización no se va de vacaciones",
    "Menos teclear, más negocio",
    "Un lead sin respuesta rápida se enfría",
    "Un proceso ordenado vale otro par de manos",
    "Un buen bot responde también a las dos de la madrugada",
    "Este formulario podría rellenarse solo",
    "El mejor momento para automatizar fue ayer",
  ];
  const LONGEST = Math.max(...RAIN.map((text) => text.length));
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
    if (seen) paint(); // nothing is drawn while the panel is off screen, so page load stays light
  }
  function paint() {
    ctx.fillStyle = "#04140b";
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px "IBM Plex Mono", Consolas, monospace';
    ctx.textAlign = "center";
    const span = H + LONGEST * ROW + 60;
    for (let column = 0; column * STEP < W + STEP; column++) {
      const fall = 26 + rand(column) * 44; // pixels a second
      const way = clock * fall + rand(column + 50) * span;
      const head = (way % span) - 30;
      // every second column carries real words, read from the top down; the others carry loose glyphs
      const words = column % 2 === 0 ? RAIN[(column * 7 + Math.floor(way / span) * 3) % RAIN.length] : "";
      const rows = words ? words.length : TRAIL;
      for (let row = 0; row < rows; row++) {
        const y = head - row * ROW;
        if (y < -10 || y > H + 10) continue;
        ctx.fillStyle = row === 0 ? "#d5ffe6" : "#35d07f";
        ctx.globalAlpha = row === 0 ? 0.95 : words ? 0.8 : Math.max(0.08, 0.5 - row * 0.035);
        ctx.fillText(words ? words[rows - 1 - row] : GLYPHS[Math.floor(rand(column * 31 + row * 7 + Math.floor(clock * 3 + column)) * GLYPHS.length)], column * STEP + 9, y);
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
      if (seen && !running && W > 0) paint(); // calm mode: one still frame
    }).observe(canvas);
  } else {
    seen = true;
  }
  const onResize = () => {
    resize();
    update();
  };
  // the panel changes size with the layout, not only with the window
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(canvas);
  else addEventListener("resize", onResize);
  addEventListener("a11y-change", update);
  document.addEventListener("visibilitychange", update);
  if (motion.addEventListener) motion.addEventListener("change", update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !running && seen && W > 0 && paint());
  resize();
  update();
})();
