#!/usr/bin/env node
/**
 * HW05 — Giai đoạn 2: Xác minh dữ liệu seed dùng được cho Flow A
 * MSSV: 23127522
 *
 * Chạy: node scripts/verify-seed.js
 *
 * Lấy dòng ĐẦU và dòng CUỐI của mỗi CSV rồi chạy đủ 9 request của Flow A với
 * dữ liệu đó. Mục đích: chứng minh CSV dùng được thật, không phải chỉ "đủ số
 * dòng". Nếu bước nào trả mã lỗi ngoài dự kiến, script exit 1 kèm chi tiết.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DATA_DIR = path.resolve(__dirname, "..", "data");

let errorCount = 0;

/** Parse CSV có hỗ trợ ô bọc dấu ngoặc kép (địa chỉ có dấu phẩy). */
function readCsv(file) {
  const text = fs.readFileSync(path.join(DATA_DIR, file), "utf8").replace(/\r\n/g, "\n");
  const rows = [];
  let cur = [""];
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; }
        else inQuote = false;
      } else cur[cur.length - 1] += c;
    } else if (c === '"') inQuote = true;
    else if (c === ",") cur.push("");
    else if (c === "\n") { rows.push(cur); cur = [""]; }
    else cur[cur.length - 1] += c;
  }
  if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

async function call(method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(label, passed, detail) {
  console.log(`  ${passed ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!passed) errorCount++;
}

/** Chạy đủ 9 request Flow A cho 1 user + 1 sản phẩm + 1 coupon. */
async function runFlowA(user, sp, coupon, label) {
  console.log(`\n[${label}] ${user.email} | ${sp.ten_san_pham} (${Number(sp.gia).toLocaleString("vi-VN")} đ) | ${coupon.code}`);

  // 1. POST /api/login
  const r1 = await call("POST", "/api/login", { email: user.email, password: user.password });
  check("1. POST /api/login", r1.status === 200 && !!r1.data.token, `HTTP ${r1.status}`);
  const token = r1.data.token;
  if (!token) return;
  check("   token khớp user_id trong CSV", String(r1.data.user.id) === String(user.user_id),
    `CSV=${user.user_id} API=${r1.data.user.id}`);
  check("   họ tên tiếng Việt giữ nguyên dấu", r1.data.user.name === user.ho_ten,
    `API trả "${r1.data.user.name}"`);

  // 2. GET /api/users/me
  const r2 = await call("GET", "/api/users/me", null, token);
  check("2. GET /api/users/me", r2.status === 200 && r2.data.email === user.email, `HTTP ${r2.status}`);

  // 3. GET /api/categories
  const r3 = await call("GET", "/api/categories");
  check("3. GET /api/categories", r3.status === 200 && Array.isArray(r3.data) && r3.data.length >= 3,
    `${Array.isArray(r3.data) ? r3.data.length : "?"} danh mục`);

  // 4. GET /api/products/:id — kiểm luôn dự đoán kiểu price ở cột CSV
  const r4 = await call("GET", `/api/products/${sp.product_id}`);
  const kieuThat = typeof r4.data.price;
  check("4. GET /api/products/:id", r4.status === 200 && r4.data.id, `HTTP ${r4.status}`);
  check("   cột kieu_price_tra_ve dự đoán đúng", kieuThat === sp.kieu_price_tra_ve,
    `CSV=${sp.kieu_price_tra_ve} thật=${kieuThat}`);
  check("   giá trong CSV khớp API", Number(r4.data.price) === Number(sp.gia),
    `CSV=${sp.gia} API=${r4.data.price}`);

  // 5. POST /api/cart
  const quantity = 1;
  const r5 = await call("POST", "/api/cart",
    { product_id: Number(sp.product_id), name: sp.ten_san_pham, price: Number(sp.gia), quantity }, token);
  check("5. POST /api/cart", r5.status === 200, `HTTP ${r5.status}`);

  // 6. GET /api/cart
  const r6 = await call("GET", "/api/cart", null, token);
  check("6. GET /api/cart", r6.status === 200 && r6.data.length >= 1, `${r6.data.length} món`);

  // 7. POST /api/apply-coupon (không cần token — server.js:363)
  const totalAmount = Number(sp.gia) * quantity;
  const r7 = await call("POST", "/api/apply-coupon",
    { code: coupon.code, total_amount: totalAmount, user_id: Number(user.user_id) });
  check("7. POST /api/apply-coupon (không token)", r7.status === 200 && r7.data.success === true,
    `HTTP ${r7.status} ${r7.data.error || ""}`);
  const discountAmount = r7.data.discount_amount;
  const finalAmount = r7.data.final_amount;
  check("   coupon fixed giảm đúng discount_value", discountAmount === Number(coupon.discount_value),
    `giảm ${Number(discountAmount).toLocaleString("vi-VN")} đ`);
  check("   final_amount dương (không âm như bug percent)", finalAmount > 0,
    `còn ${Number(finalAmount).toLocaleString("vi-VN")} đ`);
  check("   total_amount vượt min_order_amount (so sánh chặt >)",
    totalAmount > Number(coupon.min_order_amount),
    `${totalAmount.toLocaleString("vi-VN")} > ${Number(coupon.min_order_amount).toLocaleString("vi-VN")}`);

  // 8. POST /api/checkout — địa chỉ tiếng Việt có dấu từ CSV
  const r8 = await call("POST", "/api/checkout",
    { total_amount: finalAmount, shipping_address: user.dia_chi }, token);
  check("8. POST /api/checkout", r8.status === 200 && !!r8.data.orderId, `orderId=${r8.data.orderId}`);

  // 9. GET /api/orders/my-orders — xác nhận địa chỉ có dấu lưu/đọc lại nguyên vẹn
  const r9 = await call("GET", "/api/orders/my-orders", null, token);
  check("9. GET /api/orders/my-orders", r9.status === 200 && r9.data.length >= 1, `${r9.data.length} đơn`);
  const newOrder = r9.data.find((o) => o.id === r8.data.orderId);
  check("   địa chỉ tiếng Việt lưu/đọc nguyên vẹn", newOrder && newOrder.shipping_address === user.dia_chi,
    newOrder ? `"${newOrder.shipping_address}"` : "không thấy đơn");
}

async function main() {
  console.log(`[verify] BASE_URL = ${BASE_URL}`);

  const users = readCsv("users.csv");
  const lockout = readCsv("users_lockout.csv");
  const products = readCsv("products.csv");
  const coupons = readCsv("coupons.csv");

  console.log(`[verify] users=${users.length} lockout=${lockout.length} products=${products.length} coupons=${coupons.length}`);

  // Kiểm tra tính toàn vẹn của chính file CSV trước khi gọi API.
  console.log("\n[Toàn vẹn CSV]");
  check("users.csv đủ 500 dòng", users.length === 500, `${users.length}`);
  check("email không trùng", new Set(users.map((u) => u.email)).size === users.length);
  check("user_id không trùng", new Set(users.map((u) => u.user_id)).size === users.length);
  check("mọi user có địa chỉ + SĐT", users.every((u) => u.dia_chi && /^0\d{9}$/.test(u.so_dien_thoai)));
  check("họ tên có dấu tiếng Việt", users.filter((u) => /[àáảãạăâằắẳẵặầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(u.ho_ten)).length > users.length * 0.5,
    `${users.filter((u) => /[àáảãạăâằắẳẵặầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(u.ho_ten)).length}/${users.length} dòng`);
  check("products.csv mọi giá > 500.000 (đủ cho BIGBUY)", products.every((p) => Number(p.gia) > 500000));
  check("products.csv đủ cả 3 category", new Set(products.map((p) => p.category_id)).size === 3);
  check("coupons.csv chỉ có loại fixed", coupons.every((c) => c.type === "fixed"), coupons.map((c) => c.code).join(", "));

  // Flow A với dòng đầu và dòng cuối để bắt lỗi ở cả hai biên của CSV.
  await runFlowA(users[0], products[0], coupons[0], "Dòng ĐẦU");
  await runFlowA(users[users.length - 1], products[products.length - 1], coupons[coupons.length - 1], "Dòng CUỐI");

  // Nhánh negative: user lockout phải bị khóa sau 2 lần sai (server.js:54 —
  // login_attempts + 2, ngưỡng >= 3), không phải 3 lần như FR-02 mô tả.
  const lockoutUser = lockout[0];
  console.log(`\n[Lockout] ${lockoutUser.email}`);
  const wrongAttempt1 = await call("POST", "/api/login", { email: lockoutUser.email, password: lockoutUser.password_sai });
  check("sai lần 1 → 401", wrongAttempt1.status === 401, `HTTP ${wrongAttempt1.status}`);
  const wrongAttempt2 = await call("POST", "/api/login", { email: lockoutUser.email, password: lockoutUser.password_sai });
  check("sai lần 2 → 401 (attempts thành 4, vượt ngưỡng 3)", wrongAttempt2.status === 401, `HTTP ${wrongAttempt2.status}`);
  const correctAttempt = await call("POST", "/api/login", { email: lockoutUser.email, password: lockoutUser.password_dung });
  check("mật khẩu ĐÚNG vẫn bị 403 → xác nhận đã khóa sau 2 lần sai",
    correctAttempt.status === 403, `HTTP ${correctAttempt.status} ${correctAttempt.data.error || ""}`);
  console.log("  Ghi chú: user lockout nằm ở file CSV RIÊNG để không làm khóa 500 user của luồng chính.");

  console.log(`\n[verify] ${errorCount === 0 ? "TẤT CẢ ĐẠT" : `${errorCount} kiểm tra THẤT BẠI`}`);
  process.exit(errorCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n[LỖI] ${e.stack || e.message}`);
  process.exit(1);
});
