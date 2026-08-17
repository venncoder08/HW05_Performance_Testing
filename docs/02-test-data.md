# Giai đoạn 2 — Dữ liệu test (seed + CSV)

MSSV: 23127522 — Luồng nghiệp vụ: **Flow A** (Login → Product detail → Cart + Coupon + Checkout)
SUT: `eshop-sut` backend, `http://localhost:3000`
Ngày thực hiện: 2026-08-16

## 1. Hai script và cách chạy

| Script | Việc | Lệnh |
| --- | --- | --- |
| `scripts/seed-data.js` | Seed user + sản phẩm qua API thật, rồi ghi 4 file CSV bằng **ID thật do DB sinh** | `node scripts/seed-data.js` |
| `scripts/verify-seed.js` | Chạy đủ 9 request Flow A với dòng đầu/cuối của CSV để chứng minh dữ liệu dùng được | `node scripts/verify-seed.js` |

Tham số điều chỉnh qua biến môi trường (mặc định trong ngoặc):
`BASE_URL` (`http://localhost:3000`), `NUM_USERS` (500), `NUM_LOCKOUT_USERS` (30), `NUM_PRODUCTS` (200).

Cả hai script **tất định**: không dùng `Math.random()`, nên chạy lại luôn ra cùng bộ dữ liệu.
`seed-data.js` **idempotent**: đọc `GET /api/admin/users` và `GET /api/products` trước, chỉ tạo phần
còn thiếu. Cần thiết vì `POST /api/register` không kiểm tra email trùng
(`eshop-sut/backend/server.js:20`) — chạy 2 lần mà không check sẽ tạo user trùng email.

## 2. Thứ tự bắt buộc — restart backend là mất hết dữ liệu

`backend/database.js` gọi `initDatabase()` **ngay khi được require** (dòng 117), và hàm này bắt đầu
bằng `DROP TABLE IF EXISTS` cho cả 6 bảng (dòng 15–20). Nghĩa là **mỗi lần khởi động backend, DB bị
xóa và seed lại từ đầu** về đúng 2 user + 5 sản phẩm + 4 coupon gốc.

Hệ quả trực tiếp: không thể seed một lần rồi chạy test cả tuần. Thứ tự đúng trước **mỗi** lần chạy
test hiệu năng:

```
1. Khởi động backend        cd eshop-sut/backend && node server.js
2. Seed lại dữ liệu         node scripts/seed-data.js
3. Xác minh dữ liệu         node scripts/verify-seed.js      → phải in "TẤT CẢ ĐẠT"
4. Mới chạy JMeter
```

Bước 2 cũng chính là cách **reset trạng thái lockout**: user bị khóa 3 phút sau khi sai mật khẩu
(`server.js:57`), nhưng restart backend thì bảng `users` bị drop nên `login_attempts` và
`locked_until` cũng mất theo — nhanh hơn là chờ hết 3 phút.

Ngoài ra `userCarts` là object trong RAM (`server.js:14`), không nằm trong DB, nên restart backend
cũng xóa sạch giỏ hàng của mọi user.

## 3. Bốn file CSV

Tất cả UTF-8, **không BOM** (JMeter CSV Data Set Config đọc BOM thành phần của giá trị cột đầu
tiên), dấu phân cách `,`, ô chứa dấu phẩy được bọc `"`. Trong JMeter phải khai `File encoding` =
`UTF-8`, nếu để trống thì tiếng Việt hỏng thành `Nguy?n V?n An`.

### 3.1 `data/users.csv` — 500 dòng

```
user_id,email,password,ho_ten,dia_chi,so_dien_thoai
3,an.nguyen001@load.eshop.vn,MatKhau123!,Nguyễn Văn An,"12 Nguyễn Văn Cừ, Phường Cầu Kho, Quận 1, TP. Hồ Chí Minh",0321000000
4,bich.tran002@load.eshop.vn,MatKhau123!,Trần Thị Bích,"19 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",0331074519
```

| Cột | Dùng ở sampler nào | Ghi chú |
| --- | --- | --- |
| `user_id` | #7 `POST /api/apply-coupon` (body `user_id`) | **ID thật** đọc từ `GET /api/admin/users` sau khi seed, không phải số tự tăng đoán trước |
| `email`, `password` | #1 `POST /api/login` | Mật khẩu chung `MatKhau123!` cho toàn bộ 500 user |
| `ho_ten` | Đối chiếu response `/api/users/me` | Họ + tên đệm + tên thật 496/500 dòng có dấu tiếng Việt; 4 dòng còn lại là tên vốn không mang dấu: `Mai Minh Nam`, `Chu Kim Dung`, `Phan Quang Nam`, `Chu Kim Nga` |
| `dia_chi` | #8 `POST /api/checkout` (`shipping_address`) | Số nhà + đường + phường/quận + tỉnh, ghép theo **cụm địa lý thật** (24 cụm ở TP.HCM, Hà Nội, Đà Nẵng, Huế, Biên Hòa, Vũng Tàu, Nha Trang, Cần Thơ, Đà Lạt) nên không có kiểu "đường ở Hà Nội, quận ở TP.HCM" |
| `so_dien_thoai` | Dự phòng cho `PUT /api/users/me` | 10 số, đầu số di động thật đang lưu hành (`032`–`039`, `070`–`079`, `081`–`086`, `088`, `090`–`098`) |

500 dòng là để mỗi virtual user dùng một tài khoản riêng ở mức tải cao nhất, tránh hai VU cùng đăng
nhập một email rồi vô tình làm nhau bị lockout.

### 3.2 `data/users_lockout.csv` — 30 dòng

```
user_id,email,password_dung,password_sai,ho_ten
500,an.nguyen001@lockout.eshop.vn,MatKhau123!,MatKhauSai999!,Nguyễn Văn An
```

File **riêng biệt** cho nhánh negative test account-lockout (FR-02). Tách hẳn khỏi `users.csv` vì
đăng nhập sai làm user bị khóa 3 phút — nếu dùng chung thì một vòng test lockout sẽ làm hỏng luôn
tài khoản của luồng chính. Domain khác nhau (`@lockout.eshop.vn` vs `@load.eshop.vn`) nên không thể
lẫn.

### 3.3 `data/products.csv` — 204 dòng

```
product_id,ten_san_pham,gia,category_id,ten_category,kieu_price_tra_ve
1,iPhone 15 Pro Max,30000000,1,Điện thoại,number
2,Samsung Galaxy S24 Ultra,28000000,1,Điện thoại,string
```

204 dòng = 5 sản phẩm seed gốc + 199 sản phẩm script tạo thêm. Tên là **hàng thật đang bán tại Việt
Nam** (72 mẫu gốc: 24 điện thoại, 24 laptop, 24 phụ kiện), giá tham chiếu thị trường, đơn vị ₫. Từ
vòng thứ hai trở đi tên được thêm biến thể dung lượng/màu (`iPhone 15 Pro 256GB Đen`) thay vì
`Sản phẩm 123`.

Cột `kieu_price_tra_ve` là cột **đặc thù của SUT này**: `GET /api/products/:id` đổi `price` thành
**string** khi `id` chẵn (`server.js:162`, `if (row.id % 2 === 0) row.price = row.price.toString()`).
Có sẵn cột này thì JSON Extractor trong JMeter biết trước phải parse kiểu nào, không bị fail assertion
vì so `"30000000"` với `30000000`.

### 3.4 `data/coupons.csv` — 2 dòng

```
code,type,discount_value,min_order_amount,max_uses_per_user,total_amount_toi_thieu,ghi_chu
BIGBUY,fixed,50000,500000,1,500001,Dùng cho luồng chính
VIP100,fixed,100000,300000,2,300001,Dùng cho luồng chính
```

Đọc từ `GET /api/coupons` thật rồi lọc: chỉ giữ `type = fixed`, `is_active = 1`, chưa hết hạn. Bốn
coupon trong DB bị loại 2:

| Coupon | Loại | Vì sao loại khỏi luồng chính |
| --- | --- | --- |
| `BIGBUY` | fixed 50.000 ₫, min 500.000 | **Giữ** |
| `VIP100` | fixed 100.000 ₫, min 300.000, tối đa 2 lần/user | **Giữ** |
| `SAVE10` | percent 10% | Loại — công thức percent tính sai (xem §4), dùng riêng cho bug report |
| `EXPIRED` | percent 20%, hết hạn 2020-01-01 | Loại — đã hết hạn, chỉ dùng cho negative test |

## 4. Ba đặc điểm của SUT đã tính vào dữ liệu

**(a) `min_order_amount` so sánh CHẶT.** `server.js:379` dùng `total_amount > coupon.min_order_amount`
chứ không phải `>=`. Nên đơn đúng 500.000 ₫ vẫn bị `BIGBUY` từ chối. Xử lý: mọi sản phẩm sinh ra đều
có giá **≥ 600.000 ₫** (hằng `MIN_PRICE`), nên mọi dòng `products.csv` đều dùng được với cả hai
coupon ở `quantity = 1` — không cần logic cộng dồn giỏ hàng trong test plan. Cột
`total_amount_toi_thieu` ghi luôn giá trị nhỏ nhất chắc chắn qua được (`min_order_amount + 1`).

**(b) Coupon `percent` tính sai.** `server.js:400`: `total_amount * (1 - discount_value)` —
`discount_value` là 10 (nghĩa là 10%) chứ không phải 0.1, nên với đơn 1.000.000 ₫ ra
`discount_amount = -9.000.000` và `final_amount` phồng lên ~10 lần. Vì vậy luồng chính chỉ dùng
coupon `fixed`; nếu dùng percent thì `final_amount` gửi sang `POST /api/checkout` sẽ là số vô nghĩa
và toàn bộ số liệu hiệu năng mất ý nghĩa nghiệp vụ. Bug này để riêng làm bug report.

**(c) Lockout khóa sau 2 lần sai, không phải 3.** `server.js:54` cộng `login_attempts + 2` mỗi lần
sai, ngưỡng khóa là `>= 3`. Nên: sai lần 1 → attempts = 2 (chưa khóa), sai lần 2 → attempts = 4 →
khóa 3 phút. `verify-seed.js` kiểm chứng đúng điều này bằng thực nghiệm, xem §5.

## 5. Kết quả xác minh (`node scripts/verify-seed.js`)

Chạy lúc 2026-08-16, backend thật đang chạy trên port 3000 — **TẤT CẢ ĐẠT**, không có kiểm tra nào
thất bại.

Toàn vẹn CSV:

| Kiểm tra | Kết quả |
| --- | --- |
| `users.csv` đủ 500 dòng | OK |
| `email` không trùng, `user_id` không trùng | OK |
| Mọi user có địa chỉ + SĐT đúng dạng `0` + 9 số | OK |
| Họ tên có dấu tiếng Việt | OK — 496/500 dòng |
| Mọi giá trong `products.csv` > 500.000 ₫ | OK |
| `products.csv` đủ cả 3 category | OK |
| `coupons.csv` chỉ có loại `fixed` | OK — `BIGBUY`, `VIP100` |

Chạy đủ 9 request Flow A với **dòng đầu** và **dòng cuối** của mỗi CSV (bắt lỗi ở cả hai biên):

| Dòng | Dữ liệu | Kết quả |
| --- | --- | --- |
| ĐẦU | `an.nguyen001@load.eshop.vn` + iPhone 15 Pro Max (30.000.000 ₫) + `BIGBUY` | 9/9 request HTTP 200; giảm 50.000 ₫ → còn 29.950.000 ₫; `orderId=1` |
| CUỐI | `uyen.chu500@load.eshop.vn` + Bàn phím cơ Keychron K2 Pro Xanh dương (2.650.000 ₫) + `VIP100` | 9/9 request HTTP 200; giảm 100.000 ₫ → còn 2.550.000 ₫; `orderId=2` |

Các điểm được kiểm chứng thêm trong cùng lần chạy:

- `user_id` trong CSV **khớp** `id` mà `/api/login` trả về (3 và 501) — chứng minh CSV dùng ID thật.
- Họ tên tiếng Việt đi qua API về nguyên vẹn: `Nguyễn Văn An`, `Chu Thị Uyên`.
- Cột `kieu_price_tra_ve` dự đoán **đúng** cả hai chiều: id 1 (lẻ) → `number`, id 204 (chẵn) → `string`.
- Địa chỉ có dấu lưu vào SQLite rồi đọc lại qua `/api/orders/my-orders` **không sai một ký tự**:
  `"12 Nguyễn Văn Cừ, Phường Cầu Kho, Quận 1, TP. Hồ Chí Minh"`.
- `POST /api/apply-coupon` chạy được **không cần** header `Authorization` — xác nhận điểm lệch spec
  đã ghi ở Giai đoạn 1.

Nhánh negative lockout (`an.nguyen001@lockout.eshop.vn`):

| Bước | Kết quả thật |
| --- | --- |
| Sai mật khẩu lần 1 | HTTP 401 |
| Sai mật khẩu lần 2 | HTTP 401 (`login_attempts` thành 4, vượt ngưỡng 3) |
| Đăng nhập bằng mật khẩu **ĐÚNG** | HTTP 403 — `"Tài khoản đã bị khóa. Vui lòng thử lại sau."` |

Bước cuối là bằng chứng thực nghiệm cho phát hiện (c): tài khoản đã bị khóa **chỉ sau 2 lần sai**,
trong khi FR-02 mô tả 3 lần.

## 6. Việc cần làm ở Giai đoạn 3

- Khai 4 CSV này thành 4 `CSV Data Set Config` trong `23127522_Load_20260816.jmx`, encoding `UTF-8`,
  `Recycle on EOF = True`, `Sharing mode = All threads`.
- `users.csv` chia theo thread để mỗi VU một tài khoản; `products.csv` cho `Recycle` tự do.
- Assertion cho sampler #4 phải chấp nhận `price` cả hai kiểu, dựa vào cột `kieu_price_tra_ve`.
