// Parses a single DMS string used in `fasilitas_pelabuhan.koordinat`, e.g. `1°27'13" N`
function parseDMS(value) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?\s*([NSEW])/i);
  if (!match) return null;
  const deg = parseFloat(match[1]) || 0;
  const min = parseFloat(match[2]) || 0;
  const sec = parseFloat(match[3]) || 0;
  const dir = match[4].toUpperCase();
  const decimal = deg + min / 60 + sec / 3600;
  return dir === 'S' || dir === 'W' ? -decimal : decimal;
}

// Resolves a pelabuhan row's coordinates from the editable `fasilitas_pelabuhan.koordinat` (DMS: { lu, bt }).
export function resolvePelabuhanCoords(pelabuhan) {
  const fasilitas = Array.isArray(pelabuhan?.fasilitas_pelabuhan)
    ? pelabuhan.fasilitas_pelabuhan[0]
    : pelabuhan?.fasilitas_pelabuhan;
  const lat = parseDMS(fasilitas?.koordinat?.lu);
  const lng = parseDMS(fasilitas?.koordinat?.bt);
  if (lat != null && lng != null) return { lat, lng };
  return null;
}

// Great-circle distance between two { lat, lng } points, in kilometers
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
