// Single source of truth for the /mizranim demo pages: sizes and final prices (ILS, delivery and assembly included).
window.MIZRANIM = {
  sizes: ["80x190", "90x190", "90x200", "120x190", "120x200", "140x190", "160x190", "160x200", "180x200", "200x200"],
  defaultSize: "160x200",
  customSizeAdd: 600, // a size not in the list = the nearest larger standard size + this amount, shown as one final price
  models: {
    classic: { prices: [1390, 1450, 1490, 1550, 1590, 1650, 1750, 1790, 1890, 1990] },
    soft: { prices: [2350, 2450, 2490, 2590, 2690, 2790, 2890, 2990, 3090, 3190] },
    ortho: { prices: [3490, 3650, 3750, 3900, 3990, 4190, 4350, 4490, 4690, 4890] },
    platinum: { prices: [4690, 4890, 4990, 5190, 5390, 5590, 5790, 6000, 6300, 6600] },
  },
};
