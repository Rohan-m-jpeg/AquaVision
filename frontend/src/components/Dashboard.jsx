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
      'Severe':   { color: '#ff0033', gradient: 'rgba(200,0,0,0.9)',   label: 'CRITICAL EVACUATION WARNING', description: 'The predictive statistical model forecasts sustained oceanic temperature anomalies radically above the 90-day baseline. This marine ecosystem is critically destabilizing.' },
      'Strong':   { color: '#ff5722', gradient: 'rgba(200,60,0,0.9)',   label: 'STRONG WARNING',              description: 'Significant temperature anomalies detected above the historical baseline. Marine ecosystems in this region may experience thermal stress.' },
      'Moderate': { color: '#ffa726', gradient: 'rgba(200,140,0,0.85)', label: 'MODERATE ADVISORY',            description: 'Mild temperature anomalies developing above the 90-day baseline. Continued monitoring is recommended for this region.' },
    };

    const c = config[heatwave_severity];
    if (!c) return null;

    return (
      <div className="heatwave-banner" style={{
        background: `linear-gradient(135deg, ${c.color} 0%, ${c.gradient} 100%)`,
        color: '#fff',
        padding: '1.5rem 2.5rem',
        borderRadius: '20px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: `0 12px 40px ${c.color}50`
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            ⚠️ {heatwave_severity} Marine Heatwave Detected
          </h2>
          <p style={{ margin: '0.75rem 0 0 0', opacity: 0.95, fontSize: '1rem', fontWeight: 500, lineHeight: 1.4 }}>
            {c.description}
          </p>
        </div>
        <div style={{ background: '#fff', color: c.color, padding: '10px 20px', borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '1px', flexShrink: 0, marginLeft: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          {c.label}
        </div>
      </div>
    );
  };

  // Render Depth Profile Chart Data
  const depthChartData = {
    datasets: [
      {
        label: 'Thermocline Depth Profile (°C)',
        data: depth_profile ? depth_profile.map(p => ({ x: p.temperature, y: p.depth })) : [],
        backgroundColor: '#00e5ff',
        borderColor: '#00e5ff',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const depthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#79838c' } },
      tooltip: { backgroundColor: '#111418', titleColor: '#fff', bodyColor: '#fff', padding: 12, displayColors: false }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Temperature (°C)', color: '#79838c' },
        ticks: { color: '#79838c' },
        grid: { color: '#f0f3f5', borderDash: [2, 4] }
      },
      y: { 
        title: { display: true, text: 'Depth (m)', color: '#79838c' },
        reverse: true,
        ticks: { color: '#79838c' },
        grid: { color: '#f0f3f5', borderDash: [2, 4] }
      }
    }
  };

  // Render Historical Chart Data
  const histLabels = historical_trace ? historical_trace.map(t => t.timestamp) : [];
  const histData = historical_trace ? historical_trace.map(t => t.temperature) : [];
  
  const historyChartData = {
    labels: histLabels,
    datasets: [{
      label: 'Locally Sourced Historical Temperature (°C)',
      data: histData,
      borderColor: '#ff4081',
      backgroundColor: 'rgba(255, 64, 129, 0.1)',
      tension: 0.1,
      pointRadius: 3,
      fill: true
    }]
  };

  // Heatwave Severity Styling
  const heatwaveColors = {
    'Moderate': { bg: '#fff9c4', border: '#fbc02d', text: '#f57f17' },
    'Strong': { bg: '#ffe0b2', border: '#fb8c00', text: '#e65100' },
    'Severe': { bg: '#ffcdd2', border: '#e53935', text: '#b71c1c' },
  };
  const severity = heatwave_severity || 'Moderate';
  const alertStyle = heatwaveColors[severity] || heatwaveColors['Moderate'];

  const tempChartData = {
    labels: days,
    datasets: [
      {
        label: 'Predicted Temp (°C)',
        data: temperature,
        borderColor: '#ff5722',
        backgroundColor: 'rgba(255, 87, 34, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3,
      },
      {
        label: 'Historical Avg',
        data: days.map(() => historical_avg_temp),
        borderColor: '#9caab0',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 2,
      }
    ]
  };

  const salChartData = {
    labels: days,
    datasets: [
      {
        label: 'Predicted Salinity (PSU)',
        data: salinity,
        borderColor: '#00e676',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3,
      },
      {
        label: 'Historical Avg',
        data: days.map(() => historical_avg_salinity),
        borderColor: '#9caab0',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 2,
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
          color: darkMode ? '#e6edf3' : '#79838c',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#30363d' : '#111418',
        titleFont: { family: 'Plus Jakarta Sans', size: 13 },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 12,
        borderColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        displayColors: false,
      }
    },
    scales: {
      y: {
        ticks: { color: darkMode ? '#7d8590' : '#79838c', font: { family: 'Plus Jakarta Sans', weight: '500' } },
        grid: { color: darkMode ? '#30363d' : '#f0f3f5', borderDash: [2, 4] }
      },
      x: {
        ticks: { color: darkMode ? '#7d8590' : '#79838c', font: { family: 'Plus Jakarta Sans', weight: '500' } },
        grid: { display: false }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="white-card" style={{ marginTop: '2.5rem' }}>
      
      {renderHeatwaveBanner()}
      
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Forecast Insights {ocean_name && ocean_name !== 'Open Ocean' ? <span style={{ color: '#00e5ff', marginLeft: '8px' }}>• {ocean_name}</span> : ''}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {data_points && (
            <a href={source_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '0.85rem', color: '#00e676', backgroundColor: '#111418', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                ✓ {data_points.toLocaleString()} Records ({unique_floats} Floats)
              </span>
            </a>
          )}
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
        <div style={{ height: '320px', padding: '1.25rem', background: 'var(--btn-bg)', borderRadius: '16px', border: '1px solid var(--btn-bg)' }}>
          <h3 title="Forecasts how hot or cold the ocean surface will be over the next few weeks." style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, cursor: 'help', marginBottom: '10px', textAlign: 'center', fontWeight: '800' }}>AI Temperature Forecast</h3>
          <Line data={tempChartData} options={chartOptions} />
        </div>
        <div style={{ height: '320px', padding: '1.25rem', background: 'var(--btn-bg)', borderRadius: '16px', border: '1px solid var(--btn-bg)' }}>
          <h3 title="Forecasts how salty the ocean will be over the next few weeks." style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, cursor: 'help', marginBottom: '10px', textAlign: 'center', fontWeight: '800' }}>AI Salinity Forecast</h3>
          <Line data={salChartData} options={chartOptions} />
        </div>
      </div>

      <div className="charts-grid">
        <div style={{ height: '320px', padding: '1.25rem', background: 'var(--btn-bg)', borderRadius: '16px', border: '1px solid var(--btn-bg)' }}>
          <h3 title="Shows how the water gets drastically colder as you dive deeper underwater." style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, cursor: 'help', marginBottom: '10px', textAlign: 'center', fontWeight: '800' }}>Vertical Depth Thermocline Profile</h3>
          {depth_profile ? <Scatter data={depthChartData} options={depthOptions} /> : null}
        </div>
        <div style={{ height: '320px', padding: '1.25rem', background: 'var(--btn-bg)', borderRadius: '16px', border: '1px solid var(--btn-bg)' }}>
           <h3 title="Shows exactly what temperatures the robotic Argo floats actually recorded here over the last 90 days." style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, cursor: 'help', marginBottom: '10px', textAlign: 'center', fontWeight: '800' }}>Raw ERDDAP Historical Temperature Tracking</h3>
           {historical_trace ? <Line data={historyChartData} options={chartOptions} /> : null}
        </div>
      </div>
    </div>
  );
}
