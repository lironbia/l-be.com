// 404 page: a small jumping game. A shape runs along the line (right to left, like the text).
// On the ground come bugs (block, ball, spike): jump over them. In the air come flying bars: stay
// on the ground and they pass overhead. The world speeds up every 10 seconds.
// Keys: Up or Space jumps, a quick second press in the air adds a show-off spin; Down changes the
// shape; Left and Right change its colour. Every game gets a different backdrop (city outlines,
// green falling letters, an automated production line, a Caribbean beach).
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
    "Whatever repeats itself belongs to automation",
    "Automation never goes on vacation",
    "Less typing, more business",
    "A lead that isn't answered fast goes cold",
    "A tidy process is worth another pair of hands",
    "A good bot answers at two in the morning too",
    "This form could fill itself in",
    "The best time for automation was yesterday",
  ];
  // Top, front and side shade of each colour. The first four follow the site's palette.
  const TONES = [
    ["#b9daf7", "#74b4f2", "#4a8fd4"],
    ["#a9efc6", "#7ad3a0", "#55b47d"],
    ["#f8a09b", "#ea7c77", "#d95d58"],
    ["#3a455c", "#232c40", "#0e1420"],
    ["#fbe3a1", "#f6c85f", "#d9a233"],
    ["#d6c8fb", "#b39df2", "#8a6fe0"],
    ["#a5e9ee", "#62cfd8", "#35a9b3"],
  ];
  const SHAPES = ["box", "ball", "triangle", "diamond", "hexagon", "star"];
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}<>/=+";

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
  let pageInk = "#0e1420", pageSoft = "#465066";
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    pageInk = css.getPropertyValue("--ink").trim() || pageInk;
    pageSoft = css.getPropertyValue("--ink-soft").trim() || pageSoft;
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
  let theme = 0; // which backdrop this game uses
  let look = { shape: 0, tone: Math.floor(Math.random() * TONES.length) }; // the player's shape and colour, kept between games
  let player, things, speed, level, score, nextThing, lastKind, clock, travelled, message, last, lastAct = 0, lastJump = 0;
  function reset() {
    player = { y: 0, vy: 0, spin: 0 }; // y: height above the ground; spin: 0, or how far the show-off turn has gone (0..1)
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

  // --- backdrops ---------------------------------------------------------------------------------
  // Each has its own line and text colour, and paints itself from how far the world has moved.
  const rand = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const THEMES = [
    {
      // city outlines
      paint() {
        const far = (travelled * 0.12) % 220;
        ctx.strokeStyle = pageSoft;
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
      },
    },
    {
      // green letters falling down a dark screen
      ink: "#eafff2", text: "#d5ffe6", marks: "#35d07f",
      paint() {
        ctx.fillStyle = "#04140b";
        ctx.fillRect(0, 0, W, H);
        ctx.font = '14px "IBM Plex Mono", Consolas, monospace';
        ctx.textAlign = "center";
        for (let column = 0; column * 18 < W + 18; column++) {
          const fall = 28 + rand(column) * 46; // pixels a second
          const head = ((clock * fall + rand(column + 50) * 400) % (H + 220)) - 60;
          for (let row = 0; row < 11; row++) {
            const y = head - row * 16;
            if (y < -10 || y > H) continue;
            const glyph = GLYPHS[Math.floor(rand(column * 31 + row * 7 + Math.floor(clock * 3 + column)) * GLYPHS.length)];
            ctx.fillStyle = row === 0 ? "#d5ffe6" : "#35d07f";
            ctx.globalAlpha = row === 0 ? 0.95 : Math.max(0.08, 0.7 - row * 0.065);
            ctx.fillText(glyph, column * 18 + 9, y);
          }
        }
        ctx.globalAlpha = 1;
      },
    },
    {
      // an automated production line; the further you get, the more of the plant comes into view
      ink: "#0e1420", text: "#232c40", marks: "#465066",
      paint() {
        ctx.fillStyle = "#eef1f5";
        ctx.fillRect(0, 0, W, H);
        const stage = 1 + Math.floor(travelled / 1800); // 1: belt and crates, 2: robot arms, 3: press, 4: tanks and pipes
        const shift = (travelled * 0.5) % 520;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#465066";
        if (stage >= 4) {
          // pipes along the ceiling, and tanks behind
          ctx.globalAlpha = 0.55;
          ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(W, 16); ctx.moveTo(0, 24); ctx.lineTo(W, 24); ctx.stroke();
          for (let x = -((travelled * 0.2) % 300); x < W + 60; x += 300) {
            ctx.fillStyle = "#d9dee8";
            ctx.fillRect(x + 190, ground - 120, 54, 120); ctx.strokeRect(x + 190, ground - 120, 54, 120);
            ctx.beginPath(); ctx.arc(x + 217, ground - 120, 27, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 217, ground - 147); ctx.lineTo(x + 217, 24); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        for (let x = -shift - 520; x < W + 520; x += 520) {
          // the upper belt and the crates riding it
          ctx.strokeStyle = "#465066";
          ctx.fillStyle = "#cfd6e2";
          ctx.fillRect(x, ground - 62, 520, 6); ctx.strokeRect(x, ground - 62, 520, 6);
          for (let leg = 40; leg < 520; leg += 130) { ctx.beginPath(); ctx.moveTo(x + leg, ground - 56); ctx.lineTo(x + leg, ground); ctx.stroke(); }
          const ride = (clock * 46) % 130;
          for (let crate = 0; crate < 4; crate++) {
            const cx = x + crate * 130 + ride;
            ctx.fillStyle = TONES[(crate + Math.floor(x / 520) + 40) % TONES.length][1];
            ctx.globalAlpha = 0.75;
            ctx.fillRect(cx, ground - 84, 24, 22); ctx.globalAlpha = 1; ctx.strokeRect(cx, ground - 84, 24, 22);
          }
          if (stage >= 2) {
            // a robot arm that reaches down to the belt and back
            const reach = Math.sin(clock * 2.2 + x) * 0.5 + 0.5;
            const bx = x + 300, by = ground - 150;
            ctx.strokeStyle = "#232c40";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(bx, 24); ctx.lineTo(bx, by); ctx.lineTo(bx + 34, by + 26 + reach * 22); ctx.lineTo(bx + 34, by + 46 + reach * 22); ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.fillStyle = "#f6c85f";
            for (const [jx, jy] of [[bx, by], [bx + 34, by + 26 + reach * 22]]) { ctx.beginPath(); ctx.arc(jx, jy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
          }
          if (stage >= 3) {
            // a press that stamps in rhythm
            const down = Math.max(0, Math.sin(clock * 3.4 + x)) * 20;
            ctx.strokeStyle = "#232c40";
            ctx.fillStyle = "#8f98aa";
            ctx.fillRect(x + 90, ground - 140, 60, 14); ctx.strokeRect(x + 90, ground - 140, 60, 14);
            ctx.fillStyle = "#b39df2";
            ctx.fillRect(x + 106, ground - 126, 28, 22 + down); ctx.strokeRect(x + 106, ground - 126, 28, 22 + down);
          }
        }
      },
      // the ground itself is a conveyor: rollers turn under the line
      floor() {
        ctx.strokeStyle = "#465066";
        ctx.lineWidth = 1.5;
        const roll = travelled % 26;
        for (let x = roll - 26; x < W + 26; x += 26) {
          ctx.beginPath(); ctx.arc(x, ground + 10, 7, 0, Math.PI * 2); ctx.stroke();
          const a = travelled / 7;
          ctx.beginPath(); ctx.moveTo(x, ground + 10); ctx.lineTo(x + Math.cos(a) * 7, ground + 10 + Math.sin(a) * 7); ctx.stroke();
        }
      },
    },
    {
      // a Caribbean beach: sun, sea, a far island, palms going by
      ink: "#0e1420", text: "#0e1420", marks: "#0e1420",
      paint() {
        const sky = ctx.createLinearGradient(0, 0, 0, ground);
        sky.addColorStop(0, "#9fd8fb");
        sky.addColorStop(1, "#eafaff");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffd76b";
        ctx.beginPath(); ctx.arc(W * 0.16, 46, 22, 0, Math.PI * 2); ctx.fill();
        // clouds drift slowly
        ctx.fillStyle = "#ffffff";
        for (let x = -((travelled * 0.05) % 260) - 60; x < W + 60; x += 260) {
          ctx.beginPath(); ctx.arc(x + 120, 34, 13, 0, Math.PI * 2); ctx.arc(x + 138, 28, 17, 0, Math.PI * 2); ctx.arc(x + 158, 35, 12, 0, Math.PI * 2); ctx.fill();
        }
        // the sea, with a far island
        const seaTop = ground - 46;
        ctx.fillStyle = "#62cfd8";
        ctx.fillRect(0, seaTop, W, 46);
        ctx.fillStyle = "#35a9b3";
        const isle = W - ((travelled * 0.08) % (W + 300)) + 40;
        ctx.beginPath(); ctx.moveTo(isle - 70, seaTop); ctx.quadraticCurveTo(isle, seaTop - 34, isle + 80, seaTop); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        for (let row = 0; row < 3; row++) {
          const drift = (clock * (14 + row * 6) + row * 40) % 80;
          for (let x = -80 + drift; x < W + 80; x += 80) { ctx.beginPath(); ctx.moveTo(x, seaTop + 10 + row * 12); ctx.quadraticCurveTo(x + 12, seaTop + 5 + row * 12, x + 24, seaTop + 10 + row * 12); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
        // sand under the line
        ctx.fillStyle = "#f6e3b4";
        ctx.fillRect(0, ground, W, H - ground);
        // palms pass by, nearer than the sea
        for (let x = ((travelled * 0.34) % 310) - 310; x < W + 80; x += 310) {
          const px = x + 150, sway = Math.sin(clock * 1.6 + x) * 4;
          ctx.strokeStyle = "#8a5a2b";
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(px, ground); ctx.quadraticCurveTo(px + 14, ground - 50, px + 6 + sway, ground - 96); ctx.stroke();
          ctx.strokeStyle = "#2f9e63";
          ctx.lineWidth = 5;
          for (const [dx, dy] of [[-40, -8], [-28, -30], [0, -40], [30, -28], [42, -6], [-22, 14], [26, 14]]) {
            ctx.beginPath(); ctx.moveTo(px + 6 + sway, ground - 96); ctx.quadraticCurveTo(px + 6 + sway + dx * 0.5, ground - 96 + dy - 12, px + 6 + sway + dx, ground - 96 + dy + 6); ctx.stroke();
          }
        }
        ctx.lineWidth = 1.5;
      },
    },
  ];
  const now = () => THEMES[theme];
  const ink = () => now().ink || pageInk;

  // --- drawing
  function outline() {
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink();
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
  // a closed shape through points on a circle; `inner` > 0 makes every second point shorter (a star)
  function polygon(points, r, tone, turn = 0, inner = 0) {
    outline();
    ctx.fillStyle = tone[1];
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = turn + (i / points) * Math.PI * 2, d = inner && i % 2 ? r * inner : r;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tone[0];
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  function drawPlayer() {
    const tone = TONES[look.tone], half = SIZE / 2;
    ctx.save();
    ctx.translate(W - 96 + half, ground - half - player.y);
    if (player.spin) ctx.rotate(-player.spin * Math.PI * 2);
    const shape = SHAPES[look.shape];
    if (shape === "box") box(-half, -half, SIZE, SIZE, tone);
    else if (shape === "ball") ball(-half, -half, SIZE, tone);
    else if (shape === "triangle") spike(-half, -half, SIZE, SIZE, tone);
    else if (shape === "diamond") polygon(4, half * 1.15, tone, -Math.PI / 2);
    else if (shape === "hexagon") polygon(6, half * 1.1, tone, 0);
    else polygon(10, half * 1.25, tone, -Math.PI / 2, 0.48);
    ctx.restore();
  }
  function drawThing(t) {
    const top = t.fly ? ground - FLY_GAP - t.h : ground - t.h;
    if (t.kind === "ball") ball(t.x, top, t.w, t.tone);
    else if (t.kind === "spike") spike(t.x, top, t.w, t.h, t.tone);
    else box(t.x, top, t.w, t.h, t.tone);
    if (t.fly) {
      // two thin lines above a flying bar, so it reads as hanging in the air
      ctx.strokeStyle = now().marks || pageSoft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t.x + 4, top - 12); ctx.lineTo(t.x + t.w - 12, top - 12);
      ctx.moveTo(t.x + 10, top - 17); ctx.lineTo(t.x + t.w - 20, top - 17);
      ctx.stroke();
    }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    now().paint();
    const textColor = now().text || pageInk;
    if (message) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = now().text || pageSoft;
      ctx.font = '600 17px "IBM Plex Sans Hebrew", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.direction = document.documentElement.dir || "rtl";
      ctx.fillText(message.text, message.x, 30);
    }
    // the ground: a line, and marks that rush by (or the theme's own floor)
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, ground + 0.75); ctx.lineTo(W, ground + 0.75);
    ctx.stroke();
    if (now().floor) now().floor();
    else {
      const near = travelled % 46;
      ctx.beginPath();
      for (let x = near - 46; x < W + 10; x += 46) { ctx.moveTo(x, ground + 8); ctx.lineTo(x + 14, ground + 8); }
      ctx.stroke();
    }
    for (const t of things) drawThing(t);
    drawPlayer();
    if (state !== "run") {
      ctx.font = '600 16px "IBM Plex Sans Hebrew", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.direction = document.documentElement.dir || "rtl";
      const line = state === "over" ? "Stuck on a bug. Another round?" : "Space, up arrow or a tap to start";
      const width = ctx.measureText(line).width + 24;
      ctx.fillStyle = theme === 1 ? "#04140b" : "#ffffff";
      ctx.globalAlpha = 0.82;
      ctx.fillRect(W / 2 - width / 2, H / 2 - 28, width, 30);
      ctx.globalAlpha = 1;
      ctx.fillStyle = textColor;
      ctx.fillText(line, W / 2, H / 2 - 8);
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
  function step(time) {
    if (state !== "run") return;
    const dt = Math.min((time - last) / 16.67, 2.5);
    last = time;
    clock += dt / 60;
    // every 10 seconds the world gets a little faster
    const due = 1 + Math.floor(clock / 10);
    if (due !== level) {
      level = due;
      speed = Math.min(5 + (level - 1) * 0.7, 13);
      levelOut.textContent = String(level);
      live.textContent = "Speed " + level + ".";
    }
    const move = speed * dt;
    travelled += move;
    score += move * 0.1;
    player.vy -= 0.62 * dt;
    player.y = Math.max(player.y + player.vy * dt, 0);
    if (player.spin) player.spin = Math.min(player.spin + dt / 26, 1); // one full turn in about 26 frames
    if (player.y === 0) {
      player.vy = 0;
      player.spin = 0;
    }
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
    // a different backdrop every game
    theme = (theme + 1 + Math.floor(Math.random() * (THEMES.length - 1))) % THEMES.length;
    state = "run";
    button.textContent = "Jump";
    levelOut.textContent = "1";
    live.textContent = "The game has started.";
    last = performance.now();
    requestAnimationFrame(step);
  }
  function end() {
    state = "over";
    button.textContent = "Another round";
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
    live.textContent = "Game over. Score: " + final.toLocaleString("en-US") + ".";
    draw();
  }
  function stop() {
    if (state !== "run") return;
    state = "idle";
    button.textContent = "Start game";
    live.textContent = "The game was stopped.";
    reset();
    scoreOut.textContent = "0";
    levelOut.textContent = "1";
    draw();
  }
  // Up, Space, the button or a tap: start, jump, and on a quick second press in the air, spin.
  function act() {
    const time = performance.now();
    if (time - lastAct < 90) return; // one press, one action
    lastAct = time;
    if (state !== "run") return start();
    if (player.y === 0) {
      player.vy = 11.2;
      lastJump = time;
    } else if (!player.spin && time - lastJump < 420) {
      player.spin = 0.001;
      player.vy = Math.max(player.vy, 7.5); // a little extra air for the turn
    }
  }
  function change(what, by = 1) {
    if (what === "shape") look.shape = (look.shape + 1) % SHAPES.length;
    else look.tone = (look.tone + by + TONES.length) % TONES.length;
    if (state !== "run") draw();
  }

  button.addEventListener("click", (event) => {
    // Space on the focused button was already handled on key-down; its click must not count as a second press
    if (event.detail === 0 && performance.now() - lastAct < 500) return;
    act();
  });
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    act();
  });
  document.querySelectorAll("[data-game]").forEach((el) => el.addEventListener("click", () => change(el.dataset.game)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return stop();
    const arrows = { ArrowDown: ["shape"], ArrowLeft: ["tone", -1], ArrowRight: ["tone", 1] };
    const jump = event.code === "Space" || event.key === "ArrowUp";
    if (!jump && !arrows[event.key]) return;
    // Only when nothing else is focused, so the keys still work on links and form fields; the
    // shape and colour keys only during a game, so the arrows scroll the page as usual otherwise.
    const el = document.activeElement;
    if (el && el !== document.body && el !== button && el !== canvas) return;
    if (!jump && state !== "run") return;
    event.preventDefault();
    if (jump) act();
    else change(...arrows[event.key]);
  });
  addEventListener("resize", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => state !== "run" && draw());
  resize();
})();
