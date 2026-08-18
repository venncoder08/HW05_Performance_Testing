---
name: hw05-performance-reporter
description: Prepare and review HW05 EShop performance testing reports from JMeter artifacts, especially Load/Stress/Spike .jmx, .jtl, statistics.json, screenshots, and AI audit appendices.
---

# HW05 Performance Reporter

Use this skill when the user is working on the HW05 Performance Testing assignment for the EShop SUT and asks to create, translate, audit, or update reports, command docs, prompt logs, or JMeter evidence.

## Assignment Context

- SUT: EShop backend REST API, Node/Express + SQLite, usually `http://localhost:3000`.
- Student naming convention: `23127522_Load_*.jmx`, `23127522_Stress_*.jmx`, `23127522_Spike_*.jmx`.
- Main workflow: Flow A with login, profile, categories, product detail, add cart, get cart, apply coupon, checkout, and my-orders.
- Evidence should live under `reports/` when preparing submission artifacts:
  - raw JMeter logs: `reports/results/*.jtl`
  - HTML dashboards: `reports/load`, `reports/stress`, `reports/spike`
  - screenshots: `reports/evidence/*.png`
  - appendices: `reports/appendix/*.md` and `*.pdf`

## Reporting Rules

- Treat raw `.jtl` and `statistics.json` as primary evidence. HTML dashboards are presentation evidence, not the source of truth.
- Always distinguish JMeter transaction parent samples from child HTTP samples. A transaction parent error such as `Response was null` must not be reported as a backend HTTP failure unless child samplers confirm it.
- Do not equate `.jtl` row count with user count. Rows are sample records; users are active threads or configured virtual users.
- For Load with ramp-up and loop count 1, max active threads may be much lower than total configured users if the flow completes quickly.
- For Spike, reject or label invalid any run with mass `401/403` caused by dirty data/login state. Prefer rerun after seed/verify.
- When describing optimization, prefer items that fit SQLite embedded architecture: `orders(user_id)` index, pagination for `my-orders`, clearing `userCarts`, and SQLite WAL. Treat generic client/server DB connection pool advice as not applicable unless the DB architecture changes.

## Expected Deliverables

For report work, keep Markdown and PDF files consistent. For PDF generation on Windows, use a UTF-8 HTML pipeline if available:

1. Convert Markdown to HTML body.
2. Wrap it with `<meta charset="utf-8">` and a font stack such as Arial/Segoe UI/DejaVu Sans.
3. Print with Chrome/Edge headless.
4. Verify the PDF timestamp and size changed.

## Numbers To Preserve Unless Recomputed

If the current repo evidence has not changed, preserve these verified headline metrics:

| Scenario | Raw rows | Max active threads | Total P95 | Total P99 | Throughput |
| --- | ---: | ---: | ---: | ---: | ---: |
| Load | 5,000 | 81 | 19 ms | 30 ms | 33.17 req/s |
| Stress | 147,593 | 500 | 1,635 ms | 5,163.87 ms | 290.01 req/s |
| Spike | 32,850 | 300 | 448 ms | 794 ms | 157.21 req/s |

Also preserve the verified issue links when relevant:

- `https://github.com/venncoder08/HW05_Performance_Testing/issues/2`
- `https://github.com/venncoder08/HW05_Performance_Testing/issues/3`
- `https://github.com/venncoder08/HW05_Performance_Testing/issues/4`
- `https://github.com/venncoder08/HW05_Performance_Testing/issues/5`
- `https://github.com/venncoder08/HW05_Performance_Testing/issues/6`
