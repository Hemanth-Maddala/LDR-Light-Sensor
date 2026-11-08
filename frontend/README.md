# Lumen frontend

This React app accepts an Arduino A0 voltage, calls the LDR prediction API, and displays the estimated resistance and circuit-based brightness state.

## Development

From this directory, run:

```powershell
npm install
npm run dev
```

Start the backend as described in the [project README](../README.md). Vite proxies `/health` and `/predict` to `http://127.0.0.1:8000` by default. To use another local backend port, set `LDR_API_PROXY_TARGET` before starting Vite.

## Production build

```powershell
npm run build
```

For a separately hosted API, set `VITE_API_BASE_URL` to the API's base URL before building and set `CORS_ORIGINS` for the backend.
