import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import timedelta
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, field_validator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PROD = APP_ENV == "production"

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS = os.path.join(BASE_DIR, "artifacts")


def _split_env_list(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


cors_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "")
if cors_origins_env:
    cors_allow_origins = _split_env_list(cors_origins_env)
elif IS_PROD:
    cors_allow_origins = []
else:
    cors_allow_origins = ["*"]

allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "")
if allowed_hosts_env:
    allowed_hosts = _split_env_list(allowed_hosts_env)
elif IS_PROD:
    allowed_hosts = []
else:
    allowed_hosts = ["*"]

if IS_PROD and not allowed_hosts:
    raise RuntimeError("ALLOWED_HOSTS must be set in production")

if IS_PROD and not cors_allow_origins:
    logger.warning("CORS_ALLOW_ORIGINS is empty; cross-origin requests are blocked")


class WeightedMAELoss(tf.keras.losses.Loss):
    def __init__(self, name="weighted_mae_loss", **kwargs):
        super().__init__(name=name, **kwargs)
        self.weights = tf.constant(
            [2.0, 1.8, 1.5, 1.2, 1.0, 1.0, 1.0], dtype=tf.float32
        )

    def call(self, y_true, y_pred):
        y_true = tf.cast(y_true, tf.float32)
        y_pred = tf.cast(y_pred, tf.float32)
        return tf.reduce_mean(tf.abs(y_true - y_pred) * self.weights)

    def get_config(self):
        return super().get_config()


model    = None
scaler_X = None
scaler_y = None
metadata = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, scaler_X, scaler_y, metadata

    logger.info("Loading artifacts...")

    try:
        model = tf.keras.models.load_model(
            os.path.join(ARTIFACTS, "foreca_model.keras"),
            custom_objects={"WeightedMAELoss": WeightedMAELoss}
        )
        scaler_X = joblib.load(os.path.join(ARTIFACTS, "scaler_X.pkl"))
        scaler_y = joblib.load(os.path.join(ARTIFACTS, "scaler_y.pkl"))
        with open(os.path.join(ARTIFACTS, "model_metadata.json")) as f:
            metadata = json.load(f)

        logger.info(f"Model loaded: {metadata.get('model_name')} v{metadata.get('version')}")
        logger.info(f"Features    : {metadata.get('feature_columns')}")
        logger.info("Artifacts ready!")

    except Exception as e:
        logger.error(f"Failed to load artifacts: {e}")
        raise RuntimeError(f"Artifacts not found: {e}")

    yield

    logger.info("Server shutdown.")


app = FastAPI(
    title="Foreca API",
    description=(
        "REST API prediksi penjualan 7 hari ke depan untuk UMKM.\n\n"
        "**Tim:** CC26-PSU041 | **Coding Camp 2026 powered by DBS Foundation**\n\n"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if cors_allow_origins == ["*"] else cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["Referrer-Policy"]        = "no-referrer"
    response.headers["Permissions-Policy"]     = "geolocation=(), microphone=(), camera=()"
    if IS_PROD and os.getenv("ENABLE_HSTS", "1") == "1":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


class DailyRecord(BaseModel):
    Tanggal:         str
    Total:           float
    Jumlah_Order:    float
    Transaksi_Count: float
    Unique_Produk:   float
    Hari_Ke:         int
    y:               float
    lag_1:           float
    lag_7:           float
    roll7_mean:      float
    roll7_std:       float
    roll14_mean:     float
    is_zero_day:     Optional[int] = None

    @field_validator("Total", "Jumlah_Order", "Transaksi_Count")
    @classmethod
    def must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError("Nilai tidak boleh negatif")
        return v


class PredictRequest(BaseModel):
    data: List[DailyRecord]

    @field_validator("data")
    @classmethod
    def must_have_enough_rows(cls, v):
        if len(v) < 30:
            raise ValueError("Data minimal 30 baris untuk prediksi")
        return v


class ForecastItem(BaseModel):
    tanggal:        str
    prediksi_total: float


class PredictResponse(BaseModel):
    status:            str
    last_date_in_data: str
    forecast:          List[ForecastItem]


def run_inference(df_input: pd.DataFrame) -> dict:
    LOOKBACK    = metadata["lookback"]
    COLS_TO_USE = metadata["feature_columns"]

    if "is_zero_day" not in df_input.columns:
        df_input["is_zero_day"] = (df_input["Total"] == 0).astype(int)

    recent_data   = df_input[COLS_TO_USE].tail(LOOKBACK).values
    recent_scaled = scaler_X.transform(recent_data)
    X_input       = recent_scaled.reshape(1, LOOKBACK, len(COLS_TO_USE))

    pred_scaled = model.predict(X_input, verbose=0)
    pred_real   = scaler_y.inverse_transform(
        pred_scaled.reshape(-1, 1)
    ).flatten()
    pred_real = np.maximum(pred_real, 0)

    last_date  = pd.to_datetime(df_input["Tanggal"].iloc[-1])
    pred_dates = [
        (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(7)
    ]

    return {
        "last_date_in_data": last_date.strftime("%Y-%m-%d"),
        "forecast": [
            {
                "tanggal":        date,
                "prediksi_total": round(float(val), 2),
            }
            for date, val in zip(pred_dates, pred_real)
        ],
    }


@app.get("/health", tags=["Monitoring"], summary="Health check")
def health_check():
    if model is None:
        raise HTTPException(status_code=503, detail="Model belum siap")
    return {
        "status":  "ok",
        "message": "Foreca API is running",
        "model":   metadata.get("model_name"),
        "version": metadata.get("version"),
    }


@app.get("/model-info", tags=["Info"], summary="Informasi model")
def model_info():
    if metadata is None:
        raise HTTPException(status_code=503, detail="Metadata belum dimuat")
    return metadata


@app.post(
    "/predict",
    response_model=PredictResponse,
    tags=["Forecasting"],
    summary="Prediksi penjualan 7 hari ke depan",
)
def predict(request: PredictRequest):
    try:
        df_input            = pd.DataFrame([r.model_dump() for r in request.data])
        df_input["Tanggal"] = pd.to_datetime(df_input["Tanggal"])
        df_input            = df_input.sort_values("Tanggal").reset_index(drop=True)

        result = run_inference(df_input)

        logger.info(
            f"Prediksi berhasil | last_date={result['last_date_in_data']} "
            f"| n_rows={len(request.data)}"
        )

        return {"status": "success", **result}

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
