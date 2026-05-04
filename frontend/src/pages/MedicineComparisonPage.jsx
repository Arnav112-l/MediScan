import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { compareMedicine, getAlternatives } from '../services/api';

const MedicineComparisonPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const medicineName = searchParams.get('m')?.trim() || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [generics, setGenerics] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!medicineName) {
        setLoading(false);
        setError('Pass a medicine query: /dashboard/compare?m=Your+Medicine');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [data, alts] = await Promise.all([
          compareMedicine(medicineName),
          getAlternatives(medicineName).catch(() => null),
        ]);
        if (!cancelled) {
          setPayload(data);
          setGenerics(alts?.alternatives || []);
        }
      } catch (e) {
        const msg =
          e.response?.data?.message ||
          e.message ||
          'Could not load comparison (check backend / Playwright).';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [medicineName]);

  const prices = payload?.prices || [];
  const lowest = prices.length ? Math.min(...prices.map((p) => Number(p.price))) : null;
  const cheapest = prices.find((p) => Number(p.price) === lowest);
  const alternatives = payload?.alternatives || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        <p className="text-gray-500">Fetching live pharmacy listings…</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          to="/dashboard/search"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600"
        >
          <ArrowLeft size={16} /> Back to Search
        </Link>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-800 text-sm">{error}</div>
      </div>
    );
  }

  if (payload.failed_all) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/dashboard/search" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600">
          <ArrowLeft size={16} /> Back to Search
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
          All pharmacy sources failed for «{payload.query}». Check Playwright / network on the API host.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link
          to="/dashboard/search"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Search
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{payload.medicine_display || medicineName}</h2>
            <p className="text-gray-500 mt-1">Live scrape — verify pack and price on the pharmacy site.</p>
          </div>
          {cheapest && (
            <div className="bg-green-50 rounded-lg p-4 text-center min-w-[150px] border border-green-100">
              <p className="text-sm font-medium text-green-800">Lowest MRP in result set</p>
              <p className="text-3xl font-bold text-green-600 my-1">₹{Number(cheapest.price).toFixed(2)}</p>
              <p className="text-xs text-green-700">at {cheapest.pharmacy_name}</p>
            </div>
          )}
        </div>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-bold text-gray-900">Price comparison</h3>
        </Card.Header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Pharmacy</th>
                <th className="px-6 py-4">Pack</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Unit price</th>
                <th className="px-6 py-4">vs lowest</th>
                <th className="px-6 py-4">Availability</th>
                <th className="px-6 py-4 text-right">Buy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {prices.map((row, idx) => {
                const isLow = cheapest && row.pharmacy_name === cheapest.pharmacy_name;
                const savingsPct = row.savings_percent_vs_lowest;
                return (
                  <tr key={`${row.pharmacy_name}-${idx}`} className={isLow ? 'bg-green-50/30' : ''}>
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                      {row.pharmacy_name}
                      {isLow && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Lowest
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.pack_size || '—'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{Number(row.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-500">{row.unit_price != null ? `₹${row.unit_price}` : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{savingsPct != null ? `${savingsPct}%` : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{row.availability || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noreferrer noopener">
                          <Button variant="primary" size="sm">
                            Visit
                          </Button>
                        </a>
                      ) : (
                        <Button variant="primary" size="sm" disabled>
                          —
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Card.Footer>
          <p className="text-xs text-gray-400">
            Prices and links come from pharmacy search pages at query time — not cached demo data.
          </p>
        </Card.Footer>
      </Card>

      {generics.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-bold text-gray-900">Generic alternatives</h3>
            <p className="text-sm text-gray-500">Same composition / generic name from MedScan catalog.</p>
          </Card.Header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Generic / composition</th>
                  <th className="px-6 py-4">Manufacturer</th>
                  <th className="px-6 py-4 text-right">Compare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {generics.map((g) => (
                  <tr key={g.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{g.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {g.generic_name || g.composition || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{g.manufacturer || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/dashboard/compare?m=${encodeURIComponent(g.name)}`}
                        className="text-green-600 hover:text-green-700 text-sm font-bold"
                      >
                        Compare prices
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {alternatives.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-bold text-gray-900">Ranked offers (same query)</h3>
          </Card.Header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Pharmacy</th>
                  <th className="px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {alternatives.map((a) => (
                  <tr key={a.rank}>
                    <td className="px-6 py-4">{a.rank}</td>
                    <td className="px-6 py-4 font-medium">{a.pharmacy_name}</td>
                    <td className="px-6 py-4 text-gray-500">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MedicineComparisonPage;
