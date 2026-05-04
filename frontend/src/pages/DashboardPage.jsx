import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { setDashboardData, setLoading, setError, resetDashboard } from '../store/slices/dashboardSlice';
import { resetMedicine } from '../store/slices/medicineSlice';
import { resetReminders } from '../store/slices/reminderSlice';
import { resetReports } from '../store/slices/reportSlice';
import { getDashboardData, resetUserActivity } from '../services/api';
import { Link } from 'react-router-dom';
import RefillAlertsBanner from '../components/RefillAlertsBanner';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { widgets, adherenceTrend, loading, recentSearches } = useSelector((state) => state.dashboard);
  const { user } = useSelector((state) => state.auth);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      dispatch(setLoading(true));
      try {
        const data = await getDashboardData();
        dispatch(setDashboardData(data));
      } catch (error) {
        dispatch(setError(error.message));
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchDashboard();
  }, [dispatch]);

  const handleResetAll = async () => {
    if (
      !window.confirm(
        'Clear all your MedScan activity? This removes searches, uploads, reminders, adherence logs, and lab reports. Your account stays.',
      )
    ) {
      return;
    }
    setResetting(true);
    dispatch(setLoading(true));
    try {
      await resetUserActivity();
      dispatch(resetDashboard());
      dispatch(resetMedicine());
      dispatch(resetReminders());
      dispatch(resetReports());
      const data = await getDashboardData({ refresh: true });
      dispatch(setDashboardData(data));
    } catch (error) {
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f803f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B1B2B] tracking-tight">
          Welcome back, {user?.name?.split?.(' ')?.[0] || user?.email?.split?.('@')?.[0] || 'there'} 👋
        </h2>
        <p className="text-[15px] font-medium text-gray-500 mt-1">Here's your health overview</p>
      </div>

      <RefillAlertsBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-[130px]">
          <p className="text-[13px] font-bold text-[#0B1B2B]">Upcoming Reminders</p>
          <div className="mt-2">
            <h4 className="text-[32px] leading-none font-bold text-[#0B1B2B]">{widgets.upcomingReminders}</h4>
            <span className="text-[13px] font-medium text-gray-500 block mt-1">Today</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-[130px]">
          <p className="text-[13px] font-bold text-[#0B1B2B]">Adherence Score</p>
          <div className="mt-2 relative">
            <div className="flex items-baseline gap-2">
              <h4 className="text-[32px] leading-none font-bold text-[#0B1B2B]">{widgets.adherenceScore}%</h4>
              {widgets.adherenceScore >= 80 ? (
                <span className="text-[13px] font-bold text-[#0f803f]">Good</span>
              ) : widgets.adherenceScore > 0 ? (
                <span className="text-[13px] font-bold text-amber-600">Building</span>
              ) : (
                <span className="text-[13px] font-medium text-gray-400">—</span>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#0f803f] rounded-full" style={{ width: `${widgets.adherenceScore}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-[130px]">
          <p className="text-[13px] font-bold text-[#0B1B2B]">Medicines Tracked</p>
          <div className="mt-2">
            <h4 className="text-[32px] leading-none font-bold text-[#0B1B2B]">{widgets.medicinesTracked}</h4>
            <span className="text-[13px] font-medium text-gray-500 block mt-1">Active</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-[130px]">
          <p className="text-[13px] font-bold text-[#0B1B2B]">Money Saved</p>
          <div className="mt-2">
            <h4 className="text-[32px] leading-none font-bold text-[#0f803f]">₹{widgets.monthlySavings}</h4>
            <span className="text-[13px] font-medium text-gray-500 block mt-1">This Month</span>
          </div>
        </div>

      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Table) - spans 2 cols on lg screens */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-[#0B1B2B]">Recent searches</h3>
            <Link to="/dashboard/search" className="text-[13px] font-bold text-blue-600 hover:text-blue-700">
              Search medicines
            </Link>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-y border-gray-100">
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">Pharmacy</th>
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">Pack Size</th>
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">Price</th>
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">Unit Price</th>
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap">Savings</th>
                  <th className="px-6 py-3.5 text-[13px] font-bold text-[#0B1B2B] whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSearches?.length ? (
                  recentSearches.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[13px] font-bold text-[#0B1B2B]" colSpan={4}>
                        {row.query}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-gray-500" colSpan={2}>
                        {row.created_at?.replace('T', ' ').slice(0, 16) || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-8 text-[13px] text-gray-500 text-center" colSpan={6}>
                      No saved searches yet. Use Search Medicine — prices come from live pharmacy pages when you run a
                      query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col">
          
          {/* Adherence Overview Chart Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-[250px]">
            <div className="p-6 pb-2">
              <h3 className="text-[14px] font-bold text-[#0B1B2B]">Adherence Overview</h3>
              <div className="mt-4">
                <h4 className="text-[28px] leading-none font-bold text-[#0B1B2B]">{widgets.adherenceScore}%</h4>
                <span className="text-[12px] font-medium text-gray-500 block mt-1">This Week</span>
              </div>
            </div>
            <div className="flex-1 w-full mt-2 px-2 pb-4 min-h-[160px]">
              {adherenceTrend?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adherenceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                      dy={10}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [`${value}%`, 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 2, fill: '#16a34a' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[13px] text-gray-400 px-4 pb-4">No adherence data yet — log doses from Reminders.</p>
              )}
            </div>
          </div>

          {/* AI Health Assistant Widget */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[14px] font-bold text-[#0B1B2B] mb-2">AI Health Assistant</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed pr-8">
              Ask me anything about medicines, side effects, or health...
            </p>
            <div className="mt-4 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleResetAll}
          disabled={resetting}
          className="text-[13px] font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
        >
          {resetting ? 'Resetting…' : 'Reset all activity data'}
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
