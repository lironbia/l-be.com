// "Send me an email so I can come back and read about you later": one email field, posted to the
// same webhook as the contact form with type "read_later" (the contact form sends type "contact").
// A page may hold more than one of these forms (the home page has two).
(() => {
  const param = (name) => new URLSearchParams(location.search).get(name) || "";
  document.querySelectorAll("form.later-form").forEach((form) => {
    const input = form.querySelector('[name="email"]');
    const trap = form.querySelector('[name="website"]');
    const status = form.querySelector(".form-status");
    const live = form.querySelector('[role="status"]');
    const button = form.querySelector("button");
    const noteId = input.id + "-msg";
    form.noValidate = true; // the messages below replace the browser's own bubbles

    function say(state, text) {
      status.dataset.state = state;
      status.textContent = text;
      live.textContent = text;
    }
    function check() {
      const value = input.value.trim();
      const message = !value ? "חסרה לי כתובת אימייל." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "כתובת האימייל הזו לא נראית תקינה.";
      let note = document.getElementById(noteId);
      if (message) {
        if (!note) {
          note = document.createElement("p");
          note.className = "field-msg";
          note.id = noteId;
          input.parentElement.appendChild(note);
          input.setAttribute("aria-describedby", noteId);
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
    input.addEventListener("input", () => {
      if (input.hasAttribute("aria-invalid")) check();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!check()) {
        say("error", "צריך כתובת אימייל תקינה כדי לשלוח.");
        input.focus();
        return;
      }
      // A field people never see: only automated form fillers complete it.
      if (trap.value) {
        say("ok", "נשלח. המייל בדרך אליך :)");
        form.reset();
        return;
      }
      const payload = {
        type: "read_later",
        name: "", business_name: "", phone: "", email: input.value.trim(), message: "",
        form_name: "שלח לי מייל לקרוא אחר כך", form_id: "read-later-form",
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
      say("busy", "שולח…");
      try {
        const res = await fetch(form.dataset.hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Webhook responded " + res.status);
        say("ok", "נשלח. המייל בדרך אליך :)");
        if (window.lbeGuard) window.lbeGuard.mark();
        form.dataset.sent = "1";
      } catch (err) {
        say("error", "השליחה נכשלה. אפשר לנסות שוב.");
      } finally {
        button.disabled = false;
      }
    });
  });
})();
