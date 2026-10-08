// AI MODE page: the "copy" button and the contact form written for AI agents.
(() => {
  // Copy the whole page content, as text.
  const copy = document.getElementById("copy-ai");
  const copied = document.getElementById("copy-ai-status");
  if (copy) {
    copy.addEventListener("click", async () => {
      const text = document.getElementById("ai-content").innerText.trim();
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        // Older browsers: copy through a temporary text area.
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(area);
        area.select();
        try {
          ok = document.execCommand("copy");
        } catch (err2) {
          ok = false;
        }
        area.remove();
      }
      copied.textContent = ok ? "Copied ✓" : "Copying failed";
      setTimeout(() => {
        copied.textContent = "";
      }, 4000);
    });
  }

  const form = document.getElementById("agent-form");
  if (!form) return;
  const status = form.querySelector(".agent-status");
  const button = form.querySelector('button[type="submit"]');
  const field = (name) => form.querySelector('[name="' + name + '"]');
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  form.noValidate = true;

  const rules = [
    ["on_behalf_of", (el) => (el.value.trim() ? "" : "missing: on_behalf_of (name of the person on whose behalf the request is made)")],
    ["contact", (el) => (!el.value.trim() ? "missing: contact (email or WhatsApp)" : isEmail(el.value) || el.value.replace(/\D/g, "").length >= 9 ? "" : "invalid: contact (an email or a phone number is needed)")],
    ["request", (el) => (el.value.trim() ? "" : "missing: request (what is being requested)")],
    ["human_approved", (el) => (el.checked ? "" : "missing: human_approved (approval is required from the person on whose behalf the request is made)")],
  ];
  function say(state, lines) {
    status.dataset.state = state;
    status.textContent = lines.join("\n");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const problems = [];
    let first = null;
    for (const [name, test] of rules) {
      const el = field(name);
      const message = test(el);
      if (message) {
        problems.push("✗ " + message);
        el.setAttribute("aria-invalid", "true");
        first = first || el;
      } else {
        el.removeAttribute("aria-invalid");
      }
    }
    if (problems.length) {
      say("error", ["status: 400", ...problems]);
      first.focus();
      return;
    }
    if (field("website").value) {
      say("ok", ["status: 200", "✓ The request was received."]);
      form.reset();
      return;
    }
    const contact = field("contact").value.trim();
    const agent = field("agent").value.trim();
    const param = (name) => new URLSearchParams(location.search).get(name) || "";
    const payload = {
      type: "contact", page_title: document.title, page_lang: document.documentElement.lang,
      name: field("on_behalf_of").value.trim(), business_name: field("business_name").value.trim(),
      phone: isEmail(contact) ? "" : contact, email: isEmail(contact) ? contact : "",
      message: "Sent via an AI agent" + (agent ? " (" + agent + ")" : "") + ", with the approval of the person on whose behalf the request is made.\n\n" + field("request").value.trim(),
      form_name: "AI MODE: form for AI agents", form_id: "ai-agent-form", page_url: location.href,
      ref: param("ref") || document.referrer || "",
      utm_source: param("utm_source"), utm_campaign: param("utm_campaign"), utm_medium: param("utm_medium"),
      utm_content: param("utm_content"), utm_term: param("utm_term"), utm_adset: param("utm_adset"),
      fbclid: param("fbclid"), gclid: param("gclid"), affiliate_code: param("affiliate_code"),
    };
    const blocked = window.lbeGuard ? window.lbeGuard.check() : "";
    if (blocked) {
      say("error", ["status: 429", "✗ " + blocked]);
      return;
    }
    button.disabled = true;
    say("busy", ["status: sending…"]);
    try {
      const res = await fetch(form.dataset.hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Webhook responded " + res.status);
      say("ok", ["status: 200", "✓ The request was received. Liron will get back to you as soon as possible."]);
      if (window.lbeGuard) window.lbeGuard.mark();
      form.dataset.sent = "1";
    } catch (err) {
      say("error", ["status: 502", "✗ Sending failed. You can try again, or book a call."]);
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
