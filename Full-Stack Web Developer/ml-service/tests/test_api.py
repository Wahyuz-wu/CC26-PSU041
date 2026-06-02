import datetime
import numpy as np
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest


def _make_dummy_records(n: int = 30) -> list[dict]:
    base = datetime.date(2024, 1, 1)
    records = []
    for i in range(n):
        d = base + datetime.timedelta(days=i)
        records.append({
            "Tanggal":         d.strftime("%Y-%m-%d"),
            "Total":           float(1_000_000 + i * 10_000),
            "Jumlah_Order":    float(10 + i),
            "Transaksi_Count": float(8 + i),
            "Unique_Produk":   float(5 + i % 3),
            "Hari_Ke":         i + 1,
            "y":               float(1_000_000 + i * 10_000),
            "lag_1":           float(990_000 + i * 10_000),
            "lag_7":           float(930_000 + i * 10_000),
            "roll7_mean":      float(1_000_000 + i * 9_000),
            "roll7_std":       float(50_000),
            "roll14_mean":     float(980_000 + i * 9_000),
            "is_zero_day":     0,
        })
    return records


DUMMY_METADATA = {
    "model_name":      "Foreca_CNN_LSTM",
    "version":         "1.0.0",
    "lookback":        30,
    "horizon":         7,
    "n_features":      12,
    "feature_columns": [
        "Total", "Jumlah_Order", "Transaksi_Count", "Unique_Produk",
        "Hari_Ke", "y", "lag_1", "lag_7",
        "roll7_mean", "roll7_std", "roll14_mean", "is_zero_day",
    ],
    "trained_at":  "2026-05-17T08:40:34.558166",
    "mae_scaled":  0.029,
    "mae_rupiah":  3722839.29,
    "rmse_rupiah": 5171270.66,
}


@pytest.fixture(scope="module")
def client():
    mock_model = MagicMock()
    mock_model.predict.return_value = np.array([[0.1, 0.2, 0.15, 0.3, 0.25, 0.18, 0.22]])

    mock_scaler_X = MagicMock()
    mock_scaler_X.transform.side_effect = lambda x: x

    mock_scaler_y = MagicMock()
    mock_scaler_y.inverse_transform.side_effect = (
        lambda x: np.array([[1_500_000], [1_600_000], [1_700_000],
                             [1_800_000], [1_900_000], [2_000_000], [2_100_000]])
    )

    with (
        patch("main.model",    mock_model),
        patch("main.scaler_X", mock_scaler_X),
        patch("main.scaler_y", mock_scaler_y),
        patch("main.metadata", DUMMY_METADATA),
    ):
        import importlib
        import main as app_module
        importlib.reload(app_module)

        app_module.model    = mock_model
        app_module.scaler_X = mock_scaler_X
        app_module.scaler_y = mock_scaler_y
        app_module.metadata = DUMMY_METADATA

        with TestClient(app_module.app) as c:
            yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        assert client.get("/health").status_code == 200

    def test_health_response_structure(self, client):
        data = client.get("/health").json()
        assert data["status"] == "ok"
        assert "model" in data
        assert "version" in data
        assert "message" in data

    def test_health_model_name(self, client):
        assert client.get("/health").json()["model"] == "Foreca_CNN_LSTM"

    def test_health_version(self, client):
        assert client.get("/health").json()["version"] == "1.0.0"


class TestModelInfoEndpoint:
    def test_model_info_returns_200(self, client):
        assert client.get("/model-info").status_code == 200

    def test_model_info_no_mape(self, client):
        assert "mape_pct" not in client.get("/model-info").json()

    def test_model_info_has_required_keys(self, client):
        required = {"model_name", "version", "lookback", "horizon",
                    "n_features", "feature_columns", "trained_at",
                    "mae_scaled", "mae_rupiah", "rmse_rupiah"}
        assert required.issubset(client.get("/model-info").json().keys())

    def test_model_info_feature_count(self, client):
        data = client.get("/model-info").json()
        assert len(data["feature_columns"]) == 12
        assert data["n_features"] == 12

    def test_model_info_horizon(self, client):
        assert client.get("/model-info").json()["horizon"] == 7

    def test_model_info_lookback(self, client):
        assert client.get("/model-info").json()["lookback"] == 30


class TestPredictEndpointHappyPath:
    def test_predict_returns_200(self, client):
        assert client.post("/predict", json={"data": _make_dummy_records(30)}).status_code == 200

    def test_predict_response_status_success(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        assert data["status"] == "success"

    def test_predict_response_has_forecast(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        assert isinstance(data.get("forecast"), list)

    def test_predict_forecast_length_is_7(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        assert len(data["forecast"]) == 7

    def test_predict_forecast_item_structure(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        for item in data["forecast"]:
            assert "tanggal" in item
            assert "prediksi_total" in item

    def test_predict_forecast_dates_are_sequential(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        dates = [datetime.date.fromisoformat(item["tanggal"]) for item in data["forecast"]]
        for i in range(1, len(dates)):
            assert dates[i] == dates[i - 1] + datetime.timedelta(days=1)

    def test_predict_prediksi_total_non_negative(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        for item in data["forecast"]:
            assert item["prediksi_total"] >= 0

    def test_predict_last_date_in_data_present(self, client):
        data = client.post("/predict", json={"data": _make_dummy_records(30)}).json()
        assert "last_date_in_data" in data

    def test_predict_last_date_correct(self, client):
        records = _make_dummy_records(30)
        data = client.post("/predict", json={"data": records}).json()
        assert data["last_date_in_data"] == records[-1]["Tanggal"]

    def test_predict_more_than_30_rows_accepted(self, client):
        assert client.post("/predict", json={"data": _make_dummy_records(45)}).status_code == 200

    def test_predict_without_is_zero_day_field(self, client):
        records = _make_dummy_records(30)
        for r in records:
            r.pop("is_zero_day", None)
        assert client.post("/predict", json={"data": records}).status_code == 200


class TestPredictEndpointValidation:
    def test_predict_less_than_30_rows_returns_422(self, client):
        assert client.post("/predict", json={"data": _make_dummy_records(29)}).status_code == 422

    def test_predict_empty_data_returns_422(self, client):
        assert client.post("/predict", json={"data": []}).status_code == 422

    def test_predict_negative_total_returns_422(self, client):
        records = _make_dummy_records(30)
        records[0]["Total"] = -1000.0
        assert client.post("/predict", json={"data": records}).status_code == 422

    def test_predict_negative_jumlah_order_returns_422(self, client):
        records = _make_dummy_records(30)
        records[0]["Jumlah_Order"] = -5.0
        assert client.post("/predict", json={"data": records}).status_code == 422

    def test_predict_negative_transaksi_count_returns_422(self, client):
        records = _make_dummy_records(30)
        records[0]["Transaksi_Count"] = -1.0
        assert client.post("/predict", json={"data": records}).status_code == 422

    def test_predict_missing_required_field_returns_422(self, client):
        records = _make_dummy_records(30)
        for r in records:
            r.pop("Total")
        assert client.post("/predict", json={"data": records}).status_code == 422

    def test_predict_invalid_json_returns_422(self, client):
        resp = client.post("/predict", content=b"not json",
                           headers={"Content-Type": "application/json"})
        assert resp.status_code == 422

    def test_predict_missing_data_key_returns_422(self, client):
        assert client.post("/predict", json={"records": []}).status_code == 422


class TestSecurityHeaders:
    def test_x_content_type_options(self, client):
        assert client.get("/health").headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self, client):
        assert client.get("/health").headers.get("x-frame-options") == "DENY"

    def test_referrer_policy(self, client):
        assert client.get("/health").headers.get("referrer-policy") == "no-referrer"


class TestNotFound:
    def test_unknown_route_returns_404(self, client):
        assert client.get("/unknown-endpoint").status_code == 404

    def test_get_predict_not_allowed(self, client):
        assert client.get("/predict").status_code == 405
