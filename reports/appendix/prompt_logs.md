# Prompt Logs — HW05 Performance Testing on EShop (Flow A: Login → Product Detail → Cart + Coupon + Checkout)

Họ tên: Ong Khánh Vinh
MSSV: 23127522
Lớp: 23KTPM1
Bài tập: HW05 — Performance Testing (Load / Stress / Spike) với JMeter trên EShop SUT
Công cụ AI đã dùng: **Claude Code** (CLI). Model thay đổi trong phiên — xem mục "Model và effort".
Múi giờ: Asia/Saigon, UTC+07:00
Đối tượng kiểm thử: `eshop-sut` backend REST API, local, `http://localhost:3000`
Repo nộp bài: `https://github.com/venncoder08/HW05_Performance_Testing`

Khai báo theo mục 9 của đề: **Tôi có sử dụng công cụ AI cho các nhiệm vụ sau** — dịch đề bài, chọn
luồng nghiệp vụ end-to-end, đọc source code SUT để xác định endpoint, lập kế hoạch theo giai đoạn,
cài đặt JMeter + plugin, và soạn tài liệu tham chiếu API. Toàn bộ prompt và output được liệt kê
bên dưới.

## Ghi chú về timestamp (tính xác thực của bằng chứng)

Mọi mốc thời gian trong bảng dưới là **thời gian thật của message** do Claude Code ghi tự động vào
transcript của phiên làm việc, không phải suy ra từ `mtime` của file và không phải do AI nhớ lại:

```
C:\Users\ACER\.claude\projects\D--2025-2026-HK9-Test-HW06\
├── ca72ce3c-7b89-433a-8b04-1196c48ae1ad.jsonl   446 dòng — phiên 1
└── 0695c18d-b0f0-4c3c-9c2a-5baeb76b8ba9.jsonl   694 dòng — phiên 2 (đang chạy khi trích)
```

Hai file `.jsonl` này được parse bằng script `scripts/extract_prompts.py` (commit cùng repo, chạy
lại được để đối chiếu):

```bash
OUT=turns.json python scripts/extract_prompts.py
# rows=545 real_user_turns=29
```

Script lọc bỏ những entry **không phải người gõ**: `tool_result`, `<system-reminder>`,
`<local-command-stdout>`, các slash command, và thông báo lỗi API. Sau khi lọc còn **29 lượt prompt
thật của người dùng**, xếp theo thứ tự thời gian và liệt kê đầy đủ dưới đây — không bỏ lượt nào,
kể cả các lượt lỗi và các lượt trùng.

Phạm vi thời gian: **2026-08-16 17:03:42 → 2026-08-17 02:37:21** (một ngày làm việc kéo qua nửa
đêm, hai phiên CLI; phiên 2 bắt đầu 23:38 ngày 16/08 sau khoảng nghỉ ~3,7 giờ).

## Model và effort

| Mốc | Thay đổi | Ảnh hưởng |
| --- | --- | --- |
| 17:03:24 | `/effort` → **high** | Đặt mức suy luận cao cho cả phiên (mặc định cho các phiên sau) |
| 17:03:42 – 17:49:37 | Model mặc định lúc mở phiên (lượt 1–3) | — |
| 17:49:37 | `/model` → **Sonnet 5** (lượt 4–7) | — |
| 18:53:18 – 18:53:39 | Lỗi truy cập model: `claude-sonnet-5` rồi `claude-sonnet-5[1m]` báo *"It may not exist or you may not have access to it"* | **3 lượt prompt bị mất trắng** (lượt 8, 9, 10) — xem bảng |
| 18:54:33 | `/model` → **Opus 5 (1M context)** (lượt 11–27) | Lượt 11 mới thực sự chạy được yêu cầu đã gõ 4 lần |
| 01:18:22 | `/model` → **Sonnet 5** (lượt 28–29) | Đổi model giữa phiên 2, trước khi refactor đặt tên biến |

## Ghi chú phạm vi (Scope Note)

Tại thời điểm của log này, công việc đã đi đến hết **Giai đoạn 2** (chuẩn bị môi trường + tài liệu
API + dữ liệu test seed/CSV). Chưa có file `.jmx`, chưa có `.jtl`, nên **không có bất kỳ số liệu
hiệu năng nào** xuất hiện trong log này. Những gì AI đã kiểm chứng bằng thực thi thật (không phải
suy đoán):

- JMeter 5.6.3 chạy được trên Java 25 — verify bằng `jmeter.bat --version` (lượt 16).
- Plugin `jpgc-casutg` load được class `ConcurrencyThreadGroup` — verify bằng cách nạp thật một
  `.jmx` tối giản chứ không chỉ kiểm tra jar có nằm trong `lib/ext` (lượt 16).
- JMeter GUI mở thật — verify bằng process `javaw` PID 35452, cửa sổ "Apache JMeter (5.6.3)" (lượt 18).
- 31 endpoint trong `docs/01-api-endpoints.md` đọc từ `backend/server.js` (572 dòng) và
  `backend/database.js`, không lấy từ `api_specification.md` một cách máy móc (lượt 11, 19).
- 4 file CSV (users/lockout/products/coupons) dùng được thật với API, không chỉ đúng định dạng —
  verify bằng cách chạy thật 9 request Flow A trên dòng đầu và dòng cuối mỗi CSV, cộng nhánh
  negative cho account-lockout (lượt 23, 26).

## Bảng log prompt theo thứ tự thời gian

| # | Ngày và giờ | Prompt của tôi | Kết quả đầu ra của AI | Bằng chứng / file |
| ---: | --- | --- | --- | --- |
| 1 | 2026-08-16 17:03:42 | "Hãy dịch file HW05 ra tiếng việt" | Đọc `2026.HW05.Performance Testing_En_2.0_HTThanh.md` rồi ghi bản dịch tiếng Việt, giữ nguyên cấu trúc bảng/tiêu đề/định dạng của bản gốc. | `2026.HW05.Performance Testing_VI_2.0_HTThanh.md` (18.7 KB) |
| 2 | 2026-08-16 17:10:52 | Dán lỗi git thật: `git push -u origin main` → `error: src refspec main does not match any` | Chạy `git status`/`git branch -a`, chỉ ra branch local là `master` chứ không phải `main` (chỉ có 1 commit `95c2726 init repo`). Giải thích thêm: `git config --global init.defaultBranch` trả về rỗng nên `git init` dùng mặc định cũ `master`; GitHub mặc định `main` chỉ áp dụng cho repo tạo *trên* GitHub. Đưa 2 lựa chọn: push `master`, hoặc `git branch -M main` rồi push. | commit `95c2726`; quyết định chốt ở lượt 17 |
| 3 | 2026-08-16 17:48:07 | "đuôi .jtl là chứng minh cho file gì?" | Giải thích `.jtl` (JMeter Test Log) là bằng chứng **đã thực sự thực thi** test, chứa từng request kèm timestamp/response time/HTTP code — liên hệ trực tiếp tới mục 11 (chống gian lận AI) của đề: phải đính kèm log thô, không chỉ bản tóm tắt. | mục 11 của đề bài |
| 4 | 2026-08-16 17:49:46 | "Cho tôi biết trước tiên tôi nên làm gì" | Đề xuất thứ tự: (1) clone + chạy được SUT local trước, vì không thể thiết kế test plan khi chưa biết endpoint/params/response thật; (2) chọn 3 nhóm endpoint theo mục 5; (3) mới tới test plan. | — |
| 5 | 2026-08-16 17:54:21 | "ở mục 5 là chọn 3 nhóm endpoint từ 3 Pool, nhưng không được trùng task trong Pool có thành viên khác làm r đúng không" | **Sửa lại cách hiểu sai của tôi.** Đọc lại mục 4 + 5 và chỉ rõ: read-heavy / auth-heavy / transactional là 3 *loại chức năng*, không phải 3 Pool khác nhau; cả 3 loại đều nằm chủ yếu trong Pool A và Pool B. | mục 4, 5 của đề bài |
| 6 | 2026-08-16 18:26:34 | "login -> product listing -> add to cart + checkout. Đã có người làm flow này rồi bạn hãy gợi ý flow khác đầy đủ 3 nhóm endpoint với 3 chức năng trên" | Gợi ý nhiều flow thay thế; **Flow A được chọn**: Login (kèm account-lockout sau 3 lần sai) → Product detail trực tiếp bằng product ID lấy từ CSV (**không qua search/listing**) → Add-to-cart → Apply coupon → Checkout. Điểm khác biệt so với flow đã có người làm là bỏ hẳn bước listing/search và thêm coupon. | quyết định này được ghi vào memory ở lượt 11 |
| 7 | 2026-08-16 18:48:34 | "Test performance này là test API + Frontend luôn đúng không" | Trả lời **không** — chỉ test backend API. Dẫn nguyên văn mục 4 và mục 6 của đề ("Target three backend API endpoint groups...", "against the SUT's backend API using JMeter (or k6)"), giải thích JMeter gửi request thẳng tới endpoint, không render UI. | mục 4, 6 của đề bài |
| 8 | 2026-08-16 18:53:18 | "Hãy xác định các endpoint API cần test, và lên plan với 3 test case đó" | **Không có output** — lượt này chết lặng, không có phản hồi nào từ model. | — |
| 9 | 2026-08-16 18:53:29 | Gõ lại y nguyên prompt trên (lần 2) | Lỗi: *"There's an issue with the selected model (claude-sonnet-5). It may not exist or you may not have access to it."* → tôi chạy `/model` chọn lại Sonnet 5. | — |
| 10 | 2026-08-16 18:53:39 | Gõ lại y nguyên prompt trên (lần 3) | Lỗi tương tự với model ID `claude-sonnet-5[1m]` → tôi chạy `/model` đổi sang **Opus 5 (1M context)**. | — |
| 11 | 2026-08-16 18:54:35 | Gõ lại y nguyên prompt trên (lần 4) — lần này chạy được | Đọc `api_specification.md`, rồi đọc **code thật**: `backend/server.js` (572 dòng) + `backend/database.js`. Đối chiếu và phát hiện vài chỗ **code khác spec**, ảnh hưởng trực tiếp tới thiết kế test (ví dụ endpoint login thật là `POST /api/login`). Kiểm tra luôn cấu hình máy (CPU/RAM qua `Get-CimInstance`) để tham số test dựa trên hardware thật. Ghi quyết định Flow A và MSSV vào memory. Xuất bảng 9 request theo Flow A kèm nhóm endpoint, yêu cầu auth, và ghi chú đọc từ code. | `eshop-sut/backend/server.js`, `database.js`; memory `hw05-workflow-choice.md` |
| 12 | 2026-08-16 19:04:56 | "cho tôi hỏi JMeter được áp dụng ở đâu trong plan?" | Lập bảng ánh xạ từng phần của plan sang element JMeter cụ thể: base URL → HTTP Request Defaults (khai 1 lần, 9 request dùng chung), CSV → CSV Data Set Config, token → JSON Extractor + HTTP Header Manager, think-time → Timer, ramp-up → Thread Group / Concurrency Thread Group. | — |
| 13 | 2026-08-16 19:11:10 | "Trong HW có yêu cầu viết docs cho 3 test plan nhưng cùng một nghiệp vụ end-to-end. Tôi nên làm thế nào nếu ghi 3 test plans thì rất rời rạc và khó quan sát" | Đề xuất tách tài liệu theo trục **"cái không đổi" vs "cái đổi"** thay vì viết 3 section song song lặp lại cùng 9 request: Phần A = thiết kế dùng chung (viết một lần), Phần B = chỉ phần khác nhau giữa Load/Stress/Spike (thread count, ramp-up, hold). | định hướng cho tài liệu Giai đoạn 3 |
| 14 | 2026-08-16 19:16:21 | "Tôi muốn thực hiện từng bước step-by-step để có thể review chỉnh chu nhất, hãy list cho tôi các giai đoạn ra" | Chia thành **6 giai đoạn (0–6)**, mỗi bước nhỏ kèm cột "bạn review gì" và điểm commit tương ứng (mục 12 của đề yêu cầu mỗi bước 1 commit). | tiền đề cho `phases.md` |
| 15 | 2026-08-16 19:18:51 | "Hãy ghi các phase nào vào phases.md. Và hướng dẫn tôi chạy step 0" | Ghi `phases.md` (6 giai đoạn, 15.2 KB). Làm luôn phần thuộc thẩm quyền: tạo cây thư mục `test-plans/ data/ results/ reports/ evidence/{screenshots,hardware}/ docs/ scripts/ ai-logs/` kèm `.gitkeep`, và viết `.gitignore` (chặn `eshop-sut/` để tránh embedded repo, chặn `jmeter.log`, `node_modules/`). Verify `eshop-sut/` đã biến khỏi `git status`. | `phases.md`, `.gitignore` |
| 16 | 2026-08-16 19:30:52 | "Tôi đã tải jmeter C:\ProgramData\chocolatey\lib\jmeter\tools, nhưng không biết add thư viện vào và nó ở trong download. Hãy add plugin này vào giúp tôi" | Tìm trong Downloads/Desktop/Documents → **không có jar nào** (download của browser chưa hoàn tất). Chuyển hướng: tải trực tiếp từ Maven Central. Cài `jmeter-plugins-manager-1.10.jar` (907 KB) vào `lib/ext`, thêm `cmdrunner-2.3.jar` để dựng `PluginsManagerCMD`, rồi `PluginsManagerCMD.sh install jpgc-casutg`. Gặp lỗi `jmeter.sh` không chạy đúng trong Git Bash → chuyển sang `jmeter.bat` qua `cmd //c` + `cygpath -w`. Verify 2 lớp: `--version` chạy trên Java 25, và nạp thật một `.jmx` tối giản chứa `ConcurrencyThreadGroup` → "Created the tree successfully" (không ClassNotFoundException). Dọn file tạm sau khi verify. Cập nhật `phases.md` cho khớp tên plugin thật. | `lib/ext/jmeter-plugins-manager-1.10.jar`, `lib/ext/jmeter-plugins-casutg-3.1.1.jar`, `lib/cmdrunner-2.3.jar`; `phases.md` |
| 17 | 2026-08-16 19:38:31 | "đặt MSSV 23127522" | Ghi MSSV vào memory, thay toàn bộ placeholder trong `phases.md` bằng `23127522`, chốt quy ước tên file theo mục 11 (`23127522_Load_{YYYYMMDD}.jmx`, `_Stress_`, `_Spike_`, `_Endurance_`). Đổi branch `master` → `main` bằng `git branch -M main` (khớp với lệnh push tôi đã chạy ở lượt 2), rồi commit Giai đoạn 0. | commit `2b186c4`; memory `hw05-student-id.md` |
| 18 | 2026-08-16 19:47:52 | "làm sao để bật tool Jmeter" | Bật GUI bằng `cmd /c start "" jmeterw.cmd`, **verify bằng process thật**: `javaw` PID 35452, cửa sổ "Apache JMeter (5.6.3)", 572 MB RAM. Giải thích khác biệt `jmeterw.cmd` (không console) vs `jmeter.cmd` (kèm console đen). | `jmeter.log` (JMeter tự ghi lúc 19:48) |
| 19 | 2026-08-16 19:53:15 | "Hãy bỏ qua các lỗi hay các phát hiện về code, tạo cho tôi document về api endpoint đầy đủ" | Viết `docs/01-api-endpoints.md` — 591 dòng, **31 endpoint** (11 công khai, 20 cần Bearer token), 13 mục: quy ước xác thực (401 vs 403), chi tiết theo nhóm Auth/Users/Products/Categories/Cart/Orders/Coupons/Admin, bảng tra nhanh, dữ liệu seed. Theo yêu cầu, viết thuần reference, không bàn về bug. | `docs/01-api-endpoints.md`; commit `4edb209` |
| 20 | 2026-08-16 23:38:45 | "bạn có lưu log ở trong folder này không?" | Kiểm tra thật cả project + `ai-logs/` + `results/` + `evidence/`: trả lời **không** tự ghi log hội thoại vào project. `jmeter.log` là do JMeter ghi (đã trong `.gitignore`); `ai-logs/` còn trống, chỉ có `.gitkeep`. | `ai-logs/.gitkeep` |
| 21 | 2026-08-16 23:40:02 | "vậy là bạn không lưu lịch sử input/output của folder này à" | Làm rõ: lịch sử **có** được lưu, nhưng do CLI ghi tự động và nằm ngoài repo — 2 file `.jsonl` (446 + 30 dòng) trong `~/.claude/projects/D--2025-2026-HK9-Test-HW06/`. Phân biệt 3 thứ: transcript session (đầy đủ, tự động), memory (3 file, chỉ vài fact chắt lọc), và `ai-logs/` trong project (vẫn trống). | 2 file `.jsonl`; `memory/` (3 file) |
| 22 | 2026-08-16 23:46:02 | "Vì tôi cần bằng chứng để báo cáo input/output như file reports/appendix/prompt_logs" | Đọc mục 9 của đề để lấy đúng format bắt buộc (tên công cụ / ngày giờ / prompt / output). Phát hiện `reports/appendix/prompt_logs.md` **đang chứa nội dung HW04 cũ** — là template, không phải log của HW05. Viết `scripts/extract_prompts.py` để parse 2 file `.jsonl`, lọc bỏ tool result / slash command / system reminder, đổi UTC → +07:00; gặp lỗi `UnicodeEncodeError` khi ghi ra stdout trên Windows → sửa thành ghi trực tiếp ra file. Kết quả `rows=254 real_user_turns=22`, rồi viết lại toàn bộ file này. | `scripts/extract_prompts.py`; chính file này |
| 23 | 2026-08-16 23:54:57 | "Hãy tạo seed data và csv ở phase 02. Lưu ý nên là dữ liệu thật, rõ ràng, tiếng việt có dấu" | Đọc `phases.md` (Giai đoạn 2), `backend/server.js`, `backend/database.js` để nắm quy tắc/bug thật của SUT (khóa tài khoản sau 2 lần sai chứ không phải 3, `price` trả kiểu string khi id chẵn, coupon percent tính sai, `apply-coupon` không cần token). Viết `scripts/seed-data.js` (sinh 500 user + 30 user lockout riêng + 200 sản phẩm, dữ liệu tiếng Việt có dấu thật, tất định, idempotent qua API) và `scripts/verify-seed.js` (chạy thật 9 request Flow A để xác nhận CSV dùng được, không chỉ đủ số dòng). Sửa lỗi ký tự Unicode kết hợp gõ trực tiếp trong regex `boDau()` (khó đọc, gây lỗi khi tool ngoài xử lý) bằng escape `̀-ͯ`. Ghi 4 file CSV bằng ID thật lấy từ API, cập nhật `phases.md` và viết `docs/02-test-data.md`. | `scripts/seed-data.js`, `scripts/verify-seed.js`, `docs/02-test-data.md`, `data/*.csv` |
| 24 | 2026-08-17 01:08:43 | "node scripts/verify-seed.js câu này chạy ở level nào" | Giải thích script chạy ở cấp HTTP API (gọi thật `fetch` tới `http://localhost:3000`), không phải cấp UI/browser — khác với JMeter sẽ chạy sau ở Giai đoạn 3 cũng cùng cấp API. | — |
| 25 | 2026-08-17 01:10:00 | Dán lỗi thật khi chạy `node scripts/verify-seed.js`: `TypeError: fetch failed` tại `call()` | Chỉ ra nguyên nhân: backend chưa chạy (không phải bug trong script). Hướng dẫn khởi động lại `node server.js` trước khi verify. | — |
| 26 | 2026-08-17 01:13:37 | Dán output verify thành công (nhánh Lockout: sai 2 lần → 401, đúng mật khẩu vẫn 403) kèm câu hỏi "Bạn chia luồng này ra để làm gì" | Giải thích lý do tách `users_lockout.csv` khỏi `users.csv`: nếu dùng chung file, user bị khóa vĩnh viễn trong phiên test sẽ làm sai lệch p95 latency và error rate của toàn bộ luồng chính (500 user), gây nghịch lý số liệu đẹp nhưng không phản ánh đúng hệ thống. | `data/users_lockout.csv` |
| 27 | 2026-08-17 01:16:51 | "Vậy mục đích của bạn ở đây là gì, chỉ cần số liệu password đúng thì nó sẽ không bị 403 status mà?" | Đào sâu hơn vào code thật: `backend/server.js:40` kiểm tra `locked_until` **trước** khi so khớp mật khẩu (dòng 46) — nên một khi tài khoản đã bị khóa, mật khẩu đúng vẫn trả 403, không liên quan gì đến việc mật khẩu có đúng hay không. Giải thích thêm giới hạn kỹ thuật của JMeter CSV Data Set Config: không có tuỳ chọn "bắt đầu từ dòng N", nên không thể dùng offset trên cùng 1 file để tránh user bị khóa — đây là lý do bắt buộc phải tách file vật lý riêng. | `backend/server.js:40-57` |
| 28 | 2026-08-17 01:19:10 | "Hãy restyle lại verify-seed, seed-data.js lại thành các hàm, biến tiếng anh" | Đổi tên toàn bộ hàm/biến tiếng Việt sang tiếng Anh trong cả 2 file (`sinhNguoiDung`→`generateUsers`, `sinhSanPham`→`generateProducts`, `boDau`→`stripDiacritics`, `chayFlowA`→`runFlowA`, `soLoi`→`errorCount`, v.v.), giữ nguyên toàn bộ dữ liệu tiếng Việt có dấu, comment, và header CSV. Trong lúc thao tác đã ghi đè `seed-data.js` bằng bản dựng lại từ bộ nhớ hội thoại thay vì đọc file thật — phát hiện sai sót này ngay và phục hồi lại đúng nội dung gốc bằng cách trích xuất trực tiếp các lệnh `Write`/`Edit` đã từng ghi vào file đó từ transcript `.jsonl`, rồi mới áp lại các đổi tên. Restart backend, chạy lại `seed-data.js` + `verify-seed.js` trên DB sạch để xác nhận hành vi không đổi — kết quả `TẤT CẢ ĐẠT`. | `scripts/seed-data.js`, `scripts/verify-seed.js` |
| 29 | 2026-08-17 02:37:21 | "Bây giờ tôi muốn override prompt_logs thì chỉ cần chạy file py à" | Trả lời: **không đủ** — `extract_prompts.py` chỉ trích JSON thô các lượt thật, chưa tự viết ra `prompt_logs.md`; bước format sang markdown vẫn do AI đọc JSON rồi viết tay. Chạy lại script (`rows=545 real_user_turns=29`), rồi cập nhật toàn bộ file log này (bảng, số dòng `.jsonl`, phạm vi thời gian, trạng thái Giai đoạn 2, mục nhận xét độ tin cậy). | `scripts/extract_prompts.py`; chính file này |

## Trạng thái tại thời điểm chốt log

| Hạng mục | Trạng thái |
| --- | --- |
| Giai đoạn 0 — môi trường | **Xong.** JMeter 5.6.3 + `jpgc-casutg` đã verify chạy thật trên Java 25; cây thư mục + `.gitignore` + branch `main` + MSSV đã chốt (commit `2b186c4`) |
| Tài liệu API | **Xong.** 31 endpoint, 591 dòng (commit `4edb209`) |
| Giai đoạn 1 — smoke test 9 endpoint | Chưa làm |
| Giai đoạn 2 — CSV test data | **Xong.** `scripts/seed-data.js` + `scripts/verify-seed.js` (hàm/biến tiếng Anh, dữ liệu tiếng Việt có dấu), 4 file CSV (500 user, 30 user lockout, 204 sản phẩm, 2 coupon fixed), verify chạy thật 9 request Flow A → `TẤT CẢ ĐẠT`; `docs/02-test-data.md` |
| Giai đoạn 3 — `.jmx` Load (bản master) | Chưa làm |
| Giai đoạn 4 — chạy Load/Stress/Spike/Endurance | Chưa làm — **chưa có file `.jtl` nào** |
| Giai đoạn 5 — phân tích + thresholds | Chưa làm |
| Giai đoạn 6 — video demo, đóng gói | Chưa làm |
| Số commit hiện tại | 3 (`95c2726`, `2b186c4`, `4edb209`) — Giai đoạn 2 chưa commit; mục 12 yêu cầu nhiều hơn, sẽ tăng theo từng giai đoạn |

## Nhận xét về độ tin cậy của AI trong phiên này

- **Tôi hiểu sai đề, AI sửa lại — chứ không phụ họa theo.** Ở lượt 5 tôi khẳng định "3 nhóm endpoint
  = 3 Pool khác nhau"; AI đọc lại mục 4/5 và bác bỏ, chỉ ra đó là 3 *loại chức năng* cùng nằm trong
  Pool A/B. Nếu AI đồng ý cho êm chuyện thì toàn bộ thiết kế test sau đó đã lệch ngay từ gốc.
- **Spec và code không khớp — chỉ đọc spec là chưa đủ.** Ở lượt 11, `api_specification.md` không
  phản ánh đúng `server.js`. Bài học: mọi endpoint đưa vào `.jmx` phải đối chiếu code thật, vì một
  path sai không làm test "fail" mà làm test đo sai thứ (404 vẫn có response time đẹp).
- **"Jar đã nằm trong lib/ext" không đồng nghĩa với "plugin chạy được".** Ở lượt 16, AI không dừng
  ở việc `ls` thấy jar mà nạp thật một `.jmx` chứa `ConcurrencyThreadGroup`. Đây là bước dễ bị bỏ
  qua nhất, và nếu bỏ qua thì lỗi `ClassNotFoundException` sẽ chỉ lộ ra lúc đang chạy Stress test.
- **Môi trường Windows + Git Bash gây lỗi mà AI phải thử mới biết.** `jmeter.sh` không chạy đúng
  trong Git Bash (phải chuyển sang `jmeter.bat` + `cygpath -w`), và `scripts/extract_prompts.py`
  chết vì `UnicodeEncodeError` khi in tiếng Việt ra stdout (phải ghi thẳng ra file UTF-8). Cả hai
  đều không đoán trước được, chỉ hiện ra khi thực thi.
- **Lỗi hạ tầng làm mất 3 lượt prompt.** Lượt 8–10 (18:53:18 → 18:53:39) là cùng một câu hỏi gõ lại
  4 lần: một lần không có phản hồi, hai lần lỗi model không truy cập được. Tôi giữ nguyên trong log
  thay vì gộp lại thành một dòng, vì mục 9 yêu cầu ghi *mỗi lần tương tác*, và cũng để thấy rõ:
  transcript ghi cả những lượt thất bại chứ không chỉ những lượt đẹp.
- **File appendix cũ là cái bẫy rõ ràng nhất.** `reports/appendix/prompt_logs.md` chứa nguyên log
  HW04 (Playwright, FR-04/09/17) — nếu nộp mà không đọc lại thì đã nộp log của bài khác. Nguyên tắc
  rút ra: file có sẵn trong repo không mặc nhiên là file của bài đang làm; và log AI phải trích từ
  transcript bằng script chạy lại được, không viết lại bằng ký ức.
- **AI tự dựng lại file từ ký ức thay vì đọc file thật — và đã tự phát hiện, tự sửa.** Ở lượt 28, khi
  refactor `scripts/seed-data.js`, AI ghi đè toàn bộ file bằng bản tái tạo từ ngữ cảnh hội thoại thay
  vì gọi `Read` trước. Vì file này chưa từng commit (không có Git history để đối chiếu), sai sót suýt
  làm mất bản gốc thật. AI tự nhận ra ngay sau khi ghi, và phục hồi đúng nội dung gốc bằng cách trích
  xuất trực tiếp các tool-call `Write`/`Edit` đã từng ghi vào file đó từ transcript `.jsonl` — cùng
  cơ chế bằng chứng dùng cho `extract_prompts.py`. Bài học: với file chưa commit, không có lưới an
  toàn nào ngoài chính transcript; luôn `Read` trước khi ghi đè, bất kể AI "nhớ" nội dung file đến đâu.

