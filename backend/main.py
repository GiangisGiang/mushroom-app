import json
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Mushroom Classifier API")

ART = Path("artifacts")
MODEL_PATH = ART / "best_model.joblib"
SCHEMA_PATH = ART / "schema_vi.json"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://mushroom-dok.pages.dev",
    ],
    allow_origin_regex=r"^https:\/\/([a-z0-9-]+\.)?mushroom-dok\.pages\.dev$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model + schema lúc khởi động
model = joblib.load(MODEL_PATH)
schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

FEATURES = [f["name"] for f in schema["features"]]
LABELS = schema.get("labels", {"e": "Ăn được", "p": "Độc"})

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/schema")
def get_schema():
    # React sẽ dùng schema này để render dropdown + mô tả
    return schema

@app.post("/predict")
def predict(payload: dict):
    # payload mong đợi: {"odor":"n", "gill-size":"b", ...} (value code)
    missing = [f for f in FEATURES if f not in payload or payload[f] in (None, "")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing fields: {missing}")

    # Tạo DataFrame 1 dòng theo đúng features
    X = pd.DataFrame([{f: str(payload[f]) for f in FEATURES}])

    pred = model.predict(X)[0]  # 'e' hoặc 'p'
    result = {
        "class": str(pred),
        "label": LABELS.get(str(pred), str(pred))
    }

    # Nếu model có predict_proba thì trả thêm confidence
    if hasattr(model, "predict_proba"):
        try:
            proba = float(model.predict_proba(X).max())
            result["confidence"] = proba
        except Exception:
            pass
    return result
