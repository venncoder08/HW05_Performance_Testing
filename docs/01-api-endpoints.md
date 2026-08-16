# EShop SUT — Tài liệu API Endpoint

> **Base URL:** `http://localhost:3000`
> **Nguồn:** đối chiếu `api_specification.md` với code `backend/server.js`
> **Content-Type:** `application/json` cho mọi request có body

## Quy ước xác thực

Các endpoint yêu cầu xác thực dùng JWT qua header:

```
Authorization: Bearer <token>
```

Token lấy từ `POST /api/login`. Payload JWT chứa `{ id, role }` và **không có thời gian hết hạn** — một token dùng được suốt phiên test, không cần đăng nhập lại giữa các iteration.

Mã lỗi liên quan xác thực:

| Mã | Tình huống |
| --- | --- |
| `401 Unauthorized` | Không gửi header `Authorization` |
| `403 Forbidden` | Token sai định dạng hoặc không verify được |

---

## 1. Authentication

### 1.1 Đăng ký tài khoản

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/register` |
| **Auth** | Không |

Request:
```json
{ "name": "Nguyen Van A", "email": "test@domain.com", "password": "Password123!" }
```

Response `200`:
```json
{ "message": "User registered successfully", "id": 3 }
```

### 1.2 Đăng nhập

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/login` |
| **Auth** | Không |

Request:
```json
{ "email": "test@eshop.com", "password": "Test1234!" }
```

Response `200`:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 2, "name": "Test User", "email": "test@eshop.com", "role": "user" }
}
```

| Mã | Tình huống |
| --- | --- |
| `401` | Email không tồn tại hoặc mật khẩu sai |
| `403` | Tài khoản đang bị khóa |

**Cơ chế khóa tài khoản:** mỗi lần đăng nhập sai làm tăng `login_attempts`; khi đạt ngưỡng, tài khoản bị khóa **180 giây** (`locked_until`). Đăng nhập thành công reset `login_attempts` về 0 và xóa `locked_until`.

### 1.3 Quên mật khẩu

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/forgot-password` |
| **Auth** | Không |

Request: `{ "email": "test@eshop.com" }`

Response `200`:
```json
{ "message": "Mã đặt lại mật khẩu đã được tạo", "resetToken": "4821" }
```

`resetToken` là số **4 chữ số** sinh ngẫu nhiên, trả thẳng trong response (không gửi email) → lấy được trực tiếp bằng JSON Extractor. Trả `404` nếu email không tồn tại.

### 1.4 Đặt lại mật khẩu

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/reset-password` |
| **Auth** | Không |

Request:
```json
{ "email": "test@eshop.com", "resetToken": "4821", "newPassword": "NewPass123!" }
```

Response `200`: `{ "message": "Password reset successfully" }`
Response `400`: `{ "error": "Invalid token or email" }` — token không khớp hoặc đã dùng.

Sau khi đổi thành công, `reset_token` bị xóa → token chỉ dùng được **một lần**.

---

## 2. Users

### 2.1 Lấy thông tin cá nhân

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/users/me` |
| **Auth** | **Bearer** |

Response `200`: đối tượng user đầy đủ (`id`, `name`, `email`, `role`, `login_attempts`, `locked_until`, `shipping_address`, `phone`).

### 2.2 Cập nhật hồ sơ

| | |
| --- | --- |
| **Method** | `PUT` |
| **Path** | `/api/users/me` |
| **Auth** | **Bearer** |

Request:
```json
{ "name": "Nguyen Van A", "shipping_address": "123 Le Loi, Q1, TP.HCM", "phone": "0912345678" }
```

Response `200`: `{ "message": "Profile updated" }`

---

## 3. Products

### 3.1 Danh sách / tìm kiếm sản phẩm

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/products` |
| **Auth** | Không |
| **Query** | `?search=<keyword>` (tùy chọn) — tìm theo tên, khớp một phần |

Không có `search` → trả toàn bộ sản phẩm. Response `200` là **array**:
```json
[
  { "id": 1, "name": "iPhone 15 Pro Max", "price": 30000000,
    "description": "Điện thoại cao cấp của Apple",
    "imageUrl": "https://placehold.co/300x300/png?text=iPhone+15", "category_id": 1 }
]
```

Không phân trang — luôn trả về hết. Không tìm thấy kết quả → array rỗng `[]`.

### 3.2 Chi tiết một sản phẩm

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/products/:id` |
| **Auth** | Không |

Response `200`: một đối tượng sản phẩm. Nếu `id` không tồn tại, trả `200` với body `{}` (không phải `404`) — nên assertion cần kiểm tra sự tồn tại của field, không chỉ kiểm mã trạng thái.

### 3.3 Thêm sản phẩm

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/products` |
| **Auth** | Không |

Request:
```json
{ "name": "Tên SP", "price": 100000, "description": "Mô tả",
  "imageUrl": "http://...", "category_id": 1 }
```

Response `200`: `{ "message": "Product created", "id": 6 }`

### 3.4 Cập nhật / Xóa sản phẩm

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `PUT` | `/api/products/:id` | Không | Như 3.3 (đủ 5 field) | `{ "message": "Product updated" }` |
| `DELETE` | `/api/products/:id` | Không | — | `{ "message": "Product deleted" }` |

### 3.5 Import sản phẩm từ CSV

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/admin/import-products` |
| **Auth** | **Bearer** |

CSV được parse ở phía frontend rồi gửi lên dưới dạng **JSON array**:
```json
{ "products": [
    { "name": "SP 1", "price": 10000, "description": "Mô tả",
      "imageUrl": "", "category_id": 1 }
] }
```

Response `200`:
```json
{ "message": "Import hoàn tất: 1/1 sản phẩm được thêm", "inserted": 1, "errors": [] }
```

Field `errors` là array chuỗi mô tả từng hàng lỗi (kèm số hàng). Trả `400` nếu `products` rỗng hoặc không phải array. Chỉ `name` là bắt buộc; `description`/`imageUrl` mặc định rỗng, `category_id` mặc định `1`.

---

## 4. Categories

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/categories` | Không | — | Array `{ id, name }` |
| `POST` | `/api/categories` | **Bearer** | `{ "name": "Tên DM" }` | `{ message, id }` |
| `PUT` | `/api/categories/:id` | **Bearer** | `{ "name": "Tên mới" }` | `{ "message": "Category updated" }` |
| `DELETE` | `/api/categories/:id` | **Bearer** | — | `{ "message": "Category deleted" }` |

---

## 5. Cart

Giỏ hàng lưu **trong bộ nhớ tiến trình**, tách riêng theo `user_id` lấy từ token — không lưu vào database. Hệ quả khi test: restart backend là mất toàn bộ giỏ hàng, và giỏ hàng của mỗi virtual user độc lập với nhau.

### 5.1 Lấy giỏ hàng

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/cart` |
| **Auth** | **Bearer** |

Response `200`: array các item đã thêm. Giỏ chưa có gì → `[]`.

### 5.2 Thêm vào giỏ hàng

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/cart` |
| **Auth** | **Bearer** |

Request:
```json
{ "id": 1, "name": "iPhone 15 Pro Max", "price": 30000000, "quantity": 2 }
```

Response `200`: `{ "message": "Added to cart" }`

Body được lưu nguyên trạng, **không hợp nhất theo `id`** — thêm cùng một sản phẩm hai lần sẽ tạo hai phần tử riêng biệt trong array.

### 5.3 Đặt hàng

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/checkout` |
| **Auth** | **Bearer** |

Request:
```json
{ "total_amount": 60000000, "shipping_address": "123 Le Loi, TP.HCM" }
```

Response `200`: `{ "message": "Checkout successful", "orderId": 12 }`

Tạo bản ghi trong bảng `orders` với `status` = `pending`. `total_amount` lấy từ body (client tự tính), không đọc từ giỏ hàng — nên có thể checkout mà không cần gọi `POST /api/cart` trước.

---

## 6. Orders

### 6.1 Lịch sử đơn hàng cá nhân

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/orders/my-orders` |
| **Auth** | **Bearer** |

Response `200`: array đơn hàng của user trong token, sắp xếp `id` giảm dần (mới nhất trước). Không phân trang.

```json
[ { "id": 12, "user_id": 2, "total_amount": 60000000, "status": "pending",
    "shipping_address": "123 Le Loi, TP.HCM", "created_at": "2026-08-16 12:30:00" } ]
```

### 6.2 Chi tiết một đơn hàng

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/orders/:id` |
| **Auth** | Không |

Response `200`: đối tượng đơn hàng. Response `404`: `{ "error": "Order not found" }`

### 6.3 Hủy đơn hàng

| | |
| --- | --- |
| **Method** | `PUT` |
| **Path** | `/api/orders/:id/cancel` |
| **Auth** | **Bearer** |

Response `200`: `{ "message": "Order canceled successfully" }`

| Mã | Tình huống |
| --- | --- |
| `404` | Đơn không tồn tại **hoặc** không thuộc user trong token |
| `400` | Đơn đang ở trạng thái không cho hủy |

### 6.4 Các trạng thái đơn hàng

`pending` · `confirmed` · `shipping` · `delivered` · `canceled`

Chuyển trạng thái được thực hiện qua `PUT /api/admin/orders/:id/status` (mục 8.2).

---

## 7. Coupons

### 7.1 Áp dụng mã giảm giá

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/apply-coupon` |
| **Auth** | Không |

Request:
```json
{ "code": "BIGBUY", "total_amount": 600000, "user_id": 2 }
```

Response `200`:
```json
{ "success": true, "coupon_id": 2, "discount_amount": 50000,
  "final_amount": 550000, "message": "Áp dụng thành công! Giảm 50.000 ₫" }
```

| Mã | Tình huống |
| --- | --- |
| `400` | Thiếu `code`; đơn chưa đạt `min_order_amount`; mã hết hạn; user đã dùng quá `max_uses_per_user` |
| `404` | Mã không tồn tại hoặc `is_active = 0` |

`user_id` là **tùy chọn**: có gửi thì mới kiểm tra giới hạn số lần dùng theo user; không gửi thì bỏ qua bước kiểm tra đó.

Điều kiện giá trị đơn tối thiểu là **so sánh nghiêm ngặt** (`total_amount > min_order_amount`) — đơn bằng đúng `min_order_amount` sẽ bị từ chối.

### 7.2 Ghi nhận lượt dùng mã

| | |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/api/coupon-usage` |
| **Auth** | **Bearer** |

Request: `{ "coupon_id": 2 }` → Response `200`: `{ "message": "Usage recorded" }`

Gọi sau khi checkout thành công. Đây là nơi duy nhất ghi vào bảng `coupon_usage` — nếu không gọi, giới hạn `max_uses_per_user` ở 7.1 sẽ không bao giờ chạm ngưỡng.

### 7.3 Danh sách mã giảm giá

| | |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/coupons` |
| **Auth** | **Bearer** |

Response `200`: array toàn bộ coupon kèm `type`, `discount_value`, `min_order_amount`, `expired_at`, `is_active`, `max_uses_per_user`.

---

## 8. Admin

Toàn bộ endpoint mục này yêu cầu header `Authorization: Bearer <token>`.

### 8.1 Quản lý người dùng

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/api/admin/users` | Array user (`id`, `name`, `email`, `role`, `login_attempts`, `locked_until`, `shipping_address`) — không trả `password` |
| `DELETE` | `/api/admin/users/:id` | `{ "message": "User deleted" }` |

`GET /api/admin/users` hữu ích khi test: xem được `login_attempts` và `locked_until` để biết tài khoản nào đang bị khóa.

### 8.2 Quản lý đơn hàng

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/admin/orders` | — | Array đơn hàng toàn hệ thống, kèm `user_name` (JOIN với `users`), `id` giảm dần |
| `PUT` | `/api/admin/orders/:id/status` | `{ "status": "confirmed" }` | `{ "message": "Order status updated" }` |

Chuyển trạng thái được kiểm tra tính hợp lệ:

| Từ | Sang được |
| --- | --- |
| `pending` | `confirmed`, `canceled` |
| `confirmed` | `shipping`, `canceled` |
| `shipping` | `delivered` |

| Mã | Tình huống |
| --- | --- |
| `400` | `{ "error": "Invalid state transition from X to Y" }` |
| `404` | Đơn không tồn tại |

### 8.3 Quản lý mã giảm giá

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/admin/coupons` | Xem dưới | `{ message, id }` |
| `DELETE` | `/api/admin/coupons/:id` | — | `{ "message": "Coupon deleted" }` |

```json
{ "code": "TET2026", "type": "percent", "discount_value": 15,
  "min_order_amount": 200000, "expired_at": "2026-01-31", "max_uses_per_user": 1 }
```

`code` là **UNIQUE** — tạo trùng mã sẽ trả `500`. `type` nhận `percent` hoặc `fixed`. `max_uses_per_user` mặc định `1` nếu không gửi.

---

## 9. Bảng tra nhanh toàn bộ endpoint

| # | Method | Path | Auth | Nhóm |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/register` | — | Auth |
| 2 | `POST` | `/api/login` | — | Auth |
| 3 | `POST` | `/api/forgot-password` | — | Auth |
| 4 | `POST` | `/api/reset-password` | — | Auth |
| 5 | `GET` | `/api/users/me` | Bearer | User |
| 6 | `PUT` | `/api/users/me` | Bearer | User |
| 7 | `GET` | `/api/products` | — | Product |
| 8 | `GET` | `/api/products/:id` | — | Product |
| 9 | `POST` | `/api/products` | — | Product |
| 10 | `PUT` | `/api/products/:id` | — | Product |
| 11 | `DELETE` | `/api/products/:id` | — | Product |
| 12 | `POST` | `/api/admin/import-products` | Bearer | Product |
| 13 | `GET` | `/api/categories` | — | Category |
| 14 | `POST` | `/api/categories` | Bearer | Category |
| 15 | `PUT` | `/api/categories/:id` | Bearer | Category |
| 16 | `DELETE` | `/api/categories/:id` | Bearer | Category |
| 17 | `GET` | `/api/cart` | Bearer | Cart |
| 18 | `POST` | `/api/cart` | Bearer | Cart |
| 19 | `POST` | `/api/checkout` | Bearer | Cart |
| 20 | `GET` | `/api/orders/my-orders` | Bearer | Order |
| 21 | `GET` | `/api/orders/:id` | — | Order |
| 22 | `PUT` | `/api/orders/:id/cancel` | Bearer | Order |
| 23 | `POST` | `/api/apply-coupon` | — | Coupon |
| 24 | `POST` | `/api/coupon-usage` | Bearer | Coupon |
| 25 | `GET` | `/api/coupons` | Bearer | Coupon |
| 26 | `POST` | `/api/admin/coupons` | Bearer | Coupon |
| 27 | `DELETE` | `/api/admin/coupons/:id` | Bearer | Coupon |
| 28 | `GET` | `/api/admin/users` | Bearer | Admin |
| 29 | `DELETE` | `/api/admin/users/:id` | Bearer | Admin |
| 30 | `GET` | `/api/admin/orders` | Bearer | Admin |
| 31 | `PUT` | `/api/admin/orders/:id/status` | Bearer | Admin |

Tổng: **31 endpoint** — 11 công khai, 20 yêu cầu Bearer token.

---

## 10. Dữ liệu seed

Database được khởi tạo lại và seed mỗi khi backend khởi động.

### Tài khoản

| Email | Password | Role |
| --- | --- | --- |
| `admin@eshop.com` | `Admin123!` | `admin` |
| `test@eshop.com` | `Test1234!` | `user` |

### Danh mục

| id | name |
| --- | --- |
| 1 | Điện thoại |
| 2 | Laptop |
| 3 | Phụ kiện |

### Sản phẩm

| id | name | price | category_id |
| --- | --- | --- | --- |
| 1 | iPhone 15 Pro Max | 30.000.000 | 1 |
| 2 | Samsung Galaxy S24 Ultra | 28.000.000 | 1 |
| 3 | MacBook Pro M3 | 45.000.000 | 2 |
| 4 | Tai nghe AirPods Pro 2 | 6.000.000 | 3 |
| 5 | Bàn phím cơ Keychron Q1 | 4.000.000 | 3 |

### Mã giảm giá

| code | type | discount_value | min_order_amount | expired_at | max_uses_per_user |
| --- | --- | --- | --- | --- | --- |
| `SAVE10` | percent | 10 | 300.000 | 2099-12-31 | 1 |
| `BIGBUY` | fixed | 50.000 | 500.000 | 2099-12-31 | 1 |
| `VIP100` | fixed | 100.000 | 300.000 | 2099-12-31 | 2 |
| `EXPIRED` | percent | 20 | 100.000 | 2020-01-01 | 1 |

---

## 11. Schema database

| Bảng | Cột |
| --- | --- |
| `users` | `id`, `name`, `email`, `password`, `role` (mặc định `user`), `login_attempts` (mặc định 0), `locked_until`, `reset_token`, `shipping_address`, `phone` |
| `products` | `id`, `name`, `price` (INTEGER), `description`, `imageUrl`, `category_id` |
| `categories` | `id`, `name` |
| `orders` | `id`, `user_id`, `total_amount` (INTEGER), `status` (mặc định `pending`), `shipping_address`, `created_at` |
| `coupons` | `id`, `code` (UNIQUE), `type` (mặc định `percent`), `discount_value`, `min_order_amount`, `expired_at`, `is_active` (mặc định 1), `max_uses_per_user` (mặc định 1) |
| `coupon_usage` | `id`, `coupon_id`, `user_id`, `used_at` |

Giỏ hàng **không có bảng** — lưu trong bộ nhớ tiến trình backend.

---

## 12. Luồng E2E dùng cho HW05 (Flow A)

| # | Bước | Endpoint | Nhóm | Auth |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập | `POST /api/login` | Auth-heavy | — |
| 2 | Lấy profile | `GET /api/users/me` | Auth-heavy | Bearer |
| 3 | Xem danh mục | `GET /api/categories` | Read-heavy | — |
| 4 | Chi tiết sản phẩm | `GET /api/products/:id` | Read-heavy | — |
| 5 | Thêm giỏ | `POST /api/cart` | Transactional | Bearer |
| 6 | Xem giỏ | `GET /api/cart` | Transactional | Bearer |
| 7 | Áp mã giảm giá | `POST /api/apply-coupon` | Transactional | — |
| 8 | Đặt hàng | `POST /api/checkout` | Transactional | Bearer |
| 9 | Lịch sử đơn | `GET /api/orders/my-orders` | Transactional | Bearer |

Token từ bước 1 được correlate sang các bước 2, 5, 6, 8, 9 qua JSON Extractor `$.token`.

---

## 13. Ví dụ curl cho Flow A

```bash
BASE=http://localhost:3000

# 1. Đăng nhập, lấy token
TOKEN=$(curl -s -X POST $BASE/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eshop.com","password":"Test1234!"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# 2. Profile
curl -s $BASE/api/users/me -H "Authorization: Bearer $TOKEN"

# 3. Danh mục
curl -s $BASE/api/categories

# 4. Chi tiết sản phẩm
curl -s $BASE/api/products/1

# 5. Thêm giỏ
curl -s -X POST $BASE/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id":1,"name":"iPhone 15 Pro Max","price":30000000,"quantity":2}'

# 6. Xem giỏ
curl -s $BASE/api/cart -H "Authorization: Bearer $TOKEN"

# 7. Áp mã giảm giá
curl -s -X POST $BASE/api/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"BIGBUY","total_amount":60000000,"user_id":2}'

# 8. Đặt hàng
curl -s -X POST $BASE/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"total_amount":59950000,"shipping_address":"123 Le Loi, TP.HCM"}'

# 9. Lịch sử đơn hàng
curl -s $BASE/api/orders/my-orders -H "Authorization: Bearer $TOKEN"
```

