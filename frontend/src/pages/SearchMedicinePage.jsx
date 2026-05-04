import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import { setSearchResults, addRecentSearch, setLoading, setError } from '../store/slices/medicineSlice';
import { searchMedicines } from '../services/api';

const SearchMedicinePage = () => {
  const dispatch = useDispatch();
  const { searchResults, loading } = useSelector((state) => state.medicine);
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Clear search results on initial load
  useEffect(() => {
    dispatch(setSearchResults([]));
  }, [dispatch]);

  const handleSearch = async (e, opts = {}) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    setFetchError('');
    dispatch(setLoading(true));
    dispatch(addRecentSearch(query));

    try {
      const results = await searchMedicines(query, { refresh: Boolean(opts.refresh) });
      dispatch(setSearchResults(results));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Search failed';
      setFetchError(msg);
      dispatch(setError(msg));
      dispatch(setSearchResults([]));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-2">
      {/* Search Header Area */}
      <div>
        <h2 className="text-[22px] font-bold text-[#0B1B2B] mb-1">Search Medicine</h2>
        <p className="text-[14px] font-medium text-gray-500 mb-6">Search for any medicine and compare prices</p>
        
        <form onSubmit={(ev) => handleSearch(ev, {})} className="flex items-center gap-4">
          <input
            type="text"
            className="flex-1 py-3 px-4 text-[15px] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] outline-none transition-all shadow-sm text-gray-800 placeholder-gray-400"
            placeholder="Enter medicine name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#0f803f] hover:bg-[#0c6b34] text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </div>

      {!hasSearched ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Tips Card */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-gray-100 p-6">
              <h3 className="text-[15px] font-bold text-[#0B1B2B] mb-6">Tips</h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-3">
                  <div className="text-[#0f803f] mt-0.5">
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#0B1B2B]">Search by brand name</p>
                    <p className="text-[13px] text-gray-400 font-medium mt-0.5">Brand or trade name</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-[#0f803f] mt-0.5">
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#0B1B2B]">Search by generic name</p>
                    <p className="text-[13px] text-gray-400 font-medium mt-0.5">Salt / composition</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-[#0f803f] mt-0.5">
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#0B1B2B]">Compare prices & save more</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          {fetchError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{fetchError}</div>
          )}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[15px] font-bold text-[#0B1B2B]">
              Showing {searchResults.length} results for <span className="text-[#0f803f]">"{query}"</span>
            </h3>
            <div className="flex items-center gap-4">
              {hasSearched && query.trim() && (
                <button
                  type="button"
                  onClick={() => handleSearch(null, { refresh: true })}
                  disabled={loading}
                  className="text-[13px] font-bold text-[#0f803f] hover:underline disabled:opacity-50"
                >
                  Refresh live prices
                </button>
              )}
              <button 
                type="button"
                onClick={() => { setHasSearched(false); setQuery(''); }}
                className="text-[13px] font-bold text-gray-400 hover:text-gray-600"
              >
                Clear Search
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-[16px] font-bold text-[#0B1B2B]">{item.name}</h3>
                    {item.savings && item.savings !== '—' && (
                      <span className="bg-green-50 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {item.savings}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-500 mb-3">{item.packSize}</p>
                  <p className="text-[13px] font-medium text-gray-700">
                    Pharmacy: <span className="font-bold">{item.pharmacy}</span>
                  </p>
                </div>
                <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                  <div className="text-[20px] font-bold text-[#0B1B2B]">₹{item.price}</div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="bg-[#0f803f] hover:bg-[#0c6b34] text-white text-[13px] font-bold px-5 py-2 rounded-lg transition-colors inline-block text-center"
                    >
                      Visit site
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="bg-gray-200 text-gray-500 text-[13px] font-bold px-5 py-2 rounded-lg"
                    >
                      No link
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchMedicinePage;
