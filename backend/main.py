from pathlib import Path
import math
import os
import pickle

import numpy as np
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


PROJECT_ROOT = Path(__file__).resolve().parent.parent
REGRESSION_MODEL_PATH = PROJECT_ROOT / "best_model.pkl"
CLASSIFICATION_MODEL_PATH = PROJECT_ROOT / "brightness_model.pkl"

# The saved regressor was trained only on rows with a non-zero LDR reading.
# Valid training voltages span 1.29 V to 4.99 V. At 5.00 V the sensor log's
# resistance conversion reaches zero, so those boundary rows were excluded.
MIN_VOLTAGE = 1.29
MAX_VOLTAGE = 4.99
for model_path in (REGRESSION_MODEL_PATH, CLASSIFICATION_MODEL_PATH):
    if not model_path.is_file():
        raise FileNotFoundError(
            f"The trained model was not found at {model_path}. "
            "Keep best_model.pkl and brightness_model.pkl in the project root."
        )

with REGRESSION_MODEL_PATH.open("rb") as model_file:
    regression_model = pickle.load(model_file)

with CLASSIFICATION_MODEL_PATH.open("rb") as model_file:
    classification_model = pickle.load(model_file)

if getattr(regression_model, "n_features_in_", None) != 1:
    raise ValueError("best_model.pkl must be a trained model that accepts one voltage feature.")
if getattr(classification_model, "n_features_in_", None) != 1:
    raise ValueError("brightness_model.pkl must accept one predicted LDR resistance feature.")

app = FastAPI(title="LDR Sensor API", version="1.0.0")
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    # JSON permits non-standard NaN/Infinity values in some clients. Replace
    # them in validation details so the 422 response itself remains valid JSON.
    errors = exc.errors()
    for error in errors:
        value = error.get("input")
        if isinstance(value, float) and not math.isfinite(value):
            error["input"] = str(value)
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})


class PredictRequest(BaseModel):
    voltage: float = Field(
        ge=MIN_VOLTAGE,
        le=MAX_VOLTAGE,
        allow_inf_nan=False,
        description="LDR divider voltage in volts, within the model's training range.",
    )


@app.get("/")
def home():
    return {
        "message": "LDR Sensor API is running.",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "regression_model": type(regression_model).__name__,
        "classification_model": type(classification_model).__name__,
        "brightness_categories": [str(label) for label in classification_model.classes_],
        "voltage_range": {"min": MIN_VOLTAGE, "max": MAX_VOLTAGE},
    }


@app.post("/predict")
def predict(req: PredictRequest):
    voltage_feature = np.array([[req.voltage]], dtype=float)
    predicted_ldr_value = float(regression_model.predict(voltage_feature)[0])
    resistance_feature = np.array([[predicted_ldr_value]], dtype=float)
    brightness = str(classification_model.predict(resistance_feature)[0])

    return {
        "voltage": req.voltage,
        "predicted_ldr_value": predicted_ldr_value,
        "brightness": brightness,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("LDR_API_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port)
