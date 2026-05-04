import React, { useEffect, useState } from 'react';
import { Search, FileText, Calendar, ExternalLink } from 'lucide-react';
import { getHistory } from '../services/api';
import Card from '../components/ui/Card';
import { Link } from 'react-router-dom';

const MedicineHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        const rows = [];
        (data.searches || []).forEach((s) => {
          rows.push({
            id: `search-${s.id}`,
            type: 'search',
            query: s.query,
            date: s.created_at,
          });
        });
        (data.prescriptions || []).forEach((p) => {
          const names = Array.isArray(p.medicine_list)
            ? p.medicine_list.map((m) => m.name || m).join(', ')
            : '';
          rows.push({
            id: `rx-${p.id}`,
            type: 'prescription',
            query: names || 'Prescription upload',
            date: p.uploaded_at,
          });
        });
        rows.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(rows);
      } catch (err) {
        console.error(err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Medicine History</h2>
        <p className="text-gray-600 mt-1">Your past searches and extracted prescriptions.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Query / Medicine</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {item.type === 'search' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                        <Search size={14} /> Search
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                        <FileText size={14} /> Prescription
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.query}
                  </td>
                  <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {formatDate(item.date)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/dashboard/search?q=${encodeURIComponent(item.query)}`}
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium"
                    >
                      Search Again <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              
              {history.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No history found. Start by searching for a medicine or uploading a prescription.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination mock */}
        <Card.Footer className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing 1 to {history.length} of {history.length} entries</p>
          <div className="flex gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50" disabled>&lt;</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-green-600 text-white font-medium">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">&gt;</button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default MedicineHistoryPage;
