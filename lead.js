// Contact form (home, digital-dreams, GoHighLevel pages). The form element carries its own
// settings: data-hook (webhook), data-form-name and data-form-id. Every call has type "contact".
(() => {
  const form = document.getElementById("lead-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const live = form.querySelector(".form-live"); // screen readers get the whole message at once
  const trap = form.querySelector('[name="website"]');
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-calm");
  const param = (name) => new URLSearchParams(location.search).get(name) || "";
  form.noValidate = true; // the messages below replace the browser's own bubbles

  // One rule per field: returns the message to show, or "" when the value is fine.
  const rules = [
    ["f-name", (v) => (v.trim() ? "" : "חסר לי שם. איך לקרוא לך?")],
    ["f-phone", (v) => (!v.trim() ? "חסר לי מספר וואטסאפ, כדי שאוכל לחזור אליך." : v.replace(/\D/g, "").length < 9 ? "המספר הזה קצר מדי בשביל וואטסאפ." : "")],
    ["f-email", (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "כתובת האימייל הזו לא נראית תקינה.")],
  ];
  function check(id, test) {
    const input = document.getElementById(id);
    const message = test(input.value);
    let note = document.getElementById(id + "-msg");
    if (message) {
      if (!note) {
        note = document.createElement("p");
        note.className = "field-msg";
        note.id = id + "-msg";
        input.parentElement.appendChild(note);
        input.setAttribute("aria-describedby", note.id);
      }
      note.textContent = message;
      input.setAttribute("aria-invalid", "true");
    } else {
      if (note) note.remove();
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
    return !message;
  }
  rules.forEach(([id, test]) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      if (input.hasAttribute("aria-invalid")) check(id, test);
    });
  });

  // Status line: typed out, like an agent reporting back.
  let typing;
  function say(state, text) {
    clearInterval(typing);
    status.dataset.state = state;
    live.textContent = text;
    if (calm()) {
      status.textContent = text;
      return;
    }
    let i = 0;
    status.textContent = text.slice(0, 1);
    typing = setInterval(() => {
      i += 1;
      status.textContent = text.slice(0, i + 1);
      if (i + 1 >= text.length) clearInterval(typing);
    }, 16);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const allGood = rules.map(([id, test]) => check(id, test)).every(Boolean);
    if (!allGood) {
      say("error", "חסרים לי כמה פרטים כדי לשלוח. סימנתי אותם למעלה.");
      form.querySelector("[aria-invalid]").focus();
      return;
    }
    // A field people never see: only automated form fillers complete it.
    if (trap && trap.value) {
      say("ok", "תודה :) נהיה בקשר בהקדם האפשרי");
      form.reset();
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const payload = {
      type: "contact", page_title: document.title,
      name: data.get("name") || "", business_name: data.get("business_name") || "", phone: data.get("phone") || "",
      email: data.get("email") || "", message: data.get("message") || "",
      form_name: form.dataset.formName, form_id: form.dataset.formId, page_url: location.href,
      ref: param("ref") || document.referrer || "",
      utm_source: param("utm_source"), utm_campaign: param("utm_campaign"), utm_medium: param("utm_medium"),
      utm_content: param("utm_content"), utm_term: param("utm_term"), utm_adset: param("utm_adset"),
      fbclid: param("fbclid"), gclid: param("gclid"), affiliate_code: param("affiliate_code"),
    };
    button.disabled = true;
    say("busy", "שולח את הפנייה…");
    try {
      const res = await fetch(form.dataset.hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Webhook responded " + res.status);
      say("ok", "תודה :) נהיה בקשר בהקדם האפשרי");
      form.dataset.sent = "1"; // the fields close, which also lets the browser remember what was typed
    } catch (err) {
      say("error", "השליחה נכשלה. אפשר לנסות שוב, או לתאם שיחה ביומן.");
    } finally {
      button.disabled = false;
    }
  });

  // "Send another": bring the fields back, empty.
  const againButton = form.querySelector(".form-again");
  if (againButton) againButton.addEventListener("click", () => {
    form.reset();
    delete form.dataset.sent;
    status.textContent = "";
    form.querySelector("input").focus();
  });
})();
