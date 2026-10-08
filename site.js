// Shared behaviour: logo colour play + gentle parallax on scroll, Calendly popup, portfolio viewer.
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

  // --- Scroll: --sp (0..1) drives the logo gradient; [data-parallax] elements drift at their own speed.
  const drifters = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax),
    // Measure a parent that is not itself transformed, so the offset never feeds back into itself.
    ref: el.closest("[data-parallax-root]") || el.parentElement,
  }));
  // --- The guide: a small dot that rests at the edge of the screen and, when a main button is in
  // view, glides over to its corner and marks it (in the contact area: the send button).
  const guide = document.querySelector(".guide");
  // The opener has its own effect, so the dot only appears once the opener has scrolled away,
  // and the opener's buttons are not targets.
  const opener = document.querySelector("main > section");
  const guideTargets = guide ? [...document.querySelectorAll("main .btn")].filter((el) => !opener || !opener.contains(el)) : [];
  let gx = 0, gy = 0, tx = 0, ty = 0, guideMoving = false, guidePlaced = false;
  function guideStep() {
    gx += (tx - gx) * 0.12;
    gy += (ty - gy) * 0.12;
    guide.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
    if (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.4) requestAnimationFrame(guideStep);
    else guideMoving = false;
  }
  function updateGuide() {
    if (!guide) return;
    const mid = innerHeight / 2;
    let best = null;
    let bestDistance = Infinity;
    for (const el of guideTargets) {
      if (el.offsetParent === null) continue; // hidden (short mode)
      const r = el.getBoundingClientRect();
      const centre = r.top + r.height / 2;
      if (centre < 90 || centre > innerHeight - 40) continue;
      const distance = Math.abs(centre - mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = r;
      }
    }
    if (best) {
      tx = best.right + 5; // the button's top right corner
      ty = best.top - 5;
    } else {
      tx = 20; // resting place: left edge, a little below the middle
      ty = innerHeight * 0.62;
    }
    guide.classList.toggle("is-docked", !!best);
    const pastOpener = !opener || opener.getBoundingClientRect().bottom < innerHeight * 0.45;
    if (!guidePlaced || reduceMotion) {
      gx = tx;
      gy = ty;
      guidePlaced = true;
      guide.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
    } else if (!guideMoving) {
      guideMoving = true;
      requestAnimationFrame(guideStep);
    }
    guide.classList.toggle("is-on", pastOpener);
  }
  addEventListener("load", updateGuide);

  let queued = false;
  function frame() {
    queued = false;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : "0");
    root.style.setProperty("--sy", String(Math.round(scrollY)));
    updateGuide();
    if (reduceMotion) return;
    const mid = innerHeight / 2;
    for (const { el, speed, ref } of drifters) {
      const r = ref.getBoundingClientRect();
      if (r.bottom < -300 || r.top > innerHeight + 300) continue;
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - mid) * speed).toFixed(1) + "px,0)";
    }
  }
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  frame();

  // --- Pointer glow in the opener (mouse only). The glow follows the pointer and warms up as the
  // pointer nears the two main buttons: cool blue far away, warm coral right next to them.
  const hero = document.querySelector(".hero");
  if (hero && !reduceMotion && matchMedia("(pointer: fine)").matches) {
    const heroButtons = [...hero.querySelectorAll(".actions .btn, .actions [data-calendly]")];
    const COOL = [116, 180, 242];
    const WARM = [246, 138, 92];
    hero.addEventListener("pointermove", (event) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (event.clientX - r.left).toFixed(0) + "px");
      hero.style.setProperty("--my", (event.clientY - r.top).toFixed(0) + "px");
      let nearest = Infinity;
      for (const button of heroButtons) {
        const b = button.getBoundingClientRect();
        const dx = Math.max(b.left - event.clientX, 0, event.clientX - b.right);
        const dy = Math.max(b.top - event.clientY, 0, event.clientY - b.bottom);
        nearest = Math.min(nearest, Math.hypot(dx, dy));
      }
      let t = 1 - Math.min(nearest / 460, 1);
      t = t * t * (3 - 2 * t); // ease in and out
      const mix = COOL.map((cool, i) => Math.round(cool + (WARM[i] - cool) * t));
      hero.style.setProperty("--glow", "rgb(" + mix.join(" ") + " / " + (0.4 + 0.2 * t).toFixed(2) + ")");
    });
  }

  // --- "תקצר לי": the short version of the home page (process, client messages, contact).
  const hasShort = !!document.querySelector("[data-tachles]");
  function setShort(on) {
    root.classList.toggle("tachles", on);
    document.querySelectorAll("[data-tachles-toggle]").forEach((el) => {
      if (!el.dataset.fullLabel) el.dataset.fullLabel = el.textContent;
      el.textContent = on ? "לאתר המלא" : el.dataset.fullLabel;
      el.setAttribute("aria-pressed", String(on));
    });
    onScroll();
  }
  if (hasShort && location.hash === "#tachles") setShort(true);

  // --- Lazy script loader (each URL once)
  const loading = {};
  function load(src) {
    if (!loading[src]) {
      loading[src] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }

  // --- Calendly: open the booking popup in place; fall back to the plain link.
  async function openCalendly(url) {
    try {
      if (!document.getElementById("calendly-css")) {
        const css = document.createElement("link");
        css.id = "calendly-css";
        css.rel = "stylesheet";
        css.href = "https://assets.calendly.com/assets/external/widget.css";
        document.head.appendChild(css);
      }
      await load("https://assets.calendly.com/assets/external/widget.js");
      window.Calendly.initPopupWidget({ url });
    } catch (err) {
      window.open(url, "_blank", "noopener");
    }
  }

  // --- Portfolio: render the PDF page by page inside a dialog (works on phones, unlike an embedded PDF).
  const dialog = document.getElementById("portfolio");
  async function openPortfolio(url) {
    if (!dialog || !dialog.showModal) {
      location.href = url;
      return;
    }
    dialog.showModal();
    if (dialog.dataset.loaded) return;
    dialog.dataset.loaded = "1";
    const pages = dialog.querySelector(".pdf-pages");
    try {
      await load(PDFJS + "pdf.min.js");
      const lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
      const doc = await lib.getDocument(url).promise;
      const size = (await doc.getPage(1)).getViewport({ scale: 1 });
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(async (entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            const page = await doc.getPage(Number(entry.target.dataset.page));
            const base = page.getViewport({ scale: 1 });
            const scale = (entry.target.clientWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale });
            const canvas = entry.target.querySelector("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          });
        },
        { root: pages, rootMargin: "800px 0px" },
      );
      pages.textContent = "";
      for (let n = 1; n <= doc.numPages; n++) {
        const holder = document.createElement("div");
        holder.className = "pdf-page";
        holder.dataset.page = n;
        holder.style.aspectRatio = size.width + " / " + size.height;
        holder.appendChild(document.createElement("canvas"));
        pages.appendChild(holder);
        observer.observe(holder);
      }
      pages.scrollTop = 0;
    } catch (err) {
      dialog.dataset.loaded = "";
      pages.innerHTML = '<p class="pdf-note">לא הצלחתי להציג את הקובץ כאן. <a href="' + url + '" target="_blank" rel="noopener">לפתיחה בלשונית חדשה</a></p>';
    }
  }
  if (dialog) {
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  document.addEventListener("click", (event) => {
    const shortToggle = event.target.closest("[data-tachles-toggle]");
    if (shortToggle && hasShort) {
      event.preventDefault();
      const on = !root.classList.contains("tachles");
      setShort(on);
      history.replaceState(null, "", on ? "#tachles" : location.pathname);
      scrollTo(0, 0);
      return;
    }
    const calendly = event.target.closest("[data-calendly]");
    if (calendly) {
      event.preventDefault();
      openCalendly(calendly.href);
      return;
    }
    const portfolio = event.target.closest("[data-portfolio]");
    if (portfolio) {
      event.preventDefault();
      openPortfolio(portfolio.href);
    }
  });
})();
