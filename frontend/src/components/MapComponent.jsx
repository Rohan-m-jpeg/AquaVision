import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Rectangle, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  return (
    <div style={{ padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
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
