# HW05 AI Performance Testing - EShop

**Student:** Ong Khanh Vinh  
**Student ID:** 23127522  
**Class:** 23KTPM1  
**SUT:** EShop backend API, Node/Express + SQLite  
**Base URL:** `http://localhost:3000`  
**Tooling:** Apache JMeter 5.6.3, JMeter Plugins Ultimate Thread Group, Windows Task Manager/Resource Monitor, AI assistant

## Submission Links

| Item | Link |
|---|---|
| GitHub repository | https://github.com/venncoder08/HW05_Performance_Testing/tree/main |
| Demo video | https://youtu.be/GPZ94lcdWDI?si=GJrB3ISKFlGie_b2 |
| GitHub Issues | https://github.com/venncoder08/HW05_Performance_Testing/issues |

## Self-Assessment

**Self-assessed grade:** `95/100`

| Requirement | Max score | Self score | Evidence | Note |
|---|---:|---:|---|---|
| Task 1 - Load testing | 20 | 20 | `test-plans/23127522_Load_20260817.jmx`, `reports/results/23127522_Load_20260817.jtl`, `reports/load` | Complete. |
| Task 1 - Stress testing | 20 | 20 | `test-plans/23127522_Stress_20260818.jmx`, `reports/results/23127522_Stress_20260818.jtl`, `reports/stress` | Complete. |
| Task 1 - Spike testing | 20 | 20 | `test-plans/23127522_Spike_20260818.jmx`, `reports/results/23127522_Spike_20260818.jtl`, `reports/spike` | Complete after clean rerun. |
| Task 2 - AI analysis + misinterpretation hunt | 10 | 10 | `reports/Main_Report.md`, `reports/appendix/AI Audit Report.md`, `reports/appendix/prompt_logs.md` | Raw `.jtl` values are used to correct AI misreadings. |
| Task 3 - Continuous Performance Testing proposal | 10 | 10 | `reports/Main_Report.md`, `reports/evidence/continous_performance_testing.png` | Includes tiered CPT model, p95 regression rules, and trade-offs. |
| AI audit, critique, evidence, report packaging | 20 | 15 | `reports/appendix`, `reports/evidence`, `agent-skill/hw05-performance-reporter` | Minus 5 because there is no separate agent-skill demonstration video. |

## Test Summary

All three JMeter plans exercise the same end-to-end workflow, called Flow A:

1. `POST /api/login`
2. `GET /api/users/me`
3. `GET /api/categories`
4. `GET /api/products/:id`
5. `POST /api/cart`
6. `GET /api/cart`
7. `POST /api/apply-coupon`
8. `POST /api/checkout`
9. `GET /api/orders/my-orders`

Endpoint coverage:

| Endpoint group | Covered by |
|---|---|
| Auth-heavy | Login and profile requests. |
| Read-heavy | Categories and product detail requests. |
| Transactional | Cart, coupon, checkout, and my-orders requests. |

## Performance Results

| Scenario | Raw rows | Pass | Fail | Max active threads | Total P95 | Total P99 | Throughput |
|---|---:|---:|---:|---:|---:|---:|---:|
| Load | 5,000 | 5,000 | 0 | 81 | 19 ms | 30 ms | 33.17 req/s |
| Stress | 147,593 | 147,550 | 43 | 500 | 1,635 ms | 5,163.87 ms | 290.01 req/s |
| Spike | 32,850 | 32,809 | 41 | 300 | 448 ms | 794 ms | 157.21 req/s |

Important review notes:

- Load is a clean baseline with 0 failed samples.
- Stress reaches 500 active threads. The 43 failures are transaction parent records with `Response was null`, not child HTTP backend failures.
- Spike uses the clean rerun after reseeding data. The earlier Spike run with mass `401/403` is excluded from the final performance conclusion.

## Endurance Threshold

A separate 10-15 minute endurance/soak run is not included in this final package. The local hardware threshold is therefore reported as an inferred threshold from the Stress and Spike evidence:

| Threshold type | Value |
|---|---|
| Maximum observed active threads | 500 active threads in Stress |
| Maximum observed throughput | 290.01 req/s in Stress |
| Stress Total P95 | 1,635 ms |
| Stress Total P99 | 5,163.87 ms |
| Recommended future endurance load | 250-300 active threads for 10-15 minutes |

This is marked as an inferred local threshold, not a formally executed endurance result.

## Bug And Performance Issues

| Issue | Link |
|---|---|
| `apply-coupon` does not require Authorization token | https://github.com/venncoder08/HW05_Performance_Testing/issues/2 |
| Account lockout happens earlier than expected | https://github.com/venncoder08/HW05_Performance_Testing/issues/3 |
| Product `price` type is inconsistent | https://github.com/venncoder08/HW05_Performance_Testing/issues/4 |
| Percent coupon calculates `final_amount` incorrectly | https://github.com/venncoder08/HW05_Performance_Testing/issues/5 |
| `my-orders` lacks pagination/index and may slow down as orders grow | https://github.com/venncoder08/HW05_Performance_Testing/issues/6 |

## Repository Contents

| Path | Content |
|---|---|
| `reports/Main_Report.md` | Main report in English. |
| `reports/Main Report.pdf` | Main report PDF. |
| `reports/appendix/AI Audit Report.md` | AI audit report. |
| `reports/appendix/AI Audit Report.pdf` | AI audit report PDF. |
| `reports/appendix/AI Critique.md` | AI critique. |
| `reports/appendix/AI Critique.pdf` | AI critique PDF. |
| `reports/appendix/prompt_logs.md` | Prompt log appendix. |
| `test-plans/*.jmx` | Load, Stress, and Spike JMeter test plans. |
| `reports/results/*.jtl` | Raw JMeter logs. |
| `reports/load`, `reports/stress`, `reports/spike` | JMeter HTML report folders. |
| `reports/evidence/*.png` | Monitoring and hardware screenshots. |
| `agent-skill/hw05-performance-reporter` | Reusable Codex skill for this HW05 JMeter reporting workflow. |
| `reports/youtube_link.txt` | Demo video link. |
| `reports/github_link.txt` | Repository link. |

## How To Rerun

Start the backend:

```bat
cd /d "<project-root>\eshop-sut\backend"
node server.js
```

Reset and verify data:

```bat
cd /d "<project-root>"
node scripts\seed-data.js
node scripts\verify-seed.js
```

Run Load:

```bat
jmeter -n ^
  -t test-plans\23127522_Load_20260817.jmx ^
  -l reports\results\23127522_Load_20260817.jtl ^
  -e -o reports\load
```

Run Stress:

```bat
jmeter -n ^
  -t test-plans\23127522_Stress_20260818.jmx ^
  -l reports\results\23127522_Stress_20260818.jtl ^
  -e -o reports\stress
```

Run Spike:

```bat
jmeter -n ^
  -t test-plans\23127522_Spike_20260818.jmx ^
  -l reports\results\23127522_Spike_20260818.jtl ^
  -e -o reports\spike
```
