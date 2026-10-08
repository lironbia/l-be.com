// "Copy and send to your AI agent": one press copies a ready prompt, with the whole site's content
// after it, so a visitor can paste it into their own AI assistant as it is. The text lives in
// agent-prompt.txt (one per language), written by the site build. Any element with
// data-agent-copy is a copy button; on regular pages a small floating button is added as well.
(() => {
  const lang = document.documentElement.lang || "he";
  const url = (lang === "he" ? "/" : "/" + lang + "/") + "agent-prompt.txt";
  let text = null, loading = null;
  const load = () => loading || (loading = fetch(url).then((res) => {
    if (!res.ok) throw new Error("prompt " + res.status);
    return res.text();
  }).then((body) => (text = body)).catch((err) => {
    loading = null;
    throw err;
  }));

  async function copy() {
    if (text == null) await load();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Older browsers: copy through a temporary text area.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err2) {
        ok = false;
      }
      area.remove();
      return ok;
    }
  }

  // The floating button, under the accessibility button
  const a11y = document.querySelector(".a11y");
  if (a11y) {
    const fab = document.createElement("div");
    fab.className = "agent-fab";
    fab.innerHTML =
      '<button type="button" data-agent-copy aria-describedby="agent-fab-note">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M12 2l1.800 5.400L19 9l-5.200 1.600L12 16l-1.800-5.400L5 9l5.200-1.600z"/><path d="M18.500 14l.900 2.600 2.600.900-2.600.900-.900 2.600-.900-2.600-2.600-.900 2.600-.900z"/></svg>' +
      '<span class="visually-hidden">להעתיק פרומפט מוכן עם כל תוכן האתר, ולשלוח לסוכן ה-AI שלך</span></button>' +
      '<p class="agent-fab-note" id="agent-fab-note" role="status" data-agent-status>לשלוח לסוכן ה-AI שלך</p>';
    a11y.after(fab);
  }

  const warm = (event) => {
    if (event.target.closest && event.target.closest("[data-agent-copy]")) load().catch(() => {});
  };
  document.addEventListener("pointerover", warm);
  document.addEventListener("focusin", warm);
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-agent-copy]");
    if (!button) return;
    const scope = button.closest(".agent-fab, section, main, body");
    const status = scope.querySelector("[data-agent-status]");
    let ok = false;
    try {
      ok = await copy();
    } catch (err) {
      ok = false;
    }
    if (!status) return;
    if (!status.dataset.rest) status.dataset.rest = status.textContent;
    status.textContent = ok ? "הועתק ✓ עכשיו מדביקים בצ'אט של סוכן ה-AI שלך, ושולחים." : "ההעתקה לא הצליחה. אפשר לנסות שוב.";
    status.dataset.state = ok ? "ok" : "error";
    clearTimeout(status.timer);
    status.timer = setTimeout(() => {
      status.textContent = status.dataset.rest;
      delete status.dataset.state;
    }, 9000);
  });
})();
