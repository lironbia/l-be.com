// 404 page: a small jumping game. A cube runs along the line (right to left, like the text).
// On the ground come bugs of three shapes (block, ball, spike): jump over them. In the air come
// flying bars: stay on the ground and they pass overhead. The world speeds up every 10 seconds,
// the background moves in layers, and now and then a line about automation drifts by.
// One button does everything: start, jump, play again. Escape stops the game.
(() => {
  const canvas = document.getElementById("game");
  const button = document.getElementById("game-button");
  if (!canvas || !button) return;
  const ctx = canvas.getContext("2d");
  const scoreOut = document.getElementById("game-score");
  const levelOut = document.getElementById("game-level");
  const bestOut = document.getElementById("game-best");
  const live = document.getElementById("game-live");
  const KEY = "lbe-404-best";

  const LINES = [
    "מה שחוזר על עצמו, שייך לאוטומציה",
    "אוטומציה לא יוצאת לחופשה",
    "פחות הקלדה, יותר עסק",
    "ליד שלא נענה מהר, מתקרר",
    "תהליך מסודר שווה עוד זוג ידיים",
    "בוט טוב עונה גם בשתיים בלילה",
    "הטופס הזה יכול למלא את עצמו",
    "הזמן הכי טוב לאוטומציה היה אתמול",
  ];
  // Top, front and side shade of each block colour. The first four follow the site's palette.
  const TONES = [
    ["#b9daf7", "#74b4f2", "#4a8fd4"],
    ["#a9efc6", "#7ad3a0", "#55b47d"],
    ["#f8a09b", "#ea7c77", "#d95d58"],
    ["#3a455c", "#232c40", "#0e1420"],
    ["#fbe3a1", "#f6c85f", "#d9a233"],
    ["#d6c8fb", "#b39df2", "#8a6fe0"],
    ["#a5e9ee", "#62cfd8", "#35a9b3"],
  ];

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

  // Line and text colours come from the page, so the game follows the contrast mode.
  let ink = "#0e1420", soft = "#465066";
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    ink = css.getPropertyValue("--ink").trim() || ink;
    soft = css.getPropertyValue("--ink-soft").trim() || soft;
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

  const SIZE = 30, FLY_GAP = 50; // a flying bar leaves 50px above the ground: enough to stand, not to jump
  let state = "idle"; // idle | run | over
  let player, things, speed, level, score, nextThing, lastKind, clock, travelled, message, last, lastAct = 0;
  function reset() {
    player = { y: 0, vy: 0, tone: Math.floor(Math.random() * TONES.length) }; // y: height above the ground
    things = [];
    speed = 5;
    level = 1;
    score = 0;
    clock = 0;
    travelled = 0;
    nextThing = 80;
    lastKind = "";
    message = null;
  }
  reset();

  // --- drawing
  function outline() {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink;
  }
  function box(x, y, w, h, tone) {
    const d = 7; // depth of the block, drawn up and to the left
    outline();
    ctx.fillStyle = tone[1];
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = tone[0];
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - d, y - d); ctx.lineTo(x + w - d, y - d); ctx.lineTo(x + w, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone[2];
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - d, y - d); ctx.lineTo(x - d, y + h - d); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function ball(x, y, w, tone) {
    const r = w / 2;
    outline();
    ctx.fillStyle = tone[1];
    ctx.beginPath(); ctx.arc(x + r, y + r, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone[0];
    ctx.beginPath(); ctx.arc(x + r * 0.72, y + r * 0.68, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  function spike(x, y, w, h, tone) {
    outline();
    ctx.fillStyle = tone[1];
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone[2];
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.36, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function drawThing(t) {
    const top = t.fly ? ground - FLY_GAP - t.h : ground - t.h;
    if (t.kind === "ball") ball(t.x, top, t.w, t.tone);
    else if (t.kind === "spike") spike(t.x, top, t.w, t.h, t.tone);
    else box(t.x, top, t.w, t.h, t.tone);
    if (t.fly) {
      // two thin lines above a flying bar, so it reads as hanging in the air
      ctx.strokeStyle = soft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t.x + 4, top - 12); ctx.lineTo(t.x + t.w - 12, top - 12);
      ctx.moveTo(t.x + 10, top - 17); ctx.lineTo(t.x + t.w - 20, top - 17);
      ctx.stroke();
    }
  }
  // Three layers that scroll at different speeds: far outlines, nearer blocks, marks on the ground.
  function background() {
    const far = (travelled * 0.12) % 220;
    ctx.strokeStyle = soft;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    for (let x = far - 220; x < W + 40; x += 220) {
      ctx.strokeRect(x, ground - 86, 46, 86);
      ctx.strokeRect(x + 46, ground - 58, 34, 58);
      ctx.strokeRect(x + 112, ground - 112, 40, 112);
      ctx.beginPath(); ctx.moveTo(x + 112, ground - 112); ctx.lineTo(x + 132, ground - 128); ctx.lineTo(x + 152, ground - 112); ctx.stroke();
    }
    const mid = (travelled * 0.32) % 170;
    ctx.globalAlpha = 0.5;
    for (let x = mid - 170; x < W + 40; x += 170) {
      ctx.strokeRect(x, ground - 30, 26, 30);
      ctx.strokeRect(x + 26, ground - 46, 22, 46);
      ctx.beginPath(); ctx.arc(x + 96, ground - 14, 14, Math.PI, 0); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const near = travelled % 46;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = near - 46; x < W + 10; x += 46) { ctx.moveTo(x, ground + 8); ctx.lineTo(x + 14, ground + 8); }
    ctx.stroke();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    background();
    if (message) {
      ctx.fillStyle = soft;
      ctx.font = '600 17px "IBM Plex Sans Hebrew", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.direction = "rtl";
      ctx.fillText(message.text, message.x, 30);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, ground + 0.75); ctx.lineTo(W, ground + 0.75);
    ctx.stroke();
    for (const t of things) drawThing(t);
    box(W - 96, ground - SIZE - player.y, SIZE, SIZE, TONES[player.tone]);
    if (state !== "run") {
      ctx.fillStyle = ink;
      ctx.font = '600 16px "IBM Plex Sans Hebrew", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillText(state === "over" ? "נתקעת בבאג. עוד סיבוב?" : "רווח, חץ למעלה או נגיעה כדי להתחיל", W / 2, H / 2 - 8);
    }
  }

  // --- world
  function spawn() {
    // early on only ground bugs; flying bars join from the second level
    const fly = level >= 2 && Math.random() < 0.3;
    const tone = TONES[Math.floor(Math.random() * TONES.length)];
    let thing;
    if (fly) {
      thing = { fly: true, kind: "box", w: 54 + Math.random() * 30, h: 16, tone };
    } else {
      const kind = ["box", "ball", "spike"][Math.floor(Math.random() * 3)];
      if (kind === "ball") thing = { kind, w: 26, h: 26, tone };
      else if (kind === "spike") thing = { kind, w: 26, h: 30 + Math.random() * 10, tone };
      else thing = Math.random() < 0.3 ? { kind, w: 18, h: 44, tone } : { kind, w: 22 + Math.random() * 16, h: 22 + Math.random() * 10, tone };
    }
    thing.x = -thing.w - 20;
    things.push(thing);
    // After a change between "jump" and "stay down" the player needs a whole jump's length to recover.
    const kindNow = fly ? "fly" : "ground";
    const recover = lastKind && lastKind !== kindNow ? speed * 44 : 0;
    lastKind = kindNow;
    nextThing = 210 + Math.random() * 240 + speed * 16 + recover;
  }
  function hits(t) {
    const px = W - 96;
    if (!(t.x + t.w > px + 5 && t.x < px + SIZE - 5)) return false;
    if (t.fly) return player.y + SIZE > FLY_GAP + 3; // jumped into it
    return player.y < t.h - 5;
  }
  function step(now) {
    if (state !== "run") return;
    const dt = Math.min((now - last) / 16.67, 2.5);
    last = now;
    clock += dt / 60;
    // every 10 seconds the world gets a little faster
    const due = 1 + Math.floor(clock / 10);
    if (due !== level) {
      level = due;
      speed = Math.min(5 + (level - 1) * 0.7, 13);
      levelOut.textContent = String(level);
      live.textContent = "מהירות " + level + ".";
    }
    const move = speed * dt;
    travelled += move;
    score += move * 0.1;
    player.vy -= 0.62 * dt;
    player.y = Math.max(player.y + player.vy * dt, 0);
    if (player.y === 0) player.vy = 0;
    nextThing -= move;
    if (nextThing <= 0) spawn();
    for (const t of things) {
      t.x += move;
      if (hits(t)) return end();
    }
    things = things.filter((t) => t.x < W + 30);
    // a line about automation drifts across, slower than the ground, every so often
    if (!message && Math.random() < 0.0035 * dt) {
      ctx.font = '600 17px "IBM Plex Sans Hebrew", Arial, sans-serif';
      const text = LINES[Math.floor(Math.random() * LINES.length)];
      message = { text, x: -ctx.measureText(text).width - 10 };
    }
    if (message) {
      message.x += move * 0.45;
      if (message.x > W + 10) message = null;
    }
    scoreOut.textContent = Math.floor(score).toLocaleString("en-US");
    draw();
    requestAnimationFrame(step);
  }
  function start() {
    reset();
    state = "run";
    button.textContent = "קפיצה";
    levelOut.textContent = "1";
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
    levelOut.textContent = "1";
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
