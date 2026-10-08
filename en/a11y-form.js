// Accessibility contact form (on the accessibility statement). Posts to the same webhook as the
// other forms, with type "accessibility" and the same set of fields.
(() => {
  const form = document.getElementById("a11y-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const live = form.querySelector('[role="status"]');
  const button = form.querySelector('button[type="submit"]');
  const field = (id) => document.getElementById(id);
  const param = (name) => new URLSearchParams(location.search).get(name) || "";
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  form.noValidate = true; // the messages below replace the browser's own bubbles

  // One rule per required field: returns the message to show, or "" when the value is fine.
  const rules = [
    ["af-name", (v) => (v.trim() ? "" : "I'm missing a name.")],
    ["af-contact", (v) => (!v.trim() ? "I'm missing a way to get back to you: email or phone." : isEmail(v) || v.replace(/\D/g, "").length >= 9 ? "" : "That doesn't look like an email or a phone number.")],
    ["af-message", (v) => (v.trim() ? "" : "I'm missing a description of the problem or of the request.")],
  ];
  function check(id, test) {
    const input = field(id);
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
    field(id).addEventListener("input", () => {
      if (field(id).hasAttribute("aria-invalid")) check(id, test);
    });
  });
  function say(state, text) {
    status.dataset.state = state;
    status.textContent = text;
    live.textContent = text;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const allGood = rules.map(([id, test]) => check(id, test)).every(Boolean);
    if (!allGood) {
      say("error", "I'm missing a few details before I can send. I've marked them above.");
      form.querySelector("[aria-invalid]").focus();
      return;
    }
    const contact = field("af-contact").value.trim();
    const details = [
      field("af-page").value.trim() && "Page: " + field("af-page").value.trim(),
      field("af-tech").value.trim() && "Browser or assistive technology: " + field("af-tech").value.trim(),
    ].filter(Boolean);
    const payload = {
      type: "accessibility",
      name: field("af-name").value.trim(), business_name: "",
      phone: isEmail(contact) ? "" : contact, email: isEmail(contact) ? contact : "",
      message: (details.length ? details.join("\n") + "\n\n" : "") + field("af-message").value.trim(),
      form_name: "Accessibility inquiry", form_id: "accessibility-form",
      page_url: location.href, page_title: document.title, page_lang: document.documentElement.lang,
      ref: param("ref") || document.referrer || "",
      utm_source: param("utm_source"), utm_campaign: param("utm_campaign"), utm_medium: param("utm_medium"),
      utm_content: param("utm_content"), utm_term: param("utm_term"), utm_adset: param("utm_adset"),
      fbclid: param("fbclid"), gclid: param("gclid"), affiliate_code: param("affiliate_code"),
    };
    const blocked = window.lbeGuard ? window.lbeGuard.check() : "";
    if (blocked) {
      say("error", blocked);
      return;
    }
    button.disabled = true;
    say("busy", "Sending your inquiry…");
    try {
      const res = await fetch(form.dataset.hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Webhook responded " + res.status);
      say("ok", "Your inquiry was received. Thank you, I'll get back to you as soon as possible.");
      if (window.lbeGuard) window.lbeGuard.mark();
      form.dataset.sent = "1";
    } catch (err) {
      say("error", "Sending failed. You can try again.");
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
