# 🌊 AquaVision — Ocean & Climate Intelligence Platform

A full-stack AI-powered web application for **global ocean prediction** using live Argo float data from IFREMER ERDDAP.

![AquaVision Preview](image.png)

![Graph Preview](image-1.png)

---

## ✨ Features

- **Global Ocean Forecasting** — Click anywhere on the world map to generate temperature & salinity forecasts
- **Live ARGO Data** — Pulls real-time data from IFREMER's ERDDAP database (no mock data)
- **Marine Heatwave Detection** — Three severity tiers: Moderate (Amber), Strong (Orange), and Severe (Red)
- **Depth Thermocline Profile** — Visualizes how temperature changes with ocean depth
- **Historical Temperature Tracking** — Charts actual float-recorded temperatures over the past 90 days
- **Auto-Expanding Search** — Dynamically widens the search radius up to 6° to find nearby float data
- **Reverse Geocoding** — Labels forecast results with the geographic ocean/region name
- **Dark / Light Mode** — Toggle with persisted preference

---

## 🏗️ Architecture

```
AquaVision/
├── backend/
│   └── main.py              # FastAPI server — data fetching, prediction, heatwave logic
├── frontend/
│   └── src/
│       ├── App.jsx           # Main app — controls, state management, API calls
│       ├── components/
│       │   ├── MapComponent.jsx   # Interactive Leaflet world map
│       │   └── Dashboard.jsx      # Charts (Chart.js), heatwave banners, stats
│       ├── index.css         # Global styles — dark/light themes, responsive design
│       └── main.jsx          # React entry point
├── start_backend.bat         # One-click backend launcher
├── start_frontend.bat        # One-click frontend launcher
└── requirements.txt          # Python dependencies
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Vite, Leaflet.js, Chart.js, Axios |
| **Backend** | FastAPI, Uvicorn |
| **Data & ML** | Pandas, NumPy, IFREMER ERDDAP (live ARGO float data) |
| **Styling** | Custom CSS, Plus Jakarta Sans, Glassmorphism UI |

---

## 🚀 Setup & Run

### Prerequisites
- Python 3.8+
- Node.js v18+

### Launch

**1. Start the Backend**
Double-click `start_backend.bat` or run from terminal.
→ API available at **http://localhost:8012**

**2. Start the Frontend**
Double-click `start_frontend.bat` or run from terminal.
→ UI available at **http://localhost:5173**

**3. Open your browser** and navigate to `http://localhost:5173`

---

## 📖 How It Works

1. **Select a location** — Click anywhere on the interactive global ocean map
2. **Configure parameters** — Set depth (0–2000m), prediction horizon (1–30 days), and historical lookback (30–180 days)
3. **Generate Forecast** — The backend fetches live ARGO float data from the selected region, calculates a statistical baseline, and generates predicted temperature & salinity trends
4. **View Results** — Interactive charts display forecasts, depth profiles, historical data, and heatwave risk assessment
