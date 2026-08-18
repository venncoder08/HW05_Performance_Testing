# JMeter Commands

All commands below are for Windows Command Prompt (`cmd`). Run them from the repository root:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06"
```

## 1. Start Backend

Open a separate Command Prompt for the backend:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06\eshop-sut\backend"
node server.js
```

Keep this terminal open while JMeter is running.

## 2. Seed And Verify Data

Run this after every backend restart:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06"
node scripts\seed-data.js
node scripts\verify-seed.js
```

## 3. Load Test

Plan:

```text
test-plans\23127522_Load_20260817.jmx
```

Run:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06"

rmdir /s /q reports\load
del /q results\23127522_Load_20260817.jtl

jmeter -n ^
  -t test-plans\23127522_Load_20260817.jmx ^
  -l results\23127522_Load_20260817.jtl ^
  -e -o reports\load ^
  -Jsummariser.name=summary ^
  -Jsummariser.interval=10 ^
  -Jsummariser.out=true ^
  -Jsummariser.log=true
```

Open report:

```bat
start reports\load\index.html
```

## 4. Stress Test

Plan:

```text
test-plans\23127522_Stress_20260818.jmx
```

Run:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06"

rmdir /s /q reports\stress
del /q results\23127522_Stress_20260818.jtl

jmeter -n ^
  -t test-plans\23127522_Stress_20260818.jmx ^
  -l results\23127522_Stress_20260818.jtl ^
  -e -o reports\stress ^
  -Jsummariser.name=summary ^
  -Jsummariser.interval=10 ^
  -Jsummariser.out=true ^
  -Jsummariser.log=true
```

Open report:

```bat
start reports\stress\index.html
```

## 5. Spike Test

Plan:

```text
test-plans\23127522_Spike_20260818.jmx
```

Run:

```bat
cd /d "D:\2025-2026 HK9\Test\HW06"

rmdir /s /q reports\spike
del /q results\23127522_Spike_20260818.jtl

jmeter -n ^
  -t test-plans\23127522_Spike_20260818.jmx ^
  -l results\23127522_Spike_20260818.jtl ^
  -e -o reports\spike ^
  -Jsummariser.name=summary ^
  -Jsummariser.interval=10 ^
  -Jsummariser.out=true ^
  -Jsummariser.log=true
```

Open report:

```bat
start reports\spike\index.html
```

## 6. Quick Result Checks

Count response codes:

```bat
powershell -Command "Import-Csv results\23127522_Load_20260817.jtl | Group-Object responseCode | Select Name,Count"
powershell -Command "Import-Csv results\23127522_Stress_20260818.jtl | Group-Object responseCode | Select Name,Count"
powershell -Command "Import-Csv results\23127522_Spike_20260818.jtl | Group-Object responseCode | Select Name,Count"
```

Count pass/fail:

```bat
powershell -Command "Import-Csv results\23127522_Load_20260817.jtl | Group-Object success | Select Name,Count"
powershell -Command "Import-Csv results\23127522_Stress_20260818.jtl | Group-Object success | Select Name,Count"
powershell -Command "Import-Csv results\23127522_Spike_20260818.jtl | Group-Object success | Select Name,Count"
```

## 7. Monitoring Helpers

Find the backend `node.exe` PID:

```bat
netstat -ano | findstr :3000
wmic process where "name='node.exe'" get ProcessId,CommandLine
```

Open Resource Monitor:

```bat
resmon
```

Monitor these processes during each run:

```text
node.exe = EShop backend SUT
java.exe = JMeter load generator
```

## Notes

- Do not choose `Append to existing file` in JMeter GUI. Delete old `.jtl` files before each official run.
- `reports\<scenario>` must be removed before running `-e -o`, because JMeter requires the output directory to be empty or absent.
- The console `summary +` line shows the latest interval; `summary =` shows cumulative results from the start of the run.
