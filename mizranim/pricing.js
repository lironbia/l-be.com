// Renders the size picker and final price from data.js into #pricing, and keeps the selected size in window.mizranimState.
(function () {
  var D = window.MIZRANIM;
  var box = document.getElementById("pricing");
  if (!D || !box) return;
  var model = D.models[box.getAttribute("data-model")];
  if (!model) return;

  var fmt = function (n) { return n.toLocaleString("en-US"); };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  var ltr = function (text) { var s = el("bdi", null, text); s.setAttribute("dir", "ltr"); return s; };

  var state = (window.mizranimState = { size: D.defaultSize, price: 0, custom: false });
  var priceVal = document.getElementById("price-val");
  var selLine = document.getElementById("sel-line");
  var chips = [];
  var customOut;

  function select(size, price, custom) {
    state.size = size;
    state.price = price;
    state.custom = !!custom;
    priceVal.textContent = fmt(price) + " ₪";
    if (selLine) selLine.textContent = model.name + ", " + size;
    chips.forEach(function (c) {
      var on = !custom && c.getAttribute("data-size") === size;
      c.setAttribute("aria-pressed", on ? "true" : "false");
      c.classList.toggle("on", on);
    });
    document.dispatchEvent(new CustomEvent("mizranim:size", { detail: { size: size, price: price, custom: !!custom } }));
  }

  box.textContent = "";
  box.appendChild(el("h2", null, "בחירת מידה ומחיר סופי"));
  var grid = el("div", "sizes");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "מידות");
  D.sizes.forEach(function (size, i) {
    var b = el("button", "chip");
    b.type = "button";
    b.setAttribute("data-size", size);
    var s = el("span", "chip-size");
    s.appendChild(ltr(size));
    b.appendChild(s);
    b.appendChild(el("span", "chip-price", fmt(model.prices[i]) + " ₪"));
    b.addEventListener("click", function () { select(size, model.prices[i], false); });
    chips.push(b);
    grid.appendChild(b);
  });
  box.appendChild(grid);
  box.appendChild(el("p", "note", "המחיר כולל משלוח והרכבה. המחיר עולה בהדרגה עם הגודל כי יש יותר חומר ועבודה, אבל ההפרש בין מידה למידה קטן כי רוב העלות היא באיכות החומרים והייצור. בלי הפתעות: המחיר שמוצג הוא מה שמשלמים."));

  // Custom size: nearest larger standard size (both dimensions at least as large) plus the custom amount, one final price.
  var det = el("details", "custom");
  det.appendChild(el("summary", null, "מידה מיוחדת שלא ברשימה?"));
  var row = el("div", "custom-row");
  var w = el("input"); w.type = "number"; w.inputMode = "numeric"; w.min = "60"; w.max = "300"; w.placeholder = "רוחב"; w.setAttribute("aria-label", "רוחב בס״מ"); w.setAttribute("dir", "ltr");
  var l = el("input"); l.type = "number"; l.inputMode = "numeric"; l.min = "60"; l.max = "300"; l.placeholder = "אורך"; l.setAttribute("aria-label", "אורך בס״מ"); l.setAttribute("dir", "ltr");
  var go = el("button", "chip go", "חשב מחיר");
  go.type = "button";
  row.appendChild(w); row.appendChild(el("span", null, "x")); row.appendChild(l); row.appendChild(el("span", null, "ס״מ")); row.appendChild(go);
  det.appendChild(row);
  customOut = el("p", "note custom-out");
  customOut.setAttribute("aria-live", "polite");
  det.appendChild(customOut);
  box.appendChild(det);

  go.addEventListener("click", function () {
    var cw = parseInt(w.value, 10), cl = parseInt(l.value, 10);
    if (!(cw >= 60 && cw <= 300 && cl >= 60 && cl <= 300)) { customOut.textContent = "נא להזין רוחב ואורך בס״מ (60 עד 300)."; return; }
    var best = -1;
    D.sizes.forEach(function (s, i) {
      var p = s.split("x");
      if (+p[0] >= cw && +p[1] >= cl && (best < 0 || model.prices[i] < model.prices[best])) best = i;
    });
    if (best < 0) { customOut.textContent = "מידה גדולה מ-200x200: נבדוק ונחזיר מחיר בשיחה בוואטסאפ."; return; }
    var price = model.prices[best] + D.customSizeAdd;
    customOut.textContent = "מידה " + cw + "x" + cl + ": " + fmt(price) + " ₪, מחיר סופי כולל משלוח והרכבה.";
    select(cw + "x" + cl, price, true);
  });

  select(D.defaultSize, model.prices[D.sizes.indexOf(D.defaultSize)], false);
})();
