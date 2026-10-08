// Velluto Coffee Atelier: a fictional brand. All copy, places and people are invented.

export const FILM_DURATION = 40; // seconds; 16 bars at 96 BPM

/** Each scroll chapter starts at a film timestamp that lands on a bar line. */
export const CHAPTERS = [
  { id: "top", n: "00", label: "Velluto", t: 0 },
  { id: "origin", n: "I", label: "Origin", t: 10 },
  { id: "roast", n: "II", label: "Roast", t: 17.5 },
  { id: "menu", n: "III", label: "Pour", t: 25 },
  { id: "gallery", n: "IV", label: "Ritual", t: 32.5 },
  { id: "visit", n: "V", label: "Visit", t: 36 },
  { id: "reserve", n: "VI", label: "Reserve", t: 38.5 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

/** Callouts pinned to 3D points in the film (see ANCHORS in scene/camera.ts). Times in film seconds. */
export const PINNED_LABELS = [
  { anchor: "cupRim", t0: 1, t1: 6.5, kicker: "Porcelain", text: "Hand-thrown · 22-ct gold rim" },
  { anchor: "steam", t0: 3, t1: 7, kicker: "Served at", text: "68 °C, the sweet spot" },
  { anchor: "cherries", t0: 11.2, t1: 14.8, kicker: "Harvest", text: "Garnet-ripe · 22° Brix" },
  { anchor: "greenBeans", t0: 14.6, t1: 17.2, kicker: "Process", text: "Washed · 21 days sun-dried" },
  { anchor: "tunnel", t0: 21.5, t1: 24, kicker: "Roast", text: "First crack at 10:12" },
  { anchor: "stream", t0: 26.2, t1: 30, kicker: "Extraction", text: "18 g in · 36 g out · 28 s" },
  { anchor: "rosetta", t0: 31, t1: 35.5, kicker: "Latte art", text: "Free-poured rosetta" },
] as const;

export const MENU: { id: string; label: string; note: string; items: { name: string; desc: string; price: string; tag?: string }[] }[] = [
  {
    id: "espresso",
    label: "Espresso Bar",
    note: "House blend · Huila & Guji · 18 g in, 36 g out",
    items: [
      { name: "Velluto Espresso", desc: "Cacao nib, red cherry, a long caramel finish", price: "3.8" },
      { name: "Cortado", desc: "Equal parts espresso and silk-steamed milk", price: "4.4" },
      { name: "Flat White", desc: "Double ristretto, micro-foam, poured thin", price: "4.9" },
      { name: "Rosetta Latte", desc: "Our signature pour, oat or whole milk", price: "5.2", tag: "Most loved" },
    ],
  },
  {
    id: "slow",
    label: "Slow Bar",
    note: "Single origins, brewed to order. Allow six minutes.",
    items: [
      { name: "V60 of the Week", desc: "Rotating single estate, ask the barista", price: "6.5" },
      { name: "Guji Natural Cold Brew", desc: "Eighteen-hour steep, blueberry and jasmine", price: "5.8" },
      { name: "Siphon for Two", desc: "Theatre at the counter, served in glass", price: "14" },
      { name: "Cascara Tea", desc: "Dried coffee cherry, hibiscus, orange peel", price: "4.6" },
    ],
  },
  {
    id: "signature",
    label: "Signatures",
    note: "Built by our head barista, changed each season.",
    items: [
      { name: "Velvet Smoke", desc: "Espresso tonic, smoked demerara, grapefruit oil", price: "6.8", tag: "New" },
      { name: "Midnight Crema", desc: "Affogato over burnt-honey gelato", price: "7.5" },
      { name: "Cardamom Cloud", desc: "Iced latte, cardamom syrup, cold foam", price: "6.2" },
      { name: "Harbour Mocha", desc: "70% single-origin chocolate, sea salt", price: "5.9" },
    ],
  },
  {
    id: "bakery",
    label: "Bakery",
    note: "Baked downstairs every morning from 5:30.",
    items: [
      { name: "Brown Butter Canelé", desc: "Caramelised shell, custard heart", price: "4.2" },
      { name: "Cardamom Knot", desc: "Laminated sourdough, pearl sugar", price: "4.6", tag: "Sells out" },
      { name: "Dark Chocolate Cookie", desc: "Maldon salt, brown sugar, 48-hour dough", price: "3.9" },
      { name: "Olive Oil Cake", desc: "Blood orange, crème fraîche", price: "5.1" },
    ],
  },
];

export const GALLERY = [
  { src: "/media/gallery/ritual-steam.jpg", alt: "Steam rising from a rosetta latte in a dark stoneware cup", caption: "First light", span: "tall" },
  { src: "/media/gallery/origin-cherries.jpg", alt: "Ripe red coffee cherries drifting through highland mist", caption: "Huila, at harvest", span: "wide" },
  { src: "/media/gallery/roast-drum.jpg", alt: "Coffee beans turning in a glowing roaster", caption: "Minute eleven", span: "" },
  { src: "/media/gallery/pour.jpg", alt: "A thin stream of espresso pouring into a cup", caption: "The pour", span: "" },
  { src: "/media/gallery/green-beans.jpg", alt: "Green coffee beans in morning fog", caption: "Green, resting", span: "" },
  { src: "/media/gallery/rosetta.jpg", alt: "Close-up of a rosetta in milk foam", caption: "Rosetta, no. 4,112", span: "wide" },
] as const;

export const HOURS: { day: string; open: string; close: string; idx: number[] }[] = [
  { day: "Monday – Friday", open: "07:00", close: "18:00", idx: [1, 2, 3, 4, 5] },
  { day: "Saturday", open: "08:00", close: "19:00", idx: [6] },
  { day: "Sunday", open: "08:30", close: "16:00", idx: [0] },
];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Live open/closed line from HOURS, in the visitor's local time. */
export const openStatus = (now = new Date()) => {
  const day = (d: number) => HOURS.find((h) => h.idx.includes(d))!;
  const today = day(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= toMin(today.open) && mins < toMin(today.close)) return { open: true, text: `Open now · until ${today.close}` };
  if (mins < toMin(today.open)) return { open: false, text: `Closed now · opens ${today.open}` };
  return { open: false, text: `Closed now · opens ${day((now.getDay() + 1) % 7).open} tomorrow` };
};

export const ADDRESS = {
  line1: "9 Calder Row",
  line2: "Old Harbour Quarter, Port Ellery",
  email: "hello@velluto.example",
};
