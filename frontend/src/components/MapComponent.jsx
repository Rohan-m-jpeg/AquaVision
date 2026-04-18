import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Rectangle, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import HeatmapLayer from './HeatmapLayer';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationSelector({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapComponent({ position, setPosition, predictionData, radius = 4.0 }) {
  const center = [20, 0];

  // Heatmap state
  const [heatmapVisible, setHeatmapVisible]   = useState(false);
  const [heatmapPoints, setHeatmapPoints]     = useState(null);
  const [heatmapMeta,   setHeatmapMeta]       = useState(null);
  const [heatmapStatus, setHeatmapStatus]     = useState('idle'); // idle | precached | loading | ready | error
  const statusPollRef = useRef(null);

  // Poll backend to see if heatmap data has been pre-fetched
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await axios.get('https://aquavision-abj8.onrender.com/heatmap/status', { timeout: 2000 });
        if (!cancelled && res.data.status === 'ready') {
          setHeatmapStatus(prev => (prev === 'idle' ? 'precached' : prev));
          return; // stop polling
        }
      } catch { /* backend not up yet */ }
      if (!cancelled) statusPollRef.current = setTimeout(poll, 3000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(statusPollRef.current); };
  }, []);

  const toggleHeatmap = useCallback(async () => {
    // If already loaded, just toggle visibility
    if (heatmapPoints) {
      setHeatmapVisible(v => !v);
      return;
    }

    // Fetch from backend (instant if pre-cached)
    setHeatmapStatus('loading');
    setHeatmapVisible(true);

    try {
      const res = await axios.get('https://aquavision-abj8.onrender.com/heatmap', { timeout: 45000 });
      if (res.data.error || !res.data.points?.length) {
        setHeatmapStatus('error');
        return;
      }
      setHeatmapPoints(res.data.points);
      setHeatmapMeta({ min: res.data.min_temp, max: res.data.max_temp, total: res.data.total });
      setHeatmapStatus('ready');
    } catch {
      setHeatmapStatus('error');
    }
  }, [heatmapPoints]);

  // Button label
  const btnLabel = () => {
    if (heatmapStatus === 'loading') return '⏳ Loading...';
    if (heatmapVisible && heatmapPoints)  return '🌡️ Hide Heatmap';
    if (heatmapStatus === 'precached')    return '🌡️ SST Heatmap  ●';
    return '🌡️ SST Heatmap';
  };

  return (
    <div style={{ padding: 0, overflow: 'hidden', borderRadius: '20px', position: 'relative' }}>

      {/* ── Heatmap toggle button ─────────────────────────────────── */}
      <button
        id="heatmap-toggle-btn"
        onClick={toggleHeatmap}
        disabled={heatmapStatus === 'loading'}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          background: heatmapVisible && heatmapPoints
            ? 'linear-gradient(135deg, #d73027 0%, #a50026 100%)'
            : 'linear-gradient(135deg, #1a2332dd 0%, #243044dd 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '12px',
          padding: '8px 16px',
          fontSize: '0.8rem',
          fontWeight: '700',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          cursor: heatmapStatus === 'loading' ? 'wait' : 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          letterSpacing: '0.3px',
          transition: 'all 0.25s ease',
        }}
      >
        {btnLabel()}
      </button>

      {/* ── Heatmap legend ────────────────────────────────────────── */}
      {heatmapVisible && heatmapStatus === 'ready' && heatmapMeta && (
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '12px',
            zIndex: 1000,
            background: 'rgba(18,27,42,0.88)',
            borderRadius: '12px',
            padding: '10px 14px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            minWidth: '180px',
          }}
        >
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.75rem', marginBottom: '8px', letterSpacing: '0.4px' }}>
            🌡️ Sea Surface Temperature
          </div>
          {/* gradient bar */}
          <div style={{
            height: '10px',
            borderRadius: '6px',
            background: 'linear-gradient(to right, #313695, #4575b4, #74add1, #ffffbf, #f46d43, #d73027, #a50026)',
            marginBottom: '6px',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bfc8d6', fontSize: '0.7rem', fontWeight: '600' }}>
            <span>Cold {heatmapMeta.min}°C</span>
            <span>Hot {heatmapMeta.max}°C</span>
          </div>
          <div style={{ color: '#7a8a9e', fontSize: '0.65rem', marginTop: '6px' }}>
            {heatmapMeta.total?.toLocaleString()} Argo float readings · Last 30 days
          </div>
        </div>
      )}

      {/* ── Error notice ─────────────────────────────────────────── */}
      {heatmapStatus === 'error' && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
          background: 'rgba(185,28,28,0.9)', color: '#fff', borderRadius: '10px',
          padding: '8px 14px', fontSize: '0.75rem', fontWeight: '600',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          ⚠️ Could not load heatmap data
          <button
            onClick={() => { setHeatmapStatus('idle'); setHeatmapPoints(null); toggleHeatmap(); }}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: '6px', padding: '3px 10px', fontSize: '0.7rem',
              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
          <button
            onClick={() => setHeatmapStatus('idle')}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              cursor: 'pointer', fontSize: '0.85rem', padding: '0 2px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: '520px', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB Positron</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Heatmap layer */}
        {heatmapPoints && (
          <HeatmapLayer points={heatmapPoints} visible={heatmapVisible} />
        )}

        <LocationSelector position={position} setPosition={setPosition} />

        {predictionData && position && (
          <Rectangle
            bounds={[
              [position.lat - radius, position.lng - radius],
              [position.lat + radius, position.lng + radius]
            ]}
            pathOptions={{ color: '#2d9c6f', weight: 2, dashArray: '6, 8', fillOpacity: 0.04, fillColor: '#2d9c6f' }}
          />
        )}

        {predictionData && predictionData.historical_trace && predictionData.historical_trace.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt.latitude, pt.longitude]}
            radius={4}
            pathOptions={{ color: '#2d9c6f', fillColor: '#2d9c6f', fillOpacity: 0.7, weight: 1.5 }}
          >
            <Popup>
              <div style={{ padding: '6px', textAlign: 'center', minWidth: '150px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <div style={{ background: '#1a2332', color: '#38d99a', padding: '6px 12px', borderRadius: '10px', marginBottom: '10px', fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.3px' }}>
                  Float #{pt.platform_number || 'Unknown'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7b8d', marginBottom: '6px' }}>
                  <strong>Recorded:</strong> {pt.timestamp}
                </div>
                <div style={{ fontSize: '1.3rem', color: '#e8734a', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  {pt.temperature.toFixed(2)} °C
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ba8b4', borderTop: '1px solid #eef2f0', paddingTop: '6px' }}>
                  Source: IFREMER ERDDAP
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
