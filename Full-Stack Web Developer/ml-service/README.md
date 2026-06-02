---
title: Foreca API
sdk: docker
app_port: 7860
pinned: false
---

# Foreca API

REST API prediksi penjualan 7 hari ke depan berbasis model CNN-LSTM.

**Tim:** CC26-PSU041 — Coding Camp 2026 powered by DBS Foundation  

**Base URL:** `https://sughara-foreca-api.hf.space`  
**Dokumentasi :** [/docs](https://sughara-foreca-api.hf.space/docs)

---

## Deskripsi

API ini menerima data historis penjualan harian minimal 30 hari dan menghasilkan prediksi penjualan untuk 7 hari ke depan. Model yang digunakan adalah CNN-LSTM dengan custom loss function berbasis weighted MAE yang memberi bobot lebih tinggi pada hari-hari pertama prediksi.

---

## Endpoints

### GET /health

Mengecek status server dan model. Digunakan untuk monitoring dan polling frontend sebelum mengirim request prediksi.

**URL:** `https://sughara-foreca-api.hf.space/health`

Response `200 OK`:
```json
{
  "status": "ok",
  "message": "Foreca API is running",
  "model": "Foreca_CNN_LSTM",
  "version": "1.0.0"
}
```

Response `503 Service Unavailable` jika model belum siap:
```json
{
  "detail": "Model belum siap"
}
```

---

### GET /model-info

Mengembalikan metadata model yang sedang aktif.

**URL:** `https://sughara-foreca-api.hf.space/model-info`

Response `200 OK`:
```json
{
  "model_name": "Foreca_CNN_LSTM",
  "version": "1.0.0",
  "lookback": 30,
  "horizon": 7,
  "n_features": 12,
  "feature_columns": [
    "Total", "Jumlah_Order", "Transaksi_Count", "Unique_Produk",
    "Hari_Ke", "y", "lag_1", "lag_7",
    "roll7_mean", "roll7_std", "roll14_mean", "is_zero_day"
  ],
  "trained_at": "2026-05-17T08:40:34.558166",
  "mae_scaled": 0.029631593275584123,
  "mae_rupiah": 3722839.2909663864,
  "rmse_rupiah": 5171270.662644506
}
```

---

### POST /predict

Menerima data historis penjualan dan mengembalikan prediksi 7 hari ke depan.

**URL:** `https://sughara-foreca-api.hf.space/predict`  
**Method:** POST  
**Content-Type:** application/json

#### Request Body

```json
{
  "data": [
    {
      "Tanggal": "2024-01-01",
      "Total": 1500000.0,
      "Jumlah_Order": 15.0,
      "Transaksi_Count": 12.0,
      "Unique_Produk": 6.0,
      "Hari_Ke": 1,
      "y": 1500000.0,
      "lag_1": 1480000.0,
      "lag_7": 1420000.0,
      "roll7_mean": 1490000.0,
      "roll7_std": 30000.0,
      "roll14_mean": 1470000.0,
      "is_zero_day": 0
    }
  ]
}
```

#### Keterangan Field

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `Tanggal` | string | Ya | Format `YYYY-MM-DD` |
| `Total` | float | Ya | Total penjualan hari itu, tidak boleh negatif |
| `Jumlah_Order` | float | Ya | Jumlah order, tidak boleh negatif |
| `Transaksi_Count` | float | Ya | Jumlah transaksi, tidak boleh negatif |
| `Unique_Produk` | float | Ya | Jumlah produk unik terjual |
| `Hari_Ke` | int | Ya | Nomor urut hari dalam dataset |
| `y` | float | Ya | Target variabel (sama dengan `Total`) |
| `lag_1` | float | Ya | Nilai `Total` hari sebelumnya |
| `lag_7` | float | Ya | Nilai `Total` 7 hari sebelumnya |
| `roll7_mean` | float | Ya | Rata-rata `Total` 7 hari terakhir |
| `roll7_std` | float | Ya | Standar deviasi `Total` 7 hari terakhir |
| `roll14_mean` | float | Ya | Rata-rata `Total` 14 hari terakhir |
| `is_zero_day` | int | Tidak | `1` jika `Total = 0`, `0` jika tidak. Dihitung otomatis jika tidak disertakan |

**Aturan validasi:**
- Array `data` minimal berisi **30 record**
- `Total`, `Jumlah_Order`, `Transaksi_Count` tidak boleh bernilai negatif
- Data akan diurutkan berdasarkan `Tanggal` secara otomatis

#### Response `200 OK`

```json
{
  "status": "success",
  "last_date_in_data": "2024-01-30",
  "forecast": [
    { "tanggal": "2024-01-31", "prediksi_total": 1620000.0 },
    { "tanggal": "2024-02-01", "prediksi_total": 1580000.0 },
    { "tanggal": "2024-02-02", "prediksi_total": 1610000.0 },
    { "tanggal": "2024-02-03", "prediksi_total": 1640000.0 },
    { "tanggal": "2024-02-04", "prediksi_total": 1590000.0 },
    { "tanggal": "2024-02-05", "prediksi_total": 1560000.0 },
    { "tanggal": "2024-02-06", "prediksi_total": 1530000.0 }
  ]
}
```

#### Response Error

| Status | Kondisi |
|---|---|
| `422 Unprocessable Entity` | Data kurang dari 30 record, field hilang, atau nilai negatif |
| `500 Internal Server Error` | Kesalahan inference di sisi server |
| `503 Service Unavailable` | Model belum ter-load |

Contoh response `422`:
```json
{
  "detail": "Data minimal 30 baris untuk prediksi"
}
```

---

## Contoh Penggunaan

### cURL

```bash
curl -X POST https://sughara-foreca-api.hf.space/predict \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://sughara-foreca-api.hf.space/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: yourDataArray })
});

const result = await response.json();
console.log(result.forecast);
```

### Python (requests)

```python
import requests

response = requests.post(
    'https://sughara-foreca-api.hf.space/predict',
    json={'data': your_data_list}
)

print(response.json()['forecast'])
```

---

## Struktur Proyek

```
Foreca_Serve/
├── main.py
├── requirements.txt
├── Dockerfile
├── artifacts/
│   ├── foreca_model.keras
│   ├── scaler_X.pkl
│   ├── scaler_y.pkl
│   └── model_metadata.json
└── tests/
    ├── conftest.py
    ├── test_api.py
    └── load_test.py
```

---

## Instalasi Lokal

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

pip install -r requirements.txt
uvicorn main:app --reload
```

Swagger UI tersedia di `http://localhost:8000/docs`.

---

## Testing

```bash
pytest tests/test_api.py -v
```

34 test case mencakup validasi input, response format, security headers, dan error handling.

```bash
locust -f tests/load_test.py --headless -u 10 -r 2 -t 60s --host https://sughara-foreca-api.hf.space
```
