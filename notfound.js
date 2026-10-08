// The host serves one "not found" page for every missing address. When the missing address belongs
// to a language folder (/en/…, /es/…), go to that language's own "not found" page.
(() => {
  const match = location.pathname.match(/^\/(en|es)\//);
  if (match && !/\/404(\.html)?$/.test(location.pathname)) location.replace("/" + match[1] + "/404");
})();
