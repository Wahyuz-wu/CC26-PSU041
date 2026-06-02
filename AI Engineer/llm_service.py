import os
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
APP_SITE_URL = os.getenv("APP_SITE_URL", "https://sughara-foreca-api.hf.space")

SYSTEM_PROMPT = """Kamu adalah analis bisnis UMKM berpengalaman di Indonesia.
Tugasmu adalah menganalisis data penjualan dan hasil prediksi untuk memberikan insight yang actionable.

Kamu HARUS menjawab dalam format berikut (gunakan heading markdown):

## Ringkasan Tren
(Jelaskan tren penjualan dari data historis: naik/turun/stabil, pola mingguan, dll)

## Analisis Penyebab
(Analisis faktor yang mungkin menyebabkan tren tersebut berdasarkan data: hari tertentu yang ramai/sepi, volatilitas, pola musiman)

## Prediksi & Outlook
(Jelaskan hasil prediksi 7 hari ke depan: apakah diperkirakan naik/turun, hari mana yang tertinggi/terendah)

## Rekomendasi Tindakan
(Berikan 3-5 rekomendasi spesifik dan actionable untuk meningkatkan penjualan berdasarkan analisis di atas)

Gunakan bahasa Indonesia yang profesional tapi mudah dipahami oleh pelaku UMKM.
Sertakan angka-angka spesifik dari data yang diberikan untuk mendukung analisismu.
Jangan mengarang data, gunakan HANYA data yang diberikan."""


def build_user_prompt(summary: dict) -> str:
    hist = summary["historis"]
    pred = summary["prediksi"]

    forecast_lines = "\n".join(
        f"  - {item['tanggal']}: Rp {item['prediksi_total']:,.0f}"
        for item in pred["forecast"]
    )

    prompt = f"""Berikut data penjualan UMKM yang perlu kamu analisis:

### Data Historis ({hist['jumlah_hari']} hari terakhir)
- Periode: {hist['tanggal_awal']} s/d {hist['tanggal_akhir']}
- Total penjualan: Rp {hist['total_penjualan']:,.0f}
- Rata-rata harian: Rp {hist['rata_rata_harian']:,.0f}
- Penjualan tertinggi: Rp {hist['penjualan_tertinggi']:,.0f} ({hist['tanggal_tertinggi']})
- Penjualan terendah: Rp {hist['penjualan_terendah']:,.0f} ({hist['tanggal_terendah']})
- Standar deviasi: Rp {hist['standar_deviasi']:,.0f}
- Total order: {hist['total_order']:,.0f}
- Rata-rata order harian: {hist['rata_rata_order_harian']:.1f}
- Jumlah hari tanpa penjualan: {hist['hari_tanpa_penjualan']}
- Tren 7 hari terakhir vs 7 hari sebelumnya: {hist['tren_mingguan']}

### Prediksi 7 Hari ke Depan (dari model CNN-LSTM)
- Periode prediksi: {pred['periode_awal']} s/d {pred['periode_akhir']}
- Rata-rata prediksi harian: Rp {pred['rata_rata_prediksi']:,.0f}
- Prediksi tertinggi: Rp {pred['prediksi_tertinggi']:,.0f}
- Prediksi terendah: Rp {pred['prediksi_terendah']:,.0f}
- Perbandingan vs rata-rata historis: {pred['perbandingan_vs_historis']}
- Detail per hari:
{forecast_lines}

Berikan analisis lengkap berdasarkan data di atas."""

    return prompt


def build_data_summary(df, forecast_result: dict) -> dict:
    totals = df["Total"].values
    avg_daily = float(totals.mean())
    max_val = float(totals.max())
    min_val = float(totals.min())
    max_idx = int(totals.argmax())
    min_idx = int(totals.argmin())
    std_val = float(totals.std())

    zero_days = int((totals == 0).sum())
    total_order = float(df["Jumlah_Order"].sum())
    avg_order = float(df["Jumlah_Order"].mean())

    last_7 = totals[-7:].mean() if len(totals) >= 14 else avg_daily
    prev_7 = totals[-14:-7].mean() if len(totals) >= 14 else avg_daily

    if prev_7 > 0:
        pct_change = ((last_7 - prev_7) / prev_7) * 100
        if pct_change > 5:
            tren = f"Naik {pct_change:.1f}%"
        elif pct_change < -5:
            tren = f"Turun {abs(pct_change):.1f}%"
        else:
            tren = f"Relatif stabil ({pct_change:+.1f}%)"
    else:
        tren = "Tidak dapat dihitung (data sebelumnya = 0)"

    forecast = forecast_result["forecast"]
    pred_vals = [item["prediksi_total"] for item in forecast]
    avg_pred = sum(pred_vals) / len(pred_vals)

    if avg_daily > 0:
        pred_vs_hist = ((avg_pred - avg_daily) / avg_daily) * 100
        if pred_vs_hist > 5:
            perbandingan = f"Naik {pred_vs_hist:.1f}% dari rata-rata historis"
        elif pred_vs_hist < -5:
            perbandingan = f"Turun {abs(pred_vs_hist):.1f}% dari rata-rata historis"
        else:
            perbandingan = f"Relatif sama ({pred_vs_hist:+.1f}%) dengan rata-rata historis"
    else:
        perbandingan = "Tidak dapat dibandingkan"

    tanggal_list = df["Tanggal"].dt.strftime("%Y-%m-%d").tolist()

    return {
        "historis": {
            "jumlah_hari": len(df),
            "tanggal_awal": tanggal_list[0],
            "tanggal_akhir": tanggal_list[-1],
            "total_penjualan": float(totals.sum()),
            "rata_rata_harian": avg_daily,
            "penjualan_tertinggi": max_val,
            "tanggal_tertinggi": tanggal_list[max_idx],
            "penjualan_terendah": min_val,
            "tanggal_terendah": tanggal_list[min_idx],
            "standar_deviasi": std_val,
            "total_order": total_order,
            "rata_rata_order_harian": avg_order,
            "hari_tanpa_penjualan": zero_days,
            "tren_mingguan": tren,
        },
        "prediksi": {
            "periode_awal": forecast[0]["tanggal"],
            "periode_akhir": forecast[-1]["tanggal"],
            "rata_rata_prediksi": avg_pred,
            "prediksi_tertinggi": max(pred_vals),
            "prediksi_terendah": min(pred_vals),
            "perbandingan_vs_historis": perbandingan,
            "forecast": forecast,
        },
    }


def generate_insight(summary: dict) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY belum dikonfigurasi")

    client = OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
    )

    user_prompt = build_user_prompt(summary)

    logger.info(f"Sending request to OpenRouter ({OPENROUTER_MODEL})...")

    completion = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.6,
        top_p=0.9,
        max_tokens=2048,
        extra_headers={
            "HTTP-Referer": APP_SITE_URL,
            "X-Title": "Foreca API",
        },
    )

    content = completion.choices[0].message.content

    logger.info(
        f"LLM response received | "
        f"tokens_used={completion.usage.total_tokens if completion.usage else 'N/A'}"
    )

    return content
