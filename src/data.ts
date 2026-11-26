export type Category =
  | "Rau củ"
  | "Trái cây"
  | "Thịt"
  | "Hải sản"
  | "Trứng"
  | "Sữa"
  | "Tinh bột"
  | "Đậu & hạt"
  | "Gia vị"
  | "Khác";
export type Ingredient = {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  emoji: string;
  parentId?: string;
  vegan?: boolean;
  containsMeat?: boolean;
  containsSeafood?: boolean;
  requiresDefrost?: boolean;
  defaultUnit?: string;
  commonUnits?: string[];
};
// Wikimedia Commons' Special:FilePath endpoint selects a matching real photo
// from the ingredient name; callers retain the existing emoji as a fallback.
export const ingredientImage = (name: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=160`;
export const ingredients: Ingredient[] = [
{ id: 'bell-pepper', name: 'Ớt chuông', aliases: ["ớt ngọt", "bell pepper"], category: 'Rau củ', emoji: '🫑' },
  { id: 'broccoli', name: 'Bông cải xanh', aliases: ["súp lơ xanh", "broccoli"], category: 'Rau củ', emoji: '🥦' },
  { id: 'cauliflower', name: 'Súp lơ trắng', aliases: ["bông cải trắng", "cauliflower"], category: 'Rau củ', emoji: '🥦' },
  { id: 'bok-choy', name: 'Cải thìa', aliases: ["bok choy"], category: 'Rau củ', emoji: '🥬' },
  { id: 'water-spinach', name: 'Rau muống', aliases: ["water spinach"], category: 'Rau củ', emoji: '🥬' },
  { id: 'rau-lan', name: 'Rau lan', aliases: ["rau lan"], category: 'Rau củ', emoji: '🌿' },
  { id: 'kale', name: 'Cải xoăn', aliases: ["kale"], category: 'Rau củ', emoji: '🥬' },
  { id: 'lettuce', name: 'Xà lách', aliases: ["rau xà lách", "lettuce"], category: 'Rau củ', emoji: '🥬' },
  { id: 'celery', name: 'Cần tây', aliases: ["celery"], category: 'Rau củ', emoji: '🌿' },
  { id: 'ginger', name: 'Gừng', aliases: ["ginger"], category: 'Gia vị', emoji: '🫚' },
  { id: 'lemongrass', name: 'Sả', aliases: ["lemongrass"], category: 'Gia vị', emoji: '🌾' },
  { id: 'cilantro', name: 'Ngò rí', aliases: ["rau mùi", "cilantro", "coriander"], category: 'Rau củ', emoji: '🌿' },
  { id: 'basil', name: 'Rau húng', aliases: ["húng quế", "basil"], category: 'Rau củ', emoji: '🌱' },
  { id: 'mint', name: 'Bạc hà', aliases: ["mint"], category: 'Rau củ', emoji: '🌿' },
  { id: 'eggplant', name: 'Cà tím', aliases: ["aubergine", "eggplant"], category: 'Rau củ', emoji: '🍆' },
  { id: 'zucchini', name: 'Bí ngòi', aliases: ["zucchini"], category: 'Rau củ', emoji: '🥒' },
  { id: 'chayote', name: 'Su su', aliases: ["chayote"], category: 'Rau củ', emoji: '🥒' },
  { id: 'radish', name: 'Củ cải trắng', aliases: ["daikon", "radish"], category: 'Rau củ', emoji: '🥕' },
  { id: 'lotus-root', name: 'Ngó sen', aliases: ["củ sen", "lotus root"], category: 'Rau củ', emoji: '🪷' },
  { id: 'green-beans', name: 'Đậu que', aliases: ["đậu cô ve", "green beans"], category: 'Rau củ', emoji: '🫛' },
  { id: 'snow-peas', name: 'Đậu Hà Lan', aliases: ["đậu hà lan", "peas"], category: 'Rau củ', emoji: '🫛' },
  { id: 'asparagus', name: 'Măng tây', aliases: ["asparagus"], category: 'Rau củ', emoji: '🌱' },
  { id: 'bamboo-shoot', name: 'Măng', aliases: ["bamboo shoot"], category: 'Rau củ', emoji: '🎋' },
  { id: 'bitter-melon', name: 'Khổ qua', aliases: ["mướp đắng", "bitter melon"], category: 'Rau củ', emoji: '🥒' },
  { id: 'luffa', name: 'Mướp', aliases: ["luffa"], category: 'Rau củ', emoji: '🥒' },
  { id: 'bottle-gourd', name: 'Bầu', aliases: ["bầu sao", "bầu non", "bottle gourd"], category: 'Rau củ', emoji: '🥒' },
  { id: 'winter-melon', name: 'Bí đao', aliases: ["winter melon"], category: 'Rau củ', emoji: '🍈' },
  { id: 'okra', name: 'Đậu bắp', aliases: ["okra"], category: 'Rau củ', emoji: '🌱' },
  { id: 'taro', name: 'Khoai môn', aliases: ["taro"], category: 'Rau củ', emoji: '🍠' },
  { id: 'purple-yam', name: 'Khoai mỡ', aliases: ["khoai tím", "purple yam", "ube"], category: 'Rau củ', emoji: '🍠' },
  { id: 'ginger-root', name: 'Củ nghệ', aliases: ["nghệ", "turmeric"], category: 'Gia vị', emoji: '🫚' },
  { id: 'beef-brisket', name: 'Nạm bò', aliases: ["beef brisket"], category: 'Thịt', emoji: '🥩', parentId: 'beef' },
  { id: 'beef-sirloin', name: 'Thăn bò', aliases: ["beef sirloin"], category: 'Thịt', emoji: '🥩', parentId: 'beef' },
  { id: 'beef-bones', name: 'Xương bò', aliases: ["beef bones"], category: 'Thịt', emoji: '🦴', parentId: 'beef' },
  { id: 'apple', name: 'Táo', aliases: ["apple"], category: 'Trái cây', emoji: '🍎' },
  { id: 'orange', name: 'Cam', aliases: ["orange"], category: 'Trái cây', emoji: '🍊' },
  { id: 'mango', name: 'Xoài', aliases: ["mango"], category: 'Trái cây', emoji: '🥭' },
{ id: 'pineapple', name: 'Thơm', aliases: ["dứa", "khóm", "pineapple"], category: 'Trái cây', emoji: '🍍' },
  { id: 'avocado', name: 'Bơ trái', aliases: ["avocado"], category: 'Trái cây', emoji: '🥑' },
  { id: 'papaya', name: 'Đu đủ', aliases: ["papaya"], category: 'Trái cây', emoji: '🥭' },
  { id: 'watermelon', name: 'Dưa hấu', aliases: ["watermelon"], category: 'Trái cây', emoji: '🍉' },
  { id: 'grape', name: 'Nho', aliases: ["grape"], category: 'Trái cây', emoji: '🍇' },
  { id: 'strawberry', name: 'Dâu tây', aliases: ["strawberry"], category: 'Trái cây', emoji: '🍓' },
  { id: 'pear', name: 'Lê', aliases: ["pear"], category: 'Trái cây', emoji: '🍐' },
  { id: 'leek', name: 'Tỏi tây', aliases: ["leek"], category: 'Rau củ', emoji: '🥬' },
  { id: 'pork-belly', name: 'Ba chỉ heo', aliases: ["thịt ba chỉ", "pork belly", "pork belly sliced"], category: 'Thịt', emoji: '🥓', parentId: 'pork' },
  { id: 'ground-pork', name: 'Thịt heo xay', aliases: ["thịt băm", "ground pork", "pork mince"], category: 'Thịt', emoji: '🥩', parentId: 'pork' },
  { id: 'sausage', name: 'Xúc xích', aliases: ["sausage"], category: 'Thịt', emoji: '🌭' },
  { id: 'bacon', name: 'Thịt xông khói', aliases: ["bacon"], category: 'Thịt', emoji: '🥓' },
  { id: 'duck', name: 'Thịt vịt', aliases: ["duck"], category: 'Thịt', emoji: '🦆' },
  { id: 'frozen-fried-chicken', name: 'Gà rán đông lạnh', aliases: ["gà rán", "frozen fried chicken"], category: 'Thịt', emoji: '🍗', containsMeat: true },
  { id: 'nem-chua-ran', name: 'Nem chua rán', aliases: ["nem chua ran"], category: 'Thịt', emoji: '🍖', containsMeat: true },
  { id: 'roast-duck', name: 'Vịt quay', aliases: ["vịt quay Bắc Kinh", "duck roast", "roast duck"], category: 'Thịt', emoji: '🦆', containsMeat: true },
  { id: 'pha-lau', name: 'Phá lấu', aliases: ["phá lấu bò", "phá lấu heo", "pha lau", "stewed offal"], category: 'Thịt', emoji: '🍲', containsMeat: true },
  { id: 'chicken-wing', name: 'Cánh gà', aliases: ["chicken wing"], category: 'Thịt', emoji: '🍗', parentId: 'chicken' },
  { id: 'salmon', name: 'Cá hồi', aliases: ["salmon"], category: 'Hải sản', emoji: '🐟' },
  { id: 'tuna', name: 'Cá ngừ', aliases: ["tuna"], category: 'Hải sản', emoji: '🐟' },
  { id: 'squid', name: 'Mực', aliases: ["squid", "calamari"], category: 'Hải sản', emoji: '🦑' },
  { id: 'crab', name: 'Cua', aliases: ["crab"], category: 'Hải sản', emoji: '🦀' },
  { id: 'clams', name: 'Nghêu', aliases: ["ngao", "clams"], category: 'Hải sản', emoji: '🐚' },
  { id: 'fish-cake', name: 'Chả cá', aliases: ["fish cake"], category: 'Hải sản', emoji: '🍥' },
  { id: 'quail', name: 'Chim cút', aliases: ["quail"], category: 'Thịt', emoji: '🍗' },
  { id: 'duck-egg', name: 'Trứng vịt', aliases: ["duck egg"], category: 'Trứng', emoji: '🥚' },
  { id: 'cream-cheese', name: 'Phô mai kem', aliases: ["cream cheese"], category: 'Sữa', emoji: '🧀' },
  { id: 'cheese', name: 'Phô mai', aliases: ["cheese"], category: 'Sữa', emoji: '🧀' },
  { id: 'condensed-milk', name: 'Sữa đặc', aliases: ["condensed milk"], category: 'Sữa', emoji: '🥛' },
  { id: 'cream', name: 'Kem tươi', aliases: ["heavy cream"], category: 'Sữa', emoji: '🥛' },
  { id: 'vermicelli', name: 'Bún tươi', aliases: ["bún", "rice vermicelli"], category: 'Tinh bột', emoji: '🍜' },
  { id: 'pho-noodle', name: 'Bánh phở', aliases: ["phở", "pho noodles", "flat rice noodles"], category: 'Tinh bột', emoji: '🍜' },
  { id: 'hu-tieu', name: 'Hủ tiếu', aliases: ["sợi hủ tiếu", "hu tieu"], category: 'Tinh bột', emoji: '🍜' },
  { id: 'fresh-noodle', name: 'Mì tươi', aliases: ["fresh noodles"], category: 'Tinh bột', emoji: '🍜' },
  { id: 'rice-paper', name: 'Bánh tráng', aliases: ["rice paper"], category: 'Tinh bột', emoji: '🫓' },
  { id: 'sticky-rice', name: 'Gạo nếp', aliases: ["nếp", "sticky rice"], category: 'Tinh bột', emoji: '🍚' },
  { id: 'flour', name: 'Bột mì', aliases: ["flour"], category: 'Tinh bột', emoji: '🌾' },
  { id: 'rice-flour', name: 'Bột gạo', aliases: ["rice flour"], category: 'Tinh bột', emoji: '🌾' },
  { id: 'cornstarch', name: 'Bột bắp', aliases: ["corn starch"], category: 'Tinh bột', emoji: '🌽' },
  { id: 'lentils', name: 'Đậu lăng', aliases: ["lentils"], category: 'Đậu & hạt', emoji: '🫘' },
  { id: 'mung-beans', name: 'Đậu xanh', aliases: ["mung beans"], category: 'Đậu & hạt', emoji: '🫘' },
  { id: 'black-beans', name: 'Đậu đen', aliases: ["black beans"], category: 'Đậu & hạt', emoji: '🫘' },
  { id: 'cashew', name: 'Hạt điều', aliases: ["cashew"], category: 'Đậu & hạt', emoji: '🥜' },
  { id: 'sesame', name: 'Mè', aliases: ["vừng", "sesame"], category: 'Đậu & hạt', emoji: '🌰' },
  { id: 'curry-powder', name: 'Bột cà ri', aliases: ["curry powder"], category: 'Gia vị', emoji: '🫙' },
  { id: 'five-spice', name: 'Ngũ vị hương', aliases: ["five spice"], category: 'Gia vị', emoji: '🫙' },
  { id: 'vinegar', name: 'Giấm', aliases: ["vinegar"], category: 'Gia vị', emoji: '🫙' },
  { id: 'rice-vinegar', name: 'Giấm gạo', aliases: ["rice vinegar"], category: 'Gia vị', emoji: '🫙', parentId: 'vinegar' },
  { id: 'honey', name: 'Mật ong', aliases: ["honey"], category: 'Gia vị', emoji: '🍯', vegan: false },
  { id: 'mayonnaise', name: 'Mayonnaise', aliases: ["sốt mayonnaise", "mayo"], category: 'Gia vị', emoji: '🫙', vegan: false },
  { id: 'ketchup', name: 'Tương cà', aliases: ["ketchup"], category: 'Gia vị', emoji: '🫙' },
  { id: 'chili-sauce', name: 'Tương ớt', aliases: ["chili sauce"], category: 'Gia vị', emoji: '🌶️' },
  { id: 'stock-cube', name: 'Hạt nêm', aliases: ["viên súp", "bouillon cube", "hạt nêm Knorr", "hạt nêm Aji-ngon", "bột nêm rau củ"], category: 'Gia vị', emoji: '🧊', vegan: false, containsMeat: true },
  { id: 'cooking-wine', name: 'Rượu nấu ăn', aliases: ["cooking wine"], category: 'Gia vị', emoji: '🍶' },
  { id: 'tamarind', name: 'Me', aliases: ["tamarind"], category: 'Gia vị', emoji: '🫘' },
  { id: 'dried-shrimp', name: 'Tôm khô', aliases: ["dried shrimp"], category: 'Hải sản', emoji: '🦐' },
  { id: 'dried-mushroom', name: 'Nấm khô', aliases: ["nấm hương", "shiitake"], category: 'Rau củ', emoji: '🍄' },
  { id: 'kimchi', name: 'Kim chi', aliases: ["kimchi"], category: 'Khác', emoji: '🥬' },
  { id: 'tofu-skin', name: 'Tàu hũ ky', aliases: ["váng đậu", "tofu skin"], category: 'Đậu & hạt', emoji: '🫘' },
  { id: 'frozen-vegetables', name: 'Rau củ đông lạnh', aliases: ["frozen vegetables"], category: 'Rau củ', emoji: '🥦' },
  { id: 'water', name: 'Nước lọc', aliases: ["water"], category: 'Khác', emoji: '💧' },

  {
    id: "carrot",
    name: "Cà rốt",
    aliases: ["carrot"],
    category: "Rau củ",
    emoji: "🥕",
  },
  {
    id: "bean-sprout",
    name: "Giá đỗ",
    aliases: ["giá", "bean sprouts", "mung bean sprouts"],
    category: "Rau củ",
    emoji: "🌱",
  },
  {
    id: "tomato",
    name: "Cà chua",
    aliases: ["tomato"],
    category: "Rau củ",
    emoji: "🍅",
    defaultUnit: "quả",
  },
  {
    id: "onion",
    name: "Hành tây",
    aliases: ["onion"],
    category: "Rau củ",
    emoji: "🧅",
  },
  {
    id: "garlic",
    name: "Tỏi",
    aliases: ["garlic"],
    category: "Gia vị",
    emoji: "🧄",
  },
  {
    id: "scallion",
    name: "Hành lá",
    aliases: ["green onion", "spring onion"],
    category: "Rau củ",
    emoji: "🌿",
  },
  {
    id: "shallot",
    name: "Hành tím",
    aliases: ["shallot"],
    category: "Rau củ",
    emoji: "🧅",
  },
  {
    id: "cabbage",
    name: "Bắp cải",
    aliases: ["cabbage"],
    category: "Rau củ",
    emoji: "🥬",
  },
  {
    id: "spinach",
    name: "Rau cải",
    aliases: ["spinach", "greens"],
    category: "Rau củ",
    emoji: "🥬",
  },
  {
    id: "mushroom",
    name: "Nấm",
    aliases: ["mushroom"],
    category: "Rau củ",
    emoji: "🍄",
  },
  {
    id: "potato",
    name: "Khoai tây",
    aliases: ["potato"],
    category: "Rau củ",
    emoji: "🥔",
  },
  {
    id: "cucumber",
    name: "Dưa leo",
    aliases: ["dưa chuột", "cucumber"],
    category: "Rau củ",
    emoji: "🥒",
  },
  {
    id: "banana",
    name: "Chuối",
    aliases: ["banana"],
    category: "Trái cây",
    emoji: "🍌",
  },
  {
    id: "chicken",
    name: "Thịt gà",
    aliases: ["gà", "chicken"],
    category: "Thịt",
    emoji: "🍗",
  },
  {
    id: "pork",
    name: "Thịt heo",
    aliases: ["thịt lợn", "pork"],
    category: "Thịt",
    emoji: "🥩",
    defaultUnit: "g",
  },
  {
    id: "beef",
    name: "Thịt bò",
    aliases: ["beef"],
    category: "Thịt",
    emoji: "🥩",
  },
  {
    id: "shrimp",
    name: "Tôm",
    aliases: ["shrimp", "prawn"],
    category: "Hải sản",
    emoji: "🦐",
  },
  {
    id: "fish",
    name: "Cá",
    aliases: ["fish"],
    category: "Hải sản",
    emoji: "🐟",
  },
  {
    id: "egg",
    name: "Trứng gà",
    aliases: ["trứng", "egg", "eggs"],
    category: "Trứng",
    emoji: "🥚",
    defaultUnit: "quả",
  },
  {
    id: "quail-egg",
    name: "Trứng cút",
    aliases: ["quail eggs"],
    category: "Trứng",
    emoji: "🥚",
  },
  {
    id: "fish-ball",
    name: "Cá viên chiên",
    aliases: ["cá viên", "fish balls"],
    category: "Hải sản",
    emoji: "🍢",
    containsSeafood: true,
  },
  {
    id: "ha-cao",
    name: "Há cảo",
    aliases: ["há cảo", "dumplings"],
    category: "Hải sản",
    emoji: "🥟",
    containsSeafood: true,
  },
  {
    id: "cha-lua",
    name: "Chả lụa",
    aliases: ["giò lụa", "vietnamese pork sausage"],
    category: "Thịt",
    emoji: "🍖",
    containsMeat: true,
  },
  {
    id: "lap-xuong",
    name: "Lạp xưởng",
    aliases: ["lạp xường", "chinese sausage"],
    category: "Thịt",
    emoji: "🥓",
    containsMeat: true,
  },
  {
    id: "cha-gio",
    name: "Chả giò",
    aliases: ["nem rán", "spring rolls"],
    category: "Thịt",
    emoji: "🥠",
    containsMeat: true,
  },
  {
    id: "milk",
    name: "Sữa tươi",
    aliases: ["milk"],
    category: "Sữa",
    emoji: "🥛",
  },
  {
    id: "yogurt",
    name: "Sữa chua",
    aliases: ["yogurt", "yoghurt"],
    category: "Sữa",
    emoji: "🥣",
  },
  {
    id: "rice",
    name: "Cơm",
    aliases: ["gạo", "rice"],
    category: "Tinh bột",
    emoji: "🍚",
  },
  {
    id: "noodle",
    name: "Mì",
    aliases: ["mì gói", "noodles"],
    category: "Tinh bột",
    emoji: "🍜",
  },
  {
    id: "glass-noodle",
    name: "Miến dong",
    aliases: ["miến", "glass noodles", "mung bean noodles"],
    category: "Tinh bột",
    emoji: "🍜",
  },
  {
    id: "nui",
    name: "Nui",
    aliases: ["macaroni", "pasta shells"],
    category: "Tinh bột",
    emoji: "🍝",
  },
  {
    id: "bread",
    name: "Bánh mì",
    aliases: ["bread"],
    category: "Tinh bột",
    emoji: "🍞",
  },
  {
    id: "tofu",
    name: "Đậu hũ",
    aliases: ["đậu phụ", "tofu"],
    category: "Đậu & hạt",
    emoji: "🧈",
  },
  {
    id: "peanut",
    name: "Đậu phộng",
    aliases: ["lạc", "peanut"],
    category: "Đậu & hạt",
    emoji: "🥜",
  },
  {
    id: "fish-sauce",
    name: "Nước mắm",
    aliases: ["fish sauce"],
    category: "Gia vị",
    emoji: "🫙",
    vegan: false,
    containsSeafood: true,
  },
  {
    id: "soy-sauce",
    name: "Nước tương",
    aliases: ["xì dầu", "soy sauce"],
    category: "Gia vị",
    emoji: "🫙",
  },
  {
    id: "oil",
    name: "Dầu ăn",
    aliases: ["cooking oil"],
    category: "Gia vị",
    emoji: "🫒",
  },
  {
    id: "salt",
    name: "Muối",
    aliases: ["salt"],
    category: "Gia vị",
    emoji: "🧂",
  },
  {
    id: "sugar",
    name: "Đường",
    aliases: ["sugar"],
    category: "Gia vị",
    emoji: "🍬",
  },
  {
    id: "lime",
    name: "Chanh",
    aliases: ["lime", "lemon"],
    category: "Trái cây",
    emoji: "🍋",
  },
  {
    id: "chili",
    name: "Ớt",
    aliases: ["chili", "chilli"],
    category: "Gia vị",
    emoji: "🌶️",
  },
  {
    id: "oyster-sauce",
    name: "Dầu hào",
    aliases: ["oyster sauce"],
    category: "Gia vị",
    emoji: "🫙",
    vegan: false,
    containsSeafood: true,
  },
  {
    id: "coconut-milk",
    name: "Nước cốt dừa",
    aliases: ["coconut milk"],
    category: "Sữa",
    emoji: "🥥",
    vegan: true,
  },
  {
    id: "pumpkin",
    name: "Bí đỏ",
    aliases: ["pumpkin"],
    category: "Rau củ",
    emoji: "🎃",
  },
  {
    id: "sweet-potato",
    name: "Khoai lang",
    aliases: ["sweet potato"],
    category: "Rau củ",
    emoji: "🍠",
  },
  {
    id: "corn",
    name: "Bắp",
    aliases: ["ngô", "corn"],
    category: "Rau củ",
    emoji: "🌽",
  },
  {
    id: "oats",
    name: "Yến mạch",
    aliases: ["oats", "oatmeal"],
    category: "Tinh bột",
    emoji: "🌾",
  },
  {
    id: "butter",
    name: "Bơ lạt",
    aliases: ["butter"],
    category: "Sữa",
    emoji: "🧈",
  },
  {
    id: "pasta",
    name: "Mì Ý",
    aliases: ["pasta", "spaghetti"],
    category: "Tinh bột",
    emoji: "🍝",
  },
  { id: "rice-stick-noodle", name: "Mì chũ", aliases: ["bánh đa", "rice vermicelli sheets"], category: "Tinh bột", emoji: "🍜" },
  { id: "coconut-flakes", name: "Dừa nạo sấy", aliases: ["dried shredded coconut"], category: "Trái cây", emoji: "🥥" },
  { id: "cai-ngot", name: "Cải ngọt", aliases: ["choy sum", "yu choy"], category: "Rau củ", emoji: "🥬" },
  { id: "vegan-stock-cube", name: "Hạt nêm rau củ", aliases: ["hạt nêm chay", "vegetable stock powder"], category: "Gia vị", emoji: "🧊", vegan: true },
  { id: "vanilla", name: "Vani", aliases: ["vanilla extract", "vanilla essence"], category: "Gia vị", emoji: "🧴" },
  { id: "margarine", name: "Bơ thực vật", aliases: ["margarine"], category: "Gia vị", emoji: "🧈" },
  { id: "rock-sugar", name: "Đường phèn", aliases: ["rock sugar"], category: "Gia vị", emoji: "🧊" },
  { id: "pandan-leaf", name: "Lá dứa", aliases: ["lá nếp", "pandan leaf"], category: "Rau củ", emoji: "🌿" },
  { id: "chicken-foot", name: "Chân gà", aliases: ["chicken feet", "chicken paws"], category: "Thịt", emoji: "🍗", parentId: "chicken" },
  { id: "bbq-sauce", name: "Sốt thịt nướng", aliases: ["barbecue sauce", "bbq sauce"], category: "Gia vị", emoji: "🫙" },
  { id: "shrimp-satay", name: "Sa tế tôm", aliases: ["shrimp satay"], category: "Gia vị", emoji: "🌶️", containsSeafood: true },
  { id: "mixed-herbs", name: "Lá thơm tổng hợp", aliases: ["mixed herbs", "herbes de provence"], category: "Gia vị", emoji: "🌿" },
  { id: "dill", name: "Thì là", aliases: ["dill"], category: "Rau củ", emoji: "🌿" },
  { id: "culantro", name: "Ngò gai", aliases: ["culantro", "sawtooth coriander"], category: "Rau củ", emoji: "🌿" },
  { id: "rau-ram", name: "Rau răm", aliases: ["Vietnamese coriander", "rau ram"], category: "Rau củ", emoji: "🌿" },
  { id: "kaffir-lime-leaf", name: "Lá chanh", aliases: ["kaffir lime leaf"], category: "Gia vị", emoji: "🍃" },
  { id: "pepper", name: "Tiêu", aliases: ["black pepper", "ground pepper"], category: "Gia vị", emoji: "🧂" },
  { id: "sesame-oil", name: "Dầu mè", aliases: ["sesame oil"], category: "Gia vị", emoji: "🫒" },
  { id: "vegan-fish-sauce", name: "Nước mắm chay", aliases: ["vegetarian fish sauce"], category: "Gia vị", emoji: "🫙", vegan: true },
  { id: "chicken-immature-eggs", name: "Trứng gà non", aliases: ["trứng non", "chicken immature eggs"], category: "Trứng", emoji: "🥚" },
];
export type RecipeIngredient = {
  ingredientId: string;
  sourceName?: string;
  quantity: number | null;
  unit: string;
  optional: boolean;
  role?: "main" | "required" | "seasoning" | "optional";
  note?: string;
  instructionAdded?: boolean;
};
export type RecipeStep = { order: number; instruction: string; durationMinutes?: number };
export type Recipe = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  imageFallbacks?: string[];
  publishedAt?: string;
  description: string;
  category: string;
  cuisine: "vietnamese" | "international" | "fusion";
  method: string;
  minutes: number | null;
  preparationTime: number | null;
  cookingTime: number | null;
  totalTime: number | null;
  difficulty: string;
  servings: number | null;
  required: string[];
  optional: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  equipment: string[];
  tips: string[];
  tags: string[];
  source: { type: "internal" | "website" | "youtube" | "tiktok" | "facebook"; url?: string; title: string };
  instructionReference?: { title: string; url: string; matchType: "exact" | "similar" };
  addedIngredients?: string[];
  verificationStatus: "verified" | "unverified" | "adapted";
  dataStatus: "full_recipe" | "ingredients_only" | "catalog_only";
};
const roleForIngredient = (ingredientId: string, optional: boolean): RecipeIngredient["role"] => {
  if (optional) return "optional";
  const category = ingredients.find((ingredient) => ingredient.id === ingredientId)?.category;
  if (category === "Gia vị") return "seasoning";
  if (["Thịt", "Hải sản", "Trứng", "Tinh bột"].includes(category ?? "")) return "main";
  return "required";
};
type RecipeSource = NonNullable<Recipe["instructionReference"]>;
const recipeSource = (url: string, title: string, matchType: RecipeSource["matchType"]): RecipeSource => ({ url, title, matchType });
const measured = (...items: Array<[string, number, string, boolean?]>): RecipeIngredient[] => items.map(([ingredientId, quantity, unit, optional = false]) => ({
  ingredientId, quantity, unit, optional, role: optional ? "optional" : roleForIngredient(ingredientId, false),
}));
const r = (id: string, name: string, emoji: string, category: string, method: string, minutes: number, required: string[], optional: string[], steps: string[], tips?: string): Recipe => ({
  id, slug: id, name, emoji, description: "", category,
  cuisine: ["pasta-tomato", "potato-mash"].includes(id) ? "international" : "vietnamese",
  method, minutes, preparationTime: null, cookingTime: null, totalTime: minutes, difficulty: "Chưa đánh giá", servings: null,
  required, optional, ingredients: [...required.map((ingredientId) => ({ ingredientId, quantity: null, unit: "", optional: false, role: roleForIngredient(ingredientId, false) })), ...optional.map((ingredientId) => ({ ingredientId, quantity: null, unit: "", optional: true, role: "optional" as const }))],
  steps: steps.map((instruction, index) => ({ order: index + 1, instruction })), equipment: [], tips: tips ? [tips] : [], tags: [category, method],
  source: { type: "internal", title: "Công thức nội bộ — chưa xác minh độc lập" }, verificationStatus: "unverified", dataStatus: "full_recipe",
});

export const recipes: Recipe[] = [
  r(
    "carrot-egg",
    "Trứng xào cà rốt",
    "🍳",
    "Món xào",
    "xào",
    15,
    ["egg", "carrot", "oil"],
    ["scallion", "salt"],
    [
      "Đánh trứng với chút muối.",
      "Bào hoặc thái sợi cà rốt, xào mềm với ít dầu.",
      "Đổ trứng vào đảo chín, thêm hành lá nếu có.",
    ],
  ),
  r(
    "tomato-egg",
    "Trứng sốt cà chua",
    "🍅",
    "Món chính",
    "xào",
    20,
    ["egg", "tomato", "oil"],
    ["scallion", "sugar", "salt"],
    [
      "Cắt cà chua múi cau, đánh trứng.",
      "Tráng trứng vừa chín rồi để riêng.",
      "Nấu cà chua mềm với chút nước, nêm vừa ăn, cho trứng vào.",
    ],
  ),
  r(
    "noodle-egg",
    "Mì trứng rau cải",
    "🍜",
    "Món nước",
    "luộc",
    15,
    ["noodle", "egg"],
    ["spinach", "scallion", "salt"],
    [
      "Đun sôi nước và nấu mì theo hướng dẫn trên gói.",
      "Thêm rau cải vào nồi cho vừa chín.",
      "Đập trứng vào nấu chín, nêm vừa ăn.",
    ],
  ),
  r(
    "tofu-tomato",
    "Đậu hũ sốt cà",
    "🍲",
    "Món chính",
    "rim",
    25,
    ["tofu", "tomato"],
    ["scallion", "soy-sauce", "sugar"],
    [
      "Cắt đậu hũ thành miếng vừa ăn.",
      "Nấu cà chua với chút nước đến mềm.",
      "Cho đậu vào rim nhỏ lửa, nêm nước tương.",
    ],
  ),
  r(
    "garlic-greens",
    "Rau cải xào tỏi",
    "🥬",
    "Món xào",
    "xào",
    12,
    ["spinach", "garlic", "oil"],
    ["salt"],
    [
      "Rửa rau, để ráo và cắt vừa ăn.",
      "Phi tỏi với ít dầu.",
      "Cho rau vào xào nhanh, nêm muối.",
    ],
  ),
  r(
    "cabbage-egg",
    "Bắp cải xào trứng",
    "🥬",
    "Món xào",
    "xào",
    18,
    ["cabbage", "egg", "oil"],
    ["scallion", "salt"],
    [
      "Thái bắp cải và đánh tan trứng.",
      "Xào bắp cải với ít dầu đến mềm vừa.",
      "Đẩy rau sang bên, cho trứng vào đảo chín rồi trộn đều.",
    ],
  ),
  r(
    "chicken-carrot",
    "Gà xào cà rốt",
    "🍗",
    "Món chính",
    "xào",
    25,
    ["chicken", "carrot", "oil"],
    ["garlic", "soy-sauce"],
    [
      "Thái gà và cà rốt miếng mỏng.",
      "Xào gà đến khi chín hoàn toàn.",
      "Thêm cà rốt và chút nước tương, đảo mềm.",
    ],
  ),
  r(
    "pork-cabbage",
    "Heo xào bắp cải",
    "🥩",
    "Món xào",
    "xào",
    25,
    ["pork", "cabbage", "oil"],
    ["garlic", "fish-sauce"],
    [
      "Thái mỏng thịt và bắp cải.",
      "Xào thịt đến chín hoàn toàn.",
      "Thêm bắp cải, nêm nước mắm và đảo chín tới.",
    ],
  ),
  r(
    "beef-tomato",
    "Bò xào cà chua",
    "🥩",
    "Món chính",
    "xào",
    20,
    ["beef", "tomato", "oil"],
    ["garlic", "scallion"],
    [
      "Thái bò mỏng, cà chua múi cau.",
      "Xào bò nhanh trên chảo nóng đến chín theo ý muốn.",
      "Thêm cà chua và đảo mềm, nêm vừa ăn.",
    ],
  ),
  r(
    "shrimp-greens",
    "Tôm xào rau cải",
    "🦐",
    "Món xào",
    "xào",
    18,
    ["shrimp", "spinach", "oil"],
    ["garlic", "salt"],
    [
      "Sơ chế tôm và rửa rau.",
      "Xào tôm đến khi chuyển màu và chín hoàn toàn.",
      "Thêm rau, đảo nhanh đến khi vừa mềm.",
    ],
  ),
  r(
    "pumpkin-soup",
    "Canh bí đỏ",
    "🎃",
    "Món nước",
    "nấu canh",
    30,
    ["pumpkin", "salt"],
    ["scallion", "pork"],
    [
      "Gọt bí đỏ, cắt miếng vừa ăn.",
      "Nấu bí trong nước đến mềm.",
      "Nêm muối, thêm hành lá nếu có.",
    ],
  ),
  r(
    "potato-soup",
    "Canh khoai tây cà rốt",
    "🥣",
    "Món nước",
    "nấu canh",
    30,
    ["potato", "carrot", "salt"],
    ["scallion", "pork"],
    [
      "Cắt khoai tây và cà rốt miếng vừa.",
      "Nấu trong nồi nước đến mềm.",
      "Nêm muối, thêm hành lá.",
    ],
  ),
  r(
    "bread-egg",
    "Bánh mì trứng",
    "🍞",
    "Món ăn nhẹ",
    "áp chảo",
    12,
    ["bread", "egg", "oil"],
    ["tomato"],
    [
      "Chiên trứng với ít dầu.",
      "Nướng hoặc áp chảo bánh mì cho nóng.",
      "Kẹp trứng và cà chua thái lát nếu có.",
    ],
  ),
  r(
    "cucumber-salad",
    "Dưa leo trộn chua ngọt",
    "🥒",
    "Món ăn nhẹ",
    "trộn",
    10,
    ["cucumber", "lime"],
    ["sugar", "chili", "fish-sauce"],
    [
      "Thái dưa leo lát mỏng.",
      "Pha nước cốt chanh với chút đường và muối.",
      "Trộn đều, để vài phút cho thấm.",
    ],
  ),
  r(
    "fried-rice",
    "Cơm rang trứng",
    "🍚",
    "Món chính",
    "rang",
    15,
    ["rice", "egg", "oil"],
    ["scallion", "carrot", "soy-sauce"],
    [
      "Đánh trứng, thái nhỏ rau củ nếu dùng.",
      "Tráng trứng và để riêng.",
      "Rang cơm với ít dầu, cho trứng vào đảo đều.",
    ],
  ),
  r(
    "garlic-noodle",
    "Mì xào rau cải",
    "🍜",
    "Món xào",
    "xào",
    18,
    ["noodle", "spinach", "oil"],
    ["garlic", "soy-sauce"],
    [
      "Luộc mì vừa chín, để ráo.",
      "Xào tỏi với ít dầu rồi thêm rau.",
      "Cho mì vào đảo đều với nước tương.",
    ],
  ),
  r(
    "glass-noodle-stir",
    "Miến xào rau củ",
    "🍜",
    "Món xào",
    "xào",
    20,
    ["glass-noodle", "carrot", "bean-sprout", "oil"],
    ["egg", "scallion", "soy-sauce"],
    [
      "Ngâm miến đến mềm rồi để ráo.",
      "Xào cà rốt, thêm miến và chút nước.",
      "Cho giá đỗ vào đảo nhanh, nêm nước tương.",
    ],
  ),
  r(
    "glass-noodle-soup",
    "Miến nước rau củ",
    "🍲",
    "Món nước",
    "nấu canh",
    20,
    ["glass-noodle", "carrot", "bean-sprout"],
    ["quail-egg", "scallion", "salt"],
    [
      "Nấu cà rốt trong nồi nước đến mềm vừa.",
      "Thêm miến đã ngâm, nấu chín.",
      "Cho giá vào cuối cùng, nêm muối.",
    ],
  ),
  r(
    "carrot-salad",
    "Cà rốt trộn chanh",
    "🥕",
    "Món ăn nhẹ",
    "trộn",
    10,
    ["carrot", "lime"],
    ["sugar", "peanut"],
    [
      "Bào cà rốt thành sợi mảnh.",
      "Trộn nước cốt chanh với chút đường.",
      "Rưới lên cà rốt, thêm đậu phộng nếu có.",
    ],
  ),
  r(
    "mushroom-egg",
    "Nấm xào trứng",
    "🍄",
    "Món xào",
    "xào",
    15,
    ["mushroom", "egg", "oil"],
    ["scallion", "salt"],
    [
      "Rửa nhanh nấm và thái lát.",
      "Xào nấm đến khi mềm, bớt nước.",
      "Cho trứng đã đánh vào đảo chín.",
    ],
  ),
  r(
    "tofu-greens",
    "Đậu hũ xào rau cải",
    "🥬",
    "Món xào",
    "xào",
    18,
    ["tofu", "spinach", "oil"],
    ["garlic", "soy-sauce"],
    [
      "Cắt đậu hũ thành miếng vừa.",
      "Áp chảo đậu hũ với ít dầu.",
      "Thêm rau cải, tỏi và nước tương, đảo chín.",
    ],
  ),
  r(
    "shrimp-tomato",
    "Tôm rim cà chua",
    "🦐",
    "Món chính",
    "rim",
    20,
    ["shrimp", "tomato"],
    ["garlic", "fish-sauce"],
    [
      "Sơ chế tôm, cắt cà chua.",
      "Nấu cà chua mềm trong chảo.",
      "Thêm tôm, rim đến khi chín hoàn toàn.",
    ],
  ),
  r(
    "fish-boil",
    "Cá hấp gừng hành",
    "🐟",
    "Món hấp",
    "hấp",
    25,
    ["fish"],
    ["scallion", "ginger", "salt"],
    [
      "Làm sạch cá, khứa nhẹ thân.",
      "Đặt cá lên đĩa, thêm hành và gừng nếu có.",
      "Hấp đến khi thịt cá chín đục và tách thớ.",
    ],
  ),
  r(
    "potato-egg",
    "Khoai tây xào trứng",
    "🥔",
    "Món xào",
    "xào",
    20,
    ["potato", "egg", "oil"],
    ["scallion", "salt"],
    [
      "Thái khoai tây lát mỏng, luộc sơ cho nhanh chín.",
      "Xào khoai với ít dầu đến mềm.",
      "Thêm trứng đánh tan và đảo chín.",
    ],
  ),
  r(
    "tomato-soup",
    "Canh cà chua trứng",
    "🍅",
    "Món nước",
    "nấu canh",
    15,
    ["tomato", "egg"],
    ["scallion", "salt"],
    [
      "Đun sôi nước, cho cà chua vào nấu mềm.",
      "Từ từ rót trứng đã đánh, khuấy nhẹ.",
      "Nêm muối và rắc hành lá.",
    ],
  ),
  r(
    "coconut-pumpkin",
    "Bí đỏ nấu nước cốt dừa",
    "🥥",
    "Món chính",
    "nấu",
    25,
    ["pumpkin", "coconut-milk"],
    ["sugar", "salt"],
    [
      "Cắt bí đỏ miếng vừa.",
      "Nấu bí với nước đến mềm.",
      "Thêm nước cốt dừa, nêm nhẹ và đun thêm vài phút.",
    ],
  ),
  r(
    "peanut-noodle",
    "Mì trộn đậu phộng",
    "🥜",
    "Món khô",
    "trộn",
    15,
    ["noodle", "peanut", "soy-sauce"],
    ["lime", "chili"],
    [
      "Luộc mì chín, để ráo.",
      "Giã nhỏ đậu phộng.",
      "Trộn mì với nước tương, chanh và đậu phộng.",
    ],
  ),
  r(
    "cabbage-soup",
    "Canh bắp cải",
    "🥬",
    "Món nước",
    "nấu canh",
    20,
    ["cabbage", "salt"],
    ["pork", "scallion"],
    [
      "Thái bắp cải vừa ăn.",
      "Nấu trong nồi nước đến mềm.",
      "Nêm muối, thêm hành lá.",
    ],
  ),
  r(
    "egg-steam",
    "Trứng hấp mềm",
    "🥚",
    "Món hấp",
    "hấp",
    18,
    ["egg", "salt"],
    ["scallion"],
    [
      "Đánh trứng với nước ấm theo tỷ lệ khoảng 1:1.5.",
      "Lọc hỗn hợp vào chén chịu nhiệt.",
      "Hấp lửa nhỏ đến khi trứng đông mềm.",
    ],
  ),
  r(
    "potato-mash",
    "Khoai tây nghiền bơ",
    "🥔",
    "Món ăn nhẹ",
    "luộc",
    25,
    ["potato", "butter"],
    ["milk", "salt"],
    [
      "Gọt khoai, cắt miếng và luộc mềm.",
      "Nghiền khoai khi còn nóng.",
      "Trộn bơ, thêm chút sữa và muối nếu có.",
    ],
  ),
  r(
    "corn-egg",
    "Bắp xào trứng",
    "🌽",
    "Món xào",
    "xào",
    15,
    ["corn", "egg", "oil"],
    ["scallion", "salt"],
    [
      "Tách hạt bắp, đánh trứng.",
      "Xào bắp với ít dầu đến mềm.",
      "Thêm trứng vào đảo chín, nêm vừa ăn.",
    ],
  ),
  r(
    "pasta-tomato",
    "Mì Ý sốt cà chua",
    "🍝",
    "Món chính",
    "luộc",
    25,
    ["pasta", "tomato"],
    ["garlic", "oil", "cheese"],
    [
      "Luộc mì theo hướng dẫn trên bao bì.",
      "Nấu cà chua với tỏi và chút dầu thành sốt.",
      "Trộn mì với sốt, nêm vừa ăn.",
    ],
  ),
  r(
    "chicken-soup",
    "Canh gà rau củ",
    "🍲",
    "Món nước",
    "nấu canh",
    35,
    ["chicken", "carrot", "potato"],
    ["onion", "salt"],
    [
      "Cắt gà và rau củ miếng vừa.",
      "Nấu gà trong nồi nước đến chín hoàn toàn.",
      "Thêm rau củ, nấu mềm và nêm muối.",
    ],
  ),
  r(
    "shrimp-noodle",
    "Mì nước tôm",
    "🍜",
    "Món nước",
    "nấu canh",
    20,
    ["noodle", "shrimp"],
    ["spinach", "scallion", "salt"],
    [
      "Nấu mì trong nước sôi.",
      "Thêm tôm và nấu đến khi chín hoàn toàn.",
      "Cho rau vào cuối cùng, nêm vừa ăn.",
    ],
  ),
  r(
    "rice-cooker-cheese-flan",
    "Bánh flan phô mai nồi cơm điện",
    "🍮",
    "Món tráng miệng",
    "hấp",
    35,
    ["egg", "condensed-milk", "milk", "cheese", "sugar"],
    ["vanilla", "lime", "butter"],
    ["Nấu caramel đường, đổ vào khuôn.", "Pha trứng sữa, lọc mịn rồi chia vào khuôn.", "Hấp cách thủy trong nồi cơm điện đến khi flan vừa đông; làm lạnh trước khi ăn."],
  ),
  r(
    "rice-cooker-yogurt-sponge",
    "Bánh bông lan sữa chua nồi cơm điện",
    "🍰",
    "Món tráng miệng",
    "nướng nồi cơm điện",
    55,
    ["egg", "flour", "cornstarch", "yogurt", "milk", "sugar"],
    ["vanilla", "lime", "oil", "salt"],
    ["Tách lòng trắng và lòng đỏ trứng.", "Trộn lòng đỏ với sữa chua, sữa, dầu và bột đã rây.", "Đánh bông lòng trắng với đường, fold nhẹ vào bột rồi nấu theo chu kỳ nồi cơm điện đến khi bánh chín."],
  ),
  r(
    "air-fryer-honey-chicken-feet",
    "Chân gà nướng mật ong nồi chiên không dầu",
    "🍗",
    "Món ăn vặt",
    "nướng nồi chiên không dầu",
    260,
    ["chicken-foot", "honey", "oil", "oyster-sauce", "shrimp-satay", "bbq-sauce", "lemongrass", "salt"],
    [],
    ["Làm sạch chân gà, cắt móng và rạch nhẹ để gia vị thấm.", "Ướp chân gà với sả, dầu hào, sa tế tôm và sốt thịt nướng trong ngăn mát 3–4 giờ.", "Nướng trong nồi chiên không dầu ở 160°C, lật và quét mật ong theo từng lượt đến khi chín vàng."],
  ),
  r(
    "air-fryer-lemon-butter-salmon",
    "Cá hồi nướng giấy bạc sốt bơ tỏi chanh",
    "🐟",
    "Món chính",
    "nướng nồi chiên không dầu",
    35,
    ["salmon", "garlic", "butter", "oyster-sauce", "lime"],
    ["mixed-herbs", "cooking-wine", "salt", "sugar", "pepper"],
    ["Thấm khô cá hồi, ướp muối, tiêu và lá thơm.", "Nướng cá gói giấy bạc trong nồi chiên không dầu.", "Nấu sốt bơ tỏi chanh riêng, rưới lên cá trước khi ăn."],
  ),
  r(
    "air-fryer-sweet-potato-cheese-sticks",
    "Bánh khoai lang que nhân phô mai nồi chiên không dầu",
    "🍠",
    "Món ăn vặt",
    "nướng nồi chiên không dầu",
    50,
    ["sweet-potato", "rice-flour", "egg", "sugar", "margarine"],
    ["cheese"],
    ["Gọt khoai lang, hấp chín rồi nghiền nhuyễn.", "Trộn khoai với bột gạo, đường, bơ thực vật và trứng đến khi thành khối dẻo.", "Cắt phô mai thành thanh nhỏ. Lấy từng phần bột bọc quanh phô mai, miết kín và tạo hình que.", "Lót giấy nến trong nồi chiên. Nướng ở 180°C trong 10 phút, lật mặt rồi nướng thêm khoảng 5 phút đến khi vàng; để nguội bớt trước khi ăn."],
  ),
  r(
    "rice-cooker-hainanese-chicken-rice",
    "Cơm gà Hải Nam nấu bằng nồi cơm điện",
    "🍗",
    "Món chính",
    "nấu nồi cơm điện",
    70,
    ["chicken", "rice", "shallot", "ginger", "ginger-root", "salt", "rock-sugar", "pandan-leaf"],
    ["water"],
    ["Rửa sạch gà và để ráo. Bóc vỏ hành tím, thái lát gừng; vo gạo.", "Cho gà vào nồi cơm điện cùng hành tím, gừng, nghệ, muối, đường phèn và nước vừa đủ. Chọn chế độ nấu nhanh khoảng 40 phút; kiểm tra phần thịt dày nhất đã chín hoàn toàn.", "Vớt gà ra để nguội rồi chặt miếng vừa ăn. Giữ lại nước luộc gà trong nồi.", "Cho gạo đã vo và lá dứa vào nồi nước dùng, nấu theo chế độ cơm mềm hoặc chế độ nấu cơm phù hợp với nồi.", "Xới cơm ra đĩa, xếp gà lên trên. Dùng kèm rau và nước chấm tùy thích."],
  ),
];

// Source-backed recipes: quantities and steps are adapted for the app's pantry
// ingredient model. Similar recipes are retained as research metadata but are
// not exposed as a source link for a different dish.
const sourcedRecipeData: Record<string, {
  name?: string;
  source?: RecipeSource;
  servings: number;
  preparationTime: number;
  cookingTime: number;
  difficulty: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  equipment?: string[];
  tips?: string[];
}> = {
  "tomato-egg": {
    name: "Trứng xào cà chua",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-trung-xao-ca-chua-mon-an-don-gian-nhung-cuc-ngon-11549", "Trứng xào cà chua — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["egg", 2, "quả"], ["tomato", 2, "quả"], ["shallot", 2, "củ"], ["scallion", 1, "nhánh", true], ["fish-sauce", 1, "muỗng cà phê"], ["stock-cube", 1, "muỗng cà phê", true], ["oil", 0.5, "muỗng canh"], ["salt", 0.25, "muỗng cà phê", true]),
    steps: ["Đánh tan trứng với nước mắm và hạt nêm nếu dùng. Cắt cà chua hạt lựu, hành tím băm nhỏ.", "Phi hành tím với dầu nóng đến thơm. Cho cà chua vào xào khoảng 2–3 phút cho mềm và ra sốt.", "Đổ trứng vào chảo, đảo nhẹ đến khi trứng vừa chín. Nêm lại vừa ăn, thêm hành lá nếu có và dùng nóng."],
  },
  "tofu-tomato": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-dau-hu-sot-ca-chua-chay-don-gian-de-lam-cho-bua-com-10227", "Đậu hũ sốt cà chua chay — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 20, cookingTime: 15, difficulty: "Dễ",
    ingredients: measured(["tofu", 3, "miếng"], ["tomato", 2, "quả"], ["oil", 2, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["sugar", 1, "muỗng cà phê", true], ["scallion", 1, "nhánh", true]),
    steps: ["Cắt đậu hũ thành miếng vừa ăn. Rửa cà chua rồi cắt múi cau hoặc hạt lựu.", "Áp chảo hoặc chiên đậu với một phần dầu đến khi vàng nhẹ hai mặt, gắp ra.", "Dùng phần dầu còn lại xào cà chua đến mềm, thêm một ít nước và nêm muối, đường vừa khẩu vị.", "Cho đậu vào rim nhỏ lửa 5–7 phút để thấm sốt. Rắc hành lá nếu có và dùng nóng."],
    tips: ["Nguồn dùng đậu hũ chiên sẵn và gia vị chay; công thức trong app giữ cách nêm đơn giản, có thể dùng đậu hũ trắng áp chảo."],
  },
  "tomato-soup": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-nau-canh-ca-chua-trung-ngon-dung-dieu-khong-bi-tanh-don-10696", "2 cách nấu canh cà chua trứng (canh mây) — Điện máy XANH", "exact"),
    servings: 1, preparationTime: 5, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["egg", 2, "quả"], ["tomato", 1, "quả"], ["shallot", 2, "củ"], ["water", 500, "ml"], ["scallion", 1, "nhánh", true], ["fish-sauce", 1, "muỗng cà phê"], ["oil", 0.5, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["stock-cube", 1, "muỗng cà phê", true]),
    steps: ["Đánh trứng với nước mắm và một ít hạt nêm. Cà chua cắt múi cau, hành tím thái lát, hành lá cắt nhỏ.", "Phi hành tím với dầu khoảng 30 giây. Cho cà chua vào xào khoảng 2 phút cho mềm, thêm 500 ml nước và đun sôi.", "Nêm muối và hạt nêm, rót trứng thành dòng mảnh rồi khuấy nhẹ một chiều để tạo vân. Nấu đến khi trứng vừa chín, thêm hành lá và tắt bếp."],
    tips: ["Nguồn ghi khẩu phần 1 tô; lượng gia vị nên nêm từ ít rồi điều chỉnh theo khẩu vị."],
  },
  "potato-soup": {
    name: "Canh khoai tây cà rốt thịt băm",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-nau-canh-khoai-tay-ca-rot-thit-bam-ngon-ngot-day-dinh-11591", "Canh khoai tây cà rốt thịt băm — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["ground-pork", 200, "g"], ["potato", 3, "củ"], ["carrot", 1, "củ nhỏ"], ["shallot", 1, "củ nhỏ"], ["water", 1000, "ml"], ["scallion", 2, "nhánh", true], ["cilantro", 2, "nhánh", true], ["oil", 1, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["stock-cube", 1, "muỗng cà phê", true], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Gọt khoai tây và cà rốt, rửa sạch rồi cắt miếng vừa ăn. Băm hành tím; thái nhỏ hành lá và ngò rí.", "Ướp thịt heo xay với một ít nước mắm, muối và hành tím khoảng 15 phút.", "Phi thơm hành với dầu, cho thịt vào xào đến săn. Thêm 1 lít nước, đun sôi và hớt bọt.", "Cho khoai tây và cà rốt vào nấu đến khi chín mềm. Nêm muối, hạt nêm nếu dùng, tiêu vừa ăn. Tắt bếp, thêm hành lá và ngò rí."],
  },
  "garlic-greens": {
    name: "Cải ngọt xào tỏi",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/2-cach-lam-cai-ngot-xao-toi-thom-ngon-dan-da-cho-bua-com-gia-08889", "Cải ngọt xào tỏi — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 5, difficulty: "Dễ",
    ingredients: measured(["cai-ngot", 500, "g"], ["garlic", 4, "tép"], ["ginger", 1, "nhánh nhỏ"], ["oil", 2, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["stock-cube", 1, "muỗng cà phê", true], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Nhặt cải ngọt, bỏ lá úa, rửa sạch và cắt khúc vừa ăn. Đập dập tỏi; gừng thái lát mỏng.", "Đun nóng dầu, phi tỏi đến thơm rồi cho gừng vào đảo nhanh.", "Cho cải vào xào lửa lớn khoảng 2 phút. Nêm muối và hạt nêm nếu dùng, đảo tiếp đến khi cải vừa chín xanh. Rắc tiêu nếu thích và dùng nóng."],
  },
  "garlic-noodle": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/2-cach-lam-mi-xao-rau-cai-thanh-dam-ngon-ngot-don-gian-doi-vi-08327", "Mì xào rau cải — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["noodle", 2, "gói"], ["spinach", 400, "g"], ["shallot", 4, "củ nhỏ"], ["oil", 2, "muỗng canh"], ["stock-cube", 1, "muỗng cà phê"], ["salt", 0.25, "muỗng cà phê", true], ["soy-sauce", 1, "muỗng canh", true]),
    steps: ["Ngâm mì trong nước mát khoảng 5–7 phút cho mềm, vớt ra xả nhanh rồi để ráo. Rửa rau cải, cắt khúc 7–10 cm; hành tím thái lát.", "Làm nóng dầu, phi hành tím thơm. Cho rau cải vào xào khoảng 1–2 phút.", "Thêm mì, đảo trên lửa vừa khoảng 3 phút. Nêm hạt nêm, tiêu hoặc nước tương theo khẩu vị; đảo thêm 1–2 phút đến khi mì nóng và rau vừa chín."],
    tips: ["Nguồn dùng mì gói và cải bẹ xanh; nếu dùng mì khô/tươi khác, sơ chế theo bao bì và giảm gia vị nếu mì đã có gói nêm."],
  },
  "cabbage-egg": {
    source: recipeSource("https://cooponline.vn/cong-thuc-nau-an/bap-cai-xao-trung-mon-xao-thanh-vi-cho-bua-com-gia-dinh/", "Bắp cải xào trứng — Co.op Online", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["cabbage", 400, "g"], ["egg", 2, "quả"], ["garlic", 2, "tép", true], ["oil", 1, "muỗng canh"], ["fish-sauce", 1, "muỗng cà phê"], ["salt", 0.25, "muỗng cà phê"]),
    steps: ["Thái bắp cải thành sợi vừa ăn, rửa sạch và để ráo. Đập trứng vào bát, đánh tan.", "Phi tỏi với dầu nếu dùng. Cho bắp cải vào xào khoảng 3–4 phút đến khi vừa mềm.", "Gạt bắp cải sang một bên, đổ trứng vào chảo và đảo đến khi trứng gần chín. Trộn cùng bắp cải, nêm nước mắm và muối, đảo thêm đến khi trứng chín hẳn."],
  },
  "pork-cabbage": {
    name: "Bắp cải xào thịt băm",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-bap-cai-xao-thit-bam-thom-ngon-cuc-nhanh-chong-tai-17191", "Bắp cải xào thịt băm — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 15, difficulty: "Dễ",
    ingredients: measured(["ground-pork", 200, "g"], ["cabbage", 300, "g"], ["scallion", 2, "nhánh", true], ["cilantro", 2, "nhánh", true], ["garlic", 5, "tép"], ["oil", 2, "muỗng canh"], ["fish-sauce", 1, "muỗng canh"], ["salt", 0.25, "muỗng cà phê", true], ["stock-cube", 1, "muỗng cà phê", true], ["sugar", 0.5, "muỗng cà phê", true], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Tách lá bắp cải, ngâm nước muối loãng khoảng 10 phút, rửa lại rồi thái miếng vừa ăn. Ướp thịt heo xay với nước mắm, gia vị và chút tiêu khoảng 15 phút.", "Đun nóng một muỗng canh dầu, phi tỏi băm thơm. Cho thịt vào cùng 2 muỗng canh nước, đảo 2–3 phút đến khi thịt săn và chín.", "Cho bắp cải vào, tăng lửa lớn và xào nhanh khoảng 3 phút. Nêm lại vừa ăn; thêm hành lá, ngò rí rồi tắt bếp."],
  },
  "shrimp-greens": {
    name: "Tôm xào cà chua rau cải",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-tom-xao-ca-chua-rau-cai-thom-ngon-la-mieng-don-gian-07937", "Tôm xào cà chua rau cải — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["shrimp", 250, "g"], ["tomato", 2, "quả"], ["bok-choy", 200, "g"], ["cilantro", 2, "nhánh"], ["garlic", 2, "tép"], ["chili", 0.25, "muỗng cà phê bột", true], ["oil", 1, "muỗng canh"], ["sugar", 2, "muỗng cà phê"], ["stock-cube", 0.5, "muỗng cà phê"], ["salt", 0.5, "muỗng cà phê"], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Bóc vỏ, bỏ chỉ lưng tôm, rửa sạch và để ráo. Rửa cải thìa, ngâm nước muối loãng 5 phút rồi cắt khúc. Cà chua bổ múi cau, tỏi băm.", "Đun nóng dầu, phi thơm tỏi rồi cho cà chua vào đảo khoảng 2 phút. Thêm tôm, đường, hạt nêm, muối và ớt bột nếu dùng; xào khoảng 4 phút đến khi tôm săn và chín đục.", "Cho cải thìa vào xào nhanh khoảng 2 phút đến khi vừa chín. Rắc ngò rí và tiêu, dùng nóng."],
  },
  "pumpkin-soup": {
    name: "Canh bí đỏ nấu tôm tươi",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/2-cach-nau-canh-bi-do-voi-tom-va-thit-bam-thom-ngon-02271", "Canh bí đỏ nấu tôm tươi — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 20, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["pumpkin", 200, "g"], ["shrimp", 150, "g"], ["shallot", 1, "củ nhỏ"], ["water", 1000, "ml"], ["oil", 0.5, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["stock-cube", 1, "muỗng cà phê", true]),
    steps: ["Gọt bí đỏ, bỏ hạt, rửa sạch rồi cắt miếng vuông vừa ăn. Bóc vỏ, bỏ chỉ lưng tôm, rửa sạch rồi cắt nhỏ.", "Ướp tôm với hành tím băm, muối và hạt nêm khoảng 10 phút.", "Đun nóng dầu trong nồi, cho tôm vào xào đến khi săn. Thêm 1 lít nước, đun sôi khoảng 10 phút và hớt bọt.", "Cho bí đỏ vào, đậy nắp nấu khoảng 10 phút đến khi bí mềm nhưng không nát. Nêm lại vừa ăn rồi tắt bếp."],
  },
  "glass-noodle-stir": {
    name: "Miến xào rau củ chay",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-mien-xao-rau-cu-chay-thom-ngon-hap-dan-khong-thua-09474", "Miến xào rau củ chay — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 20, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["glass-noodle", 50, "g"], ["rice-stick-noodle", 20, "g"], ["bean-sprout", 100, "g"], ["dried-mushroom", 20, "g"], ["carrot", 1, "củ"], ["mushroom", 200, "g nấm hải sản"], ["leek", 2, "cây"], ["vegan-stock-cube", 1.3, "muỗng cà phê"], ["sugar", 0.5, "muỗng cà phê"], ["soy-sauce", 1, "muỗng cà phê"], ["oil", 3, "muỗng canh"]),
    steps: ["Ngâm miến, mì chũ và nấm mèo riêng trong nước cho mềm rồi để ráo. Thái cà rốt thành sợi; rửa sạch giá và nấm hải sản; cắt hành boa rô.", "Chần cà rốt và nấm nhanh trong nước sôi rồi vớt ra để ráo. Hòa hạt nêm chay, đường và nước tương với một ít nước.", "Phi thơm hành boa rô với dầu. Cho cà rốt, nấm và nấm mèo vào xào; thêm miến, mì chũ, giá và phần gia vị. Đảo đến khi miến mềm, thấm đều và rau vừa chín."],
  },
  "shrimp-tomato": {
    name: "Tôm sốt cà chua và tỏi",
    source: recipeSource("https://www.knorr.com/vn/r/tm-st-c-chua-v-ti--mn-ngon-t-tm-d-lm-ti-nh.html/157881", "Tôm sốt cà chua và tỏi — Knorr", "exact"),
    servings: 4, preparationTime: 15, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["shrimp", 300, "g"], ["tomato", 2, "quả nhỏ"], ["garlic", 10, "g"], ["scallion", 10, "g", true], ["oil", 2, "muỗng cà phê"], ["stock-cube", 28, "g"], ["water", 0.5, "chén"], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Rửa tôm, bóc vỏ và bỏ chỉ lưng; để ráo. Băm tỏi, thái cà chua và hành lá.", "Ướp tôm với gói gia vị cá kho Knorr, một nửa tỏi và tiêu khoảng 15 phút.", "Đun nóng dầu, phi thơm phần tỏi còn lại. Cho tôm đã ướp và cà chua vào đảo đến khi tôm hồng đều.", "Thêm nửa chén nước, đậy nắp nấu đến khi tôm chín hoàn toàn và sốt cà chua sệt lại. Rắc hành lá nếu thích và dùng với cơm nóng."],
  },
  "fish-boil": {
    name: "Cá diêu hồng hấp gừng hành",
    source: recipeSource("https://vnexpress.net/doi-song-cooking-ca-dieu-hong-hap-gung-hanh-4554129.html", "Cách làm cá diêu hồng hấp gừng hành — VnExpress", "exact"),
    servings: 4, preparationTime: 60, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["fish", 1, "con diêu hồng (1–1,2 kg)"], ["ginger", 1, "nhánh"], ["shallot", 4, "củ"], ["scallion", 1, "bó"], ["dill", 1, "bó nhỏ"], ["chili", 1, "quả", true], ["soy-sauce", 1, "muỗng canh"], ["oyster-sauce", 1, "muỗng canh"], ["sugar", 0.5, "muỗng canh"], ["stock-cube", 1, "muỗng cà phê"], ["pepper", 0.5, "muỗng cà phê"]),
    steps: ["Làm sạch cá, bỏ màng đen và máu trong bụng, rửa sạch rồi thấm khô. Khứa vài đường hai bên thân cá. Gừng thái sợi, hành lá cắt khúc.", "Pha sốt từ nước tương, dầu hào, đường, hạt nêm và tiêu. Xoa sốt lên cá, thêm gừng và hành khô; ướp trong ngăn mát khoảng 1 giờ.", "Đun sôi nước trong nồi hấp. Hấp cá 20–25 phút tùy kích cỡ; thêm hành lá và gừng ở những phút cuối. Kiểm tra phần thịt dày nhất đã đục và tách thớ trước khi dùng."],
    tips: ["Cá cỡ nhỏ hơn cần giảm thời gian hấp; kiểm tra thịt cá đã đục và tách thớ trước khi dùng."],
  },
  "egg-steam": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-trung-hap-mem-min-nung-ninh-bo-duong-cho-be-de-lam-23658", "Trứng hấp mềm mịn — Điện máy XANH", "exact"),
    servings: 1, preparationTime: 5, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["egg", 2, "quả"], ["water", 1, "chén"], ["salt", 0.5, "muỗng cà phê"], ["soy-sauce", 1, "muỗng cà phê", true], ["scallion", 1, "nhánh", true]),
    steps: ["Đánh tan 2 quả trứng với muối. Đong lượng trứng trong chén, thêm lượng nước ấm khoảng gấp đôi rồi khuấy đều.", "Lọc hỗn hợp qua rây, hớt bọt và đổ vào tô chịu nhiệt. Đậy tô bằng nắp hoặc đĩa nhỏ để nước ngưng tụ không nhỏ xuống mặt trứng.", "Đặt tô vào xửng khi nước đã sôi nhẹ, hấp lửa vừa khoảng 20 phút. Xiên tăm vào giữa; khi rút ra sạch, trứng đã chín. Dùng với hành lá hoặc chút nước tương."],
    tips: ["Nguồn hướng dẫn dùng nước ấm 50–70°C và tỷ lệ nước xấp xỉ gấp đôi thể tích trứng."],
  },
  "carrot-egg": {
    source: recipeSource("https://voh.com.vn/dinh-duong/mon-ngon-tu-ca-rot-389056.html", "Các món ngon từ cà rốt: cà rốt xào trứng — VOH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 8, difficulty: "Dễ",
    ingredients: measured(["egg", 2, "quả"], ["carrot", 1, "củ vừa (150 g)"], ["oil", 1, "muỗng canh"], ["fish-sauce", 1, "muỗng cà phê"], ["salt", 0.25, "muỗng cà phê"], ["scallion", 1, "nhánh", true]),
    steps: ["Gọt vỏ cà rốt, rửa sạch rồi bào sợi mảnh. Đập trứng vào tô, thêm nước mắm và đánh tan.", "Làm nóng dầu trên chảo, cho cà rốt vào xào lửa vừa 3–4 phút đến khi mềm nhưng còn hơi giòn.", "Dàn cà rốt ra, đổ trứng vào chảo. Đợi trứng se mặt rồi đảo tơi, trộn cùng cà rốt đến khi trứng chín hoàn toàn. Nêm muối vừa ăn, rắc hành lá nếu có và dùng nóng."],
    tips: ["Nguồn hướng dẫn xào riêng cà rốt rồi trộn với trứng; lượng gia vị trong app được ghi rõ để dễ nêm."],
  },
  "noodle-egg": {
    name: "Mì xào trứng ốp la",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-mi-xao-trung-nhanh-gon-ma-thom-ngon-hap-dan-01029", "Mì xào trứng ốp la — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["noodle", 1, "gói"], ["egg", 2, "quả"], ["cilantro", 3, "nhánh"], ["shallot", 3, "củ"], ["scallion", 4, "nhánh"], ["tomato", 0.5, "quả để trang trí", true], ["oil", 0.5, "muỗng canh"], ["fish-sauce", 0.5, "muỗng canh"], ["soy-sauce", 1, "muỗng canh"]),
    steps: ["Cho vắt mì vào 400 ml nước sôi khoảng 30–60 giây cho vừa tơi, vớt ra xả nhanh nước mát rồi để ráo. Trộn mì với phần sốt trong gói và khoảng 1/3 gói nêm.", "Băm hành tím, cắt nhỏ hành lá và ngò rí. Đun nóng dầu, phi thơm hành tím rồi cho mì vào chảo.", "Thêm nước mắm và nước tương, đảo mì trên lửa vừa khoảng 2 phút cho thấm nóng. Gắp mì ra đĩa.", "Chiên 2 quả trứng ốp la trong chảo đến độ chín mong muốn, đặt lên mì. Rắc hành lá, ngò rí; dùng cà chua thái lát để trang trí nếu có."],
  },
  "chicken-carrot": {
    name: "Su su cà rốt xào thịt gà",
    source: recipeSource("https://nutri.vnamedical.com/wp-content/uploads/2021/06/MIEN-BAC-XUAN-HE-Cong-thuc-nau-khau-phan-thu-20.pdf", "Su su cà rốt xào thịt gà — VNA Medical Nutrition", "exact"),
    servings: 2, preparationTime: 20, cookingTime: 12, difficulty: "Dễ",
    ingredients: measured(["chicken", 100, "g"], ["chayote", 300, "g"], ["carrot", 60, "g"], ["shallot", 1, "củ nhỏ"], ["garlic", 1, "tép"], ["scallion", 1, "nhánh", true], ["cilantro", 1, "nhánh", true], ["oil", 1, "muỗng canh"], ["stock-cube", 0.5, "muỗng cà phê"], ["salt", 0.25, "muỗng cà phê"]),
    steps: ["Thái gà thành lát mỏng, ướp với một ít hạt nêm 15 phút. Gọt su su và cà rốt, thái sợi mỏng; chần nhanh qua nước sôi rồi để ráo.", "Pha hạt nêm với khoảng 2 muỗng canh nước. Phi thơm hành tím và tỏi với dầu, cho gà vào xào đến khi săn và gần chín.", "Cho su su và cà rốt vào xào cùng. Thêm phần nước gia vị, đảo đến khi rau củ vừa chín và thịt gà chín hoàn toàn. Thêm hành lá, ngò nếu thích rồi tắt bếp."],
  },
  "beef-tomato": {
    source: recipeSource("https://cookpad.com/vn/cong-thuc/24459688", "Thịt bò xào cà chua — Cookpad", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["beef", 200, "g"], ["tomato", 2, "quả vừa"], ["onion", 0.5, "củ", true], ["garlic", 2, "tép", true], ["oil", 1, "muỗng canh"], ["fish-sauce", 1, "muỗng cà phê"], ["soy-sauce", 1, "muỗng cà phê"], ["sugar", 0.5, "muỗng cà phê"]),
    steps: ["Thái bò mỏng ngang thớ. Ướp với nước tương và một nửa tỏi 10 phút. Cà chua bổ múi cau; hành tây thái múi nếu dùng.", "Làm chảo thật nóng với một nửa dầu, xào bò nhanh 1–2 phút đến khi vừa đổi màu rồi gắp ra.", "Thêm dầu còn lại, phi tỏi. Cho cà chua và hành tây vào xào 2–3 phút đến khi cà chua mềm nhưng chưa nát; nêm nước mắm và đường.", "Cho bò trở lại chảo, đảo nhanh 30–60 giây cho nóng đều. Tắt bếp khi bò vừa chín để thịt không dai; dùng với cơm."],
    tips: ["Nguồn là bò xào rau củ có cà chua; lượng gia vị đã được rút gọn để tập trung vào bò và cà chua."],
  },
  "bread-egg": {
    name: "Bánh mì trứng ốp la rau củ",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-banh-mi-trung-op-la-ngon-an-sang-kieu-moi-day-du-dinh-duong-23491", "Bánh mì trứng ốp la rau củ — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 12, difficulty: "Dễ",
    ingredients: measured(["bread", 2, "ổ"], ["egg", 2, "quả"], ["potato", 0.5, "củ"], ["tomato", 0.5, "quả"], ["onion", 0.25, "củ"], ["garlic", 1, "tép"], ["cilantro", 1, "nhánh", true], ["oil", 1, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["pepper", 0.25, "muỗng cà phê", true], ["soy-sauce", 1, "muỗng cà phê", true], ["chili-sauce", 1, "muỗng cà phê", true]),
    steps: ["Gọt khoai tây, cắt hạt lựu nhỏ rồi luộc hoặc áp chảo đến khi gần mềm. Cắt cà chua và hành thành hạt lựu, băm tỏi.", "Phi thơm tỏi với ít dầu. Cho hành, khoai tây và cà chua vào xào đến khi rau củ mềm; nêm muối, tiêu và chút nước tương nếu dùng.", "Dồn rau củ sang một bên chảo, thêm chút dầu vào khoảng trống rồi chiên trứng ốp la đến độ chín mong muốn.", "Kẹp trứng và rau củ vào bánh mì. Thêm ngò hoặc tương ớt nếu thích, dùng nóng."],
  },
  "cucumber-salad": {
    name: "Salad dưa leo sốt giấm",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/3-cach-lam-salad-dua-leo-sot-giam-va-sot-kem-thanh-mat-don-05145", "Salad dưa leo sốt giấm — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 30, cookingTime: 0, difficulty: "Dễ",
    ingredients: measured(["cucumber", 1.5, "quả"], ["vinegar", 4, "muỗng canh"], ["water", 2, "muỗng canh"], ["sugar", 3, "muỗng canh"], ["onion", 0.5, "củ"], ["dill", 30, "g"], ["mint", 30, "g"], ["salt", 0.5, "muỗng cà phê"], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Rửa dưa leo, thái lát mỏng. Thái hành tây lát mỏng; nhặt và rửa sạch thì là, bạc hà.", "Khuấy giấm với nước và đường đến khi tan. Nếm lại để sốt có vị chua ngọt cân bằng.", "Trộn dưa leo với hành tây, thì là, bạc hà và sốt. Đậy lại, để lạnh khoảng 20–30 phút cho ngấm rồi dùng mát."],
  },
  "fried-rice": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/com-chien-trung-cuc-ngon-cho-mua-mua-00365", "Cơm chiên trứng — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 12, difficulty: "Dễ",
    ingredients: measured(["rice", 2, "chén cơm nguội"], ["egg", 2, "quả"], ["shallot", 1, "củ"], ["scallion", 1, "nhánh", true], ["fish-sauce", 1, "muỗng canh"], ["oil", 1.5, "muỗng canh"], ["salt", 0.25, "muỗng cà phê"]),
    steps: ["Dùng cơm nguội tơi, bóp nhẹ để tách hạt. Thái hành tím, cắt nhỏ hành lá. Đánh tan trứng với chút muối.", "Làm nóng dầu, phi hành tím thơm. Cho cơm vào đảo lửa vừa 4–5 phút để hạt cơm nóng và săn.", "Dàn cơm ra, đổ trứng vào và đảo nhanh để trứng bám quanh hạt. Thêm nước mắm, tiếp tục rang đến khi cơm tơi, trứng chín hoàn toàn.", "Nếm lại, rắc hành lá rồi tắt bếp. Dùng nóng; nếu cơm khô có thể thêm 1 muỗng canh nước khi rang."],
    tips: ["Cơm để nguội trong tủ mát giúp hạt tơi hơn; nếu dùng cơm mới nấu, trải ra cho bay hơi trước khi chiên."],
  },
  "glass-noodle-soup": {
    source: recipeSource("https://amthucdinhduong.com.vn/mon-an/mien-sup-rau-cu-chay/", "Miến súp rau củ chay — Ẩm thực dinh dưỡng", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 15, difficulty: "Dễ",
    ingredients: measured(["glass-noodle", 80, "g"], ["carrot", 0.5, "củ"], ["mushroom", 100, "g"], ["cabbage", 100, "g", true], ["water", 900, "ml"], ["soy-sauce", 1, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["scallion", 1, "nhánh", true]),
    steps: ["Ngâm miến theo hướng dẫn bao bì đến khi mềm, cắt ngắn và để ráo. Cà rốt thái lát mỏng, nấm cắt vừa ăn; thái bắp cải nếu dùng.", "Đun sôi nước, cho cà rốt vào nấu 4–5 phút. Thêm nấm, nêm nước tương và muối; nấu thêm 3 phút.", "Cho bắp cải vào nếu dùng, đun đến khi vừa mềm. Thả miến vào nồi, nấu theo loại miến khoảng 2–4 phút đến khi trong mềm.", "Nếm lại nước dùng, tắt bếp và rắc hành lá. Ăn ngay để miến không hút hết nước."],
    tips: ["Công thức nguồn là súp rau củ chay; thời gian nấu miến cần theo bao bì để tránh nhũn."],
  },
  "carrot-salad": {
    name: "Gỏi bắp cải cà rốt chay",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/2-cach-lam-goi-bap-cai-ca-rot-chay-thanh-dam-cho-mam-com-ngay-12653", "Gỏi bắp cải cà rốt chay — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 25, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["cabbage", 150, "g"], ["carrot", 25, "g"], ["chili", 0.5, "quả ớt sừng", true], ["lemongrass", 1.5, "nhánh"], ["lime", 0.5, "quả"], ["onion", 0.5, "củ"], ["tofu", 50, "g"], ["rau-ram", 25, "g"], ["peanut", 15, "g"], ["vegan-fish-sauce", 0.5, "muỗng canh"], ["vinegar", 0.25, "muỗng canh"], ["salt", 1, "muỗng cà phê"], ["sugar", 2, "muỗng cà phê"], ["oil", 0.5, "muỗng cà phê", true]),
    steps: ["Thái bắp cải, ngâm nước muối loãng 1 phút, rửa lại và để ráo. Bào cà rốt sợi, thái hành tây mỏng, sả lát, ớt và rau răm.", "Vắt chanh lên bắp cải, thêm một phần muối và đường. Trộn cà rốt vào, để 10 phút rồi vắt nhẹ cho ráo. Ướp hành tây riêng với giấm, chút muối và đường 10 phút rồi vắt ráo.", "Cắt đậu hũ thành hạt lựu, áp chảo với chút dầu đến vàng nhẹ. Trộn bắp cải, cà rốt, hành tây với sả, ớt, nước mắm chay và phần đường còn lại.", "Trộn rau răm vào sau cùng. Rắc đậu phộng giã lên trên và dùng ngay để gỏi còn giòn."],
  },
  "mushroom-egg": {
    name: "Trứng gà non xào nấm",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-trung-ga-non-xao-nam-ngon-bang-chao-inox-elmich-22359", "Trứng gà non xào nấm — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["chicken-immature-eggs", 200, "g"], ["mushroom", 350, "g nấm các loại"], ["shallot", 1.5, "củ"], ["scallion", 1, "nhánh"], ["oil", 1, "muỗng canh"], ["fish-sauce", 1, "muỗng cà phê"], ["oyster-sauce", 1, "muỗng cà phê", true], ["salt", 0.25, "muỗng cà phê"], ["pepper", 0.25, "muỗng cà phê", true], ["kaffir-lime-leaf", 1.5, "lá", true], ["chili", 0.5, "quả", true]),
    steps: ["Làm sạch trứng gà non, để ráo. Cắt bỏ gốc nấm, rửa nhanh và để thật ráo; nấm to thì thái vừa ăn. Băm hành tím, thái hành lá và lá chanh.", "Đun nóng dầu, phi thơm hành tím. Cho trứng gà non vào xào nhẹ lửa vừa, nêm nước mắm và muối.", "Khi trứng gần chín, thêm nấm và đảo đến khi nấm chín, nước trong chảo rút bớt. Nêm dầu hào và tiêu nếu dùng; thêm lá chanh, ớt và hành lá, đảo đều rồi dùng nóng."],
  },
  "tofu-greens": {
    name: "Đậu hũ xào cải thìa",
    source: recipeSource("https://bundaumamtom.com/cac-mon-rau-xao-voi-dau-hu-co-huong-vi-ngon-dinh-chop/", "Đậu hũ xào cải thìa — Bún đậu mắm tôm", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 10, difficulty: "Dễ",
    ingredients: measured(["tofu", 1, "bìa"], ["bok-choy", 3, "cây"], ["soy-sauce", 1, "muỗng canh"], ["oyster-sauce", 1, "muỗng canh", true], ["cooking-wine", 1, "muỗng canh", true], ["sesame-oil", 1, "muỗng canh", true], ["cornstarch", 1, "muỗng canh", true], ["oil", 1, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["pepper", 0.5, "muỗng cà phê"]),
    steps: ["Cắt đậu hũ thành miếng vừa ăn, thấm khô rồi chiên áp chảo đến vàng đều. Rửa cải thìa, tách bẹ và để ráo.", "Pha nước xốt gồm nước tương, dầu hào nếu dùng, rượu nấu ăn, dầu mè, tiêu, bột năng và 2 muỗng canh nước.", "Làm nóng chảo, cho cải thìa vào xào nhanh khoảng 20 giây. Thêm đậu hũ chiên và nước xốt, đảo nhẹ cho xốt phủ đều và sệt lại. Dùng nóng với cơm."],
  },
  "potato-egg": {
    source: recipeSource("https://cachnaungon.com/cach-lam-khoai-tay-xao-trung-mem-beo-thom-ngon-16698/", "Khoai tây xào trứng — Cách Nấu Ngon", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 15, difficulty: "Dễ",
    ingredients: measured(["potato", 2, "củ vừa (300 g)"], ["egg", 2, "quả"], ["oil", 1.5, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["scallion", 1, "nhánh", true], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Gọt khoai, thái lát mỏng khoảng 3–4 mm rồi ngâm nước 5 phút để bớt tinh bột. Vớt ra để ráo; đánh tan trứng với một nửa muối.", "Chần khoai trong nước sôi 3–4 phút đến khi vừa mềm nhưng chưa nát, vớt ra để ráo.", "Đun nóng dầu, cho khoai vào áp chảo và đảo nhẹ 2–3 phút. Đổ trứng phủ đều, để se rồi đảo đến khi trứng chín hoàn toàn.", "Nêm phần muối còn lại, tiêu và hành lá nếu có. Dùng nóng."],
    tips: ["Nguồn cũng chần khoai trước khi xào; thời gian chần phụ thuộc độ dày lát khoai."],
  },
  "coconut-pumpkin": {
    name: "Canh bí đỏ nấu nước cốt dừa chay",
    source: recipeSource("https://tiepthigiadinh.vn/canh-bi-do-d5436.html", "Canh bí đỏ nấu nước cốt dừa chay — Tiếp Thị Gia Đình", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["pumpkin", 200, "g"], ["coconut-milk", 100, "ml"], ["water", 300, "ml"], ["scallion", 1, "nhánh", true], ["culantro", 1, "nhánh", true], ["oil", 1, "muỗng cà phê"], ["sugar", 0.5, "muỗng cà phê"], ["salt", 0.25, "muỗng cà phê"], ["vegan-stock-cube", 0.5, "muỗng cà phê", true]),
    steps: ["Gọt bí đỏ, bỏ hạt, rửa sạch và cắt miếng vừa ăn. Phi thơm chút dầu trong nồi.", "Cho bí đỏ vào xào nhẹ với đường, muối và hạt nêm chay nếu dùng. Thêm nước vừa ngập bí, đun đến khi bí mềm.", "Rót nước cốt dừa vào, khuấy nhẹ và đun sôi lại một lần. Nếm chỉnh mặn ngọt; thêm hành lá, ngò gai rồi tắt bếp."],
  },
  "peanut-noodle": {
    name: "Mì Ý trộn sốt đậu phộng",
    source: recipeSource("https://extension.umd.edu/programs/family-consumer-sciences/snap-ed/eat-smart/recipes/easy-peanut-noodles", "Easy Peanut Noodles — University of Maryland Extension", "exact"),
    servings: 2, preparationTime: 8, cookingTime: 8, difficulty: "Dễ",
    ingredients: measured(["pasta", 100, "g"], ["peanut", 2, "muỗng canh, xay mịn"], ["bell-pepper", 0.5, "quả"], ["carrot", 0.5, "củ"], ["scallion", 1, "nhánh"], ["garlic", 1, "tép"], ["ginger", 0.5, "muỗng cà phê"], ["soy-sauce", 1.5, "muỗng canh"], ["lime", 1, "muỗng canh nước cốt"], ["honey", 1, "muỗng cà phê"], ["water", 4, "muỗng canh"], ["sesame-oil", 1, "muỗng cà phê", true], ["chili-sauce", 1, "muỗng cà phê", true], ["cilantro", 1, "nhánh", true]),
    steps: ["Luộc mì Ý theo hướng dẫn trên bao bì. Chừa lại một ít nước luộc rồi để ráo.", "Khuấy đậu phộng xay với nước ấm đến khi mịn. Thêm nước tương, tỏi băm, gừng, nước cốt chanh, mật ong và dầu mè nếu dùng; khuấy thành sốt sánh.", "Thái ớt chuông và cà rốt thành sợi, hành lá cắt nhỏ. Trộn mì với sốt, rau củ và hành lá. Nếu sốt đặc, thêm từng muỗng nước luộc mì cho vừa độ áo sợi.", "Nếm lại vị chua mặn ngọt, thêm tương ớt hoặc ngò rí nếu thích và dùng ngay."],
  },
  "cabbage-soup": {
    name: "Canh bắp cải thịt bằm",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-nau-canh-bap-cai-thit-bam-don-gian-thom-ngon-ngot-thanh-09186", "Canh bắp cải thịt bằm — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 15, difficulty: "Dễ",
    ingredients: measured(["cabbage", 300, "g"], ["ground-pork", 100, "g"], ["water", 900, "ml"], ["shallot", 1, "củ nhỏ"], ["fish-sauce", 1, "muỗng cà phê"], ["salt", 0.5, "muỗng cà phê"], ["sugar", 0.5, "muỗng cà phê"], ["scallion", 1, "nhánh", true], ["oil", 1, "muỗng cà phê", true]),
    steps: ["Thái bắp cải thành miếng vừa ăn, rửa sạch. Băm hành tím. Ướp thịt heo xay với chút nước mắm.", "Phi hành tím với ít dầu, cho thịt vào xào đến săn và tơi.", "Thêm 900 ml nước, đun sôi rồi cho bắp cải vào. Nấu lửa vừa 7–10 phút đến khi cải mềm vừa.", "Nêm nước mắm, muối và đường, nếm lại cho vừa miệng. Thêm hành lá rồi tắt bếp."],
  },
  "potato-mash": {
    source: recipeSource("https://antfarm.com.vn/blogs/cong-thuc-che-bien/cach-lam-khoai-tay-nghien-chuan-vi-nha-hang", "Cách làm khoai tây nghiền — Ant Farm", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 20, difficulty: "Dễ",
    ingredients: measured(["potato", 400, "g (2–3 củ)"], ["butter", 20, "g"], ["milk", 60, "ml"], ["salt", 0.5, "muỗng cà phê"], ["pepper", 0.25, "muỗng cà phê", true]),
    steps: ["Gọt khoai, cắt khối đều nhau. Cho vào nồi, thêm nước ngập mặt và một nửa muối; luộc 15–18 phút đến khi xiên nĩa xuyên dễ dàng.", "Chắt hết nước, để khoai trong nồi nóng thêm khoảng 1 phút cho bay hơi. Nghiền khoai khi còn nóng.", "Đun ấm sữa, cho bơ vào khuấy tan. Rót từ từ vào khoai và nghiền/trộn đến độ mịn mong muốn.", "Nêm muối còn lại, tiêu nếu dùng. Nếu nghiền quá đặc, thêm từng ít sữa ấm; dùng nóng."],
    tips: ["Nguồn dùng khoai tây nghiền với sữa và bơ làm món ăn kèm; công thức này rút gọn cho 2 khẩu phần."],
  },
  "corn-egg": {
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-bap-xao-trung-thom-ngon-beo-bui-an-la-ghien-ngay-16699", "Bắp xào trứng — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 10, cookingTime: 12, difficulty: "Dễ",
    ingredients: measured(["corn", 1, "trái bắp Mỹ (200 g hạt)"], ["egg", 2, "quả"], ["oil", 1, "muỗng canh"], ["sugar", 0.5, "muỗng cà phê"], ["salt", 0.5, "muỗng cà phê"], ["scallion", 2, "nhánh", true]),
    steps: ["Tách hạt bắp. Nếu dùng bắp tươi, luộc hạt 5–7 phút đến khi vừa mềm rồi để ráo. Đánh trứng với đường và muối.", "Trộn hạt bắp với trứng đã đánh và hành lá cắt nhỏ nếu dùng.", "Làm nóng dầu trong chảo, đổ hỗn hợp bắp trứng vào xào lửa vừa 4–6 phút, đảo đều đến khi trứng đông và chín hoàn toàn.", "Nếm lại, tắt bếp và dùng nóng."],
    tips: ["Nguồn dùng bắp Mỹ, trứng, đường và muối; nếu dùng bắp đóng hộp, để ráo và giảm muối."],
  },
  "pasta-tomato": {
    name: "Mì Ý xào rau củ",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-mi-y-xao-rau-cu-gion-ngon-chay-man-deu-dung-don-gian-13998", "Mì Ý xào rau củ — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 15, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["pasta", 120, "g"], ["tomato", 2, "quả"], ["carrot", 1, "củ"], ["potato", 1, "củ"], ["shallot", 1, "muỗng canh băm"], ["ketchup", 2, "muỗng canh"], ["oil", 4, "muỗng canh"], ["vegan-stock-cube", 0.5, "muỗng canh"], ["salt", 1, "muỗng cà phê"], ["sugar", 1, "muỗng canh"], ["pepper", 0.5, "muỗng cà phê", true]),
    steps: ["Gọt cà rốt và khoai tây, cắt hạt lựu nhỏ; cắt cà rốt nhỏ hơn khoai vì lâu chín. Băm cà chua.", "Luộc mì Ý trong khoảng 700 ml nước có 1 muỗng canh dầu và 1 muỗng cà phê muối khoảng 10 phút, để ủ thêm 3 phút rồi vớt ráo.", "Đun nóng 3 muỗng canh dầu, phi hành tím. Cho cà chua vào xào khoảng 3 phút, thêm 1 chén nước. Khi sôi, cho cà rốt vào nấu khoảng 5 phút rồi thêm khoai tây.", "Nêm hạt nêm rau củ, đường, muối và tương cà; nấu đến khi rau củ chín mềm nhưng còn nguyên miếng. Nếm chỉnh gia vị, thêm tiêu nếu thích.", "Dọn mì ra đĩa, chan sốt rau củ lên trên hoặc đảo mì trong sốt trước khi dùng."],
  },
  "chicken-soup": {
    source: recipeSource("https://cookpad.com/vn/cong-thuc/217166", "Canh gà rau củ — Cookpad", "exact"),
    servings: 3, preparationTime: 15, cookingTime: 30, difficulty: "Dễ",
    ingredients: measured(["chicken", 300, "g"], ["potato", 2, "củ vừa"], ["carrot", 1, "củ"], ["water", 1200, "ml"], ["shallot", 1, "củ nhỏ"], ["fish-sauce", 1, "muỗng canh"], ["salt", 0.5, "muỗng cà phê"], ["scallion", 1, "nhánh", true]),
    steps: ["Chặt gà thành miếng nhỏ, rửa sạch và để ráo. Gọt khoai tây, cà rốt, cắt khối vừa ăn; băm hành tím.", "Cho gà vào nồi nước lạnh, đun sôi rồi hớt bọt. Hạ lửa, nấu 10 phút để gà ra nước ngọt.", "Cho cà rốt và khoai tây vào nồi. Nấu lửa vừa 15–20 phút đến khi rau củ mềm và gà chín tới xương.", "Nêm nước mắm, muối; kiểm tra phần thịt dày nhất không còn hồng và nước canh sôi nóng. Rắc hành lá rồi dùng."],
    tips: ["Nguồn cùng món dùng cổ, cánh và chân gà; công thức trong app đã biên soạn lại định lượng và bước nấu cho phần gà thông dụng."],
  },
  "shrimp-noodle": {
    name: "Mì nước tôm trứng",
    source: recipeSource("https://afamily.vn/bua-sang-ca-tuan-nhan-tenh-nho-5-cong-thuc-nau-mi-sieu-ngon-an-la-me-236260618173522202.chn", "Mì nước tôm — aFamily", "exact"),
    servings: 1, preparationTime: 10, cookingTime: 12, difficulty: "Dễ",
    ingredients: measured(["noodle", 1, "vắt (80–100 g)"], ["shrimp", 100, "g (3–5 con)"], ["egg", 1, "quả"], ["water", 500, "ml"], ["bok-choy", 50, "g"], ["oil", 1, "muỗng cà phê"]),
    steps: ["Bóc vỏ, bỏ chỉ lưng tôm và rửa sạch; nếu có đầu tôm, giữ lại để xào lấy vị ngọt cho nước dùng. Rửa rau xanh.", "Đun nóng dầu trong nồi nhỏ, xào tôm đến khi chuyển màu. Thêm nước, đun sôi và nấu vài phút cho nước dùng ngọt; nếu dùng đầu tôm, vớt bỏ trước khi cho mì.", "Cho mì vào nấu theo hướng dẫn bao bì, thêm rau xanh khi gần chín. Trong lúc đó, chiên trứng chín trong chảo riêng.", "Múc mì và nước dùng ra tô, đặt trứng chiên lên trên và dùng nóng."],
  },
  "rice-cooker-cheese-flan": {
    name: "Bánh flan phô mai nồi cơm điện",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-banh-flan-pho-mai-bang-noi-com-dien-00703", "Bánh flan phô mai bằng nồi cơm điện — Điện máy XANH", "exact"),
    servings: 3, preparationTime: 15, cookingTime: 10, difficulty: "Dễ",
    equipment: ["Nồi cơm điện có xửng hấp", "khuôn chịu nhiệt", "rây lọc"],
    ingredients: measured(["sugar", 50, "g làm caramel"], ["lime", 0.25, "quả"], ["condensed-milk", 100, "ml"], ["milk", 300, "ml"], ["egg", 2, "quả"], ["cheese", 2, "miếng"], ["vanilla", 1, "muỗng cà phê"], ["water", 100, "ml"], ["butter", 15, "g chống dính"]),
    steps: ["Phết bơ mỏng quanh khuôn. Đun 50 g đường với khoảng 20 ml nước; khi chuyển màu cánh gián, thêm vài giọt chanh, rót caramel xuống đáy khuôn và để nguội.", "Khuấy sữa đặc với sữa tươi rồi hâm đến nóng lăn tăn, không để sôi mạnh. Đánh tan trứng với vani; rót từ từ sữa ấm vào trứng trong lúc khuấy, sau đó lọc qua rây.", "Cho một miếng phô mai vào mỗi khuôn rồi rót hỗn hợp trứng sữa lên trên. Đổ nước vào nồi cơm khoảng 1/4 chiều cao, bật Cook cho sôi; đặt xửng có khăn lót và xếp khuôn lên xửng.", "Hấp 3–5 phút, mở nắp lau nước đọng rồi hấp thêm khoảng 3 phút. Kiểm tra flan vừa đông nhưng còn rung nhẹ, lấy ra để nguội rồi làm lạnh trước khi ăn."],
  },
  "rice-cooker-yogurt-sponge": {
    name: "Bánh bông lan sữa chua nồi cơm điện",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-banh-bong-lan-sua-chua-bang-noi-com-dien-bong-mem-05183", "Bánh bông lan sữa chua nồi cơm điện — Điện máy XANH", "exact"),
    servings: 4, preparationTime: 25, cookingTime: 30, difficulty: "Trung bình",
    equipment: ["Nồi cơm điện", "máy đánh trứng hoặc phới lồng", "rây bột"],
    ingredients: measured(["egg", 4, "quả"], ["flour", 50, "g"], ["cornstarch", 50, "g"], ["milk", 80, "ml"], ["yogurt", 100, "g"], ["sugar", 100, "g"], ["salt", 0.25, "muỗng cà phê"], ["vanilla", 1, "muỗng cà phê"], ["lime", 5, "ml nước cốt"], ["oil", 2, "muỗng canh" ]),
    steps: ["Tách riêng lòng trắng và lòng đỏ vào hai tô sạch, khô. Trộn lòng đỏ với sữa chua, sữa tươi, dầu và khoảng 30 g đường. Rây bột mì và bột bắp vào, khuấy vừa quyện.", "Cho nước cốt chanh vào lòng trắng, đánh đến nổi bọt. Chia 70 g đường còn lại làm 3 lần, đánh đến khi lòng trắng bóng, tạo chóp mềm.", "Trộn 1/3 lòng trắng vào hỗn hợp lòng đỏ cho nhẹ, rồi fold phần còn lại theo động tác vét và hất từ dưới lên để giữ bọt khí.", "Quét dầu mỏng vào lòng nồi cơm điện, đổ bột vào và dàn phẳng. Chọn Cook 3 phút rồi Warm 7 phút; lặp lại một lần, sau đó Cook 2 phút và Warm 5 phút. Để bánh nghỉ thêm 5 phút rồi kiểm tra tăm; nếu còn bột ướt, chạy thêm một chu kỳ ngắn."],
    tips: ["Chu kỳ nhiệt của mỗi nồi khác nhau; mở nắp ít nhất có thể và kiểm tra bánh trước khi lấy ra."],
  },
  "air-fryer-honey-chicken-feet": {
    name: "Chân gà nướng mật ong nồi chiên không dầu",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-chan-ga-nuong-mat-ong-bang-noi-chien-khong-dau-ngon-14588", "Chân gà nướng mật ong nồi chiên không dầu — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 240, cookingTime: 16, difficulty: "Dễ",
    equipment: ["Nồi chiên không dầu", "cọ phết sốt"],
    ingredients: measured(["chicken-foot", 500, "g"], ["honey", 1.5, "muỗng canh"], ["oil", 1.5, "muỗng canh"], ["oyster-sauce", 0.5, "muỗng cà phê"], ["shrimp-satay", 0.5, "muỗng cà phê"], ["bbq-sauce", 0.5, "muỗng canh"], ["lemongrass", 1.5, "cây"], ["salt", 0.5, "muỗng cà phê"]),
    steps: ["Rửa chân gà với muối loãng, cắt bỏ móng và dùng dao rạch nhẹ dọc phần xương giữa mỗi chân để gia vị thấm. Băm sả.", "Trộn chân gà với dầu, dầu hào, sa tế tôm, sốt thịt nướng và sả. Đậy kín, ướp trong ngăn mát 3–4 giờ.", "Làm nóng nồi chiên theo hướng dẫn của máy. Xếp chân gà thành lớp thoáng, nướng 160°C trong 8 phút.", "Lấy khay ra, quét mật ong lên chân gà, trở mặt rồi nướng thêm 6 phút ở 160°C. Trở mặt lần nữa, nướng thêm khoảng 2 phút; nếu phần dày gần khớp chưa chín kỹ, nướng thêm từng 2–3 phút. Nghỉ vài phút trước khi ăn."],
  },
  "air-fryer-lemon-butter-salmon": {
    name: "Cá hồi nướng giấy bạc sốt bơ tỏi chanh",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/2-cach-lam-ca-hoi-nuong-giay-bac-bang-noi-chien-khong-dau-13599", "Cá hồi nướng giấy bạc sốt bơ tỏi chanh — Điện máy XANH", "exact"),
    servings: 2, preparationTime: 20, cookingTime: 15, difficulty: "Dễ",
    equipment: ["Nồi chiên không dầu", "giấy bạc", "chảo nhỏ"],
    ingredients: measured(["salmon", 300, "g phi lê"], ["mixed-herbs", 5, "g"], ["butter", 1, "muỗng canh"], ["garlic", 1.5, "muỗng canh băm"], ["oyster-sauce", 2, "muỗng canh"], ["lime", 50, "ml nước cốt"], ["cooking-wine", 1, "muỗng canh", true], ["water", 50, "ml"], ["sugar", 1, "muỗng canh"], ["salt", 0.75, "muỗng cà phê"], ["pepper", 0.75, "muỗng cà phê"]),
    steps: ["Nếu dùng rượu để khử mùi, rửa nhanh cá với nước cốt chanh pha loãng và rượu, tráng lại rồi thấm thật khô. Ướp hai mặt cá với muối, tiêu và lá thơm 15–20 phút.", "Đặt cá lên giấy bạc, gói kín vừa phải. Nướng bằng nồi chiên không dầu ở 175°C khoảng 5–10 phút tùy độ dày; kiểm tra cá chín tơi nhưng còn ẩm.", "Trong lúc cá nướng, đun chảy bơ trên chảo nhỏ, phi tỏi thơm. Thêm nước, nước cốt chanh, đường, dầu hào, phần muối và tiêu còn lại; khuấy đến khi sốt sôi và hơi sánh.", "Mở giấy bạc cẩn thận vì có hơi nóng, chuyển cá ra đĩa rồi rưới sốt bơ tỏi chanh lên trên. Dùng nóng."],
  },
  "air-fryer-sweet-potato-cheese-sticks": {
    name: "Bánh khoai lang que nhân phô mai nồi chiên không dầu",
    source: recipeSource("https://www.dienmayxanh.com/vao-bep/cach-lam-banh-khoai-lang-que-bang-noi-chien-khong-dau-thom-04044", "Bánh khoai lang que bằng nồi chiên không dầu — Điện máy XANH", "exact"),
    servings: 3, preparationTime: 30, cookingTime: 20, difficulty: "Dễ",
    equipment: ["Nồi chiên không dầu", "nồi hấp", "giấy nến", "âu trộn"],
    ingredients: measured(["sweet-potato", 2, "củ"], ["rice-flour", 50, "g"], ["egg", 1, "quả"], ["margarine", 1, "muỗng cà phê"], ["sugar", 30, "g"], ["cheese", 50, "g mozzarella", true]),
    steps: ["Gọt vỏ khoai lang, rửa sạch rồi hấp đến khi mềm. Nghiền khoai thật nhuyễn.", "Trộn khoai với bột gạo, đường, bơ thực vật và trứng. Nhào đến khi hỗn hợp quyện thành khối.", "Nếu dùng mozzarella, cắt thành thanh nhỏ. Lấy một phần bột, miết dẹt, đặt phô mai vào giữa rồi bọc kín và nắn thành que.", "Lót giấy nến trong nồi chiên không dầu. Nướng ở 180°C trong 10 phút, lật mặt bánh rồi nướng thêm 5 phút ở 180°C. Để nguội nhẹ trước khi ăn."],
  },
  "rice-cooker-hainanese-chicken-rice": {
    name: "Cơm gà Hải Nam nấu bằng nồi cơm điện",
    source: recipeSource("https://vn.sharp/sites/default/files/products/documents/Cookbook_KS-COM1893CIB-BK.pdf", "Cơm gà Hải Nam — Sách công thức nồi cơm điện Sharp", "exact"),
    servings: 4, preparationTime: 15, cookingTime: 55, difficulty: "Trung bình",
    equipment: ["Nồi cơm điện có chế độ nấu nhanh và cơm mềm"],
    ingredients: measured(["chicken", 1, "con nguyên con"], ["shallot", 2, "củ"], ["ginger", 4, "lát"], ["ginger-root", 1, "muỗng canh bột nghệ"], ["salt", 1, "muỗng cà phê"], ["rock-sugar", 1, "muỗng cà phê"], ["rice", 500, "g gạo tẻ"], ["pandan-leaf", 1, "bó nhỏ"], ["water", 1, "lượng vừa đủ luộc gà", true]),
    steps: ["Rửa sạch gà và để ráo; bóc vỏ hành tím, thái lát gừng. Vo gạo.", "Cho gà vào nồi cùng hành tím, gừng, bột nghệ, muối, đường phèn và nước vừa đủ. Chọn chế độ nấu nhanh khoảng 40 phút. Kiểm tra gà đã chín hoàn toàn trước khi lấy ra.", "Vớt gà ra để nguội rồi chặt miếng vừa ăn. Giữ nước dùng trong nồi.", "Cho gạo đã vo và lá dứa vào nước dùng. Chọn chế độ cơm mềm hoặc chế độ nấu cơm tương đương của nồi.", "Khi cơm chín, xới ra tô và xếp gà lên trên. Có thể ăn kèm rau và nước chấm."],
    tips: ["Nguồn Sharp dùng một con gà nguyên con và 500 g gạo; lượng nước luộc cần điều chỉnh theo kích thước gà và dung tích nồi."],
  },
};

for (const recipe of recipes) {
  const data = sourcedRecipeData[recipe.id];
  if (!data) continue;
  if (data.name) recipe.name = data.name;
  if (data.source?.matchType === "exact") recipe.instructionReference = data.source;
  // This URL supports an adapted recipe; it is not the source of the in-app recipe itself.
  recipe.verificationStatus = "adapted";
  recipe.servings = data.servings;
  recipe.preparationTime = data.preparationTime;
  recipe.cookingTime = data.cookingTime;
  recipe.totalTime = data.preparationTime + data.cookingTime;
  recipe.minutes = recipe.totalTime;
  recipe.difficulty = data.difficulty;
  if (data.equipment) recipe.equipment = data.equipment;
  recipe.ingredients = data.ingredients;
  recipe.required = data.ingredients.filter((ingredient) => !ingredient.optional).map((ingredient) => ingredient.ingredientId);
  recipe.optional = data.ingredients.filter((ingredient) => ingredient.optional).map((ingredient) => ingredient.ingredientId);
  recipe.steps = data.steps.map((instruction, index) => ({ order: index + 1, instruction }));
  recipe.tips = data.tips ?? [];
}
export const emojiFor = (id: string) =>
  ingredients.find((i) => i.id === id)?.emoji ?? "🥗";
export const nameFor = (id: string) =>
  ingredients.find((i) => i.id === id)?.name ?? id;
