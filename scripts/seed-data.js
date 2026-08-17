#!/usr/bin/env node
/**
 * HW05 — Giai đoạn 2: Seed dữ liệu test + sinh CSV cho JMeter
 * MSSV: 23127522
 *
 * Chạy: node scripts/seed-data.js
 *
 * Bắt buộc chạy LẠI sau MỖI lần restart backend, vì `database.js` gọi
 * `initDatabase()` ngay khi require, và hàm này có `DROP TABLE IF EXISTS`
 * (backend/database.js:13-21) → restart = mất toàn bộ user đã seed.
 *
 * Script này:
 *   1. Đăng ký NUM_USERS user qua POST /api/register (dữ liệu tiếng Việt có dấu)
 *   2. Đăng ký NUM_LOCKOUT_USERS user riêng để test account-lockout (FR-02)
 *   3. Tạo NUM_PRODUCTS sản phẩm qua POST /api/products
 *   4. Ghi data/users.csv, data/users_lockout.csv, data/products.csv,
 *      data/coupons.csv bằng ID THẬT do API trả về
 *
 * Idempotent: đọc danh sách user/product hiện có trước khi tạo, chỉ tạo phần
 * còn thiếu. Cần thiết vì POST /api/register KHÔNG kiểm tra email trùng
 * (backend/server.js:20-30) → chạy 2 lần mà không check sẽ tạo user trùng email.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const NUM_USERS = Number(process.env.NUM_USERS || 500);
const NUM_LOCKOUT_USERS = Number(process.env.NUM_LOCKOUT_USERS || 30);
const NUM_PRODUCTS = Number(process.env.NUM_PRODUCTS || 200);
const DATA_DIR = path.resolve(__dirname, "..", "data");

const ADMIN_CREDENTIALS = { email: "admin@eshop.com", password: "Admin123!" };
const DEFAULT_PASSWORD = "MatKhau123!";

// Mọi sản phẩm sinh ra đều có giá > 500.000 ₫ để mọi dòng products.csv đều
// thỏa min_order_amount của cả BIGBUY (500k) và VIP100 (300k) ở mức quantity=1.
// Lý do: POST /api/apply-coupon dùng so sánh CHẶT `total_amount >
// coupon.min_order_amount` (backend/server.js:379), nên total = 500000 chẵn sẽ
// bị từ chối. Xem docs/02-test-data.md §4.
const MIN_PRICE = 600000;

// ---------------------------------------------------------------- dữ liệu gốc

const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ",
  "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Trương",
  "Mai", "Chu"];

const MIDDLE_NAMES_MALE = ["Văn", "Hữu", "Minh", "Quang", "Đức", "Thành", "Bá", "Xuân"];
const MIDDLE_NAMES_FEMALE = ["Thị", "Thanh", "Ngọc", "Thu", "Kim", "Mỹ", "Diệu", "Khánh"];

const FIRST_NAMES_MALE = ["An", "Bình", "Cường", "Dũng", "Đạt", "Hải", "Hùng", "Khang",
  "Khoa", "Long", "Nam", "Nghĩa", "Phong", "Phúc", "Quân", "Sơn", "Tài",
  "Thắng", "Tiến", "Trung", "Tuấn", "Vinh", "Kiên", "Lâm"];

const FIRST_NAMES_FEMALE = ["Anh", "Bích", "Châu", "Dung", "Hà", "Hạnh", "Hoa", "Hương",
  "Lan", "Linh", "Mai", "Nga", "Ngân", "Nhung", "Oanh", "Phương", "Quyên",
  "Thảo", "Trang", "Uyên", "Vân", "Yến", "Trâm", "Diễm"];

// Địa chỉ thật theo cụm (đường + phường/quận + tỉnh/thành) để không ghép lệch
// địa lý kiểu "đường ở Hà Nội, quận ở TP.HCM".
const ADDRESSES = [
  ["Nguyễn Văn Cừ", "Phường Cầu Kho, Quận 1", "TP. Hồ Chí Minh"],
  ["Lê Lợi", "Phường Bến Nghé, Quận 1", "TP. Hồ Chí Minh"],
  ["Điện Biên Phủ", "Phường 15, Quận Bình Thạnh", "TP. Hồ Chí Minh"],
  ["Cách Mạng Tháng Tám", "Phường 11, Quận 3", "TP. Hồ Chí Minh"],
  ["Nguyễn Thị Minh Khai", "Phường Đa Kao, Quận 1", "TP. Hồ Chí Minh"],
  ["Sư Vạn Hạnh", "Phường 12, Quận 10", "TP. Hồ Chí Minh"],
  ["Quang Trung", "Phường 10, Quận Gò Vấp", "TP. Hồ Chí Minh"],
  ["Phạm Văn Đồng", "Phường Linh Đông, Quận Thủ Đức", "TP. Hồ Chí Minh"],
  ["Xô Viết Nghệ Tĩnh", "Phường 17, Quận Bình Thạnh", "TP. Hồ Chí Minh"],
  ["Cầu Giấy", "Phường Dịch Vọng, Quận Cầu Giấy", "Hà Nội"],
  ["Nguyễn Trãi", "Phường Thượng Đình, Quận Thanh Xuân", "Hà Nội"],
  ["Giải Phóng", "Phường Phương Liệt, Quận Thanh Xuân", "Hà Nội"],
  ["Xuân Thủy", "Phường Dịch Vọng Hậu, Quận Cầu Giấy", "Hà Nội"],
  ["Bà Triệu", "Phường Nguyễn Du, Quận Hai Bà Trưng", "Hà Nội"],
  ["Tây Sơn", "Phường Quang Trung, Quận Đống Đa", "Hà Nội"],
  ["Nguyễn Văn Linh", "Phường Nam Dương, Quận Hải Châu", "Đà Nẵng"],
  ["Lê Duẩn", "Phường Thạch Thang, Quận Hải Châu", "Đà Nẵng"],
  ["Nguyễn Tất Thành", "Phường Thanh Bình, Quận Hải Châu", "Đà Nẵng"],
  ["Trần Hưng Đạo", "Phường Vĩnh Ninh, TP. Huế", "Thừa Thiên Huế"],
  ["Nguyễn Văn Cừ", "Phường An Bình, TP. Biên Hòa", "Đồng Nai"],
  ["Hùng Vương", "Phường 1, TP. Vũng Tàu", "Bà Rịa - Vũng Tàu"],
  ["Trần Phú", "Phường Lộc Thọ, TP. Nha Trang", "Khánh Hòa"],
  ["Nguyễn Huệ", "Phường Xuân Khánh, Quận Ninh Kiều", "Cần Thơ"],
  ["Hai Bà Trưng", "Phường 6, TP. Đà Lạt", "Lâm Đồng"],
];

// Đầu số di động thật đang lưu hành tại Việt Nam.
const PHONE_PREFIXES = ["032", "033", "034", "035", "036", "037", "038", "039",
  "070", "076", "077", "078", "079", "081", "082", "083", "084", "085",
  "086", "088", "090", "091", "093", "094", "096", "097", "098"];

// Sản phẩm thật theo 3 category có sẵn trong DB: 1=Điện thoại, 2=Laptop,
// 3=Phụ kiện (backend/database.js:85-87). Giá tham chiếu thị trường VN, đơn ₫.
const PHONES = [
  ["iPhone 15 Pro", 27990000], ["iPhone 15", 21990000],
  ["iPhone 14 Pro Max", 25990000], ["iPhone 13", 14990000],
  ["Samsung Galaxy S24", 22990000], ["Samsung Galaxy S24 Plus", 26990000],
  ["Samsung Galaxy Z Flip 5", 25990000], ["Samsung Galaxy A55", 8990000],
  ["Samsung Galaxy A35", 6990000], ["Xiaomi 14", 19990000],
  ["Xiaomi Redmi Note 13 Pro", 6490000], ["Xiaomi Redmi 13C", 3290000],
  ["OPPO Reno11 F", 8490000], ["OPPO Find N3 Flip", 22990000],
  ["OPPO A78", 5490000], ["vivo V30e", 8490000], ["vivo Y36", 5990000],
  ["realme 12 Pro Plus", 10990000], ["realme C67", 4590000],
  ["Google Pixel 8", 17990000], ["Nothing Phone 2a", 8990000],
  ["ASUS ROG Phone 8", 24990000], ["Honor X7b", 4790000],
  ["TECNO Camon 30", 5990000],
];

const LAPTOPS = [
  ["MacBook Air M2 13 inch", 24990000], ["MacBook Air M3 15 inch", 32990000],
  ["MacBook Pro M3 Pro 14 inch", 48990000], ["Dell XPS 13 Plus", 39990000],
  ["Dell Inspiron 15 3520", 14990000], ["Dell Vostro 3520", 16990000],
  ["HP Pavilion 15", 15990000], ["HP Envy x360 14", 25990000],
  ["HP Victus 16", 21990000], ["Lenovo ThinkPad X1 Carbon Gen 11", 42990000],
  ["Lenovo IdeaPad Slim 5", 15490000], ["Lenovo LOQ 15", 20990000],
  ["ASUS Zenbook 14 OLED", 26990000], ["ASUS Vivobook 15", 13990000],
  ["ASUS TUF Gaming F15", 22990000], ["ASUS ROG Zephyrus G14", 41990000],
  ["Acer Aspire 5", 12990000], ["Acer Nitro 5 Tiger", 19990000],
  ["Acer Swift Go 14", 18990000], ["MSI Modern 14", 13490000],
  ["MSI Katana 15", 23990000], ["LG Gram 14 inch", 31990000],
  ["Huawei MateBook D14", 14990000], ["Gigabyte G5 KF", 24990000],
];

const ACCESSORIES = [
  ["Tai nghe AirPods Pro 2", 5990000], ["Tai nghe AirPods 3", 4190000],
  ["Tai nghe Sony WH-1000XM5", 8490000], ["Tai nghe Sony WF-C700N", 2290000],
  ["Tai nghe Samsung Galaxy Buds2 Pro", 3990000],
  ["Tai nghe JBL Tune 770NC", 2490000], ["Tai nghe Anker Soundcore Q30", 1290000],
  ["Bàn phím cơ Keychron K2 Pro", 2790000],
  ["Bàn phím cơ Akko 3068B Plus", 1590000],
  ["Bàn phím cơ Logitech MX Mechanical", 3490000],
  ["Chuột Logitech MX Master 3S", 2590000],
  ["Chuột Logitech G Pro X Superlight", 3190000],
  ["Chuột Razer DeathAdder V3", 1790000],
  ["Sạc nhanh Anker 735 GaN 65W", 890000],
  ["Sạc nhanh Ugreen Nexode 100W", 1490000],
  ["Pin sạc dự phòng Anker 737 24000mAh", 2790000],
  ["Pin sạc dự phòng Xiaomi 20000mAh", 690000],
  ["Ổ cứng di động Samsung T7 1TB", 2390000],
  ["Ổ cứng di động SanDisk Extreme 1TB", 2790000],
  ["Thẻ nhớ SanDisk Extreme Pro 256GB", 990000],
  ["Hub USB-C Ugreen 6 trong 1", 790000],
  ["Đế tản nhiệt laptop Cooler Master", 650000],
  ["Balo laptop Targus Cypress 15.6 inch", 1290000],
  ["Giá đỡ laptop nhôm Ugreen", 620000],
];

const DESCRIPTIONS_BY_CATEGORY = {
  1: [
    "Màn hình AMOLED sắc nét, pin dùng cả ngày, sạc nhanh kèm hộp.",
    "Camera chụp đêm rõ nét, chống rung quang học, quay video 4K.",
    "Hiệu năng mượt cho game nặng, tản nhiệt tốt khi chơi lâu.",
    "Thiết kế mỏng nhẹ, kháng nước IP68, cảm biến vân tay dưới màn hình.",
  ],
  2: [
    "Máy mỏng nhẹ, bàn phím gõ êm, pin dùng liên tục hơn 8 giờ.",
    "Màn hình chuẩn màu cho dựng phim và thiết kế đồ họa.",
    "Card rời cho game và render, khe nâng cấp RAM và SSD sẵn.",
    "Đủ cổng USB-A, HDMI và khe thẻ nhớ, không cần mang thêm hub.",
  ],
  3: [
    "Hàng chính hãng, bảo hành 12 tháng, đổi mới trong 7 ngày đầu.",
    "Chất liệu bền, hoàn thiện chắc tay, dùng hằng ngày ổn định.",
    "Tương thích cả máy Windows và macOS, cắm là chạy.",
    "Phụ kiện gọn nhẹ, dễ mang theo trong balo đi làm đi học.",
  ],
};

const COLORS = ["Đen", "Trắng", "Xanh dương", "Xanh rêu", "Bạc", "Xám", "Vàng đồng", "Tím nhạt"];
const STORAGE_OPTIONS = ["128GB", "256GB", "512GB", "8GB/256GB", "16GB/512GB", "1TB"];

// ------------------------------------------------------------------ tiện ích

/** Bỏ dấu tiếng Việt để sinh email/slug hợp lệ (tên vẫn giữ nguyên dấu). */
function stripDiacritics(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, header, rows) {
  const lines = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  // KHÔNG ghi BOM: JMeter CSV Data Set Config đọc BOM thành phần của giá trị
  // cột đầu tiên. Encoding khai trong JMeter phải là UTF-8.
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  return lines.length - 1;
}

async function apiCall(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return data;
}

/** Chạy các job song song có giới hạn, tránh làm nghẽn 1 connection SQLite. */
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// -------------------------------------------------------- sinh dữ liệu người

/** Sinh danh sách người dùng tất định (seed cố định → chạy lại ra y hệt). */
function generateUsers(count, emailPrefix) {
  const out = [];
  const usedEmails = new Set();
  for (let i = 0; i < count; i++) {
    const isMale = i % 2 === 0;
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const middleName = isMale
      ? MIDDLE_NAMES_MALE[Math.floor(i / LAST_NAMES.length) % MIDDLE_NAMES_MALE.length]
      : MIDDLE_NAMES_FEMALE[Math.floor(i / LAST_NAMES.length) % MIDDLE_NAMES_FEMALE.length];
    const firstName = isMale
      ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length]
      : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const fullName = `${lastName} ${middleName} ${firstName}`;

    const seq = String(i + 1).padStart(3, "0");
    const email = `${stripDiacritics(firstName).toLowerCase()}.${stripDiacritics(lastName).toLowerCase()}${seq}@${emailPrefix}.eshop.vn`;
    if (usedEmails.has(email)) throw new Error(`Email trùng: ${email}`);
    usedEmails.add(email);

    const [street, ward, province] = ADDRESSES[i % ADDRESSES.length];
    const houseNumber = 12 + ((i * 7) % 288);
    const address = `${houseNumber} ${street}, ${ward}, ${province}`;

    const phonePrefix = PHONE_PREFIXES[i % PHONE_PREFIXES.length];
    const phoneSuffix = String(1000000 + ((i * 74519) % 8999999)).slice(0, 7);
    const phoneNumber = `${phonePrefix}${phoneSuffix}`;

    out.push({ fullName, email, password: DEFAULT_PASSWORD, address, phoneNumber });
  }
  return out;
}

/** Sinh danh sách sản phẩm tất định, giá luôn > MIN_PRICE. */
function generateProducts(count) {
  const source = [
    ...PHONES.map((p) => [...p, 1]),
    ...LAPTOPS.map((p) => [...p, 2]),
    ...ACCESSORIES.map((p) => [...p, 3]),
  ];
  const out = [];
  const usedNames = new Set();
  for (let i = 0; i < count; i++) {
    const [baseName, basePrice, categoryId] = source[i % source.length];
    const round = Math.floor(i / source.length);

    // Vòng đầu giữ nguyên tên gốc; các vòng sau thêm biến thể màu/dung lượng
    // để tên vẫn là tên hàng thật, không phải "Sản phẩm 123".
    let name = baseName;
    if (round > 0) {
      const variant = categoryId === 3
        ? COLORS[round % COLORS.length]
        : `${STORAGE_OPTIONS[round % STORAGE_OPTIONS.length]} ${COLORS[round % COLORS.length]}`;
      name = `${baseName} ${variant}`;
    }
    if (usedNames.has(name)) throw new Error(`Tên sản phẩm trùng: ${name}`);
    usedNames.add(name);

    // Lệch giá theo vòng (±) cho dữ liệu đa dạng, vẫn giữ trên ngưỡng tối thiểu.
    const offset = ((i * 137) % 21) - 10; // -10% .. +10%
    let price = Math.round((basePrice * (100 + offset)) / 100 / 10000) * 10000;
    if (price < MIN_PRICE) price = MIN_PRICE + ((i * 10000) % 400000);

    const description = DESCRIPTIONS_BY_CATEGORY[categoryId][i % DESCRIPTIONS_BY_CATEGORY[categoryId].length];
    const slug = stripDiacritics(baseName).replace(/[^a-zA-Z0-9]+/g, "+").replace(/^\+|\+$/g, "");

    out.push({
      name,
      price,
      description: `${description} Mã hàng nội bộ: SP-${String(i + 1).padStart(4, "0")}.`,
      imageUrl: `https://placehold.co/300x300/png?text=${slug}`,
      categoryId,
    });
  }
  return out;
}

// ------------------------------------------------------------------ chạy seed

async function main() {
  const startTime = Date.now();
  console.log(`[seed] BASE_URL = ${BASE_URL}`);

  // 0. Backend phải đang chạy.
  let existingProducts;
  try {
    existingProducts = await apiCall("GET", "/api/products");
  } catch (e) {
    console.error(`\n[LỖI] Không gọi được ${BASE_URL}/api/products`);
    console.error("       Khởi động backend trước: cd eshop-sut/backend && node server.js");
    console.error(`       Chi tiết: ${e.message}`);
    process.exit(1);
  }
  console.log(`[seed] Backend OK — đang có ${existingProducts.length} sản phẩm`);

  // 1. Đăng nhập admin để đọc danh sách user (GET /api/admin/users cần token).
  const loginResponse = await apiCall("POST", "/api/login", ADMIN_CREDENTIALS);
  const adminToken = loginResponse.token;
  const existingUsers = await apiCall("GET", "/api/admin/users", null, adminToken);
  const existingEmails = new Set(existingUsers.map((u) => u.email));
  console.log(`[seed] Đang có ${existingUsers.length} user trong DB`);

  // 2. Seed user chính + user dành riêng cho lockout.
  const users = generateUsers(NUM_USERS, "load");
  const lockoutUsers = generateUsers(NUM_LOCKOUT_USERS, "lockout");

  const usersToCreate = [...users, ...lockoutUsers].filter((u) => !existingEmails.has(u.email));
  console.log(`[seed] Cần đăng ký ${usersToCreate.length} user (bỏ qua ${users.length + lockoutUsers.length - usersToCreate.length} đã có)`);

  let userErrorCount = 0;
  await runPool(usersToCreate, 10, async (u) => {
    try {
      await apiCall("POST", "/api/register", {
        name: u.fullName,
        email: u.email,
        password: u.password,
      });
    } catch (e) {
      userErrorCount++;
      if (userErrorCount <= 3) console.warn(`  [!] register ${u.email}: ${e.message}`);
    }
  });
  if (userErrorCount) console.warn(`[seed] ${userErrorCount} user đăng ký lỗi`);

  // 3. Lấy lại user để có ID THẬT do DB sinh.
  const usersAfterSeed = await apiCall("GET", "/api/admin/users", null, adminToken);
  const userIdByEmail = new Map(usersAfterSeed.map((u) => [u.email, u.id]));

  // 4. Seed sản phẩm (chỉ bù cho đủ NUM_PRODUCTS, so theo tên).
  const products = generateProducts(NUM_PRODUCTS);
  const existingProductNames = new Set(existingProducts.map((p) => p.name));
  const productsToCreate = products.filter((p) => !existingProductNames.has(p.name));
  console.log(`[seed] Cần tạo ${productsToCreate.length} sản phẩm (bỏ qua ${products.length - productsToCreate.length} đã có)`);

  let productErrorCount = 0;
  await runPool(productsToCreate, 10, async (p) => {
    try {
      await apiCall("POST", "/api/products", {
        name: p.name,
        price: p.price,
        description: p.description,
        imageUrl: p.imageUrl,
        category_id: p.categoryId,
      });
    } catch (e) {
      productErrorCount++;
      if (productErrorCount <= 3) console.warn(`  [!] product ${p.name}: ${e.message}`);
    }
  });
  if (productErrorCount) console.warn(`[seed] ${productErrorCount} sản phẩm lỗi`);

  // 5. Đọc lại sản phẩm để lấy ID thật + giá thật.
  const productsAfterSeed = await apiCall("GET", "/api/products");
  console.log(`[seed] Tổng sau seed: ${usersAfterSeed.length} user, ${productsAfterSeed.length} sản phẩm`);

  // 6. Ghi CSV.
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const userRows = users
    .filter((u) => userIdByEmail.has(u.email))
    .map((u) => [userIdByEmail.get(u.email), u.email, u.password, u.fullName, u.address, u.phoneNumber]);
  const userRowCount = writeCsv(
    path.join(DATA_DIR, "users.csv"),
    ["user_id", "email", "password", "ho_ten", "dia_chi", "so_dien_thoai"],
    userRows,
  );

  const lockoutRows = lockoutUsers
    .filter((u) => userIdByEmail.has(u.email))
    .map((u) => [
      userIdByEmail.get(u.email),
      u.email,
      u.password,
      "MatKhauSai999!", // dùng cho nhánh negative: cố tình sai để kích lockout
      u.fullName,
    ]);
  const lockoutRowCount = writeCsv(
    path.join(DATA_DIR, "users_lockout.csv"),
    ["user_id", "email", "password_dung", "password_sai", "ho_ten"],
    lockoutRows,
  );

  // products.csv chỉ lấy sản phẩm có giá > MIN_PRICE để mọi dòng đều dùng được
  // với coupon fixed ở quantity = 1.
  const usableProducts = productsAfterSeed.filter((p) => Number(p.price) >= MIN_PRICE);
  const categoryNames = { 1: "Điện thoại", 2: "Laptop", 3: "Phụ kiện" };
  const productRows = usableProducts.map((p) => [
    p.id,
    p.name,
    p.price,
    p.category_id,
    categoryNames[p.category_id] || "Khác",
    Number(p.id) % 2 === 0 ? "string" : "number", // GET /api/products/:id trả price dạng string khi id chẵn
  ]);
  const productRowCount = writeCsv(
    path.join(DATA_DIR, "products.csv"),
    ["product_id", "ten_san_pham", "gia", "category_id", "ten_category", "kieu_price_tra_ve"],
    productRows,
  );

  // coupons.csv — đọc từ API thật, chỉ giữ loại `fixed` cho luồng chính.
  const coupons = await apiCall("GET", "/api/coupons", null, adminToken);
  const fixedCoupons = coupons.filter(
    (c) => c.type === "fixed" && c.is_active === 1 && new Date(c.expired_at) > new Date(),
  );
  const couponRows = fixedCoupons.map((c) => [
    c.code,
    c.type,
    c.discount_value,
    c.min_order_amount,
    c.max_uses_per_user,
    c.min_order_amount + 1, // total_amount nhỏ nhất chắc chắn qua được (so sánh chặt >)
    "Dùng cho luồng chính",
  ]);
  const couponRowCount = writeCsv(
    path.join(DATA_DIR, "coupons.csv"),
    ["code", "type", "discount_value", "min_order_amount", "max_uses_per_user", "total_amount_toi_thieu", "ghi_chu"],
    couponRows,
  );

  console.log("\n[seed] Đã ghi CSV:");
  console.log(`  data/users.csv          ${userRowCount} dòng`);
  console.log(`  data/users_lockout.csv  ${lockoutRowCount} dòng`);
  console.log(`  data/products.csv       ${productRowCount} dòng`);
  console.log(`  data/coupons.csv        ${couponRowCount} dòng`);
  console.log(`\n[seed] Xong sau ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  if (userRowCount < NUM_USERS) {
    console.warn(`[!] users.csv chỉ có ${userRowCount}/${NUM_USERS} dòng — kiểm tra lỗi register ở trên`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`\n[LỖI] ${e.stack || e.message}`);
  process.exit(1);
});
