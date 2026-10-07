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
  let queued = false;
  function frame() {
    queued = false;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : "0");
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
