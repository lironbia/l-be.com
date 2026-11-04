// WhatsApp entry buttons on /bots/ pages. Message contract: C:\DEV\bots\BOTS_ARCHITECTURE.md section 2.
// The number comes from window.LBE_CLIENT.waNumber when the leads system script is loaded for this sub-brand, otherwise from CFG.
(function () {
  var CFG = { number: "972554606831" };
  var C = window.LBE_CLIENT;
  var number = (C && C.waNumber) || CFG.number;
  var ref = (new URLSearchParams(location.search).get("ref") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  var LEAD = { demo: "היי, אשמח לנסות את ההדגמה", order: "היי, אני רוצה להזמין בוט" };
  document.querySelectorAll("a[data-wa-code]").forEach(function (a) {
    var intent = a.getAttribute("data-wa-intent");
    var text = (LEAD[intent] || LEAD.demo) + ".\nקוד: " + a.getAttribute("data-wa-code") + "\nכוונה: " + intent + (ref ? "\nref: " + ref : "");
    a.href = "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
  });
})();
