import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversineKm } from '../../lib/geo';

function numberIcon(n) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:#1E6091;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(10,22,40,0.4);">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function popupContent(stop, distanceToNext) {
  const wrap = document.createElement('div');
  wrap.className = 'text-sm min-w-[170px]';

  const title = document.createElement('p');
  title.className = 'font-semibold text-navy-900 mb-1';
  title.textContent = stop.nama;
  wrap.appendChild(title);

  const rows = [
    ['Kabupaten/Kota', stop.kabupaten || '—'],
    ['Urutan Singgah', `Ke-${stop.urutan}`],
    ['Jarak ke Pelabuhan Berikutnya', distanceToNext == null ? 'Pelabuhan terakhir' : `${distanceToNext.toFixed(1)} km`],
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement('p');
    row.className = 'text-xs text-slate-500 mt-1';
    const lbl = document.createElement('span');
    lbl.className = 'text-slate-400';
    lbl.textContent = `${label}: `;
    row.appendChild(lbl);
    row.appendChild(document.createTextNode(value));
    wrap.appendChild(row);
  });

  return wrap;
}

export default function TrayekMap({ stops = [], height = 340 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([1.8, 125.3], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (stops.length === 0) return;

    const group = L.layerGroup();
    const latlngs = stops.map((s) => [s.lat, s.lng]);
    L.polyline(latlngs, { color: '#00BCD4', weight: 3, dashArray: '6 6' }).addTo(group);

    stops.forEach((stop, i) => {
      const next = stops[i + 1];
      const distance = next ? haversineKm(stop, next) : null;
      L.marker([stop.lat, stop.lng], { icon: numberIcon(stop.urutan) })
        .bindPopup(popupContent(stop, distance))
        .addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;
    map.fitBounds(latlngs, { padding: [30, 30] });
  }, [stops]);

  const hasStops = stops.length > 0;

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden border border-surface-200">
      <div ref={containerRef} className="absolute inset-0" style={{ visibility: hasStops ? 'visible' : 'hidden' }} />
      {!hasStops && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-50 text-sm text-slate-400 px-6 text-center">
          Belum ada data koordinat pelabuhan untuk ditampilkan di peta.
        </div>
      )}
    </div>
  );
}
