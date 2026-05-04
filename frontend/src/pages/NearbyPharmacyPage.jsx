import React, { useEffect, useState } from 'react';
import { Crosshair, ExternalLink, MapPin, Phone, Search } from 'lucide-react';
import { getNearbyPharmacies } from '../services/api';

function metres(m) {
  if (m == null) return '—';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

const NearbyPharmacyPage = () => {
  const [pos, setPos] = useState(null);
  const [radius, setRadius] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState([]);
  const [center, setCenter] = useState(null);

  const locate = () => {
    setErr('');
    if (!navigator.geolocation) {
      setErr("Your browser doesn't support geolocation.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLoading(false);
      },
      (e) => {
        setLoading(false);
        setErr(e.message || 'Could not access location.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const search = async () => {
    if (!pos) return;
    setLoading(true);
    setErr('');
    try {
      const data = await getNearbyPharmacies({ lat: pos.lat, lng: pos.lng, radius });
      setResults(data?.results || []);
      setCenter(data?.center || pos);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Lookup failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pos) search();
  }, [pos, radius]);

  const mapEmbed = center
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.02},${center.lat - 0.015},${center.lng + 0.02},${center.lat + 0.015}&layer=mapnik&marker=${center.lat},${center.lng}`
    : '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nearby pharmacies</h2>
        <p className="text-gray-600 mt-1">
          Real pharmacies pulled from OpenStreetMap. Use “Directions” to open Google Maps with a route.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-end">
        <button
          type="button"
          onClick={locate}
          className="bg-[#0f803f] hover:bg-[#0c6b34] text-white text-[14px] font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2"
        >
          <Crosshair size={16} />
          {pos ? 'Update my location' : 'Use my location'}
        </button>
        <div className="flex flex-col">
          <label className="text-[12px] font-bold text-gray-500 mb-1">Radius</label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
          >
            <option value={1000}>1 km</option>
            <option value={2000}>2 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
          </select>
        </div>
        {pos && (
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="text-[14px] font-bold border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-60"
          >
            <Search size={16} />
            {loading ? 'Searching…' : 'Refresh'}
          </button>
        )}
      </div>

      {err && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {center && mapEmbed && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
          <iframe
            title="Nearby pharmacies map"
            width="100%"
            height="320"
            frameBorder="0"
            scrolling="no"
            src={mapEmbed}
            style={{ border: 0 }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#0B1B2B]">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{metres(p.distance_m)} away</p>
              </div>
              <a
                href={p.directions_url}
                target="_blank"
                rel="noreferrer noopener"
                className="bg-[#0f803f] hover:bg-[#0c6b34] text-white text-[12px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <MapPin size={12} /> Directions
              </a>
            </div>
            {p.address && (
              <p className="text-sm text-gray-600 mt-2 flex items-start gap-1.5">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <span>{p.address}</span>
              </p>
            )}
            {p.phone && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                <Phone size={14} className="text-gray-400" />
                <a href={`tel:${p.phone}`} className="hover:underline">
                  {p.phone}
                </a>
              </p>
            )}
            {p.opening_hours && (
              <p className="text-xs text-gray-500 mt-2">Hours: {p.opening_hours}</p>
            )}
            <a
              href={p.osm_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-blue-600 hover:underline mt-3 flex items-center gap-1"
            >
              View on OpenStreetMap <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>

      {!loading && pos && results.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-12 border border-dashed rounded-2xl">
          No pharmacies returned in this radius. Try increasing the radius.
        </div>
      )}

      {!pos && (
        <div className="text-center text-sm text-gray-500 py-12 border border-dashed rounded-2xl">
          Enable location to find pharmacies nearby.
        </div>
      )}
    </div>
  );
};

export default NearbyPharmacyPage;
