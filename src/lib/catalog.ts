import heartthrobHotlineImage from "@/assets/heartthrob-hotline.jpeg.asset.json";
import morningSliceImage from "@/assets/morning-slice.jpg.asset.json";

export type ProductCategory =
  | "Art Postcards"
  | "Artistic Epoxy Keychains"
  | "Artistic Stickers"
  | "Bag Charms"
  | "Charm Earrings"
  | "Charm Necklace"
  | "Fridge Magnet"
  | "Handmade Hairclips"
  | "Handmade Worry Stones"
  | "Magnetic Bookmarks";

export type Product = {
  slug: string;
  name: string;
  emoji: string;
  price: number;
  category: ProductCategory;
  description: string;
  palette: "rose" | "blue" | "sage" | "butter" | "lilac";
  isNew?: boolean;
  featured?: boolean;
  outOfStock?: boolean;
  pricingSku?: "bag-charm";
  image?: string;
};

export const categories: ProductCategory[] = [
  "Art Postcards", "Artistic Epoxy Keychains", "Artistic Stickers", "Bag Charms",
  "Charm Earrings", "Charm Necklace", "Fridge Magnet", "Handmade Hairclips",
  "Handmade Worry Stones", "Magnetic Bookmarks",
];

const charmDescription = "A playful handmade clay bag charm, shaped and finished in small batches. Each piece carries tiny variations that make it entirely yours.";
const products: Product[] = [
  ["heartthrob-hotline", "Heartthrob Hotline", "☎️ 🐈 ❤️", "rose"],
  ["morning-slice", "Morning Slice", "🍞 🌸 🧈", "butter"],
  ["blueberry-bluff", "Blueberry Bluff", "🫐 🎲 💙", "blue"],
  ["olive-the-crab", "Olive the Crab", "🦀 🫒 🍅", "sage"],
  ["donut-dribble", "Donut Dribble", "🍩 🎱 ☕️", "lilac"],
  ["picnic-catch", "Picnic Catch", "🤍 🌷 🎱", "rose"],
  ["sunny-side-hotline", "Sunny Side Hotline", "☁️ ☎️ 🎲", "butter"],
  ["mermaids-daydream", "Mermaid's Daydream", "🐟 🐚 ☁️", "blue"],
].map(([slug, name, emoji, palette, outOfStock]) => ({
  slug: String(slug), name: String(name), emoji: String(emoji), palette: palette as Product["palette"],
  outOfStock: Boolean(outOfStock), price: 1899, category: "Bag Charms", description: charmDescription,
  isNew: true, pricingSku: "bag-charm",
}));

const reelProducts: Product[] = ([
  { slug: "favourite-meal-postcard", name: "Your favourite 🥗 meal postcard", emoji: "🥗 💌", price: 99, category: "Art Postcards", palette: "sage", description: "An original illustrated postcard for tiny notes and thoughtful corners." },
  { slug: "four-leaf-clover-keychain", name: "Four leaf clover epoxy keychain", emoji: "🍀 ✨", price: 99, category: "Artistic Epoxy Keychains", palette: "sage", description: "A pocket-sized lucky charm made from illustrated epoxy." },
  { slug: "lucky-girl-bookmark", name: "Lucky girl syndrome magnetic bookmark", emoji: "🔖 🍀", price: 119, category: "Magnetic Bookmarks", palette: "lilac", description: "A cheerful magnetic bookmark for your current read." },
  { slug: "cute-apple-keychain", name: "Cute apple epoxy keychain", emoji: "🍎 ✨", price: 99, category: "Artistic Epoxy Keychains", palette: "rose", description: "A bright illustrated apple charm for keys and pouches." },
  { slug: "collecting-boyfriends-bookmark", name: "Collecting boyfriends magnetic bookmark", emoji: "🔖 💌", price: 119, category: "Magnetic Bookmarks", palette: "rose", description: "A cheeky magnetic bookmark made for romance readers." },
  { slug: "tomato-worry-stone", name: "Tomato Worry Stone", emoji: "🍅 🤲", price: 249, category: "Handmade Worry Stones", palette: "rose", description: "A smooth handmade clay companion to hold on busy days." },
  { slug: "stickers-pack-14", name: "Stickers / Pack of 14", emoji: "🌈 ✂️", price: 599, category: "Artistic Stickers", palette: "blue", description: "Fourteen original illustrated stickers for journals, laptops and letters." },
  { slug: "do-it-for-the-plot-postcard", name: "Do it for the plot postcard", emoji: "🎬 💌", price: 99, category: "Art Postcards", palette: "butter", description: "An illustrated reminder to choose the memorable option." },
] as Product[]).map((product) => ({ ...product, featured: true }));

const categoryExtras: Product[] = [
  { slug: "tiny-bloom-earrings", name: "Tiny Bloom Earrings", emoji: "🌼 ✨", price: 649, category: "Charm Earrings", palette: "butter", description: "Delicate handmade charm earrings for everyday joy." },
  { slug: "cloud-nine-necklace", name: "Cloud Nine Necklace", emoji: "☁️ 🫧", price: 799, category: "Charm Necklace", palette: "blue", description: "A lighthearted clay charm necklace on a delicate chain." },
  { slug: "garden-note-magnet", name: "Garden Note Magnet", emoji: "🌷 🧲", price: 229, category: "Fridge Magnet", palette: "rose", description: "A hand-painted magnet for lists, photos and little reminders." },
  { slug: "daisy-day-hairclips", name: "Daisy Day Hairclips", emoji: "🌼 🎀", price: 399, category: "Handmade Hairclips", palette: "lilac", description: "A pair of hand-shaped clay clips with a playful floral finish." },
];

export const allProducts: Product[] = [...products, ...reelProducts, ...categoryExtras];
const heartthrobHotline = allProducts.find((product) => product.slug === "heartthrob-hotline");
if (heartthrobHotline) heartthrobHotline.image = heartthrobHotlineImage.url;
const morningSlice = allProducts.find((product) => product.slug === "morning-slice");
if (morningSlice) morningSlice.image = morningSliceImage.url;
export const newArrivals = allProducts.filter((product) => product.isNew);
export const reelFeatures = allProducts.filter((product) => product.featured);
export const getProduct = (slug: string) => allProducts.find((product) => product.slug === slug);
export const formatINR = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
