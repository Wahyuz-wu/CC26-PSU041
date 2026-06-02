import datetime
import random
from locust import HttpUser, task, between, events


def _make_payload(n: int = 30) -> dict:
    base = datetime.date(2024, 1, 1)
    records = []
    prev_total = 1_000_000.0
    for i in range(n):
        d = base + datetime.timedelta(days=i)
        noise = random.uniform(-50_000, 50_000)
        total = max(0.0, prev_total + noise)
        records.append({
            "Tanggal":         d.strftime("%Y-%m-%d"),
            "Total":           round(total, 2),
            "Jumlah_Order":    float(random.randint(5, 30)),
            "Transaksi_Count": float(random.randint(4, 25)),
            "Unique_Produk":   float(random.randint(2, 10)),
            "Hari_Ke":         i + 1,
            "y":               round(total, 2),
            "lag_1":           round(prev_total, 2),
            "lag_7":           round(max(0, prev_total - 70_000), 2),
            "roll7_mean":      round(total * 0.98, 2),
            "roll7_std":       round(abs(noise) * 0.5, 2),
            "roll14_mean":     round(total * 0.97, 2),
            "is_zero_day":     1 if total == 0 else 0,
        })
        prev_total = total
    return {"data": records}


PAYLOAD_30 = _make_payload(30)
PAYLOAD_60 = _make_payload(60)
PAYLOAD_90 = _make_payload(90)


class ForecaApiUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(3)
    def health_check(self):
        with self.client.get("/health", catch_response=True) as resp:
            if resp.status_code == 200:
                if resp.json().get("status") != "ok":
                    resp.failure(f"Unexpected body: {resp.json()}")
            else:
                resp.failure(f"HTTP {resp.status_code}")

    @task(4)
    def predict_30_rows(self):
        with self.client.post("/predict", json=PAYLOAD_30, catch_response=True) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") != "success":
                    resp.failure(f"status bukan success: {data}")
                elif len(data.get("forecast", [])) != 7:
                    resp.failure(f"forecast bukan 7 item: {data}")
            else:
                resp.failure(f"HTTP {resp.status_code} — {resp.text[:200]}")

    @task(2)
    def predict_60_rows(self):
        with self.client.post("/predict", json=PAYLOAD_60, catch_response=True) as resp:
            if resp.status_code == 200:
                if len(resp.json().get("forecast", [])) != 7:
                    resp.failure("forecast harus 7 item")
            else:
                resp.failure(f"HTTP {resp.status_code}")

    @task(1)
    def model_info(self):
        with self.client.get("/model-info", catch_response=True) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if "mape_pct" in data:
                    resp.failure("mape_pct tidak boleh ada di response")
                elif "model_name" not in data:
                    resp.failure("model_name hilang dari response")
            else:
                resp.failure(f"HTTP {resp.status_code}")

    @task(1)
    def predict_invalid_short_data(self):
        with self.client.post(
            "/predict",
            json=_make_payload(10),
            catch_response=True,
            name="/predict [invalid <30 rows]",
        ) as resp:
            if resp.status_code == 422:
                resp.success()
            else:
                resp.failure(f"Harusnya 422, dapat {resp.status_code}")


class SpikeTester(HttpUser):
    wait_time = between(0.1, 0.3)
    weight    = 1

    @task
    def spike_predict(self):
        with self.client.post(
            "/predict",
            json=PAYLOAD_90,
            catch_response=True,
            name="/predict [spike 90 rows]",
        ) as resp:
            if resp.status_code not in (200, 503):
                resp.failure(f"Unexpected HTTP {resp.status_code}")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print("\n" + "=" * 60)
    print("FORECA LOAD TEST — SUMMARY")
    print("=" * 60)
    print(f"  Total Requests   : {total.num_requests}")
    print(f"  Total Failures   : {total.num_failures}")
    print(f"  Failure Rate     : {total.fail_ratio * 100:.2f}%")
    print(f"  Median RT        : {total.median_response_time} ms")
    print(f"  95th Percentile  : {total.get_response_time_percentile(0.95)} ms")
    print(f"  99th Percentile  : {total.get_response_time_percentile(0.99)} ms")
    print(f"  Max RT           : {total.max_response_time} ms")
    print(f"  RPS (avg)        : {total.total_rps:.2f}")
    print("=" * 60)

    if total.fail_ratio > 0.01:
        print(f"\nFAIL: failure rate {total.fail_ratio * 100:.2f}% melebihi threshold 1%")
        environment.process_exit_code = 1
