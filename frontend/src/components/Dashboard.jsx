import React from 'react';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
);

export default function Dashboard({ predictionData, darkMode }) {
  if (!predictionData) return null;

  const { temperature, salinity, days, heatwave, historical_avg_temp, historical_avg_salinity, data_points, unique_floats, source_url, heatwave_severity, depth_profile, historical_trace, ocean_name } = predictionData;

  const renderHeatwaveBanner = () => {
    if (heatwave_severity === 'None' || !heatwave_severity) return null;

    const config = {
      'Severe':   { color: '#e53e3e', gradient: 'rgba(185,28,28,0.95)',   label: 'CRITICAL WARNING', description: 'The predictive model forecasts sustained oceanic temperature anomalies radically above the 90-day baseline. This marine ecosystem is critically destabilizing.' },
      'Strong':   { color: '#e8734a', gradient: 'rgba(194,65,12,0.92)',   label: 'STRONG WARNING',   description: 'Significant temperature anomalies detected above the historical baseline. Marine ecosystems in this region may experience thermal stress.' },
      'Moderate': { color: '#d69e2e', gradient: 'rgba(180,140,20,0.88)', label: 'MODERATE ADVISORY', description: 'Mild temperature anomalies developing above the 90-day baseline. Continued monitoring is recommended for this region.' },
    };

    const c = config[heatwave_severity];
    if (!c) return null;

    return (
      <div className="heatwave-banner" style={{
        background: `linear-gradient(135deg, ${c.color} 0%, ${c.gradient} 100%)`,
        color: '#fff',
        padding: '1.5rem 2rem',
        borderRadius: '20px',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: `0 12px 40px ${c.color}40`,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            ⚠️ {heatwave_severity} Marine Heatwave Detected
          </h2>
          <p style={{ margin: '0.6rem 0 0 0', opacity: 0.92, fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5 }}>
            {c.description}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.95)', color: c.color, padding: '10px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', flexShrink: 0, marginLeft: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {c.label}
        </div>
      </div>
    );
  };

  // Depth Profile Chart Data
  const depthChartData = {
    datasets: [
      {
        label: 'Depth Profile (°C)',
        data: depth_profile ? depth_profile.map(p => ({ x: p.temperature, y: p.depth })) : [],
        backgroundColor: darkMode ? '#22d3ee' : '#0891b2',
        borderColor: darkMode ? '#22d3ee' : '#0891b2',
        pointRadius: 3.5,
        pointHoverRadius: 6,
      }
    ]
  };

  const depthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: darkMode ? '#7a8a9e' : '#6b7b8d', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, usePointStyle: true, boxWidth: 6 } },
      tooltip: { backgroundColor: darkMode ? '#1a2332' : '#1a2332', titleColor: '#fff', bodyColor: '#fff', padding: 12, displayColors: false, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Temperature (°C)', color: darkMode ? '#7a8a9e' : '#6b7b8d', font: { family: 'Plus Jakarta Sans', weight: '600' } },
        ticks: { color: darkMode ? '#7a8a9e' : '#6b7b8d' },
        grid: { color: darkMode ? '#243044' : '#eef2f0', borderDash: [2, 4] }
      },
      y: { 
        title: { display: true, text: 'Depth (m)', color: darkMode ? '#7a8a9e' : '#6b7b8d', font: { family: 'Plus Jakarta Sans', weight: '600' } },
        reverse: true,
        ticks: { color: darkMode ? '#7a8a9e' : '#6b7b8d' },
        grid: { color: darkMode ? '#243044' : '#eef2f0', borderDash: [2, 4] }
      }
    }
  };

  // Historical Chart Data
  const histLabels = historical_trace ? historical_trace.map(t => t.timestamp) : [];
  const histData = historical_trace ? historical_trace.map(t => t.temperature) : [];
  
  const historyChartData = {
    labels: histLabels,
    datasets: [{
      label: 'Historical Temperature (°C)',
      data: histData,
      borderColor: darkMode ? '#a78bfa' : '#7c3aed',
      backgroundColor: darkMode ? 'rgba(167,139,250,0.08)' : 'rgba(124,58,237,0.08)',
      tension: 0.3,
      pointRadius: 2.5,
      fill: true,
      borderWidth: 2.5
    }]
  };

  const tempChartData = {
    labels: days,
    datasets: [
      {
        label: 'Predicted Temp (°C)',
        data: temperature,
        borderColor: darkMode ? '#ff7a55' : '#e8734a',
        backgroundColor: darkMode ? 'rgba(255,122,85,0.08)' : 'rgba(232,115,74,0.06)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: darkMode ? '#1a2332' : '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
        pointRadius: 3,
      },
      {
        label: 'Historical Avg',
        data: days.map(() => historical_avg_temp),
        borderColor: darkMode ? '#4a5568' : '#b0bec5',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 1.5,
      }
    ]
  };

  const salChartData = {
    labels: days,
    datasets: [
      {
        label: 'Predicted Salinity (PSU)',
        data: salinity,
        borderColor: darkMode ? '#38d99a' : '#2d9c6f',
        backgroundColor: darkMode ? 'rgba(56,217,154,0.08)' : 'rgba(45,156,111,0.06)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: darkMode ? '#1a2332' : '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
        pointRadius: 3,
      },
      {
        label: 'Historical Avg',
        data: days.map(() => historical_avg_salinity),
        borderColor: darkMode ? '#4a5568' : '#b0bec5',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 1.5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: darkMode ? '#7a8a9e' : '#6b7b8d',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          usePointStyle: true,
          boxWidth: 6,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1a2332' : '#1a2332',
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        padding: 12,
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        displayColors: false,
        cornerRadius: 10
      }
    },
    scales: {
      y: {
        ticks: { color: darkMode ? '#7a8a9e' : '#6b7b8d', font: { family: 'Plus Jakarta Sans', weight: '500', size: 11 } },
        grid: { color: darkMode ? '#243044' : '#eef2f0', borderDash: [2, 4] }
      },
      x: {
        ticks: { color: darkMode ? '#7a8a9e' : '#6b7b8d', font: { family: 'Plus Jakarta Sans', weight: '500', size: 11 } },
        grid: { display: false }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="white-card" style={{ marginTop: '1.5rem' }}>
      
      {renderHeatwaveBanner()}
      
      <div className="card-header" style={{ marginBottom: '1.25rem' }}>
        <h2 className="card-title">
          Forecast Insights {ocean_name && ocean_name !== 'Open Ocean' ? <span style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>• {ocean_name}</span> : ''}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {data_points && (
            <a href={source_url} target="_blank" rel="noreferrer" className="data-badge">
              ✓ {data_points.toLocaleString()} Total Records • {unique_floats} Unique Argo Floats
            </a>
          )}
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-value">{historical_avg_temp}°C</div>
          <div className="stat-card-label">Avg Temperature</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{historical_avg_salinity}</div>
          <div className="stat-card-label">Avg Salinity (PSU)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{unique_floats}</div>
          <div className="stat-card-label">Argo Floats</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: heatwave ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
            {heatwave_severity}
          </div>
          <div className="stat-card-label">Heatwave Risk</div>
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="chart-container">
          <h3 className="chart-title" title="Forecasts how hot or cold the ocean will be over the coming days.">🌡️ Temperature Forecast</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Line data={tempChartData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3 className="chart-title" title="Forecasts ocean salinity levels over the coming days.">🧪 Salinity Forecast</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Line data={salChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3 className="chart-title" title="Shows how temperature changes with ocean depth.">📐 Depth Thermocline Profile</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {depth_profile ? <Scatter data={depthChartData} options={depthOptions} /> : null}
          </div>
        </div>
        <div className="chart-container">
           <h3 className="chart-title" title="Actual temperatures recorded by Argo floats over the lookback period.">📈 Historical Temperature</h3>
           <div style={{ flex: 1, minHeight: 0 }}>
             {historical_trace ? <Line data={historyChartData} options={chartOptions} /> : null}
           </div>
        </div>
      </div>
    </div>
  );
}
