// Accessibility menu: text size, contrast, colour inversion, greyscale, plain font, text spacing,
// link emphasis, stopping motion, large pointer. Choices are kept in localStorage ("a11y") and are
// applied early by a one-line script in <head>, so a returning visitor sees no flash.
(() => {
  const root = document.documentElement;
  const KEY = "a11y";
  const SIZES = [100, 115, 130, 150, 175, 200];
  const OPTIONS = [
    ["contrast", "ניגודיות גבוהה"],
    ["dark", "תצוגה כהה (היפוך צבעים)"],
    ["mono", "גווני אפור"],
    ["font", "גופן קריא"],
    ["spacing", "ריווח טקסט מוגדל"],
    ["links", "הדגשת קישורים"],
    ["calm", "עצירת אנימציות"],
    ["cursor", "סמן עכבר גדול"],
  ];
  const statement = document.body.dataset.a11yStatement || "accessibility";

  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (err) {
    state = {};
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* private mode: the choice simply lasts for this page */
    }
  };

  const box = document.createElement("div");
  box.className = "a11y";
  box.innerHTML =
    '<button type="button" class="a11y-toggle" aria-expanded="false" aria-controls="a11y-panel">' +
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><circle cx="12" cy="4.5" r="2.2"/><path d="M4 8.3c2.6.8 5.3 1.2 8 1.2s5.4-.4 8-1.2l.5 1.9c-1.9.6-3.8 1-5.7 1.2v3.3l2.4 6.5-1.9.7-2.9-6.4h-.8l-2.9 6.4-1.9-.7 2.4-6.5v-3.300c-1.900-.200-3.800-.600-5.700-1.200z"/></svg>' +
    '<span class="visually-hidden">תפריט נגישות</span></button>' +
    '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-title" hidden>' +
    '<h2 id="a11y-title">נגישות</h2>' +
    '<div class="a11y-size" role="group" aria-label="גודל הטקסט">' +
    '<button type="button" data-size="-1">טקסט קטן יותר</button>' +
    '<output aria-live="polite"></output>' +
    '<button type="button" data-size="1">טקסט גדול יותר</button></div>' +
    '<ul class="a11y-options">' +
    OPTIONS.map(([key, label]) => '<li><button type="button" data-option="' + key + '" aria-pressed="false">' + label + "</button></li>").join("") +
    "</ul>" +
    '<div class="a11y-foot"><button type="button" data-reset>איפוס ההגדרות</button>' +
    '<a href="' + statement + '">הצהרת נגישות</a>' +
    '<button type="button" data-close>סגירת התפריט</button></div></div>';
  const skip = document.querySelector(".skip");
  if (skip) skip.after(box);
  else document.body.prepend(box);

  const toggle = box.querySelector(".a11y-toggle");
  const panel = box.querySelector(".a11y-panel");
  const output = box.querySelector("output");

  function apply() {
    const size = SIZES.includes(state.size) ? state.size : 100;
    root.style.fontSize = size === 100 ? "" : size + "%";
    root.classList.toggle("a11y-big", size >= 150);
    output.textContent = size + "%";
    box.querySelector('[data-size="-1"]').disabled = size === SIZES[0];
    box.querySelector('[data-size="1"]').disabled = size === SIZES[SIZES.length - 1];
    for (const [key] of OPTIONS) {
      root.classList.toggle("a11y-" + key, state[key] === true);
      box.querySelector('[data-option="' + key + '"]').setAttribute("aria-pressed", String(state[key] === true));
    }
    dispatchEvent(new Event("a11y-change"));
  }

  function open(on) {
    panel.hidden = !on;
    toggle.setAttribute("aria-expanded", String(on));
    if (on) panel.querySelector("button:not(:disabled)").focus();
  }

  toggle.addEventListener("click", () => open(panel.hidden));
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      open(false);
      toggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!panel.hidden && !box.contains(event.target)) open(false);
  });
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.size) {
      const at = SIZES.indexOf(SIZES.includes(state.size) ? state.size : 100);
      state.size = SIZES[Math.min(Math.max(at + Number(button.dataset.size), 0), SIZES.length - 1)];
    } else if (button.dataset.option) {
      state[button.dataset.option] = state[button.dataset.option] !== true;
    } else if ("reset" in button.dataset) {
      state = {};
    } else if ("close" in button.dataset) {
      open(false);
      toggle.focus();
      return;
    }
    save();
    apply();
  });

  apply();
})();
