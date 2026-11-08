# LDR Sensor Analysis

This project estimates LDR resistance from an Arduino voltage reading, then classifies the estimated resistance as High Brightness, Brightness, or Dark using a separately trained classifier.

## Run the app

Use Python 3.10 or newer and Node.js 20.19+ (or 22.12+).

1. Install the backend packages from the project root:

   ```powershell
   python -m pip install -r backend/requirements.txt
   ```

2. Start the API from the project root:

   ```powershell
   python backend/main.py
   ```

   The API runs at `http://127.0.0.1:8000`. Its interactive documentation is at `http://127.0.0.1:8000/docs`.
   or uvicorn main:app --host 127.0.0.1 --port 8000 reload

3. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the local URL printed by Vite. Its development server proxies `/health` and `/predict` to the API.

If port 8000 is already in use, choose another port for both processes. In PowerShell, set `$env:LDR_API_PORT = "8001"` before starting the backend and `$env:LDR_API_PROXY_TARGET = "http://127.0.0.1:8001"` before starting Vite.

For a separately hosted frontend, set `VITE_API_BASE_URL` to the backend's base URL before building and set the backend's `CORS_ORIGINS` environment variable to the frontend origin (or a comma-separated list of allowed origins).

## Sensor interpretation

The saved regressor was trained on valid readings from `data.txt`. Its supported input range is 1.29–4.99 V; 5.00 V readings have a zero LDR value and were excluded from training. Inputs outside the valid training range are rejected.

With the divider wiring shown, more light lowers the LDR resistance and raises the A0 voltage. The classifier uses resistance terciles from the valid dataset: High Brightness at or below 4,281.34 Ω, Brightness above 4,281.34 Ω through 6,230.53 Ω, and Dark above 6,230.53 Ω. The backend predicts resistance first, then passes that value to `brightness_model.pkl`. These are dataset-relative categories, not calibrated lux readings.

The web page accepts a voltage entered by the user. It does not currently read an Arduino over USB/serial; use the Arduino's A0 reading as the input.

## Retrain or inspect the model

Open `ldr_analysis.ipynb` from the project root. Install its analysis dependencies first:

```powershell
python -m pip install -r analysis-requirements.txt
```

The notebook uses a time-ordered holdout for regression evaluation, selects the model with the lowest holdout RMSE, and saves the final regressor as `best_model.pkl`. It also trains and saves the resistance-based classifier as `brightness_model.pkl`. Keep both files in the project root and use the same scikit-learn version; the backend requirements pin the version used for these artifacts.
