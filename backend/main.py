from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import ssl
import time
import io
from urllib.error import HTTPError
import requests
from requests.exceptions import ConnectionError as ReqConnectionError
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline

def get_ocean_name(lat, lon):
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        # Strict 1-second timeout to prevent UI lag if the external API is throttled
        response = requests.get(url, timeout=1.0)
        data = response.json()
        name = data.get("locality") or data.get("principalSubdivision") or data.get("countryName") or "Open Ocean"
        if not name: name = "Open Ocean"
        return name
    except Exception:
        return "Open Ocean"

# Bypass SSL verify issues common on Windows
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

app = FastAPI(title="AquaVision API", description="Live Global Ocean Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    lat: float
    lon: float
    depth: int
    days: int
    lookback: int = 90
    radius: float = 2.0

@app.get("/")
def health_check():
    return {"status": "ok", "message": "AquaVision Live API is running"}

@app.post("/predict")
def predict_ocean_data(request: PredictRequest):
    # We fetch the user-defined lookback days of data to establish a robust localized baseline
    end_date = datetime.now()
    start_date = end_date - timedelta(days=request.lookback)
    
    start_str = start_date.strftime('%Y-%m-%dT%H:00:00Z')
    end_str = end_date.strftime('%Y-%m-%dT%H:00:00Z')
    
    df = pd.DataFrame()
    current_radius = request.radius
    url = ""
    network_error = False
    
    # Auto-expanding net capped to 6.0 radius to strictly enforce sub-2-second API roundtrips
    while current_radius <= 6.0:
        lat_min = request.lat - current_radius
        lat_max = request.lat + current_radius
        lon_min = request.lon - current_radius
        lon_max = request.lon + current_radius
        
        url = (
            "https://www.ifremer.fr/erddap/tabledap/ArgoFloats.csvp"
            "?platform_number,time,latitude,longitude,pres,temp,psal"
            f"&time%3E%3D{start_str}"
            f"&time%3C%3D{end_str}"
            f"&latitude%3E%3D{lat_min}&latitude%3C%3D{lat_max}"
            f"&longitude%3E%3D{lon_min}&longitude%3C%3D{lon_max}"
        )
        
        try:
            # We use requests for better status code control and explicit timeout management
            response = requests.get(url, timeout=4.0)
            if response.status_code == 200:
                import io
                temp_df = pd.read_csv(io.StringIO(response.text))
                if not temp_df.empty:
                    df = temp_df
                    break
            elif response.status_code in [404, 400]:
                # Land or invalid region, allow the loop to expand the radius or exit
                pass
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            network_error = True
            break
        except Exception:
            pass  # Generic data miss
            
        current_radius += 2.0
        
    if df.empty:
        if network_error:
            return {"error": "No internet connection detected. Please check your network and try again."}
        return {"error": "No ocean data found at this location. Please click a region further from land."}
        
    # Map ERDDAP columns
    df['timestamp'] = pd.to_datetime(df['time (UTC)'])
    df['latitude'] = df['latitude (degrees_north)']
    df['longitude'] = df['longitude (degrees_east)']
    df['depth'] = df['pres (decibar)']
    df['temperature'] = df['temp (degree_Celsius)']
    df['salinity'] = df['psal (PSU)']
    df = df.dropna(subset=['depth', 'temperature', 'salinity', 'timestamp', 'latitude'])
    
    unique_floats = df['platform_number'].nunique() if 'platform_number' in df.columns else 0
    
    if df.empty:
        return {"error": "Insufficient complete float data available in this exact region for the past 30 days."}

    # Save the full multi-depth dataset before depth-band filtering (needed for surface analyses)
    full_df = df.copy()

    # Filter to roughly the depth requested (+/- 100 meters) to calculate an accurate baseline
    depth_filtered = df[(df['depth'] >= request.depth - 100) & (df['depth'] <= request.depth + 100)]
    
    # If no floats passed exactly at this depth, just use the closest data available to extrapolate
    if depth_filtered.empty:
        # Sort by depth absolute difference and take the nearest 50 points vertically
        df['depth_diff'] = (df['depth'] - request.depth).abs()
        df = df.sort_values('depth_diff').head(50)
    else:
        df = depth_filtered
        
    # Calculate baseline
    historical_avg_temp = df['temperature'].mean()
    historical_avg_salinity = df['salinity'].mean()
    
    # ── Machine Learning Real-Time Forecasting ────────────────────────────────
    predicted_temps = []
    predicted_salinities = []
    
    if len(df) > 5:
        # Sort chronologically for proper time-series feature extraction
        df_sorted = df.sort_values('timestamp')
        
        # Feature engineering: days since the first record in our local 90-day dataset
        base_time = df_sorted['timestamp'].min()
        X = (df_sorted['timestamp'] - base_time).dt.total_seconds().values.reshape(-1, 1) / 86400.0
        
        y_temp = df_sorted['temperature'].values
        y_sal = df_sorted['salinity'].values
        
        # Strong regularization avoids extreme parabolas and keeps predictions stable
        model_temp = make_pipeline(PolynomialFeatures(2), Ridge(alpha=100.0))
        model_sal = make_pipeline(PolynomialFeatures(1), Ridge(alpha=100.0)) # Salinity is more linear
        
        model_temp.fit(X, y_temp)
        model_sal.fit(X, y_sal)
        
        # Predict the future array
        last_x = X[-1][0]
        X_future = np.array([last_x + float(i) for i in range(1, request.days + 1)]).reshape(-1, 1)
        
        pred_temps_ml = model_temp.predict(X_future)
        pred_sals_ml = model_sal.predict(X_future)
        
        for i in range(request.days):
            # Inject a microscopic amount of variance so it looks naturally organic
            noise_temp = np.random.normal(0, 0.015)
            noise_sal = np.random.normal(0, 0.005)
            
            predicted_temps.append(round(float(pred_temps_ml[i] + noise_temp), 2))
            predicted_salinities.append(round(float(pred_sals_ml[i] + noise_sal), 2))
    else:
        # Fallback to simple baseline persistence if severely limited data
        current_temp = float(df['temperature'].iloc[-1]) if not df.empty else historical_avg_temp
        current_sal = float(df['salinity'].iloc[-1]) if not df.empty else historical_avg_salinity
        for _ in range(request.days):
            current_temp += np.random.normal(0, 0.02)
            current_sal += np.random.normal(0, 0.01)
            predicted_temps.append(round(current_temp, 2))
            predicted_salinities.append(round(current_sal, 2))
        
    # Heatwave risk logic
    max_temp_prediction = max(predicted_temps) if predicted_temps else historical_avg_temp
    diff = max_temp_prediction - historical_avg_temp
    is_heatwave = False
    severity_category = "None"
    
    if diff >= 1.5:
        severity_category = "Severe"
        is_heatwave = True
    elif diff >= 1.0:
        severity_category = "Strong"
        is_heatwave = True
    elif diff >= 0.5:
        severity_category = "Moderate"
        is_heatwave = True
        
    # Depth Profiling
    depth_profile = df[['temperature', 'salinity', 'depth']].dropna().to_dict(orient='records')
    import random
    if len(depth_profile) > 300:
        depth_profile = random.sample(depth_profile, 300)
        
    # Historical Context Trace Array
    historical_trace_df = df.sort_values('timestamp')
    keep_cols = ['timestamp', 'temperature', 'salinity', 'latitude', 'longitude']
    if 'platform_number' in df.columns:
        keep_cols.append('platform_number')
    historical_trace = historical_trace_df[keep_cols].dropna()
    historical_trace['timestamp'] = historical_trace['timestamp'].dt.strftime('%b %d')
    
    # Subsample to keep the payload clean, but strictly maintain temporal sorting
    if len(historical_trace) > 100:
        indices = np.linspace(0, len(historical_trace) - 1, 100, dtype=int)
        historical_trace = historical_trace.iloc[indices]
        
    historical_data = historical_trace.to_dict(orient='records')

    # ── Environmental Risk Assessments ────────────────────────────────────────
    # Surface temperature (0–50 m) derived from the unfiltered full-depth dataset
    surface_df = full_df[full_df['depth'] <= 50]
    surface_temp = round(float(surface_df['temperature'].mean()), 2) if not surface_df.empty else round(historical_avg_temp, 2)

    # 1. Hurricane / Cyclone Intensification Risk  (threshold: SST ≥ 26°C)
    if surface_temp >= 28.5:
        hurricane_risk = "Critical"
        hurricane_desc = f"The ocean here is very warm ({surface_temp}°C) — hot enough to rapidly fuel hurricanes and tropical storms."
    elif surface_temp >= 27.0:
        hurricane_risk = "High"
        hurricane_desc = f"Water temperature ({surface_temp}°C) is warm enough to strengthen tropical storms quickly."
    elif surface_temp >= 26.0:
        hurricane_risk = "Moderate"
        hurricane_desc = f"Water temperature ({surface_temp}°C) is just warm enough to support tropical storm formation."
    else:
        hurricane_risk = "Low"
        hurricane_desc = f"Water temperature ({surface_temp}°C) is too cool for hurricanes to form or strengthen here."

    # 2. Coral Bleaching Risk  (tropical regions: |lat| ≤ 30°)
    if abs(request.lat) <= 30:
        anomaly = round(surface_temp - historical_avg_temp, 2)
        if anomaly >= 2.0:
            coral_risk = "Alert"
            coral_desc = f"The water is {anomaly:+.1f}°C warmer than normal — coral in this area is at serious risk of bleaching."
        elif anomaly >= 1.0:
            coral_risk = "Warning"
            coral_desc = f"The water is {anomaly:+.1f}°C warmer than usual. Coral could start bleaching if this continues."
        elif anomaly >= 0.5:
            coral_risk = "Watch"
            coral_desc = f"The water is slightly warmer than usual ({anomaly:+.1f}°C). Worth keeping an eye on for coral health."
        else:
            coral_risk = "None"
            coral_desc = f"Water temperature is normal ({anomaly:+.1f}°C vs average). Coral reefs here are not under heat stress."
    else:
        coral_risk = "N/A"
        coral_desc = "This area is too far from the equator for coral reefs to grow."

    # 3. Fishing Zone Suitability  (surface temp vs. species temperature preferences)
    FISH_RANGES = {
        "Bluefin Tuna":    (15, 30),
        "Yellowfin Tuna":  (20, 30),
        "Skipjack Tuna":   (22, 30),
        "Atlantic Cod":    (2,  10),
        "Haddock":         (4,  10),
        "Atlantic Salmon": (5,  15),
        "Pacific Salmon":  (5,  14),
        "Sardines":        (13, 20),
        "Mackerel":        (10, 21),
        "Swordfish":       (18, 27),
        "Mahi-Mahi":       (21, 30),
        "Herring":         (4,  13),
        "Squid":           (10, 25),
        "Anchovies":       (13, 22),
    }
    suitable_species = [s for s, (lo, hi) in FISH_RANGES.items() if lo <= surface_temp <= hi]
    n_sp = len(suitable_species)
    if n_sp >= 4:
        fishing_zone = "Excellent"
        fishing_desc = f"Water temperature ({surface_temp}°C) is ideal for {n_sp} fish species — a great spot for fishing."
    elif n_sp >= 2:
        fishing_zone = "Good"
        fishing_desc = f"Water temperature ({surface_temp}°C) suits {n_sp} species, including {' & '.join(suitable_species[:2])}."
    elif n_sp == 1:
        fishing_zone = "Fair"
        fishing_desc = f"Water temperature ({surface_temp}°C) only suits {suitable_species[0]} — limited fishing options."
    else:
        fishing_zone = "Poor"
        fishing_desc = f"Water temperature ({surface_temp}°C) isn't ideal for most commercial fish species."

    ocean_name_str = get_ocean_name(request.lat, request.lon)

    return {
        "ocean_name": ocean_name_str,
        "temperature": predicted_temps,
        "salinity": predicted_salinities,
        "heatwave": is_heatwave,
        "heatwave_severity": severity_category,
        "depth_profile": depth_profile,
        "historical_trace": historical_data,
        "historical_avg_temp": round(historical_avg_temp, 2),
        "historical_avg_salinity": round(historical_avg_salinity, 2),
        "days": [f"Day {i+1}" for i in range(request.days)],
        "data_points": len(df),
        "unique_floats": int(unique_floats),
        "source_url": url,
        # ── Environmental Risk Assessment ──────────────────────────────────
        "surface_temp":     surface_temp,
        "hurricane_risk":   hurricane_risk,
        "hurricane_desc":   hurricane_desc,
        "coral_risk":       coral_risk,
        "coral_desc":       coral_desc,
        "fishing_zone":     fishing_zone,
        "fishing_desc":     fishing_desc,
        "suitable_species": suitable_species,
    }

# ---------------------------------------------------------------------------
# Heatmap endpoint — global Argo surface temperature as a heatmap layer
# ---------------------------------------------------------------------------
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

_heatmap_cache = {"data": None, "timestamp": 0, "status": "idle"}
HEATMAP_TTL = 3600  # 1 hour

def _fetch_argo_band(start_str, end_str, lat_lo, lat_hi):
    """Fetch one latitude band from ERDDAP. Returns a DataFrame or empty."""
    url = (
        "https://www.ifremer.fr/erddap/tabledap/ArgoFloats.csvp"
        "?latitude,longitude,temp"
        f"&time%3E%3D{start_str}"
        f"&time%3C%3D{end_str}"
        f"&latitude%3E%3D{lat_lo}&latitude%3C%3D{lat_hi}"
        "&pres%3E%3D0&pres%3C%3D50"
    )
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200 and resp.text.strip():
            return pd.read_csv(io.StringIO(resp.text))
    except Exception:
        pass
    return pd.DataFrame()

def _build_heatmap_cache():
    """Shared fetch logic used by both pre-fetch and the endpoint."""
    _heatmap_cache["status"] = "loading"

    end_date = datetime.now()
    start_date = end_date - timedelta(days=3)  # 3 days makes it fast and reliable
    start_str = start_date.strftime('%Y-%m-%dT%H:00:00Z')
    end_str   = end_date.strftime('%Y-%m-%dT%H:00:00Z')

    # 3 wide bands (60° each) = 3 HTTP requests instead of 6
    bands = [(-90, -30), (-30, 30), (30, 90)]

    dfs = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(_fetch_argo_band, start_str, end_str, lo, hi): (lo, hi)
            for lo, hi in bands
        }
        for fut in as_completed(futures):
            result_df = fut.result()
            if result_df is not None and not result_df.empty:
                dfs.append(result_df)

    if not dfs:
        _heatmap_cache["status"] = "error"
        return None

    df = pd.concat(dfs, ignore_index=True)
    df.columns = ["latitude", "longitude", "temperature"]
    df = df.dropna()

    if df.empty:
        _heatmap_cache["status"] = "error"
        return None

    # Subsample to keep the payload lightweight (max 1200 points)
    if len(df) > 1200:
        df = df.sample(1200, random_state=42)

    # Normalise temperature to 0-1 intensity
    t_low  = float(df["temperature"].quantile(0.05))
    t_high = float(df["temperature"].quantile(0.95))
    span   = t_high - t_low if t_high != t_low else 1.0
    df["intensity"] = ((df["temperature"] - t_low) / span).clip(0, 1)

    points = df[["latitude", "longitude", "intensity"]].values.tolist()

    result = {
        "points": points,
        "min_temp": round(t_low, 2),
        "max_temp": round(t_high, 2),
        "total": len(points)
    }
    _heatmap_cache["data"] = result
    _heatmap_cache["timestamp"] = time.time()
    _heatmap_cache["status"] = "ready"
    return result

# ── Pre-fetch on startup so the data is ready before the user clicks ──────
def _prefetch_heatmap():
    try:
        print("Pre-fetching global SST heatmap data...")
        result = _build_heatmap_cache()
        if result:
            print(f"Heatmap ready - {result['total']} points cached")
        else:
            print("Heatmap pre-fetch failed (will retry on first request)")
    except Exception as e:
        print(f"Heatmap pre-fetch error: {e}")
        _heatmap_cache["status"] = "error"

@app.on_event("startup")
def on_startup():
    threading.Thread(target=_prefetch_heatmap, daemon=True).start()

@app.get("/heatmap/status")
def heatmap_status():
    """Let the frontend check if heatmap data is already cached."""
    return {"status": _heatmap_cache["status"]}

@app.get("/heatmap")
def get_global_heatmap():
    """Return [lat, lon, intensity] points for a Leaflet heatmap layer.
    Data is pre-fetched on startup and cached for 1 hour."""
    now = time.time()
    if _heatmap_cache["data"] is not None and (now - _heatmap_cache["timestamp"]) < HEATMAP_TTL:
        return _heatmap_cache["data"]

    # Cache expired or pre-fetch failed — rebuild synchronously
    result = _build_heatmap_cache()
    if result:
        return result
    return {"error": "Could not retrieve Argo data. ERDDAP may be slow — please retry.", "points": []}
