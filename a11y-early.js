// Runs before the page paints: applies the visitor's saved accessibility choices, so there is no flash.
document.documentElement.classList.add("js"); // lets the styles know scripts are running
try {
  var a = JSON.parse(localStorage.getItem("a11y") || "{}"), r = document.documentElement;
  for (var k in a) if (a[k] === true) r.classList.add("a11y-" + k);
  if (a.size > 100) {
    r.style.fontSize = a.size + "%";
    if (a.size >= 150) r.classList.add("a11y-big");
  }
} catch (e) {}
