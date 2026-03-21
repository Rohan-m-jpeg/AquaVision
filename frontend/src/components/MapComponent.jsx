import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Rectangle, CircleMarker, Tooltip, Popup } from 'react-leaflet';
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
  // Global ocean view — click anywhere in the world
  const center = [20, 0];

  return (
    <div style={{ padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
      <MapContainer center={center} zoom={2} style={{ height: '380px', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB Voyager</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <LocationSelector position={position} setPosition={setPosition} />
        
        {predictionData && position && (
          <Rectangle 
            bounds={[
              [position.lat - radius, position.lng - radius],
              [position.lat + radius, position.lng + radius]
            ]}
            pathOptions={{ color: '#ff4081', weight: 2, dashArray: '5, 8', fillOpacity: 0.05 }}
          />
        )}
        
        {predictionData && predictionData.historical_trace && predictionData.historical_trace.map((pt, i) => (
          <CircleMarker 
            key={i} 
            center={[pt.latitude, pt.longitude]} 
            radius={4} 
            pathOptions={{ color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.8 }}
          >
            <Popup>
              <div style={{ padding: '4px', textAlign: 'center', minWidth: '150px' }}>
                <div style={{ background: '#111418', color: '#00e5ff', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>
                  ID: {pt.platform_number || 'Unknown'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#556270', marginBottom: '6px' }}>
                  <strong>Recorded:</strong> {pt.timestamp}
                </div>
                <div style={{ fontSize: '1.2rem', color: '#ff5722', fontWeight: '900', marginBottom: '8px' }}>
                  {pt.temperature.toFixed(2)} °C
                </div>
                <div style={{ fontSize: '0.75rem', color: '#79838c', borderTop: '1px solid #e0e6ed', paddingTop: '6px' }}>
                  Hardware: IFREMER Autonomous
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
