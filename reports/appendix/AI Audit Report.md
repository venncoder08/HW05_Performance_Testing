# AI Audit Report — HW05 Performance Testing on EShop

**Student:** Ong Khánh Vinh  
**MSSV:** 23127522  
**Class:** 23KTPM1  
**Scenario:** Performance testing với Apache JMeter cho EShop backend REST API, tập trung vào Flow A: Login → Profile → Categories → Product Detail → Add Cart → Get Cart → Apply Coupon → Checkout → My Orders  
**System under test:** `eshop-sut` backend Node/Express + SQLite, chạy local tại `http://localhost:3000`  
**Main AI tools:** Claude Code CLI và Codex trong workspace local  
**Detailed prompt log:** `reports/appendix/prompt_logs.md`

---

## Declaration

- [ ] I do not use any AI help in this exercise.
- [x] I use AI tools for the following tasks.

Tôi có sử dụng AI để hỗ trợ đọc yêu cầu HW05, dịch đề, lập kế hoạch kiểm thử hiệu năng, thiết kế dữ liệu test, tạo/điều chỉnh JMeter test plan, giải thích cách dùng JMeter GUI/non-GUI, phân tích file raw `.jtl`, soạn báo cáo tiếng Việt, đề xuất Continuous Performance Testing và ghi lại prompt log. Kết luận cuối cùng trong báo cáo không lấy trực tiếp từ AI output nếu chưa đối chiếu lại bằng evidence thật như `.jmx`, `.jtl`, `statistics.json`, HTML dashboard, screenshot monitoring và GitHub Issues.

---

## Scope Of AI Use

| Nhóm công việc | AI hỗ trợ | Evidence dùng để kiểm chứng |
| --- | --- | --- |
| Hiểu đề HW05 | Dịch và giải thích yêu cầu performance testing, yêu cầu 3 test plan, listener/report khác nhau, raw result và AI audit. | `2026.HW05.Performance Testing_VI_2.0_HTThanh.md`, `prompt_logs.md` |
| Chuẩn bị dữ liệu | Đề xuất cấu trúc data-driven test và tách dữ liệu lockout để không làm bẩn users chính. | `data/users.csv`, `data/products.csv`, `data/coupons.csv`, `data/users_lockout.csv` |
| Tạo JMeter plan | Hỗ trợ tạo Load, Stress, Spike test plan; hướng dẫn token extractor và Authorization header. | `test-plans/23127522_Load_20260817.jmx`, `test-plans/23127522_Stress_20260818.jmx`, `test-plans/23127522_Spike_20260818.jmx` |
| Chạy và troubleshoot JMeter | Giải thích GUI listener, non-GUI command, `summary = 0`, port 4445, existing output file, output path. | `command.md`, `reports/results/*.jtl`, `reports/load`, `reports/stress`, `reports/spike` |
| Phân tích kết quả | Trích số liệu từ raw `.jtl` và `statistics.json`; phân biệt lỗi backend thật với transaction parent artifact. | `reports/results/*.jtl`, `reports/*/statistics.json` |
| Human review | Săn các điểm AI dễ hiểu sai: total users vs concurrent users, transaction parent, dirty data của Spike, HTML report không thay thế raw log. | `reports/Main Report.md`, `reports/appendix/prompt_logs.md` |
| Issue reporting | Chuẩn hóa bug/performance findings và tạo GitHub Issues. | GitHub Issues #2-#6 |
| CPT proposal | Đề xuất mô hình Continuous Performance Testing theo tier, threshold và trade-off. | `reports/evidence/continous_performance_testing.png`, `reports/Main Report.md` |

---

## AI Interaction Log Summary

Chi tiết đầy đủ nằm trong `reports/appendix/prompt_logs.md`. Bảng dưới chỉ tóm tắt các cụm tương tác quan trọng nhất đối với HW05.

| # | AI tool | Date/time | Prompt / yêu cầu của sinh viên | AI output / kết quả sử dụng |
| --- | --- | --- | --- | --- |
| 1 | Claude Code | 2026-08-16 17:03-17:48 | Dịch đề HW05 và hỏi ý nghĩa `.jtl`. | Dịch đề sang tiếng Việt; giải thích `.jtl` là raw execution log của JMeter, dùng làm bằng chứng chính thay vì chỉ chụp màn hình. |
| 2 | Claude Code | 2026-08-16 18:19-19:38 | Thiết kế giai đoạn, chọn workflow và đặt MSSV. | Chốt Flow A cho EShop, quy ước tên file `23127522_Load/Stress/Spike`, chuẩn bị `phases.md` và định hướng data-driven. |
| 3 | Claude Code | 2026-08-16 22:16-23:11 | Tạo seed data và CSV phục vụ JMeter. | Tạo dữ liệu users/products/coupons, thêm script seed/verify để reset DB trước các run. |
| 4 | Codex | 2026-08-17 20:25 | “Hãy thiết kế 23127522_Load...” | Hoàn thiện Load `.jmx`: Thread Group, CSV Data Set Config, 9 HTTP samplers, JSON Extractor lấy `authToken`, HTTP Header Manager và Aggregate Report. |
| 5 | Codex | 2026-08-17 20:43-22:52 | Hỏi cách chạy JMeter, vì sao GUI không hiện gì, output `summary = 0`, existing file. | Hướng dẫn chạy GUI/non-GUI, giải thích console output, file `.jtl`, HTML dashboard và cách xóa/đổi output file đúng. |
| 6 | Codex | 2026-08-17 23:17-23:25 | Hỏi khác nhau Load/Stress/Spike/Endurance và stress có phải chạy liên tục không. | Sửa thiết kế Stress từ các lệnh rời rạc sang một run liên tục tăng tải theo bậc. |
| 7 | Codex | 2026-08-18 16:49-17:19 | Cài và dùng `jp@gc - Ultimate Thread Group`; tạo Stress và Spike. | Hướng dẫn plugin, tạo `23127522_Stress_20260818.jmx` và `23127522_Spike_20260818.jmx` với listener khác nhau. |
| 8 | Codex | 2026-08-18 17:22-19:54 | Phân tích vì sao Stress `.jtl` nhiều dòng, vì sao có 43 lỗi, và cách review HTML report. | Đọc raw `.jtl`, chỉ ra dòng `.jtl` là sample record chứ không phải user; 43 lỗi Stress là transaction parent `Response was null`, child HTTP vẫn `200`. |
| 9 | Codex | 2026-08-18 20:50-21:03 | Task 2: AI analysis + misinterpretation hunt. | Viết phần review AI: đối chiếu AI output với `.jtl`/`statistics.json`, bắt các hiểu sai về `summary = 0`, transaction parent, dirty Spike run và total users. |
| 10 | Codex | 2026-08-18 21:03-21:14 | Task 3: Continuous Performance Testing. | Đề xuất CPT theo tầng: docs-only skip, JMX/data smoke, backend PR Load Gate, nightly full suite, weekly/manual endurance. |
| 11 | Codex | 2026-08-18 21:14-22:45 | Viết main report, PDF, GitHub Issues, prompt log, đổi output path vào `reports`. | Tạo/cập nhật `reports/Main Report.md`, `reports/Main Report.pdf`, `reports/appendix/prompt_logs.md`, GitHub Issues #2-#6 và chuyển output rerun sang `reports/results`. |

---

## Evidence Used For Final Conclusions

| Scenario | Test plan | Raw result | HTML report | Listener/report view trong `.jmx` |
| --- | --- | --- | --- | --- |
| Load | `test-plans/23127522_Load_20260817.jmx` | `reports/results/23127522_Load_20260817.jtl` | `reports/load/index.html` | Aggregate Report |
| Stress | `test-plans/23127522_Stress_20260818.jmx` | `reports/results/23127522_Stress_20260818.jtl` | `reports/stress/index.html` | Summary Report |
| Spike | `test-plans/23127522_Spike_20260818.jmx` | `reports/results/23127522_Spike_20260818.jtl` | `reports/spike/index.html` | View Results Tree |

| Scenario | Raw rows | Max active threads | P95 | P99 | Throughput | Final interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Load | 5,000 | 81 | 19 ms | 30 ms | 33.17 req/s | Baseline sạch, 0 lỗi. |
| Stress | 147,593 | 500 | 1,635 ms | 5,163.87 ms | 290.01 req/s | Latency tăng rõ ở 500 active threads; 43 lỗi là transaction parent artifact, không phải HTTP child failure hàng loạt. |
| Spike | 32,850 | 300 | 448 ms | 794 ms | 157.21 req/s | Run hợp lệ sau khi seed lại data; run Spike có `401/403` hàng loạt bị loại khỏi kết luận chính. |

---

## Human Review And Corrections

| Điểm AI hoặc người dùng dễ hiểu sai | Kiểm chứng bằng dữ liệu thật | Kết luận sau review |
| --- | --- | --- |
| Chỉ có data CSV thì JMeter có thể tự chạy test. | JMeter cần Thread Group, samplers, data source, extractor/header và listener/result writer. | Chỉ có data là chưa đủ; phải có `.jmx` mô tả flow. |
| Token sau login “tự hiểu” cho các request sau. | `.jmx` cần JSON Extractor lưu `${authToken}` và HTTP Header Manager gắn `Authorization: Bearer ${authToken}`. | Token không tự truyền; phải cấu hình biến và header rõ ràng. |
| Console Load hiện `summary = 0` nên test không chạy. | `reports/results/23127522_Load_20260817.jtl` có 5,000 raw rows và pass 100%. | Không kết luận bằng console summary đơn lẻ; raw `.jtl` mới là nguồn chính. |
| Stress có 147,593 dòng nghĩa là có 147,593 users. | Max active threads của Stress là 500. Mỗi virtual user chạy nhiều sampler và nhiều vòng. | `.jtl` rows là sample records, không phải user count. |
| Stress có 43 lỗi nghĩa là backend trả HTTP lỗi. | 43 lỗi nằm ở transaction parent `Flow A - Login Browse Cart Checkout`, response code rỗng, message `Response was null`; child HTTP có 147,550 dòng `200`. | Đây là artifact cần tách khỏi lỗi HTTP backend thật. |
| Load 500 users nhưng max active threads chỉ 81 nghĩa là chỉ chạy 81 users. | Load dùng 500 threads, ramp-up 120s, loop 1; request chạy nhanh nên concurrency tức thời không đạt 500. | 500 là tổng virtual users được tạo, không phải 500 concurrent users mọi thời điểm. |
| Spike lỗi `401/403` phản ánh backend không chịu nổi spike. | Run lỗi có nhiều `401/403` do data/login dirty; sau khi seed và verify, Spike clean dùng làm kết quả chính. | Run invalid phải loại khỏi phân tích performance. |
| Đề xuất “connection pool” chung chung cho SQLite embedded. | Backend dùng SQLite embedded, không phải DB client-server như PostgreSQL/MySQL. | Đây là khuyến nghị chưa phù hợp nếu không đổi kiến trúc DB; ưu tiên index, pagination, WAL, clear cart. |

---

## Bug And Performance Issues Reported

| Issue | Category | Evidence / link |
| --- | --- | --- |
| `apply-coupon` không yêu cầu Authorization token. | Security/logic | GitHub Issue [#2](https://github.com/venncoder08/HW05_Performance_Testing/issues/2) |
| Account lockout xảy ra sớm hơn kỳ vọng. | Functional/security | GitHub Issue [#3](https://github.com/venncoder08/HW05_Performance_Testing/issues/3) |
| Kiểu dữ liệu `price` không nhất quán giữa sản phẩm. | API consistency | GitHub Issue [#4](https://github.com/venncoder08/HW05_Performance_Testing/issues/4) |
| Coupon percent tính sai `final_amount`. | Functional | GitHub Issue [#5](https://github.com/venncoder08/HW05_Performance_Testing/issues/5) |
| `my-orders` thiếu index/pagination, có nguy cơ chậm khi order tăng. | Performance risk | GitHub Issue [#6](https://github.com/venncoder08/HW05_Performance_Testing/issues/6) |

---

## Accuracy Safeguards

1. Không dùng HTML dashboard làm nguồn duy nhất. HTML chỉ dùng để trình bày trực quan; số liệu chính lấy từ `.jtl` và `statistics.json`.
2. Mọi kết luận về lỗi đều tách riêng transaction parent và child HTTP samplers.
3. Trước khi dùng Spike làm kết quả chính, cần seed lại DB và chạy verify data để tránh lỗi login/data dirty.
4. Các đề xuất tối ưu được phân loại theo mức phù hợp với kiến trúc SQLite embedded.
5. Các lệnh chạy lại đã được đổi output về `reports/results` để evidence nằm cùng thư mục nộp bài.

---

## AI Critique (200-300 words)

AI hữu ích nhất ở các phần cần tổng hợp nhiều chi tiết: đọc yêu cầu HW05, biến workflow EShop thành Flow A gồm 9 request, hướng dẫn cấu hình JMeter GUI, tạo `.jmx`, giải thích token extractor/header và soạn báo cáo từ nhiều nguồn evidence. AI cũng giúp sửa hướng thiết kế Stress: ban đầu có xu hướng nghĩ theo nhiều lệnh chạy rời rạc, sau review đã chuyển sang Ultimate Thread Group để tăng tải theo bậc trong cùng một run. Phần này làm bài test nhất quán hơn và tạo biểu đồ dễ đọc hơn.

Tuy nhiên AI không đủ tin cậy nếu chỉ nghe phần diễn giải mà không đối chiếu log thô. Có ba lỗi/dễ lỗi nổi bật. Thứ nhất, dòng console `summary = 0` có thể bị hiểu thành “test không chạy”, trong khi raw `.jtl` Load có 5,000 dòng pass. Thứ hai, 43 lỗi trong Stress dễ bị đọc nhầm là backend HTTP failure, nhưng kiểm tra `.jtl` cho thấy đó là transaction parent `Response was null`, còn child HTTP vẫn trả `200`. Thứ ba, Spike run có `401/403` hàng loạt không được dùng để kết luận performance vì nguyên nhân đến từ data/login dirty, không phải khả năng chịu tải.

Bài học chính là AI chỉ nên đóng vai trò trợ lý phân tích và phát hiện hướng kiểm tra. Kết luận cuối cùng phải dựa trên evidence có thể kiểm chứng: `.jmx`, `.jtl`, `statistics.json`, HTML report và screenshot monitoring.
