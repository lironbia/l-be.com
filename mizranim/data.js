// Single source of truth for the /mizranim demo pages: sizes and final prices (ILS, delivery and assembly included).
window.MIZRANIM = {
  sizes: ["80x190", "90x190", "90x200", "120x190", "120x200", "140x190", "160x190", "160x200", "180x200", "200x200"],
  defaultSize: "160x200",
  botNumber: "12058583885", // WhatsApp number of the sales bot, international format without "+"; will change to an Israeli number
  customSizeAdd: 600, // a size not in the list = the nearest larger standard size + this amount, shown as one final price
  // credit-card installments by final price: up to `upTo` (inclusive) allows `max` payments; last tier has no upper limit
  installments: [
    { upTo: 3000, max: 10 },
    { upTo: 5000, max: 12 },
    { upTo: Infinity, max: 24 },
  ],
  models: {
    // name always starts with the Hebrew word "מיטת"; code is what the bot recognises
    classic: { name: "מיטת LCS קלאסיק", code: "LCS-CLASSIC", prices: [1390, 1450, 1490, 1550, 1590, 1650, 1750, 1790, 1890, 1990] },
    soft: { name: "מיטת LCS סופט קומפורט", code: "LCS-SOFT", prices: [2350, 2450, 2490, 2590, 2690, 2790, 2890, 2990, 3090, 3190] },
    ortho: { name: "מיטת LCS אורתו פלוס", code: "LCS-ORTHO", prices: [3490, 3650, 3750, 3900, 3990, 4190, 4350, 4490, 4690, 4890] },
    platinum: { name: "מיטת LCS פלטינום", code: "LCS-PLATINUM", prices: [4690, 4890, 4990, 5190, 5390, 5590, 5790, 6000, 6300, 6600] },
  },
};
