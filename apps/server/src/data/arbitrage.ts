export interface ArbitrageTemplate {
  id: string;
  title: string;
  singleName: string;
  packName: string;
  unitName: string;
  basePricePence: number;
  sizes: readonly number[];
}

// Each entry is a distinct repacking problem. Twenty have two formats, twenty
// have three, and twenty have four; daily prices vary with the game's seed.
export const arbitrageTemplates: readonly ArbitrageTemplate[] = [
  { id: "water", title: "Water Depot", singleName: "Bottle", packName: "Case", unitName: "bottles", basePricePence: 125, sizes: [1, 4, 6] },
  { id: "rice", title: "Rice Exchange", singleName: "Bag", packName: "Sack", unitName: "bags", basePricePence: 250, sizes: [1, 5] },
  { id: "coffee", title: "Coffee Corner", singleName: "Coffee bag", packName: "Box", unitName: "bags", basePricePence: 650, sizes: [1, 3, 6, 12] },
  { id: "flour", title: "Flour Mill", singleName: "Flour bag", packName: "Sack", unitName: "bags", basePricePence: 150, sizes: [1, 4] },
  { id: "sugar", title: "Sugar Store", singleName: "Sugar bag", packName: "Crate", unitName: "bags", basePricePence: 180, sizes: [1, 3, 8] },
  { id: "salt", title: "Salt Merchant", singleName: "Salt pouch", packName: "Carton", unitName: "pouches", basePricePence: 85, sizes: [1, 4, 6, 10] },
  { id: "tea", title: "Tea House", singleName: "Tea tin", packName: "Chest", unitName: "tins", basePricePence: 420, sizes: [1, 6] },
  { id: "olive-oil", title: "Olive Oil Stall", singleName: "Oil bottle", packName: "Case", unitName: "bottles", basePricePence: 800, sizes: [1, 4, 6] },
  { id: "milk", title: "Milk Market", singleName: "Milk carton", packName: "Crate", unitName: "cartons", basePricePence: 145, sizes: [1, 2, 6, 12] },
  { id: "orange-juice", title: "Juice Stand", singleName: "Juice bottle", packName: "Case", unitName: "bottles", basePricePence: 220, sizes: [1, 4] },
  { id: "apples", title: "Apple Orchard", singleName: "Apple", packName: "Basket", unitName: "apples", basePricePence: 65, sizes: [1, 6, 10] },
  { id: "oranges", title: "Orange Grove", singleName: "Orange", packName: "Crate", unitName: "oranges", basePricePence: 70, sizes: [1, 4, 8, 12] },
  { id: "bananas", title: "Banana Stand", singleName: "Banana", packName: "Bunch", unitName: "bananas", basePricePence: 40, sizes: [1, 6] },
  { id: "potatoes", title: "Potato Shed", singleName: "Potato bag", packName: "Sack", unitName: "bags", basePricePence: 160, sizes: [1, 3, 5] },
  { id: "tomatoes", title: "Tomato Garden", singleName: "Tomato punnet", packName: "Crate", unitName: "punnets", basePricePence: 175, sizes: [1, 2, 4, 6] },
  { id: "onions", title: "Onion Cart", singleName: "Onion bag", packName: "Sack", unitName: "bags", basePricePence: 130, sizes: [1, 8] },
  { id: "eggs", title: "Egg Trader", singleName: "Egg", packName: "Carton", unitName: "eggs", basePricePence: 35, sizes: [1, 6, 12] },
  { id: "chocolate", title: "Chocolate Shop", singleName: "Chocolate bar", packName: "Box", unitName: "bars", basePricePence: 150, sizes: [1, 3, 6, 9] },
  { id: "cookies", title: "Cookie Counter", singleName: "Cookie pack", packName: "Tin", unitName: "packs", basePricePence: 200, sizes: [1, 5] },
  { id: "honey", title: "Honey Hive", singleName: "Honey jar", packName: "Case", unitName: "jars", basePricePence: 550, sizes: [1, 4, 6] },
  { id: "pasta", title: "Pasta Pantry", singleName: "Pasta pack", packName: "Box", unitName: "packs", basePricePence: 140, sizes: [1, 2, 5, 10] },
  { id: "oats", title: "Oat Barn", singleName: "Oat bag", packName: "Sack", unitName: "bags", basePricePence: 190, sizes: [1, 6] },
  { id: "beans", title: "Bean Warehouse", singleName: "Bean tin", packName: "Case", unitName: "tins", basePricePence: 95, sizes: [1, 4, 12] },
  { id: "lentils", title: "Lentil Merchant", singleName: "Lentil bag", packName: "Crate", unitName: "bags", basePricePence: 210, sizes: [1, 3, 5, 15] },
  { id: "cereal", title: "Cereal Store", singleName: "Cereal box", packName: "Carton", unitName: "boxes", basePricePence: 350, sizes: [1, 4] },
  { id: "butter", title: "Butter Dairy", singleName: "Butter block", packName: "Tray", unitName: "blocks", basePricePence: 225, sizes: [1, 3, 6] },
  { id: "cheese", title: "Cheese Cellar", singleName: "Cheese wedge", packName: "Box", unitName: "wedges", basePricePence: 475, sizes: [1, 2, 4, 8] },
  { id: "yogurt", title: "Yogurt Counter", singleName: "Yogurt pot", packName: "Tray", unitName: "pots", basePricePence: 85, sizes: [1, 6] },
  { id: "bread", title: "Bread Bakery", singleName: "Loaf", packName: "Basket", unitName: "loaves", basePricePence: 185, sizes: [1, 4, 8] },
  { id: "soap", title: "Soap Workshop", singleName: "Soap bar", packName: "Box", unitName: "bars", basePricePence: 120, sizes: [1, 3, 6, 12] },
  { id: "shampoo", title: "Shampoo Shelf", singleName: "Shampoo bottle", packName: "Case", unitName: "bottles", basePricePence: 450, sizes: [1, 4] },
  { id: "toothpaste", title: "Toothpaste Depot", singleName: "Toothpaste tube", packName: "Box", unitName: "tubes", basePricePence: 275, sizes: [1, 3, 6] },
  { id: "tissues", title: "Tissue Trader", singleName: "Tissue box", packName: "Carton", unitName: "boxes", basePricePence: 135, sizes: [1, 2, 5, 10] },
  { id: "paper-towels", title: "Paper Towel Stand", singleName: "Towel roll", packName: "Pack", unitName: "rolls", basePricePence: 160, sizes: [1, 6] },
  { id: "detergent", title: "Laundry Stall", singleName: "Detergent bottle", packName: "Case", unitName: "bottles", basePricePence: 650, sizes: [1, 4, 8] },
  { id: "sponges", title: "Sponge Shop", singleName: "Sponge", packName: "Pack", unitName: "sponges", basePricePence: 45, sizes: [1, 3, 6, 12] },
  { id: "candles", title: "Candle Maker", singleName: "Candle", packName: "Box", unitName: "candles", basePricePence: 280, sizes: [1, 4] },
  { id: "batteries", title: "Battery Booth", singleName: "Battery", packName: "Pack", unitName: "batteries", basePricePence: 110, sizes: [1, 4, 8] },
  { id: "notebooks", title: "Notebook Nook", singleName: "Notebook", packName: "Bundle", unitName: "notebooks", basePricePence: 240, sizes: [1, 3, 5, 10] },
  { id: "pencils", title: "Pencil Cart", singleName: "Pencil", packName: "Box", unitName: "pencils", basePricePence: 40, sizes: [1, 12] },
  { id: "pens", title: "Pen Station", singleName: "Pen", packName: "Pack", unitName: "pens", basePricePence: 95, sizes: [1, 5, 10] },
  { id: "erasers", title: "Eraser Emporium", singleName: "Eraser", packName: "Box", unitName: "erasers", basePricePence: 55, sizes: [1, 4, 6, 12] },
  { id: "markers", title: "Marker Market", singleName: "Marker", packName: "Set", unitName: "markers", basePricePence: 150, sizes: [1, 6] },
  { id: "paper", title: "Paper Warehouse", singleName: "Paper pack", packName: "Carton", unitName: "packs", basePricePence: 480, sizes: [1, 3, 5] },
  { id: "envelopes", title: "Envelope Desk", singleName: "Envelope", packName: "Bundle", unitName: "envelopes", basePricePence: 35, sizes: [1, 5, 10, 20] },
  { id: "tape", title: "Tape Trader", singleName: "Tape roll", packName: "Pack", unitName: "rolls", basePricePence: 175, sizes: [1, 6] },
  { id: "lightbulbs", title: "Lighting Lane", singleName: "Lightbulb", packName: "Box", unitName: "lightbulbs", basePricePence: 425, sizes: [1, 2, 6] },
  { id: "screws", title: "Screw Supplier", singleName: "Screw pack", packName: "Box", unitName: "packs", basePricePence: 180, sizes: [1, 3, 6, 12] },
  { id: "nails", title: "Nail Merchant", singleName: "Nail pack", packName: "Box", unitName: "packs", basePricePence: 160, sizes: [1, 8] },
  { id: "paint", title: "Paint Workshop", singleName: "Paint tin", packName: "Case", unitName: "tins", basePricePence: 950, sizes: [1, 3, 6] },
  { id: "rope", title: "Rope Stall", singleName: "Rope coil", packName: "Bundle", unitName: "coils", basePricePence: 375, sizes: [1, 2, 4, 8] },
  { id: "seeds", title: "Seed Exchange", singleName: "Seed packet", packName: "Box", unitName: "packets", basePricePence: 140, sizes: [1, 10] },
  { id: "soil", title: "Garden Soil Depot", singleName: "Soil bag", packName: "Pallet", unitName: "bags", basePricePence: 550, sizes: [1, 4, 8] },
  { id: "fertilizer", title: "Fertilizer Farm", singleName: "Fertilizer bag", packName: "Sack", unitName: "bags", basePricePence: 750, sizes: [1, 3, 6, 9] },
  { id: "flowerpots", title: "Pottery Bench", singleName: "Flowerpot", packName: "Tray", unitName: "pots", basePricePence: 325, sizes: [1, 4] },
  { id: "birdseed", title: "Birdseed Barn", singleName: "Birdseed bag", packName: "Sack", unitName: "bags", basePricePence: 280, sizes: [1, 3, 6] },
  { id: "pet-food", title: "Pet Food Pantry", singleName: "Food tin", packName: "Case", unitName: "tins", basePricePence: 145, sizes: [1, 4, 6, 12] },
  { id: "tennis-balls", title: "Tennis Counter", singleName: "Tennis ball", packName: "Tube", unitName: "balls", basePricePence: 160, sizes: [1, 3] },
  { id: "golf-balls", title: "Golf Goods", singleName: "Golf ball", packName: "Box", unitName: "balls", basePricePence: 225, sizes: [1, 3, 12] },
  { id: "shuttlecocks", title: "Badminton Booth", singleName: "Shuttlecock", packName: "Tube", unitName: "shuttlecocks", basePricePence: 190, sizes: [1, 3, 6, 12] },
];
