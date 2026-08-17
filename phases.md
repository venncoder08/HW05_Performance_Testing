# HW05 – Performance Testing · Kế hoạch thực hiện theo giai đoạn

> **SUT:** EShop (`eshop-sut`), backend REST API tại `http://localhost:3000`
> **Luồng E2E (Flow A):** login → profile → categories → product detail → cart → coupon → checkout → order history
> **MSSV:** 23127522
> **Máy chạy test:** `LAPTOP-N9D07817` — Intel Core Ultra 7 155H (16C/22T), 15.7 GB RAM
> **Công cụ:** JMeter (non-GUI khi lấy số liệu) + Task Manager

## Tổng quan các giai đoạn

| GĐ | Tên | Mục tiêu | Đầu ra chính |
| --- | --- | --- | --- |
| 0 | Chuẩn bị môi trường | Cài công cụ, dựng cấu trúc, xử lý git | JMeter chạy được, repo sạch |
| 1 | Xác minh SUT | Kiểm chứng endpoint thật trước khi thiết kế | `docs/01-api-verification.md` |
| 2 | Dữ liệu test | Seed dữ liệu + sinh CSV | `data/*.csv`, script seed |
| 3 | Dựng test plan Load (bản master) | Một `.jmx` verify kỹ ở scale nhỏ | `23127522_Load_*.jmx` + human review |
| 4 | Chạy 4 kịch bản | Load → Stress → Spike → Endurance | `.jtl` thô + HTML report + evidence |
| 5 | Phân tích (Task 2 + 3) | AI analysis, truy tìm lỗi hiểu sai, CPT | 3 tài liệu phân tích |
| 6 | Đóng gói | Báo cáo, video, bug report, zip | File nộp cuối |

---

## Giai đoạn 0 — Chuẩn bị môi trường

| Bước | Việc | Review gì |
| --- | --- | --- |
| 0.1 | Cài JMeter 5.6.3, verify chạy trên Java 25 (nếu lỗi → cài JDK 17/21) | `jmeter --version` ra kết quả |
| 0.2 | Cài plugin `jpgc-casutg` (Concurrency Thread Group) cho Stress | Add → Threads (Users) → **bzm - Concurrency Thread Group** |
| 0.3 | Dựng cấu trúc thư mục bài làm | Cấu trúc hợp ý |
| 0.4 | Xử lý git: branch `master`→`main`; `.gitignore` cho `eshop-sut/` (có `.git` riêng → embedded repo) và `node_modules/` | `git status` sạch |

**Quy ước tên file** (§11 — TA kiểm tra khớp mẫu `{MSSV}_{ScenarioType}_{YYYYMMDD}`):

| Kịch bản | Tên file |
| --- | --- |
| Load | `23127522_Load_{YYYYMMDD}.jmx` |
| Stress | `23127522_Stress_{YYYYMMDD}.jmx` |
| Spike | `23127522_Spike_{YYYYMMDD}.jmx` |
| Endurance | `23127522_Endurance_{YYYYMMDD}.jmx` |
| File nộp | `23127522_HW05_AI_Performance_{Điểm}.zip` |

`{YYYYMMDD}` dùng **ngày chạy test thật**, không phải ngày lập kế hoạch.

**Commit:** `chore: set up project structure and tooling`

---

## Giai đoạn 1 — Xác minh SUT trước khi thiết kế

Giai đoạn quan trọng nhất và thường bị bỏ qua. Không xác minh endpoint thật thì test plan sai từ gốc.

| Bước | Việc | Review gì |
| --- | --- | --- |
| 1.1 | `npm install` + khởi động backend, xác nhận port 3000 | Log `Server is running` |
| 1.2 | Smoke test 9 endpoint Flow A bằng `curl`, lưu request/response thật | So response thật vs `api_specification.md` |
| 1.3 | Kiểm chứng bằng thực nghiệm 4 phát hiện từ code (xem bảng dưới) | Tự chạy lại `curl` để xác nhận |
| 1.4 | Ghi `docs/01-api-verification.md` — bảng endpoint + các điểm lệch spec | Cơ sở cho phần A của báo cáo |

### 9 endpoint của Flow A

| # | Bước | Endpoint | Nhóm | Auth | Ghi chú từ code |
| --- | --- | --- | --- | --- | --- |
| 1 | Đăng nhập | `POST /api/login` | Auth-heavy | — | Trả `token` + `user`; reset `login_attempts=0` |
| 2 | Lấy profile | `GET /api/users/me` | Auth-heavy | Bearer | Verify JWT + query `users` |
| 3 | Xem danh mục | `GET /api/categories` | Read-heavy | — | `SELECT *` toàn bảng |
| 4 | Chi tiết sản phẩm | `GET /api/products/:id` | Read-heavy | — | ID chẵn trả `price` dạng **string** |
| 5 | Thêm giỏ | `POST /api/cart` | Transactional | Bearer | Lưu RAM `userCarts`, **không** ghi DB |
| 6 | Xem giỏ | `GET /api/cart` | Transactional | Bearer | |
| 7 | Áp mã giảm giá | `POST /api/apply-coupon` | Transactional | **không** | Spec ghi cần auth, code thì không |
| 8 | Đặt hàng | `POST /api/checkout` | Transactional | Bearer | `INSERT orders` → ghi SQLite |
| 9 | Lịch sử đơn | `GET /api/orders/my-orders` | Transactional | Bearer | `WHERE user_id` **không index**, không phân trang |

Cố ý **không** dùng `GET /api/products?search=` và listing — flow đó đã có thành viên khác làm (HW05 §5).
Mỗi iteration = 9 request, think-time 1–3s → ~0.56 rps/VU.

### 4 phát hiện từ code ảnh hưởng tới thiết kế test

| Phát hiện | Vị trí | Ảnh hưởng tới test |
| --- | --- | --- |
| Lockout khóa sau **2** lần sai, không phải 3 (`login_attempts + 2`, ngưỡng `>= 3`) | `backend/server.js:54` | Bug thật vs FR-02 → log GitHub Issues; CSV cần đủ user để tránh trùng account |
| DB **reset mỗi lần khởi động** backend (`initDatabase()` gọi ngay khi require, có `DROP TABLE`) | `backend/database.js:117` | Restart = mất user đã seed + reset lockout → bắt buộc seed lại sau mỗi restart |
| Coupon `percent` tính sai: `total * (1 - discount_value)` → `final_amount` thành ~10× total | `backend/server.js:400` | Main flow chỉ dùng coupon **fixed**; bug percent để riêng làm bug report |
| `apply-coupon` không yêu cầu auth (spec ghi có) | `backend/server.js:363` | Sampler #7 không cần header Authorization |

### 2 nguồn suy giảm hiệu năng có thật (dùng cho Endurance + Task 2)

- `userCarts` là object RAM, `push` mỗi lần add nhưng **không bao giờ xóa sau checkout** → memory tăng đơn điệu (`backend/server.js:14`).
- `GET /api/orders/my-orders` không index `user_id`, không phân trang → soak càng lâu, đơn càng nhiều, càng chậm.
- SQLite journal mode mặc định (**không WAL**), 1 connection serialize → write (`checkout`) là bottleneck trước cả CPU.

**Commit:** `docs: verify SUT API endpoints and document spec deviations`

---

## Giai đoạn 2 — Dữ liệu test

**Trạng thái: ĐÃ XONG** (2026-08-16). Chi tiết đầy đủ: `docs/02-test-data.md`.

| Bước | Việc | Review gì | Kết quả |
| --- | --- | --- | --- |
| 2.1 | `scripts/seed-data.js`: 500 user + 30 user lockout qua `POST /api/register`, 199 sản phẩm qua `POST /api/products` | Chạy được, idempotent | Xong — 532 user, 204 sản phẩm trong DB |
| 2.2 | Sinh 4 file CSV bằng **ID thật** đọc lại từ API | Đủ số dòng; coupon chỉ loại `fixed` | Xong — 500 / 30 / 204 / 2 dòng |
| 2.3 | `scripts/verify-seed.js`: chạy đủ 9 request Flow A với dòng đầu + dòng cuối | Phải in `TẤT CẢ ĐẠT` | Xong — 9/9 request HTTP 200 ở cả hai biên |
| 2.4 | Checklist reset: **restart backend → seed lại → verify → mới chạy test** | Nắm đúng thứ tự bắt buộc | Ghi ở `docs/02-test-data.md` §2 |

| File CSV | Dòng | Cột | Ghi chú |
| --- | --- | --- | --- |
| `data/users.csv` | 500 | `user_id,email,password,ho_ten,dia_chi,so_dien_thoai` | Tên/địa chỉ tiếng Việt có dấu, SĐT đầu số thật; `user_id` là ID thật từ `GET /api/admin/users` |
| `data/users_lockout.csv` | 30 | `user_id,email,password_dung,password_sai,ho_ten` | File **riêng** cho negative test FR-02, tránh làm khóa 500 user luồng chính |
| `data/products.csv` | 204 | `product_id,ten_san_pham,gia,category_id,ten_category,kieu_price_tra_ve` | Hàng thật đang bán ở VN; cột cuối dự đoán kiểu `price` do `server.js:162` đổi sang string khi id chẵn |
| `data/coupons.csv` | 2 | `code,type,discount_value,min_order_amount,max_uses_per_user,total_amount_toi_thieu,ghi_chu` | Chỉ `BIGBUY`, `VIP100` (`fixed`); loại `SAVE10`/`EXPIRED` |

Mọi giá sản phẩm **≥ 600.000 ₫** vì `server.js:379` so sánh **chặt** `total_amount > min_order_amount`
— đơn đúng 500.000 ₫ vẫn bị `BIGBUY` từ chối. Nhờ vậy mọi dòng `products.csv` dùng được ở `quantity = 1`.

Lockout đã kiểm chứng bằng thực nghiệm: sai 2 lần → mật khẩu đúng vẫn trả **HTTP 403**, xác nhận
`server.js:54` khóa sau **2** lần chứ không phải 3 như FR-02 mô tả.

**Commit:** `data: add seed script and CSV datasets for data-driven flow`

---

## Giai đoạn 3 — Dựng và verify test plan Load (bản master)

Chỉ dựng **một** file. Hai file kia nhân bản ở GĐ 4.

| Bước | Việc | Review gì |
| --- | --- | --- |
| 3.1 | Prompt AI thiết kế load profile **theo từng bước** (không phải 1 prompt chung) — lưu nguyên prompt + output cho AI Audit Report | Chất lượng prompt |
| 3.2 | Dựng `.jmx`: HTTP Defaults → Header Manager → 3 CSV Config → 9 sampler → JSON Extractor lấy `token` → Timer → Assertion → Aggregate Report | Mở JMeter GUI xem từng element |
| 3.3 | **Verify scale nhỏ: 1 thread / 1 loop**, bật VRT tạm xem từng response | 9 request đều 200, token correlate đúng, không hardcode |
| 3.4 | Verify 5 VU / 30s | Assertion không false-positive, CSV không trùng account |
| 3.5 | Ghi `docs/02-human-review-ai-testplan.md`: AI sai/thiếu gì và **tại sao** | Chấm điểm nặng ở Task 1 |

Điểm review kỹ nhất: **bước 3.3**. Nếu token extract sai, 7 request sau trả 401 mà vẫn "trông như" chạy được.

### Ánh xạ plan → thành phần JMeter

| Trong plan | Thành phần JMeter |
| --- | --- |
| Base URL `localhost:3000` | HTTP Request Defaults |
| 9 bước Flow A | 9 HTTP Request sampler (trong Transaction Controller) |
| VU / ramp-up / thời lượng | Thread Group (Threads / Ramp-up / Scheduler) |
| Stress bậc thang 100→500 | bzm - Concurrency Thread Group (plugin `jpgc-casutg`) |
| Think-time 1–3s | Uniform Random Timer (Constant 1000ms + Random 2000ms) |
| 3 file CSV | CSV Data Set Config (→ `${email}`, `${product_id}`…) |
| Correlate `token` | JSON Extractor `$.token` → Header Manager `Authorization: Bearer ${token}` |
| Tiêu chí đạt | Response Assertion + Duration Assertion |
| 3 dạng report view | Aggregate Report / Summary Report / View Results Tree |

**Commit:** 2 commit — một cho `.jmx`, một cho human review.

---

## Giai đoạn 4 — Chạy 4 kịch bản

Thứ tự có chủ đích: Load → Stress (tìm ngưỡng) → Spike → Endurance (dùng ngưỡng từ Stress).

| Bước | Việc | Review gì |
| --- | --- | --- |
| 4.1 | Chạy **Load** non-GUI, quay video + screenshot JMeter/Task Manager **cùng khung hình** | `.jtl` có dữ liệu, error 0%, HTML report sinh được |
| 4.2 | Nhân bản → **Stress** (Concurrency Thread Group, Summary Report), xác định breaking point | VU nào error >1% hoặc p95 >3s |
| 4.3 | Nhân bản → **Spike** (VRT chỉ log lỗi), đo thời gian hồi phục | Có lỗi lúc sốc không, bao lâu về baseline |
| 4.4 | **Endurance** 12–15 phút ở ~75% ngưỡng, theo dõi RAM tiến trình Node | Xác nhận `userCarts` leak + `my-orders` chậm dần |
| 4.5 | Hardware report (dxdiag + bảng spec, hostname `LAPTOP-N9D07817` khớp bài trước) | Ảnh rõ hostname |

### Bảng so sánh load profile

| | Load | Stress | Spike |
| --- | --- | --- | --- |
| **Mục tiêu** | Baseline p95 ở tải bình thường | Tìm điểm gãy | Chịu sốc + khả năng hồi phục |
| **VU** | 50 | Bậc thang 100→200→300→400→500 | Nền 20, spike 300 |
| **Ramp-up** | 60s | Mỗi bậc giữ 60s | Spike trong 5s |
| **Thời lượng** | ~6 phút | ~5 phút | ~3 phút |
| **Think-time** | 1–3s (thực tế) | 300–800ms (gắt hơn) | Nền 1–3s, spike 0.2–0.5s |
| **rps dự kiến** | ~28 | ~180→900 | 11 → ~600 |
| **Listener** | Aggregate Report | Summary Report | View Results Tree (chỉ log lỗi) |
| **Tiêu chí đạt** | p95 < 800ms, error 0% | Ghi nhận VU mà error >1% hoặc p95 >3s | Error trong spike, thời gian hồi phục |

VRT chỉ log lỗi (tick `Errors`) thay vì log tất cả — ở 300 VU nếu log full thì chính JMeter thành bottleneck, làm sai số liệu. Đây là điểm đáng viết vào human review.

Thêm **Endurance/soak** 12–15 phút ở ~75% ngưỡng tìm được từ Stress — để đo `endurance threshold` theo yêu cầu §6.

### Lệnh chạy chuẩn

```bash
jmeter -n -t test-plans/23127522_Load_20260816.jmx \
       -l results/23127522_Load_20260816.jtl \
       -e -o reports/load/
```

`-n` non-GUI (bắt buộc khi lấy số liệu thật; GUI mode tốn CPU render làm sai kết quả), `-l` xuất `.jtl`, `-e -o` sinh HTML dashboard. Nâng heap: `JVM_ARGS="-Xmx4g"`.

**Môi trường đã verify ở GĐ 0:** JMeter 5.6.3 chạy được trên Java 25.0.1 (chỉ có warning `sun.misc.Unsafe` từ `xstream`, vô hại). Trong Git Bash **không dùng `jmeter.sh`** (lỗi xử lý đường dẫn Windows) — dùng shim Chocolatey `jmeter` hoặc `cmd /c jmeter`.

**Trước mỗi lần chạy:** restart backend → seed lại → mới chạy. Không đúng thứ tự thì số liệu giữa các lần không so sánh được.

**Commit:** mỗi kịch bản 1 commit (kèm `.jtl` + report).

---

## Giai đoạn 5 — Phân tích (Task 2 + Task 3)

| Bước | Việc | Review gì |
| --- | --- | --- |
| 5.1 | Đưa `.jtl` cho AI phân tích + đề xuất threshold, lưu nguyên output | Prompt có đủ ngữ cảnh chưa |
| 5.2 | Truy tìm chỗ AI hiểu sai — mỗi lỗi trích **giá trị đúng từ `.jtl` thô** | Tự tính lại từ `.jtl` để đối chiếu |
| 5.3 | Yêu cầu AI đề xuất tối ưu, phân loại khả thi / hallucinated | Đối chiếu code thật (xem dưới) |
| 5.4 | Task 3: mô hình continuous perf testing + flowchart + trade-off | Flowchart có nhánh quyết định rõ |

Gợi ý phân loại ở 5.3: bật **WAL**, thêm **index `user_id`** trên `orders`, **clear `userCarts` sau checkout** đều khả thi (đã thấy nguyên nhân trong code). Còn "thêm connection pool cho SQLite" khả năng cao là **hallucinated** — SQLite là embedded, không dùng pool như DB client-server.

**Commit:** 3 commit riêng (AI analysis, misinterpretation hunt, CPT proposal).

---

## Giai đoạn 6 — Đóng gói

| Bước | Việc |
| --- | --- |
| 6.1 | Báo cáo chính theo cấu trúc A–E (gồm bảng so sánh chéo + biểu đồ p95 theo VU) |
| 6.2 | AI Critique 200–300 từ + AI Audit Report (từ log đã lưu ở 3.1, 5.1, 5.3) |
| 6.3 | Log bug lên GitHub Issues (lockout cộng 2, coupon percent, price string, apply-coupon thiếu auth) + screenshot |
| 6.4 | Agent Skill + video demo skill |
| 6.5 | Video demo ≥6 phút, narration tiếng Việt, tool + resource monitor cùng khung |
| 6.6 | Export MD→PDF, `git log` ra file text, `README.md` (bảng tự đánh giá + test summary), zip theo mẫu tên |

Video (6.5) chỉ quay được sau khi 4.1–4.4 xong — nên **quay luôn trong lúc chạy** ở GĐ 4 thay vì chạy lại lần nữa.

### Cấu trúc báo cáo chính (tránh rời rạc khi có 3 test plan cùng nghiệp vụ)

- **Phần A — Thiết kế dùng chung (viết một lần):** A.1 mapping endpoint → 3 nhóm · A.2 luồng E2E 9 bước · A.3 data-driven CSV · A.4 correlation & assertion · A.5 chốt "cả 3 plan dùng chung A.2–A.4, chỉ khác load profile + listener"
- **Phần B — Bảng so sánh load profile:** chỗ duy nhất mô tả khác biệt thiết kế; giải thích *vì sao* mỗi listener phù hợp với kịch bản của nó
- **Phần C — Từng kịch bản, chỉ phần riêng + kết quả:** giữ đúng 4 tiểu mục và đúng thứ tự ở cả 3 (C.x.1 lý do chọn tham số · C.x.2 minh chứng chạy · C.x.3 số liệu p50/p90/p95/p99, throughput, error rate, CPU/RAM đỉnh · C.x.4 nhận xét riêng)
- **Phần D — So sánh chéo (quan trọng nhất):** bảng p95 theo *từng endpoint* × 3 kịch bản + biểu đồ p95 theo VU. Vì cả 3 plan chạy cùng 9 request nên so sánh được theo endpoint → lộ ra endpoint nào xuống cấp trước. Biến ràng buộc "cùng nghiệp vụ" thành lợi thế phân tích.
- **Phần E — Task 1 human review, Task 2, Task 3**

3 file `.jmx` vẫn phải tách riêng (§11 yêu cầu tên file khớp mẫu). Cách gọn: dựng + verify 1 file, rồi Save As 2 lần, mỗi bản chỉ sửa Thread Group + Listener. Ghi rõ dòng dõi này trong docs — vừa thật, vừa giải thích tại sao phần A viết một lần là đủ.

