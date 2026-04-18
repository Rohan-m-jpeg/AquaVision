import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const GRADIENT = {
  0.0:  '#313695',
  0.15: '#4575b4',
  0.3:  '#74add1',
  0.45: '#abd9e9',
  0.55: '#ffffbf',
  0.65: '#fee090',
  0.75: '#fdae61',
  0.85: '#f46d43',
  0.95: '#d73027',
  1.0:  '#a50026',
};

function radiusForZoom(z) {
  if (z <= 2) return 12;
  if (z <= 3) return 16;
  if (z <= 4) return 22;
  if (z <= 5) return 28;
  return 35;
}

export default function HeatmapLayer({ points, visible }) {
  const map = useMap();
  const heatRef = useRef(null);

  // Single effect: build, show/hide, and clean up
  useEffect(() => {
    // Remove old layer if it exists
    if (heatRef.current) {
      try { map.removeLayer(heatRef.current); } catch(e) { /* ignore */ }
      heatRef.current = null;
    }

    // Nothing to render
    if (!points || points.length === 0 || !visible) return;

    // Create and add
    const layer = L.heatLayer(points, {
      radius:     radiusForZoom(map.getZoom()),
      blur:       10,
      maxZoom:    18,
      minOpacity: 0.18,
      max:        1.0,
      gradient:   GRADIENT,
    });

    layer.addTo(map);
    heatRef.current = layer;

    // Zoom handler
    const onZoom = () => {
      const r = radiusForZoom(map.getZoom());
      layer.setOptions({ radius: r, blur: Math.round(r * 0.55) });
      layer.redraw();
    };
    map.on('zoomend', onZoom);

    return () => {
      map.off('zoomend', onZoom);
      try { map.removeLayer(layer); } catch(e) { /* ignore */ }
      heatRef.current = null;
    };
  }, [points, visible, map]);

  return null;
}
