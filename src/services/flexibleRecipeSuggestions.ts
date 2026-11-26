import type { Ingredient } from "../data.ts";
import type { Recipe } from "../data.ts";

export type FlexibleStockItem = {
  id: string;
  name?: string;
  quantity?: number | string | null;
  unit?: string;
  fresh?: string;
  expiresAt?: string;
  frozen?: boolean;
};

export type FlexiblePreferences = {
  avoid: string[];
  vegan: boolean;
  vegetarian: boolean;
  avoidMeat: boolean;
  avoidSeafood: boolean;
};

type PantryFood = {
  stock: FlexibleStockItem;
  name: string;
  normalized: string;
  category?: Ingredient["category"];
  emoji: string;
  kind: "protein" | "vegetable" | "starch" | "other";
  preCooked: boolean;
  dumpling: boolean;
  springRoll: boolean;
  friedNemChua: boolean;
  roastDuck: boolean;
  offalStew: boolean;
  frozenFriedChicken: boolean;
  known: boolean;
};

const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, " ").trim();

const preCookedTerms = ["cha lua", "gio lua", "xuc xich", "lap xuong", "nem chua ran", "ham", "thit nguoi", "ca vien chien", "ga ran", "vit quay", "pha lau"];
const dumplingTerms = ["ha cao", "sui cao", "xiu mai"];
const seasoningTerms = ["toi", "hanh", "gung", "sa", "muoi", "duong", "nuoc mam", "nuoc tuong", "dau an", "tieu", "giam", "sa te"];
// These are normally eaten fresh or used as aromatics, so the generic
// stir-fry/soup templates should not turn them into cooked vegetables.
const unsuitableGenericVegetables = ["xa lach", "dua leo", "rau thom", "hung que", "ngo gai", "rau mui", "bac ha", "rau ram"];

function describeStock(stock: FlexibleStockItem, catalog: Ingredient[]): PantryFood {
  const rawName = stock.name ?? "";
  const ingredient = catalog.find((item) => item.id === stock.id)
    ?? catalog.find((item) => [item.name, item.id, ...item.aliases].some((term) => normalize(term) === normalize(rawName)));
  const name = ingredient?.name ?? (rawName || stock.id.replace(/^custom-/, "").replace(/-/g, " "));
  const normalized = normalize(name);
  const preCooked = preCookedTerms.some((term) => normalized.includes(term));
  const dumpling = dumplingTerms.some((term) => normalized.includes(term));
  const springRoll = normalized.includes("cha gio");
  const friedNemChua = ingredient?.id === "nem-chua-ran" || normalized.includes("nem chua ran");
  const roastDuck = ingredient?.id === "roast-duck" || normalized.includes("vit quay");
  const offalStew = ingredient?.id === "pha-lau" || normalized.includes("pha lau");
  const frozenFriedChicken = ingredient?.id === "frozen-fried-chicken" || normalized.includes("ga ran");
  const seasoning = ingredient?.category === "Gia vị" || seasoningTerms.some((term) => normalized === term || normalized.startsWith(`${term} `));
  const tofu = ingredient?.id === "tofu" || normalized.includes("dau hu") || normalized.includes("dau phu");
  const protein = !seasoning && (preCooked || dumpling || springRoll || tofu || ["Thịt", "Hải sản", "Trứng"].includes(ingredient?.category ?? ""));
  const vegetable = !seasoning && ingredient?.category === "Rau củ"
    && !unsuitableGenericVegetables.some((term) => normalized.includes(term));
  const starch = !seasoning && ingredient?.category === "Tinh bột";
  return {
    stock, name, normalized, category: ingredient?.category, emoji: ingredient?.emoji ?? (protein ? "🥢" : "🥬"),
    kind: protein ? "protein" : vegetable ? "vegetable" : starch ? "starch" : "other", preCooked, dumpling, springRoll, friedNemChua, roastDuck, offalStew, frozenFriedChicken, known: !!ingredient,
  };
}

function safeForPreferences(food: PantryFood, preferences: FlexiblePreferences): boolean {
  if (preferences.avoid.some((term) => {
    const blocked = normalize(term);
    return !!blocked && (blocked === food.normalized || food.normalized.includes(blocked));
  })) return false;
  if (preferences.vegetarian || preferences.vegan || preferences.avoidMeat) {
    if (food.category === "Thịt" || food.category === "Hải sản" || food.normalized.includes("cha lua") || food.normalized.includes("gio lua")) return false;
  }
  if (preferences.vegan && (food.category === "Trứng" || food.category === "Sữa")) return false;
  if (preferences.avoidSeafood && food.category === "Hải sản") return false;
  if ((preferences.vegetarian || preferences.vegan || preferences.avoidMeat || preferences.avoidSeafood) && !food.known) return false;
  return true;
}

type CreativeRecipeKind = "tofu-tomato" | "tomato-egg" | "potato-egg" | "eggplant-pork" | "tomato-stuffed-pork" | "cabbage-pork-rolls" | "steamed-egg-mushroom" | "yam-fish-ball-soup" | "cha-lua-sprout-stir" | "crispy-dumpling-greens" | "dumpling-soup-greens" | "roast-duck-rice" | "roast-duck-bread" | "roast-duck-greens" | "pha-lau-bread" | "pha-lau-noodle" | "lap-xuong-quail-egg" | "egg-lap-xuong" | "frozen-fried-chicken" | "frozen-fried-chicken-rice" | "glass-noodle-stir-fry" | "fresh-noodle-stir-fry" | "rice-lap-xuong" | "fried-nem-chua-rice-chayote-greens" | "nui-fish-ball-tomato";
type CreativeRecipePreset = Pick<Recipe, "name" | "category" | "emoji" | "method" | "minutes" | "equipment"> & { steps: string[]; tips: string[] };

function creativePreset(kind: CreativeRecipeKind, foods: PantryFood[]): CreativeRecipePreset {
  const food = (id: string) => foods.find((item) => item.stock.id === id)?.name ?? id;
  const tofu = food("tofu");
  const tomato = food("tomato");
  const egg = food("egg");
  const potato = food("potato");
  const eggplant = food("eggplant");
  const pork = food("ground-pork");
  const cabbage = food("cabbage");
  const mushroom = food("mushroom");
  const yam = food("purple-yam");
  const fishBall = food("fish-ball").replace(/\s+chiên$/i, "");
  const chảLụa = food("cha-lua");
  const beanSprouts = food("bean-sprout");
  const extraGreens = foods.find((item) => item.kind === "vegetable" && item.stock.id !== "bean-sprout")?.name;
  const roastDuck = foods.find((item) => item.roastDuck)?.name ?? food("roast-duck");
  const phaLau = foods.find((item) => item.offalStew)?.name ?? food("pha-lau");
  const rice = food("rice");
  const nui = food("nui");
  const bread = food("bread");
  const noodles = foods.find((item) => ["noodle", "hu-tieu", "fresh-noodle"].includes(item.stock.id))?.name ?? "mì";
  const lapXuong = food("lap-xuong");
  const quailEgg = food("quail-egg");
  const chickenEgg = food("egg");
  const friedChicken = foods.find((item) => item.frozenFriedChicken)?.name ?? "gà rán đông lạnh";
  const nemChuaRan = foods.find((item) => item.friedNemChua)?.name ?? "nem chua rán";
  const chayote = food("chayote");
  const rauLan = food("rau-lan");
  const dumpling = foods.find((item) => item.dumpling)?.name ?? "há cảo";
  const leafyGreen = foods.find((item) => item.kind === "vegetable" && item.stock.id !== "bean-sprout" && !["scallion", "green-onion", "hanh-la"].includes(item.stock.id))?.name ?? "rau cải";
  const skillet = ["Chảo", "Nồi"];
  switch (kind) {
    case "nui-fish-ball-tomato": return {
      name: "Nui sốt cà chua cá viên chiên", category: "Món nui", emoji: "🍝", method: "nui sốt", minutes: 25, equipment: ["Nồi", "chảo"],
      steps: [
        `Luộc ${nui.toLocaleLowerCase("vi")} theo thời gian trên bao bì đến vừa mềm; chắt nước, giữ lại khoảng nửa chén nước luộc nui.`,
        `Cắt đôi ${fishBall.toLocaleLowerCase("vi")} nếu viên lớn. Làm nóng trong chảo riêng với chút dầu đến khi nóng đều; nếu còn đông lạnh hoặc nhãn yêu cầu nấu chín, làm theo hướng dẫn bao bì.`,
        "Phi thơm tỏi với ít dầu nếu có. Cho cà chua cắt hạt lựu vào đảo đến mềm và ra nước; thêm vài muỗng nước luộc nui để tạo sốt sánh nhẹ.",
        "Nêm từ ít muối hoặc nước mắm, thêm một nhúm đường để dịu vị chua; nếm lại. Cho cá viên và nui vào đảo nhẹ cho sốt bám đều.",
        "Tắt bếp khi nui nóng và thấm sốt. Rắc hành lá hoặc tiêu nếu có, dùng nóng.",
      ],
      tips: ["Luộc nui vừa mềm theo hướng dẫn bao bì để nui không bở khi đảo sốt. Nêm nhẹ tay vì cá viên chiên thường đã có vị."],
    };
    case "fried-nem-chua-rice-chayote-greens": return {
      name: "Cơm nem chua rán, ăn kèm su su xào rau lan", category: "Món cơm", emoji: "🍚", method: "chiên và xào riêng", minutes: 25, equipment: ["Chảo", "nồi cơm hoặc lò chiên không dầu"],
      steps: [
        `Dùng ${rice.toLocaleLowerCase("vi")} đã nấu chín; nếu chỉ có gạo sống thì nấu cơm trước. Gọt ${chayote.toLocaleLowerCase("vi")}, bỏ hạt, thái que mỏng; nhặt và rửa ${rauLan.toLocaleLowerCase("vi")} rồi để ráo.`,
        `Làm nóng ${nemChuaRan.toLocaleLowerCase("vi")} riêng theo đúng hướng dẫn trên bao bì. Nếu sản phẩm còn sống/đông lạnh, nấu đủ chín theo nhãn; không cho nem vào chảo rau.`,
        `Làm nóng chảo với ít dầu. Xào ${chayote.toLocaleLowerCase("vi")} 2–3 phút, thêm một thìa nước và đậy nắp ngắn nếu cần để su su vừa mềm mà còn giòn.`,
        `Cho ${rauLan.toLocaleLowerCase("vi")} vào xào cùng 1–2 phút đến khi lá vừa xẹp và chín; nêm chút nước mắm hoặc nước tương, tiêu nếu có. Nếm trước vì nem chua rán thường đã đậm vị.`,
        "Dọn cơm, nem chua rán và phần su su xào rau lan thành từng phần riêng trên đĩa; ăn nóng.",
      ],
      tips: ["Đây là một mâm cơm gồm món chiên ăn kèm rau xào, không trộn nem vào rau. Nếu nem đã chiên chín thì chỉ làm nóng giòn; nếu nhãn bao bì có hướng dẫn riêng, ưu tiên hướng dẫn đó."],
    };
    case "tofu-tomato": return {
      name: `Đậu hũ áp chảo sốt ${tomato.toLocaleLowerCase("vi")}`, category: "Món mặn", emoji: "🍅", method: "rim", minutes: 25, equipment: skillet,
      steps: [`Thấm khô ${tofu}, cắt miếng vừa ăn rồi áp chảo với ít dầu nếu có đến khi hai mặt vàng; gắp ra.`, `Cắt ${tomato} nhỏ. Phi thơm tỏi hoặc hành nếu đang có, cho cà chua vào đảo đến khi mềm và ra nước.`, "Thêm một ít nước, nêm từng chút nước tương hoặc nước mắm và đường nếu có; nếm để sốt có vị mặn ngọt dịu.", `Cho ${tofu.toLocaleLowerCase("vi")} trở lại chảo, rim lửa nhỏ 4–6 phút cho thấm sốt. Rắc hành lá nếu có rồi dùng với cơm.`],
      tips: ["Áp chảo đậu trước giúp mặt đậu se vàng và ít vỡ khi rim; gia vị nêm từ ít rồi nếm lại."],
    };
    case "tomato-egg": return {
      name: `Trứng sốt ${tomato.toLocaleLowerCase("vi")}`, category: "Món mặn", emoji: "🍳", method: "xào", minutes: 15, equipment: ["Chảo"],
      steps: [`Đánh tan ${egg} với một nhúm muối. Cắt ${tomato} múi cau hoặc hạt lựu.`, "Làm nóng chảo với ít dầu, đổ trứng vào đảo nhẹ đến khi vừa đông khoảng 70%; trút ra đĩa.", `Cho cà chua vào chảo, đảo đến mềm; thêm 2–3 muỗng canh nước và nêm chút muối, đường hoặc nước mắm nếu có.`, "Cho trứng trở lại, đảo nhẹ cho sốt bám đều và trứng chín hẳn. Tắt bếp, dùng nóng với cơm."],
      tips: ["Đừng đảo trứng quá khô ở lượt đầu; trứng sẽ chín tiếp khi trộn với sốt cà chua."],
    };
    case "potato-egg": return {
      name: `Trứng chiên ${potato.toLocaleLowerCase("vi")} kiểu tortilla`, category: "Món chính", emoji: "🥔", method: "chiên", minutes: 30, equipment: ["Chảo chống dính", "nắp đậy"],
      steps: [`Gọt ${potato}, thái lát mỏng đều. Luộc hoặc áp chảo với ít dầu và vài muỗng nước, đậy nắp đến khi khoai mềm; để ráo.`, `Đánh ${egg} với muối và tiêu nếu có, trộn cùng khoai đã mềm.`, "Làm nóng chảo chống dính với một lớp dầu mỏng, dàn hỗn hợp thành bánh tròn và chiên lửa nhỏ có đậy nắp đến khi mặt dưới vàng, phần trứng đông.", "Lật bánh bằng đĩa hoặc úp chảo, chiên mặt còn lại đến khi trứng chín hoàn toàn. Để nghỉ một phút rồi cắt miếng."],
      tips: ["Thái khoai mỏng và làm mềm trước khi trộn để phần trứng không cháy trong lúc chờ khoai chín."],
    };
    case "eggplant-pork": return {
      name: `Cà tím om thịt bằm`, category: "Món mặn", emoji: "🍆", method: "om", minutes: 30, equipment: skillet,
      steps: [`Rửa ${eggplant}, cắt khúc vừa ăn; băm nhỏ ${pork} nếu chưa xay.`, "Làm nóng chảo với ít dầu, áp chảo cà tím đến khi xém cạnh rồi gắp ra.", `Cho thịt vào chảo, đảo đến khi chín và tơi. Thêm cà tím, chút nước, nêm nước mắm hoặc nước tương và tiêu nếu có.`, "Đậy nắp om lửa nhỏ 8–10 phút đến khi cà tím mềm nhưng còn nguyên miếng, thịt chín hoàn toàn và nước sốt sệt nhẹ."],
      tips: ["Cà tím áp chảo trước giúp món thơm và đỡ hút nhiều dầu; thêm nước từng ít để món om không bị nhão."],
    };
    case "tomato-stuffed-pork": return {
      name: "Cà chua nhồi thịt sốt nhẹ", category: "Món mặn", emoji: "🍅", method: "om", minutes: 30, equipment: ["Chảo có nắp"],
      steps: [`Chọn ${tomato} quả vừa hoặc to. Cắt nắp, khoét bớt ruột và giữ lại phần ruột băm nhỏ.`, `Trộn thịt ${pork.toLocaleLowerCase("vi")} với ruột cà chua, hành băm nếu có và chút muối/tiêu nếu có. Nhồi nhân vừa đầy, không nén chặt.`, "Đặt phần nhân úp xuống chảo nóng có ít dầu nếu có, áp chảo cho se mặt. Thêm vài muỗng nước, đậy nắp và om lửa nhỏ.", "Nấu khoảng 12–15 phút, trở nhẹ một lần; kiểm tra nhân thịt chín hoàn toàn rồi nếm lại sốt. Dọn cùng cơm."],
      tips: ["Dùng cà chua cỡ vừa hoặc lớn để nhồi dễ; đừng nhồi quá đầy vì nhân nở và dễ bung."],
    };
    case "cabbage-pork-rolls": return {
      name: "Bắp cải cuộn thịt bằm om mềm", category: "Món mặn", emoji: "🥬", method: "om", minutes: 35, equipment: ["Nồi có nắp"],
      steps: [`Tách lá ${cabbage}, chần nhanh trong nước sôi cho lá mềm để cuốn. Giữ lại phần lõi băm nhỏ.`, `Trộn ${pork} với lõi bắp cải, hành băm nếu có và chút muối/tiêu nếu có. Cho nhân lên lá, gấp hai mép rồi cuộn kín.`, "Xếp cuộn vào nồi với mặt mép gấp úp xuống. Thêm nước xâm xấp đáy nồi và nêm nhẹ nước mắm hoặc nước tương nếu có.", "Đậy nắp om lửa nhỏ 15–20 phút đến khi bắp cải mềm và thịt chín hoàn toàn. Nếm lại phần nước om, dùng nóng."],
      tips: ["Cuốn vừa tay, không nhồi nhân quá chặt để thịt chín đều; nếu lá nhỏ, dùng hai lá chồng nhau."],
    };
    case "steamed-egg-mushroom": return {
      name: `Trứng hấp mềm phủ ${mushroom.toLocaleLowerCase("vi")} áp chảo`, category: "Món mặn", emoji: "🍄", method: "hấp", minutes: 25, equipment: ["Tô chịu nhiệt", "nồi có nắp", "chảo nhỏ"],
      steps: [`Đánh ${egg} với nước ấm theo tỉ lệ khoảng 1 phần trứng : 1,5 phần nước; nêm một chút muối nếu có rồi lọc qua rây.`, "Đổ trứng vào tô chịu nhiệt, đậy hờ bằng đĩa hoặc giấy bạc. Hấp lửa nhỏ 10–12 phút đến khi mặt trứng vừa đông mịn.", `Trong lúc hấp, lau ${mushroom} sạch, cắt vừa ăn rồi áp chảo với ít dầu đến khi chín và thơm.`, `Cho nấm lên mặt trứng hấp, rưới chút nước tương hoặc hành lá nếu có. Hấp thêm 1–2 phút rồi dùng nóng.`],
      tips: ["Giữ nước chỉ sôi lăn tăn và không mở nắp liên tục để mặt trứng mịn, ít rỗ."],
    };
    case "yam-fish-ball-soup": return {
      name: "Canh khoai mỡ nấu cá viên", category: "Món nước", emoji: "🥣", method: "nấu canh", minutes: 30, equipment: ["Nồi", "dao bào hoặc bàn nạo"],
      steps: [`Gọt ${yam.toLocaleLowerCase("vi")}, rửa sạch rồi bào sợi hoặc nạo nhỏ để khoai dễ tan và làm sánh nước canh.`, "Đun sôi nước trong nồi. Cho khoai mỡ vào từ từ, vừa cho vừa khuấy nhẹ để khoai không vón đáy; hạ lửa nấu 8–12 phút đến khi khoai mềm.", `Cho ${fishBall.toLocaleLowerCase("vi")} vào. Nếu cá viên còn sống hoặc đông lạnh, nấu theo hướng dẫn trên bao bì; nếu đã chiên chín, chỉ cần đun thêm vài phút đến khi nóng đều.`, "Nêm từng ít nước mắm hoặc muối nếu có, nếm lại. Thêm hành lá hoặc rau thơm nếu đang có rồi dùng nóng với cơm."],
      tips: ["Cá viên chiên thường đã chín; chỉ cần làm nóng kỹ. Nếu dùng cá viên sống/đông lạnh, tuân theo thời gian nấu trên bao bì."],
    };
    case "cha-lua-sprout-stir": return {
      name: extraGreens ? `Chả lụa áp chảo, ăn kèm giá xào ${extraGreens.toLocaleLowerCase("vi")}` : "Chả lụa áp chảo ăn kèm giá đỗ xào", category: "Món mặn", emoji: "🥬", method: "xào", minutes: 20, equipment: ["Chảo"],
      steps: [`Thái ${chảLụa} thành lát vừa ăn. Rửa ${beanSprouts} và để thật ráo.${extraGreens ? ` Rửa ${extraGreens} và cắt vừa ăn.` : ""}`, `Áp chảo ${chảLụa.toLocaleLowerCase("vi")} với ít dầu đến khi nóng và hơi xém cạnh; gắp ra đĩa.`, ...(extraGreens ? [`Cho ${extraGreens} vào chảo, xào đến khi vừa mềm; nêm nhẹ nước mắm hoặc nước tương nếu có.`] : []), `Cho giá đỗ vào sau cùng, đảo nhanh khoảng 1 phút để vẫn giòn. Dọn rau xào và ${chảLụa.toLocaleLowerCase("vi")} riêng trên đĩa, ăn cùng cơm nếu có.`],
      tips: ["Không xào giá lâu vì sẽ ra nhiều nước. Chả lụa đã chín, chỉ cần áp chảo nóng đều."],
    };
    case "crispy-dumpling-greens": return {
      name: `${dumpling} áp chảo đáy giòn, ăn kèm ${leafyGreen.toLocaleLowerCase("vi")}`, category: "Món ăn nhẹ", emoji: "🥟", method: "chiên", minutes: 20, equipment: ["Chảo có nắp"],
      steps: [`Nếu ${dumpling} còn đông lạnh, làm theo hướng dẫn rã đông trên bao bì. Rửa ${leafyGreen}, để ráo.`, "Làm nóng chảo có chút dầu, xếp há cảo cách nhau và áp chảo đến khi đáy vàng.", "Rót một ít nước vào chảo, đậy nắp để há cảo chín theo hướng dẫn bao bì; mở nắp cho nước bay hết và đáy giòn lại. Đảm bảo nhân nóng chín hoàn toàn.", `Luộc hoặc xào nhanh ${leafyGreen} đến vừa mềm, nêm nhẹ nếu có. Dọn cùng há cảo và nước chấm tương ớt hoặc giấm.`],
      tips: ["Thời gian chín của há cảo khác nhau theo kích cỡ và loại nhân; ưu tiên hướng dẫn trên bao bì."],
    };
    case "dumpling-soup-greens": return {
      name: `Canh ${dumpling.toLocaleLowerCase("vi")} nấu ${leafyGreen.toLocaleLowerCase("vi")}`, category: "Món nước", emoji: "🥣", method: "nấu canh", minutes: 20, equipment: ["Nồi"],
      steps: [`Đun sôi nước hoặc nước dùng. Nếu ${dumpling} còn đông lạnh, không rã đông trừ khi bao bì yêu cầu.`, `Cho ${dumpling.toLocaleLowerCase("vi")} vào nấu theo thời gian trên bao bì. Với há cảo sống/đông lạnh, đảm bảo nhân nóng chín hoàn toàn.`, `Khi há cảo gần chín, cho ${leafyGreen.toLocaleLowerCase("vi")} vào nấu vừa mềm. Nêm nước tương hoặc muối nếu đang có.`, "Tắt bếp khi rau vừa chín, dùng nóng; có thể thêm hành lá hoặc tiêu nếu có."],
      tips: ["Không nấu há cảo lâu hơn hướng dẫn vì vỏ dễ bục; thêm rau vào gần cuối."],
    };
    case "roast-duck-rice": return {
      name: `Cơm chiên vịt quay${foods.some((item) => item.stock.id === "bean-sprout") ? " với giá" : ""}`, category: "Món cơm", emoji: "🍚", method: "chiên cơm", minutes: 20, equipment: ["Chảo rộng"],
      steps: [`Dùng ${rice.toLocaleLowerCase("vi")} đã nấu chín và để nguội, tách tơi hạt. Gỡ thịt ${roastDuck.toLocaleLowerCase("vi")} khỏi xương, xé miếng vừa ăn.`, "Nếu vịt còn lạnh, làm nóng phần da trong chảo trước cho ra chút mỡ và se giòn; gắp thịt ra riêng.", ...(foods.some((item) => item.stock.id === "bean-sprout") ? ["Xào giá nhanh trên lửa lớn rồi trút ra để riêng."] : []), "Cho cơm vào chảo, đảo tơi và nêm chút nước tương nếu có. Thêm thịt vịt vào đảo vừa nóng; cho giá trở lại cuối cùng nếu dùng. Nếm lại rồi dọn."],
      tips: ["Vịt quay đã chín nên chỉ cần làm nóng; không chiên lại lâu để thịt khỏi khô. Nếu chỉ có gạo sống, nấu cơm trước rồi để nguội."],
    };
    case "roast-duck-bread": return {
      name: "Bánh mì vịt quay ăn kèm rau", category: "Món chính", emoji: "🥖", method: "kẹp bánh mì", minutes: 15, equipment: ["Chảo khô hoặc lò nướng nhỏ"],
      steps: [`Tách thịt ${roastDuck.toLocaleLowerCase("vi")} khỏi xương, thái lát vừa ăn. Làm nóng nhanh trên chảo hoặc lò nhỏ đến khi thịt nóng đều, giữ phần da không bị khô.`, `Làm nóng ${bread.toLocaleLowerCase("vi")} cho vỏ giòn nhẹ rồi rạch dọc.`, "Kẹp vịt vào bánh mì. Nếu đang có dưa leo, rau thơm hoặc đồ chua thì thêm vào; dùng kèm phần nước sốt vịt nếu có."],
      tips: ["Vịt quay đã chín; chỉ làm nóng vừa đủ. Nếu là vịt để lạnh, bảo đảm phần thịt dày cũng nóng đều."],
    };
    case "roast-duck-greens": return {
      name: `Vịt quay ăn kèm ${foods.filter((item) => item.kind === "vegetable" && item.stock.id !== "bean-sprout").map((item) => item.name.toLocaleLowerCase("vi")).join(", ")}${foods.some((item) => item.stock.id === "bean-sprout") ? " xào giá" : " xào"}`, category: "Món chính", emoji: "🦆", method: "áp chảo và xào", minutes: 20, equipment: ["Chảo"],
      steps: [`Thái ${roastDuck.toLocaleLowerCase("vi")} thành miếng vừa ăn. Làm nóng nhanh phần da trên chảo rồi gắp thịt ra, tránh đảo lâu để thịt không khô.`, ...foods.filter((item) => item.kind === "vegetable" && item.stock.id !== "bean-sprout").map((item) => `Rửa ${item.name.toLocaleLowerCase("vi")}, để ráo và xào vừa chín; nêm nhẹ nếu có.`), ...(foods.filter((item) => item.kind === "vegetable" && item.stock.id === "bean-sprout").map((item) => `Cho ${item.name.toLocaleLowerCase("vi")} vào sau cùng, đảo nhanh khoảng một phút để còn giòn.`)), "Dọn vịt quay riêng cạnh phần rau xào, ăn với cơm nếu đang có."],
      tips: ["Vịt quay đã chín nên chỉ làm nóng; xào rau riêng để rau không bị ngấm mỡ và mềm nhũn."],
    };
    case "pha-lau-bread": return {
      name: "Bánh mì chấm phá lấu", category: "Món chính", emoji: "🥖", method: "hâm nóng và ăn kèm", minutes: 15, equipment: ["Nồi nhỏ", "chảo hoặc lò nướng nhỏ tùy có"],
      steps: [`Làm nóng ${phaLau.toLocaleLowerCase("vi")} trong nồi nhỏ theo hướng dẫn bảo quản/bao bì, khuấy nhẹ để nóng đều.`, `Làm nóng ${bread.toLocaleLowerCase("vi")} bằng chảo khô hoặc lò nướng nhỏ đến khi vỏ ấm giòn.`, "Múc phá lấu và nước sốt ra chén, dùng bánh mì chấm sốt. Nếu có rau thơm hoặc dưa leo thì ăn kèm riêng."],
      tips: ["Phá lấu mua sẵn thường đã nêm; nếm trước khi thêm gia vị. Bảo đảm món được hâm nóng đều."],
    };
    case "pha-lau-noodle": return {
      name: `${noodles} phá lấu`, category: "Món nước", emoji: "🍜", method: "nấu mì", minutes: 20, equipment: ["Nồi nhỏ", "nồi luộc mì"],
      steps: [`Luộc ${noodles.toLocaleLowerCase("vi")} theo hướng dẫn trên bao bì, vớt ra để ráo.`, `Làm nóng ${phaLau.toLocaleLowerCase("vi")} cùng phần nước sốt. Nếu sốt đặc, thêm từng ít nước nóng để có độ sánh dễ chan.`, ...foods.filter((item) => item.kind === "vegetable").map((item) => `Trụng ${item.name.toLocaleLowerCase("vi")} vừa chín rồi để ráo.`), "Cho mì ra tô, xếp rau trụng và phá lấu lên trên, chan sốt nóng.", "Nếm trước khi thêm gia vị vì phá lấu thường đã được nêm sẵn."],
      tips: ["Nếu dùng mì khô hoặc mì gói, nấu riêng rồi mới chan phá lấu để sợi mì không hút hết phần sốt."],
    };
    case "lap-xuong-quail-egg": return {
      name: "Lạp xưởng rim trứng cút", category: "Món mặn", emoji: "🥚", method: "rim", minutes: 25, equipment: ["Nồi nhỏ hoặc chảo sâu lòng"],
      steps: [`Luộc ${quailEgg.toLocaleLowerCase("vi")} đến khi chín, ngâm nước mát rồi bóc vỏ. Nếu trứng cút đã luộc sẵn thì bỏ qua bước này.`, `Thái ${lapXuong.toLocaleLowerCase("vi")} lát xéo. Cho vào chảo nóng, đảo lửa nhỏ để mỡ tiết ra và các mặt hơi xém; chắt bớt mỡ nếu nhiều.`, "Thêm trứng cút đã bóc vỏ và một ít nước. Nếm trước; chỉ thêm chút nước tương hoặc nước mắm nếu cần vì lạp xưởng vốn đã mặn ngọt.", "Rim lửa nhỏ 5–8 phút, đảo nhẹ đến khi trứng ngấm màu và nước sốt sánh. Dùng nóng với cơm."],
      tips: ["Lạp xưởng thường đã có đường và gia vị, nên không thêm đường trước khi nếm."],
    };
    case "egg-lap-xuong": return {
      name: "Trứng chiên lạp xưởng", category: "Món mặn", emoji: "🍳", method: "chiên", minutes: 15, equipment: ["Chảo"],
      steps: [`Thái ${lapXuong.toLocaleLowerCase("vi")} lát mỏng, áp chảo lửa vừa đến khi chín nóng và hơi xém cạnh; gắp ra.`, `Đánh ${chickenEgg.toLocaleLowerCase("vi")} với một thìa nước và tiêu nếu có. Không cần thêm muối trước vì lạp xưởng đã đậm vị.`, "Đổ trứng vào chảo, dàn đều; khi mặt dưới vừa đông thì rải lạp xưởng lên một nửa rồi gập trứng lại.", "Chiên lửa nhỏ đến khi trứng chín hẳn, cắt miếng và ăn nóng."],
      tips: ["Có thể cho thêm hành lá nếu đang có; giữ lửa vừa nhỏ để trứng chín mà không khô."],
    };
    case "frozen-fried-chicken": return {
      name: "Gà rán sốt mắm tỏi", category: "Món mặn", emoji: "🍗", method: "làm nóng và áo sốt", minutes: 20, equipment: ["Nồi chiên không dầu hoặc lò theo bao bì", "chảo nhỏ"],
      steps: [`Làm nóng ${friedChicken.toLocaleLowerCase("vi")} đúng theo hướng dẫn trên bao bì; không tự rã đông nếu nhà sản xuất không yêu cầu.`, "Nếu có tỏi, băm nhỏ rồi phi thơm với ít dầu. Hòa một ít nước mắm, đường và nước; đun sôi nhẹ đến khi hơi sánh.", "Tắt bếp, cho gà vào đảo nhanh để sốt áo mỏng bên ngoài; muốn giữ giòn thì để sốt riêng và chấm.", "Dùng nóng với cơm hoặc rau đang có. Nếu bao bì ghi gà chưa chín hoàn toàn, làm theo thời gian nấu của bao bì và đảm bảo phần trong nóng chín."],
      tips: ["Gà rán đông lạnh có thể là sản phẩm đã chín hoặc chưa chín; đọc nhãn và làm đúng hướng dẫn của nhà sản xuất."],
    };
    case "frozen-fried-chicken-rice": return {
      name: `Cơm gà rán${foods.some((item) => item.stock.id === "egg") ? " ăn kèm trứng ốp la" : ""}`, category: "Món cơm", emoji: "🍚", method: "nấu thành phần riêng", minutes: 25, equipment: ["Nồi cơm", "chảo", "nồi chiên hoặc lò theo bao bì"],
      steps: [`Nấu ${rice.toLocaleLowerCase("vi")} nếu đang có gạo sống; nếu là cơm chín thì xới tơi và làm nóng kỹ.`, `Làm nóng ${friedChicken.toLocaleLowerCase("vi")} theo hướng dẫn trên bao bì.`, ...(foods.some((item) => item.stock.id === "egg") ? [`Chiên ${chickenEgg.toLocaleLowerCase("vi")} thành trứng ốp la, nấu đến khi lòng trắng chín.`] : []), "Xới cơm ra đĩa, đặt gà và trứng riêng bên cạnh. Có rau hoặc dưa leo thì ăn kèm để cân vị."],
      tips: ["Gà đông lạnh cần làm theo nhãn bao bì; một số loại là gà sống tẩm bột, không chỉ hâm nóng."],
    };
    case "rice-lap-xuong": return {
      name: `Cơm chiên ${lapXuong.toLocaleLowerCase("vi")}`, category: "Món cơm", emoji: "🍚", method: "chiên cơm", minutes: 20, equipment: ["Chảo rộng"],
      steps: [
        `Dùng ${rice.toLocaleLowerCase("vi")} đã nấu chín và để nguội; xới tơi cơm, không chiên gạo sống.`,
        `Thái ${lapXuong.toLocaleLowerCase("vi")} lát mỏng, cho vào chảo nguội rồi bật lửa vừa để mỡ tiết ra và lạp xưởng nóng chín.`,
        "Nếu chảo có quá nhiều mỡ, chắt bớt. Cho cơm vào đảo tơi trên lửa vừa đến khi hạt cơm nóng đều.",
        "Nêm chút nước tương nếu có, nếm lại rồi tắt bếp; hành lá có thể thêm nếu đang có nhưng không bắt buộc.",
      ],
      tips: ["Lạp xưởng vốn mặn ngọt và có mỡ, nên nếm trước khi thêm dầu hoặc gia vị."],
    };
    case "glass-noodle-stir-fry": {
      const noodle = foods.find((item) => item.kind === "starch" && /mien|glass noodle/.test(item.normalized))?.name ?? "miến";
      const protein = foods.find((item) => item.kind === "protein");
      const vegetable = foods.find((item) => item.kind === "vegetable");
      return {
        name: `${noodle} xào ${protein?.name.toLocaleLowerCase("vi") ?? "nguyên liệu"} và ${vegetable?.name.toLocaleLowerCase("vi") ?? "rau"}`,
        category: "Món xào", emoji: "🍜", method: "miến xào", minutes: 25, equipment: ["Chảo", "tô ngâm miến"],
        steps: [
          `Ngâm ${noodle} theo hướng dẫn trên bao bì đến khi vừa mềm, vớt để ráo và cắt ngắn nếu sợi quá dài.`,
          `Rửa ${vegetable?.name ?? "rau"}, để ráo và cắt vừa ăn. Làm nóng chảo với ít dầu nếu có.`,
          protein?.preCooked
            ? `Cho ${protein.name} vào chảo làm nóng đều theo hướng dẫn bảo quản/bao bì; nếu là loại cần nấu chín, làm theo thời gian trên nhãn.`
            : `Cho ${protein?.name ?? "nguyên liệu chính"} vào chảo, xào đến khi chín hoàn toàn rồi gắp ra.` ,
          `Xào ${vegetable?.name ?? "rau"} vừa chín. Cho miến và nguyên liệu đã làm nóng trở lại; thêm vài muỗng nước để sợi miến không dính chảo.`,
          "Nêm từng ít nước tương hoặc nước mắm nếu đang có, đảo đến khi miến nóng mềm và thấm vị rồi tắt bếp.",
        ],
        tips: ["Ngâm miến vừa mềm là đủ; ngâm quá lâu khiến sợi dễ nát khi xào."],
      };
    }
    case "fresh-noodle-stir-fry": {
      const noodle = foods.find((item) => item.kind === "starch" && /mi tuoi|fresh noodle/.test(item.normalized))?.name ?? "mì tươi";
      const protein = foods.find((item) => item.kind === "protein");
      const vegetable = foods.find((item) => item.kind === "vegetable");
      return {
        name: `${noodle} xào ${protein?.name.toLocaleLowerCase("vi") ?? "nguyên liệu"} với ${vegetable?.name.toLocaleLowerCase("vi") ?? "rau"}`,
        category: "Món mì", emoji: "🍜", method: "mì xào", minutes: 20, equipment: ["Nồi luộc mì", "chảo"],
        steps: [
          `Trụng hoặc luộc ${noodle} theo đúng thời gian trên bao bì, xả nhanh nếu cần rồi để thật ráo.`,
          `Rửa ${vegetable?.name ?? "rau"}, cắt vừa ăn. Làm nóng chảo với ít dầu nếu có và xào rau đến vừa chín.`,
          protein?.preCooked
            ? `Cho ${protein.name} vào làm nóng đều theo hướng dẫn trên bao bì; nếu nhãn yêu cầu nấu chín, làm theo nhãn.`
            : `Xào ${protein?.name ?? "nguyên liệu chính"} đến khi chín hoàn toàn.`,
          `Cho mì vào chảo, đảo nhẹ cùng rau và nguyên liệu chính; thêm chút nước nếu mì khô hoặc dính.`,
          "Nêm từng ít nước tương hoặc nước mắm nếu có, đảo nóng đều rồi dùng ngay để mì không mềm nhũn.",
        ],
        tips: ["Luộc mì vừa chín tới và để ráo trước khi xào để sợi không bở."],
      };
    }
  }
}

function recipeFromFoods(foods: PantryFood[], method: "xào" | "canh" | "chiên" | "om" | "hấp", preset?: CreativeRecipePreset, imageVariant?: CreativeRecipeKind): Recipe {
  const recipeMethod = preset?.method ?? method;
  const proteins = foods.filter((food) => food.kind === "protein");
  const vegetables = foods.filter((food) => food.kind === "vegetable");
  const main = proteins[0];
  const starch = foods.find((food) => food.kind === "starch");
  const vegNames = vegetables.map((food) => food.name);
  const quickVegetables = vegetables.filter((food) => /gia|rau|cai|xa lach|nam|ca chua/.test(food.normalized));
  const firmVegetables = vegetables.filter((food) => !quickVegetables.includes(food));
  const sauteVegetableStep = quickVegetables.length && firmVegetables.length
    ? `Xào ${firmVegetables.map((food) => food.name).join(", ")} trước; khi gần mềm mới thêm ${quickVegetables.map((food) => food.name).join(", ")} và đảo nhanh.`
    : quickVegetables.length
      ? `Cho ${quickVegetables.map((food) => food.name).join(", ")} vào gần cuối, đảo nhanh khoảng 1–2 phút để rau còn độ giòn.`
      : `Cho ${vegNames.join(", ")} vào xào đến độ mềm bạn thích; thêm chút nước nếu chảo khô.`;
  const loweredVegNames = vegNames.map((name, index) => index === 0 ? name : name.toLocaleLowerCase("vi"));
  const joinedVegNames = loweredVegNames.length > 1
    ? `${loweredVegNames.slice(0, -1).join(", ")} và ${loweredVegNames[loweredVegNames.length - 1]}`
    : loweredVegNames[0] ?? "rau củ";
  const tofu = proteins.find((food) => food.stock.id === "tofu");
  const cookedProtein = proteins.find((food) => food !== tofu && food.preCooked && !food.springRoll && !food.friedNemChua && !food.dumpling);
  const springRollOnly = proteins.length === 1 && proteins[0].springRoll && vegetables.length === 0 && !starch;
  const dumplingOnly = proteins.length === 1 && proteins[0].dumpling && vegetables.length === 0 && !starch;
  const name = springRollOnly
    ? "Chả giò chiên giòn, ăn kèm nước chấm"
    : dumplingOnly
    ? `${main.name} áp chảo đáy giòn`
    : starch?.stock.id === "rice"
    ? `Cơm chiên${main ? ` ${main.name.toLocaleLowerCase("vi")}` : ""}${vegetables.length ? ` với ${vegNames.join(" và ").toLocaleLowerCase("vi")}` : ""}`
    : vegetables.length === 0 && proteins.length > 1
    ? cookedProtein && tofu
      ? `${cookedProtein.name} áp chảo cùng ${tofu.name.toLocaleLowerCase("vi")}`
      : proteins.map((food) => food.name).join(" và ") + " làm nóng"
    : method === "canh"
        ? main ? `Canh ${joinedVegNames.toLocaleLowerCase("vi")} với ${main.name.toLocaleLowerCase("vi")}` : `Canh ${joinedVegNames.toLocaleLowerCase("vi")}`
        : main ? `${joinedVegNames} xào ${main.name.toLocaleLowerCase("vi")}` : `${joinedVegNames} xào`;
  const ingredients = foods.map((food) => {
    const amount = food.stock.quantity !== undefined && food.stock.quantity !== null && String(food.stock.quantity).trim()
      ? `${food.stock.quantity} ${food.stock.unit ?? ""} · lượng bạn đang có`.trim()
      : undefined;
    return {
      ingredientId: food.stock.id,
      sourceName: food.name,
      quantity: null,
      unit: "",
      note: amount,
      optional: false,
      role: food.kind === "protein" ? "main" as const : "required" as const,
    };
  });
  const steps = preset?.steps ?? (springRollOnly && main
    ? [
      `Kiểm tra bao bì ${main.name}: nếu còn đông lạnh, làm theo hướng dẫn chiên của nhà sản xuất và không rã đông trước trừ khi bao bì yêu cầu. Nhân chả giò thường đã nêm, không cần nêm thêm vào cuốn.`,
      `Chọn một cách chiên: chiên ngập dầu nóng khoảng 170–175°C đến khi vỏ vàng giòn và nhân nóng chín; hoặc quét/xịt một lớp dầu mỏng rồi dùng nồi chiên không dầu theo nhiệt độ, thời gian trên bao bì, lật giữa chừng.`,
      "Gắp ra để trên rack hoặc giấy thấm dầu 2–3 phút để vỏ giữ độ giòn.",
      "Pha nước chấm nếu có: khuấy 1 phần nước mắm, 1 phần đường, 2 phần nước ấm và 1 phần nước cốt chanh hoặc giấm; thêm tỏi, ớt tùy thích. Nếm rồi chỉnh chua, ngọt, mặn theo khẩu vị.",
    ]
    : dumplingOnly && main
    ? [`Nếu ${main.name} còn đông lạnh, làm theo hướng dẫn trên bao bì.`, "Làm nóng chảo với một lớp dầu mỏng, đặt há cảo vào áp chảo đến khi đáy vàng.", "Thêm một ít nước, đậy nắp để há cảo chín theo hướng dẫn trên bao bì; mở nắp cho nước bay hết và đáy giòn lại. Đảm bảo nhân nóng chín hoàn toàn.", "Dùng nóng với nước chấm nếu có."]
    : starch?.stock.id === "rice"
    ? [
      "Dùng cơm đã nấu chín, để nguội và tách tơi hạt. Nếu đang có gạo sống, nấu chín trước rồi mới chiên.",
      ...(main ? [main.preCooked || main.category === "Đậu & hạt"
        ? `Áp chảo ${main.name} cho nóng và thơm; gắp ra để riêng.`
        : `Xào ${main.name} trước đến khi chín hoàn toàn; gắp ra để riêng.`] : []),
      ...(vegetables.length ? [`Cho ${vegNames.join(", ")} vào chảo, xào vừa chín; nếu có giá đỗ, cho vào sau cùng.`] : []),
      "Cho cơm vào đảo tơi trên lửa vừa; thêm nguyên liệu đã gắp ra, nêm từng ít gia vị nếu đang có rồi đảo nóng đều.",
    ]
    : method === "xào"
    ? [
      vegetables.length === 0
        ? proteins.some((food) => food.dumpling || food.springRoll)
          ? `Nếu ${proteins.filter((food) => food.dumpling || food.springRoll).map((food) => food.name).join(", ")} còn đông lạnh hoặc chưa chín, làm chín theo hướng dẫn trên bao bì trước.`
          : `Lau khô nguyên liệu. Cắt ${proteins.map((food) => food.name).join(" và ")} thành miếng vừa ăn nếu cần.`
        : main?.category === "Trứng" && main.stock.id === "quail-egg"
        ? `Luộc ${main.name} chín, bóc vỏ; rửa và cắt vừa ăn ${vegNames.join(", ")}.`
        : main?.category === "Trứng"
        ? `Rửa và để ráo ${vegNames.join(", ")}, cắt vừa ăn rồi đánh tan trứng.`
        : `${vegNames.map((name) => /giá/i.test(name) ? `Rửa và để ráo ${name}` : `Rửa và cắt ${name} vừa ăn`).join(". ")}.${main ? ` Thái ${main.name} mỏng hoặc vừa miếng.` : ""}`,
      "Làm nóng chảo. Nếu có tỏi và dầu ăn thì phi thơm; thiếu tỏi vẫn nấu được. Có thể dùng chảo chống dính và ít dầu nếu có.",
      ...(main ? (main.category === "Trứng" && main.stock.id === "quail-egg" ? [] : [main.category === "Trứng"
        ? "Đánh tan trứng, đổ vào chảo và đảo đến khi vừa đông; gắp ra để xào rau rồi cho trứng trở lại cuối cùng."
        : main.dumpling
          ? `Làm chín ${main.name} theo hướng dẫn trên bao bì; nếu dùng đồ đông lạnh, bảo đảm phần nhân nóng và chín hoàn toàn.`
          : main.springRoll
            ? `Nếu ${main.name} đã chiên chín, hâm riêng rồi để vào sau cùng; nếu còn sống hoặc đông lạnh, làm chín theo hướng dẫn trên bao bì.`
        : main.preCooked || main.category === "Đậu & hạt"
          ? `Cho ${main.name} vào đảo nóng đến khi nóng đều${main.preCooked ? "; nếu nhãn bao bì yêu cầu nấu chín, làm theo hướng dẫn đó" : ""}.`
          : `Cho ${main.name} vào xào trước đến khi chín hoàn toàn; thịt và hải sản sống không được để tái.`]) : []),
      ...(vegetables.length
        ? [sauteVegetableStep]
        : proteins.length > 1
          ? proteins.slice(1).map((food) => food.dumpling || food.springRoll
            ? `Làm chín ${food.name} theo hướng dẫn trên bao bì trước, rồi cho vào sau cùng.`
            : `Cho ${food.name} vào sau, đảo nhẹ đến khi nóng đều.`)
          : []),
      main?.category === "Trứng" && main.stock.id === "quail-egg"
        ? "Nêm từng ít nước mắm, nước tương hoặc muối nếu đang có; cho trứng cút đã luộc vào đảo nhẹ cho nóng đều rồi tắt bếp."
        : main?.category === "Trứng"
        ? "Nêm từng ít nước mắm, nước tương hoặc muối nếu đang có; cho trứng đã xào trở lại chảo, đảo đều rồi nếm lại. Gia vị không nằm trong tủ có thể bỏ qua."
        : "Nêm từng ít nước mắm, nước tương hoặc muối nếu đang có; nếm lại rồi tắt bếp. Gia vị không nằm trong tủ có thể bỏ qua.",
    ]
    : [
      `Rửa ${vegNames.join(", ")} và cắt miếng vừa ăn. Cắt ${main?.name ?? "nguyên liệu chính"} vừa miệng.`,
      "Đun sôi nước trong nồi; lượng nước điều chỉnh theo số người ăn.",
      ...(main ? [main.category === "Trứng"
        ? "Đánh tan trứng rồi rót thành dòng mỏng vào nồi đang sôi nhẹ, khuấy nhẹ đến khi trứng chín."
        : main.preCooked || main.category === "Đậu & hạt"
          ? `Cho ${main.name} vào làm nóng trong nước dùng; không cần nấu lâu.`
          : `Cho ${main.name} vào nấu đến khi chín hoàn toàn, hớt bọt nếu cần.`] : []),
      `Cho rau củ lâu chín vào trước, rau mềm vào sau. Nấu đến độ mềm mong muốn.`,
      "Nêm từng ít muối hoặc nước mắm nếu có, nếm lại rồi tắt bếp.",
    ]);
  return {
    id: `flexible-${foods.map((food) => normalize(food.stock.id)).join("-")}-${preset?.name ? normalize(preset.name).replace(/ /g, "-") : method}`,
    slug: `flexible-${foods.map((food) => normalize(food.stock.id)).join("-")}-${preset?.name ? normalize(preset.name).replace(/ /g, "-") : method}`,
    name: preset?.name ?? name,
    emoji: preset?.emoji ?? (method === "canh" ? "🥣" : method === "chiên" ? "🥟" : "🍳"),
    description: `Gợi ý tự phối từ ${foods.map((food) => food.name).join(", ")} đang có trong tủ.`,
    category: preset?.category ?? (springRollOnly || dumplingOnly
      ? "Món chiên"
      : starch?.stock.id === "rice"
      ? "Món cơm"
      : vegetables.length === 0 && proteins.some((food) => food.springRoll || food.dumpling)
      ? "Món ăn nhẹ"
      : method === "xào" ? "Món xào" : "Món canh"),
    cuisine: "vietnamese",
    method: recipeMethod,
    minutes: preset?.minutes ?? (method === "canh"
      ? (proteins.some((food) => food.category === "Thịt" || food.category === "Hải sản") ? 35 : 25)
      : method === "chiên" ? 20
        : method === "xào" && vegetables.some((food) => ["potato", "taro", "purple-yam"].includes(food.stock.id)) ? 25
          : method === "xào" && proteins.some((food) => food.category === "Thịt" || food.category === "Hải sản") ? 20
            : 15),
    preparationTime: null,
    cookingTime: null,
    totalTime: preset?.minutes ?? (method === "canh"
      ? (proteins.some((food) => food.category === "Thịt" || food.category === "Hải sản") ? 35 : 25)
      : method === "chiên" ? 20
        : method === "xào" && vegetables.some((food) => ["potato", "taro", "purple-yam"].includes(food.stock.id)) ? 25
          : method === "xào" && proteins.some((food) => food.category === "Thịt" || food.category === "Hải sản") ? 20
            : 15),
    difficulty: "Linh hoạt",
    servings: null,
    required: ingredients.map((item) => item.ingredientId),
    optional: [],
    ingredients,
    steps: steps.map((instruction, index) => ({ order: index + 1, instruction })),
    equipment: preset?.equipment ?? (springRollOnly || dumplingOnly ? ["Chảo có nắp"] : [method === "xào" ? "Chảo" : "Nồi"]),
    tips: preset?.tips ?? [springRollOnly
      ? "Chả giò bán sẵn thường đã nêm nhân; đừng nêm thêm vào cuốn. Ưu tiên thời gian và nhiệt độ trên bao bì, nhất là với chả giò đông lạnh."
      : "Đây là gợi ý tự phối, chưa phải công thức nguồn hay món đã thử nghiệm. Nêm từ ít rồi nếm lại; không cần dùng đủ mọi gia vị."],
    tags: ["Gợi ý linh hoạt", recipeMethod, ...(imageVariant ? [`flexible-image:${imageVariant}`] : [])],
    source: { type: "internal", title: "Gợi ý linh hoạt từ tủ lạnh · tự biên soạn, chưa thử nghiệm" },
    verificationStatus: "adapted",
    dataStatus: "full_recipe",
  };
}

export function suggestFlexibleRecipes(
  stock: FlexibleStockItem[],
  catalog: Ingredient[],
  preferences: FlexiblePreferences,
): Recipe[] {
  const foods = stock.map((item) => describeStock(item, catalog)).filter((food) => food.kind !== "other" && safeForPreferences(food, preferences));
  const proteins = foods.filter((food) => food.kind === "protein");
  const vegetables = foods.filter((food) => food.kind === "vegetable");
  const rice = foods.find((food) => food.stock.id === "rice");
  const suggestions: Recipe[] = [];
  // Scale the candidate list with the number of usable foods. The fridge UI
  // paginates the display at 15; the generator itself must retain later ideas
  // so users can open the complete list when their pantry supports it.
  // A handful of ingredients can support several genuinely different dishes
  // (for example, one protein can be stir-fried, simmered, or paired with rice).
  // Keep enough candidates for the fridge's "Xem tất cả" view without letting
  // a very large pantry produce an unbounded list.
  const maxSuggestions = Math.max(5, Math.min(45, foods.length * 2));
  const recipeKeys = new Set<string>();
  const ingredientSetMethods = new Map<string, Set<string>>();
  const add = (items: PantryFood[], method: "xào" | "canh" | "chiên" | "om" | "hấp", variant?: CreativeRecipeKind) => {
    const maxIngredients = variant === "fried-nem-chua-rice-chayote-greens" ? 4 : 3;
    if (!items.length || items.length > maxIngredients || suggestions.length >= maxSuggestions) return;
    const ingredientKey = items.map((food) => food.stock.id).sort().join("+");
    const methodKey = variant ?? method;
    const recipeKey = `${ingredientKey}#${methodKey}`;
    const methodsForIngredients = ingredientSetMethods.get(ingredientKey);
    // Reuse of the same ingredients is useful when the cooking method changes,
    // but do not show several title-only variations of the same dish.
    if (recipeKeys.has(recipeKey) || methodsForIngredients?.has(methodKey) || (methodsForIngredients?.size ?? 0) >= 2) return;
    const recipe = recipeFromFoods(items, method, variant ? creativePreset(variant, items) : undefined, variant);
    suggestions.push(recipe);
    recipeKeys.add(recipeKey);
    const nextMethods = methodsForIngredients ?? new Set<string>();
    nextMethods.add(methodKey);
    ingredientSetMethods.set(ingredientKey, nextMethods);
  };
  const isSoupVegetable = (food: PantryFood) => ["purple-yam", "pumpkin", "winter-melon", "luffa", "bottle-gourd"].includes(food.stock.id);
  const stirFryPriority = ["eggplant", "bok-choy", "cabbage", "carrot", "green-beans", "water-spinach", "bean-sprout"];
  const nonSoupVegetables = vegetables.filter((food) => !isSoupVegetable(food)).sort((a, b) => {
    const rank = (food: PantryFood) => {
      const index = stirFryPriority.indexOf(food.stock.id);
      return index < 0 ? stirFryPriority.length : index;
    };
    return rank(a) - rank(b);
  });
  // Prefer a few genuinely different dishes when the pantry supports them.
  // These use distinct techniques, rather than manufacturing near-duplicate
  // titles by swapping only the meat or sausage.
  const stockFood = (id: string) => foods.find((food) => food.stock.id === id);
  const tofuInStock = stockFood("tofu");
  const tomatoInStock = stockFood("tomato");
  const eggInStock = stockFood("egg");
  const potatoInStock = stockFood("potato");
  const eggplantInStock = stockFood("eggplant");
  const groundPorkInStock = stockFood("ground-pork");
  const cabbageInStock = stockFood("cabbage");
  const mushroomInStock = stockFood("mushroom");
  const yamInStock = stockFood("purple-yam");
  const fishBallInStock = stockFood("fish-ball");
  const nuiInStock = stockFood("nui");
  const chaLuaInStock = stockFood("cha-lua");
  const beanSproutsInStock = stockFood("bean-sprout");
  const roastDuckInStock = proteins.find((food) => food.roastDuck);
  const phaLauInStock = proteins.find((food) => food.offalStew);
  const friedChickenInStock = proteins.find((food) => food.frozenFriedChicken);
  const nemChuaRanInStock = proteins.find((food) => food.friedNemChua);
  const lapXuongInStock = proteins.find((food) => food.stock.id === "lap-xuong" || food.normalized.includes("lap xuong"));
  const quailEggInStock = proteins.find((food) => food.stock.id === "quail-egg" || food.normalized.includes("trung cut"));
  const chickenEggInStock = proteins.find((food) => food.stock.id === "egg" || food.normalized === "trung ga");
  const breadInStock = stockFood("bread");
  const noodleInStock = foods.find((food) => ["noodle", "hu-tieu", "fresh-noodle"].includes(food.stock.id));
  const dumpling = proteins.find((food) => food.dumpling);
  const leafyGreen = vegetables.find((food) => ["bok-choy", "spinach", "water-spinach", "cabbage"].includes(food.stock.id));
  const dumplingGreens = leafyGreen ?? vegetables.find((food) => food.stock.id !== "bean-sprout" && !["scallion", "green-onion", "hanh-la"].includes(food.stock.id) && !["purple-yam", "pumpkin", "winter-melon", "luffa", "bottle-gourd"].includes(food.stock.id));
  const chayoteInStock = stockFood("chayote");
  const rauLanInStock = stockFood("rau-lan");
  if (nemChuaRanInStock && rice && chayoteInStock && rauLanInStock) {
    add([nemChuaRanInStock, rice, chayoteInStock, rauLanInStock], "chiên", "fried-nem-chua-rice-chayote-greens");
  }
  if (nuiInStock && fishBallInStock && tomatoInStock) add([nuiInStock, fishBallInStock, tomatoInStock], "om", "nui-fish-ball-tomato");
  if (tofuInStock && tomatoInStock) add([tofuInStock, tomatoInStock], "om", "tofu-tomato");
  if (eggInStock && tomatoInStock) add([eggInStock, tomatoInStock], "xào", "tomato-egg");
  if (eggInStock && potatoInStock) add([eggInStock, potatoInStock], "chiên", "potato-egg");
  if (eggplantInStock && groundPorkInStock) add([eggplantInStock, groundPorkInStock], "om", "eggplant-pork");
  if (tomatoInStock && groundPorkInStock) add([tomatoInStock, groundPorkInStock], "om", "tomato-stuffed-pork");
  if (cabbageInStock && groundPorkInStock) add([cabbageInStock, groundPorkInStock], "om", "cabbage-pork-rolls");
  if (eggInStock && mushroomInStock) add([eggInStock, mushroomInStock], "hấp", "steamed-egg-mushroom");
  if (yamInStock && fishBallInStock) add([yamInStock, fishBallInStock], "canh", "yam-fish-ball-soup");
  const sideVegetable = vegetables.find((food) => !["bean-sprout", "purple-yam", "pumpkin", "winter-melon", "luffa", "bottle-gourd"].includes(food.stock.id));
  if (chaLuaInStock && beanSproutsInStock) add([chaLuaInStock, beanSproutsInStock, ...(sideVegetable ? [sideVegetable] : [])], "xào", "cha-lua-sprout-stir");
  if (dumpling && dumplingGreens) {
    add([dumpling, dumplingGreens], "chiên", "crispy-dumpling-greens");
    add([dumpling, dumplingGreens], "canh", "dumpling-soup-greens");
  }
  if (roastDuckInStock && rice) add([roastDuckInStock, rice, ...(beanSproutsInStock ? [beanSproutsInStock] : [])], "chiên", "roast-duck-rice");
  if (roastDuckInStock && breadInStock) add([roastDuckInStock, breadInStock], "chiên", "roast-duck-bread");
  if (roastDuckInStock && sideVegetable) add([roastDuckInStock, ...(beanSproutsInStock ? [beanSproutsInStock] : []), sideVegetable], "xào", "roast-duck-greens");
  if (phaLauInStock && breadInStock) add([phaLauInStock, breadInStock], "chiên", "pha-lau-bread");
  if (phaLauInStock && noodleInStock) add([phaLauInStock, noodleInStock, ...(leafyGreen ? [leafyGreen] : [])], "canh", "pha-lau-noodle");
  if (lapXuongInStock && quailEggInStock) add([lapXuongInStock, quailEggInStock], "om", "lap-xuong-quail-egg");
  if (lapXuongInStock && chickenEggInStock) add([lapXuongInStock, chickenEggInStock], "chiên", "egg-lap-xuong");
  if (friedChickenInStock && rice) add([friedChickenInStock, rice, ...(chickenEggInStock ? [chickenEggInStock] : [])], "chiên", "frozen-fried-chicken-rice");
  else if (friedChickenInStock) add([friedChickenInStock], "chiên", "frozen-fried-chicken");
  const glassNoodle = foods.find((food) => food.kind === "starch" && /mien|glass noodle/.test(food.normalized));
  const freshNoodle = foods.find((food) => food.kind === "starch" && /mi tuoi|fresh noodle/.test(food.normalized));
  const noodleProteins = proteins.filter((food) => !food.springRoll && !food.friedNemChua && !food.dumpling && !food.roastDuck && !food.offalStew && !food.frozenFriedChicken);
  const noodleVegetables = vegetables.filter((food) => !["scallion", "green-onion", "hanh-la"].includes(food.stock.id) && !["purple-yam", "pumpkin", "winter-melon", "luffa", "bottle-gourd"].includes(food.stock.id));
  const glassProtein = noodleProteins.find((food) => food.stock.id === "fish-ball")
    ?? noodleProteins.find((food) => food.stock.id !== "egg" && food.stock.id !== "quail-egg")
    ?? noodleProteins[0];
  const glassVegetable = noodleVegetables.find((food) => food.stock.id === "bean-sprout") ?? noodleVegetables[0];
  const freshProtein = noodleProteins.find((food) => food.stock.id === "lap-xuong" && food !== glassProtein)
    ?? noodleProteins.find((food) => food !== glassProtein && food.stock.id !== "egg" && food.stock.id !== "quail-egg")
    ?? noodleProteins.find((food) => food !== glassProtein);
  const freshVegetable = noodleVegetables.find((food) => food !== glassVegetable)
    ?? noodleVegetables.find((food) => food !== glassVegetable || noodleVegetables.length === 1);
  if (rice && lapXuongInStock) add([rice, lapXuongInStock], "chiên", "rice-lap-xuong");
  if (glassNoodle && glassProtein && glassVegetable) add([glassNoodle, glassProtein, glassVegetable], "xào", "glass-noodle-stir-fry");
  if (freshNoodle && freshProtein && freshVegetable) add([freshNoodle, freshProtein, freshVegetable], "xào", "fresh-noodle-stir-fry");
  const vegetablePairs: PantryFood[][] = [];
  for (let first = 0; first < vegetables.length; first += 1) {
    for (let second = first + 1; second < vegetables.length; second += 1) {
      const pair = [vegetables[first], vegetables[second]];
      if (!pair.some(isSoupVegetable)) vegetablePairs.push(pair);
    }
  }
  const pairScore = (pair: PantryFood[]) => {
    const ids = new Set(pair.map((food) => food.stock.id));
    if (ids.has("bean-sprout") && ids.has("eggplant")) return 0;
    if (ids.has("bean-sprout") && (ids.has("bok-choy") || ids.has("cabbage") || ids.has("spinach") || ids.has("water-spinach"))) return 1;
    return 2;
  };
  vegetablePairs.sort((a, b) => pairScore(a) - pairScore(b));

  const rawProteins = proteins.filter((food) =>
    (food.category === "Thịt" || food.category === "Hải sản")
      && !food.preCooked && !food.springRoll && !food.friedNemChua
      && !food.dumpling && !food.roastDuck && !food.offalStew
      && !food.frozenFriedChicken,
  );
  const soupVegetableIds = new Set([
    "potato", "carrot", "radish", "cabbage", "bottle-gourd", "winter-melon",
    "luffa", "pumpkin", "taro", "chayote", "cauliflower", "broccoli",
  ]);
  const soupReadyVegetables = vegetables.filter((food) => soupVegetableIds.has(food.stock.id));
  const soupPairs: PantryFood[][] = [];
  for (let first = 0; first < soupReadyVegetables.length; first += 1) {
    for (let second = first + 1; second < soupReadyVegetables.length; second += 1) {
      soupPairs.push([soupReadyVegetables[first], soupReadyVegetables[second]]);
    }
  }
  // First combine raw proteins with two soup-friendly vegetables, so a stocked
  // fridge can surface complete meals such as chicken soup with potato/carrot.
  for (const protein of rawProteins) {
    for (const pair of soupPairs) add([protein, ...pair], "canh");
  }

  // Raw meat and seafood were previously excluded from the broad pairing pass.
  // Pair each with vegetables that cook well in a pan; the generated steps
  // cook the protein fully before adding quick-cooking greens.
  for (const protein of rawProteins) {
    for (const vegetable of nonSoupVegetables) add([protein, vegetable], "xào");
  }

  // Quail eggs are commonly stocked as a cooked add-in. Pair them with
  // vegetables, but the generated method boils and peels them first instead
  // of treating them like beaten chicken eggs.
  const eggProteins = proteins.filter((food) => food.category === "Trứng");
  for (const egg of eggProteins) {
    for (const vegetable of nonSoupVegetables) add([egg, vegetable], "xào");
  }

  // Raw proteins can also make a complete fried-rice meal from cooked rice.
  // The recipe instructions explicitly cook the protein first and never treat
  // uncooked grains as ready-to-fry rice.
  if (rice) {
    for (const protein of rawProteins) {
      const vegetable = vegetables.find((food) => food.stock.id === "bean-sprout")
        ?? vegetables.find((food) => !isSoupVegetable(food));
      add(vegetable ? [rice, protein, vegetable] : [rice, protein], "xào");
    }
  }

  // Start with a simple vegetable dish so the list does not repeat one base
  // recipe while merely swapping the meat or sausage.
  vegetablePairs.slice(0, 2).forEach((pair) => add(pair, "xào"));

  const tofu = proteins.find((food) => food.stock.id === "tofu");
  const preparedMeats = proteins.filter((food) => food.preCooked && !food.springRoll && !food.friedNemChua && !food.dumpling && !food.roastDuck && !food.offalStew && !food.frozenFriedChicken && food !== tofu);
  const soupVegetables = vegetables.filter(isSoupVegetable);

  // Soup suggestions use squash-like vegetables; tofu is paired with pumpkin
  // when available, instead of combining every vegetable in one pot.
  for (const vegetable of soupVegetables) {
    const protein = vegetable.stock.id === "pumpkin" && tofu
      ? tofu
      : proteins.find((food) => food !== vegetable && !food.springRoll && !food.friedNemChua && !food.dumpling && !food.roastDuck && !food.offalStew && !food.frozenFriedChicken);
    add(protein ? [vegetable, protein] : [vegetable], "canh");
  }

  // A prepared meat with tofu is a separate, compact dish idea.
  if (tofu && preparedMeats.length) add([preparedMeats[0], tofu], "xào");

  // Pair prepared proteins with one vegetable at a time, keeping the vegetable
  // combination unique across the list and avoiding a second dish centered on
  // a protein already used in another suggestion.
  const proteinsAlreadySuggested = new Set(suggestions.flatMap((recipe) => recipe.ingredients.map((item) => item.ingredientId)).filter((id) => proteins.some((food) => food.stock.id === id)));
  const unpairedProteins = preparedMeats.filter((food) => !proteinsAlreadySuggested.has(food.stock.id));
  for (const [index, protein] of unpairedProteins.entries()) {
    const vegetable = nonSoupVegetables[index % Math.max(1, nonSoupVegetables.length)];
    if (vegetable) add([protein, vegetable], "xào");
  }

  // Rice makes a distinct, familiar meal idea instead of another version of
  // the same stir-fried vegetables.
  if (rice) {
    const protein = preparedMeats.find((food) => !food.springRoll && !food.friedNemChua && !food.dumpling && !proteinsAlreadySuggested.has(food.stock.id))
      ?? preparedMeats.find((food) => !food.springRoll && !food.friedNemChua && !food.dumpling);
    const vegetable = vegetables.find((food) => food.stock.id === "bean-sprout") ?? vegetables.find((food) => !isSoupVegetable(food));
    if (protein && vegetable) add([rice, protein, vegetable], "xào");
    else if (protein) add([rice, protein], "xào");
    else if (vegetable) add([rice, vegetable], "xào");
  }

  // Keep dumplings and spring rolls out of unrelated stir-fries. A spring roll
  // suggestion is a complete crisp-frying dish with a practical dipping sauce.
  for (const preparedSnack of proteins.filter((food) => food.springRoll || (food.dumpling && !suggestions.some((recipe) => recipe.ingredients.some((item) => item.ingredientId === food.stock.id))))) {
    add([preparedSnack], preparedSnack.springRoll ? "chiên" : "xào");
  }

  // Expand with ingredient combinations that change both the vegetable base
  // and the protein pairing. Walk the pairs in rounds so the list does not
  // fill with the same vegetable dish while swapping only the meat.
  if (vegetablePairs.length && preparedMeats.length) {
    const maxRounds = Math.ceil(maxSuggestions / vegetablePairs.length);
    for (let round = 0; round < maxRounds && suggestions.length < maxSuggestions; round += 1) {
      for (let index = 0; index < vegetablePairs.length && suggestions.length < maxSuggestions; index += 1) {
        const protein = preparedMeats[(index + round) % preparedMeats.length];
        add([protein, ...vegetablePairs[index]], "xào");
      }
    }
  }

  // With only one usable vegetable, still offer several distinct pairings
  // when there are several prepared proteins available.
  if (suggestions.length < maxSuggestions && nonSoupVegetables.length === 1) {
    for (const protein of preparedMeats) {
      if (suggestions.length >= maxSuggestions) break;
      add([protein, nonSoupVegetables[0]], "xào");
    }
  }
  return suggestions.slice(0, maxSuggestions);
}
