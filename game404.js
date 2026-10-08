// 404 page: a tiny jumping game. A cube runs along the line (right to left, like the text) and
// jumps over bugs. One button does everything: start, jump, play again. Escape stops the game.
(() => {
  const canvas = document.getElementById("game");
  const button = document.getElementById("game-button");
  if (!canvas || !button) return;
  const ctx = canvas.getContext("2d");
  const scoreOut = document.getElementById("game-score");
  const bestOut = document.getElementById("game-best");
  const live = document.getElementById("game-live");
  const KEY = "lbe-404-best";

  let best = 0;
  try {
    best = Number(localStorage.getItem(KEY)) || 0;
  } catch (err) {
    best = 0;
  }
  const showBest = () => {
    bestOut.textContent = Math.floor(best).toLocaleString("en-US");
  };
  showBest();

  // Colours come from the page, so the game follows the site's palette and contrast mode.
  let color = {};
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const get = (name) => css.getPropertyValue(name).trim();
    color = { ink: get("--ink"), soft: get("--ink-soft"), top: get("--sky-1"), left: get("--sky-2"), right: get("--sky-3"), bugTop: get("--coral-1"), bug: get("--coral-2"), bugSide: get("--coral-3") };
  }
  readColors();
  addEventListener("a11y-change", () => {
    readColors();
    if (state !== "run") draw();
  });

  let W = 0, H = 0, ground = 0;
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ground = H - 34;
    if (state !== "run") draw();
  }

  const SIZE = 30;
  let state = "idle"; // idle | run | over
  let player, bugs, speed, score, nextBug, last, lastAct = 0;
  function reset() {
    player = { y: 0, vy: 0 }; // y: height above the ground
    bugs = [];
    speed = 5.2;
    score = 0;
    nextBug = 60;
  }
  reset();

  function box(x, y, w, h, top, front, side) {
    const d = 7; // depth of the block, drawn up and to the left
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = color.ink;
    ctx.fillStyle = front;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - d, y - d); ctx.lineTo(x + w - d, y - d); ctx.lineTo(x + w, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - d, y - d); ctx.lineTo(x - d, y + h - d); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, ground + 0.75); ctx.lineTo(W, ground + 0.75);
    ctx.stroke();
    for (const bug of bugs) box(bug.x, ground - bug.h, bug.w, bug.h, color.bugTop, color.bug, color.bugSide);
    box(W - 96, ground - SIZE - player.y, SIZE, SIZE, color.top, color.left, color.right);
    if (state !== "run") {
      ctx.fillStyle = color.ink;
      ctx.font = '600 16px "IBM Plex Sans Hebrew", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(state === "over" ? "נתקעת בבאג. עוד סיבוב?" : "רווח, חץ למעלה או נגיעה כדי להתחיל", W / 2, 34);
    }
  }

  function step(now) {
    if (state !== "run") return;
    const dt = Math.min((now - last) / 16.67, 2.5);
    last = now;
    speed = Math.min(speed + 0.0018 * dt, 12);
    score += speed * dt * 0.1;
    player.vy -= 0.62 * dt;
    player.y = Math.max(player.y + player.vy * dt, 0);
    if (player.y === 0) player.vy = 0;
    nextBug -= speed * dt;
    if (nextBug <= 0) {
      const tall = Math.random() < 0.3;
      bugs.push({ x: -40, w: tall ? 18 : 22 + Math.random() * 16, h: tall ? 44 : 22 + Math.random() * 10 });
      nextBug = 230 + Math.random() * 260 + speed * 14;
    }
    const px = W - 96;
    for (const bug of bugs) {
      bug.x += speed * dt;
      const hitX = bug.x + bug.w > px + 5 && bug.x < px + SIZE - 5;
      if (hitX && player.y < bug.h - 4) return end();
    }
    bugs = bugs.filter((bug) => bug.x < W + 20);
    scoreOut.textContent = Math.floor(score).toLocaleString("en-US");
    draw();
    requestAnimationFrame(step);
  }
  function start() {
    reset();
    state = "run";
    button.textContent = "קפיצה";
    live.textContent = "המשחק התחיל.";
    last = performance.now();
    requestAnimationFrame(step);
  }
  function end() {
    state = "over";
    button.textContent = "עוד סיבוב";
    const final = Math.floor(score);
    if (final > best) {
      best = final;
      try {
        localStorage.setItem(KEY, String(best));
      } catch (err) {
        /* private mode: the record lasts for this page only */
      }
      showBest();
    }
    live.textContent = "המשחק נגמר. הניקוד: " + final.toLocaleString("en-US") + ".";
    draw();
  }
  function stop() {
    if (state !== "run") return;
    state = "idle";
    button.textContent = "התחלת משחק";
    live.textContent = "המשחק נעצר.";
    reset();
    scoreOut.textContent = "0";
    draw();
  }
  function act() {
    const now = performance.now();
    if (now - lastAct < 120) return; // one press, one action
    lastAct = now;
    if (state !== "run") start();
    else if (player.y === 0) player.vy = 11.2;
  }

  button.addEventListener("click", act);
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    act();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return stop();
    if (event.code !== "Space" && event.key !== "ArrowUp") return;
    // Only when nothing else is focused, so Space still works on links and form fields.
    const el = document.activeElement;
    if (el && el !== document.body && el !== button && el !== canvas) return;
    event.preventDefault();
    act();
  });
  addEventListener("resize", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => state !== "run" && draw());
  resize();
})();
