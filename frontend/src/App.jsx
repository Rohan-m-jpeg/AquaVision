import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import Dashboard from './components/Dashboard';

function App() {
  const [position, setPosition] = useState(null);
  const [depth, setDepth] = useState(10);
  const [days, setDays] = useState(7);
  const [lookback, setLookback] = useState(90);
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('map');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('aquavision_dark_mode');
    return saved === 'true';
  });

  const mapRef = useRef(null);
  const dashboardRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aquavision_dark_mode', darkMode);
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  useEffect(() => {
    if (predictionData) {
      setTimeout(() => {
        document.getElementById('dashboard-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [predictionData]);

  const scrollTo = (ref, section) => {
    setActiveSection(section);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePredict = async () => {
    if (!position) {
      setError("Please select a location on the map first.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8012/predict', {
        lat: position.lat,
        lon: position.lng,
        depth: depth,
        days: days,
        lookback: lookback,
        radius: 4.0
      });
      
      if (response.data.error) {
        setError(response.data.error);
        setPredictionData(null);
      } else {
        setPredictionData(response.data);
      }
    } catch (err) {
      setError("Failed to connect to the prediction API. Ensure the backend is running.");
      setPredictionData(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sidebar — functional scroll navigation */}
      <nav className="sidebar">
        <button
          className={`sidebar-icon ${activeSection === 'map' ? 'active' : ''}`}
          title="Map & Controls"
          onClick={() => scrollTo(mapRef, 'map')}
        >🗺️</button>
        <button
          className={`sidebar-icon ${activeSection === 'dashboard' ? 'active' : ''}`}
          title="Forecast Dashboard"
          onClick={() => { if (dashboardRef.current) scrollTo(dashboardRef, 'dashboard'); }}
        >📊</button>
      </nav>

      {/* Main Content */}
      <div className="app-container">
        <header className="app-header">
          <div className="header-empty"></div>
          <h1 className="logo-text">AquaVision</h1>
          <div className="header-right">
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </header>

        <div className="dashboard-grid" ref={mapRef}>
          
          {/* Left Column: Controls */}
          <div className="white-card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <h2 className="card-title">Forecast Parameters</h2>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <div className="label-container">
                <span>Depth Level</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <input 
                  type="range" 
                  min="0" max="2000" step="10" 
                  value={depth} 
                  onChange={(e) => setDepth(parseInt(e.target.value))} 
                />
                <span className="dark-pill">{depth}m</span>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div className="label-container">
                <span>Prediction Horizon</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <input 
                  type="range" 
                  min="1" max="30" step="1" 
                  value={days} 
                  onChange={(e) => setDays(parseInt(e.target.value))} 
                />
                <span className="dark-pill">{days}d</span>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div className="label-container">
                <span>Historical Lookback</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <input 
                  type="range" 
                  min="30" max="180" step="10" 
                  value={lookback} 
                  onChange={(e) => setLookback(parseInt(e.target.value))} 
                />
                <span className="dark-pill">{lookback} Days</span>
              </div>
            </div>

            <button 
              className="btn-primary"
              onClick={handlePredict}
              disabled={loading}
            >
              {loading ? 'Analyzing Data...' : 'Generate Forecast'}
            </button>

            {error && <p className="error-text">{error}</p>}
          </div>

          {/* Right Column: Map */}
          <div>
            <div className="white-card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                <h2 className="card-title">Select Ocean Region</h2>
                {position && (
                  <span className="dark-pill" style={{ letterSpacing: '0.5px' }}>
                    📍 {position.lat.toFixed(3)}° , {position.lng.toFixed(3)}°
                  </span>
                )}
              </div>
              <div className="map-wrapper">
                <MapComponent position={position} setPosition={setPosition} predictionData={predictionData} radius={4.0} />
                {/* Stat pill overlays on map */}
                {predictionData && (
                  <div className="map-stat-overlay">
                    <div className="map-stat-pill">
                      <span className="pill-value">{predictionData.data_points?.toLocaleString()}</span>
                      <span className="pill-label">Records Fetched</span>
                    </div>
                    <div className="map-stat-pill">
                      <span className="pill-value">{predictionData.unique_floats}</span>
                      <span className="pill-label">Unique Floats</span>
                    </div>
                    <div className="map-stat-pill">
                      <span className="pill-value">{predictionData.historical_avg_temp}°C</span>
                      <span className="pill-label">Avg Temp</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        
        {predictionData && !loading && (
          <div id="dashboard-results" ref={dashboardRef}>
            <Dashboard predictionData={predictionData} darkMode={darkMode} />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
