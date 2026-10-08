// A gentle limit on form sending from one browser: at most once every five minutes, and at most
// twice in one visit. It stops double-sends and casual flooding; it is not a defence against a
// program that posts to the webhook directly (that needs a limit on the receiving side).
window.lbeGuard = (() => {
  const WAIT = 5 * 60 * 1000, MAX = 2;
  const read = (store, key) => {
    try {
      return Number(store.getItem(key)) || 0;
    } catch (err) {
      return 0;
    }
  };
  return {
    // "" when sending is allowed, otherwise the message to show
    check() {
      if (read(sessionStorage, "lbe-sent") >= MAX) return "כבר נשלחו מכאן שתי פניות בביקור הזה. אם צריך עוד משהו, אפשר לתאם שיחה ביומן.";
      const left = WAIT - (Date.now() - read(localStorage, "lbe-last"));
      if (left > 0) return "פנייה נשלחה מכאן לפני רגע. אפשר לשלוח שוב בעוד " + Math.ceil(left / 60000) + " דקות.";
      return "";
    },
    mark() {
      try {
        sessionStorage.setItem("lbe-sent", String(read(sessionStorage, "lbe-sent") + 1));
        localStorage.setItem("lbe-last", String(Date.now()));
      } catch (err) {
        /* private mode: nothing to remember */
      }
    },
  };
})();
