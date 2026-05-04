import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRefillAlerts } from '../services/api';

const bucketStyles = {
  overdue: 'bg-red-50 border-red-200 text-red-800',
  urgent: 'bg-orange-50 border-orange-200 text-orange-800',
  soon: 'bg-amber-50 border-amber-200 text-amber-900',
};

const RefillAlertsBanner = () => {
  const [alerts, setAlerts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRefillAlerts();
        if (!cancelled) setAlerts(data?.alerts || []);
      } catch {
        // Silent — banner is optional
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  if (alerts.length === 0) return null;

  const top = alerts.slice(0, 3);
  const more = alerts.length - top.length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 flex items-start gap-3">
      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <p className="text-sm font-bold text-[#0B1B2B]">Refill alerts</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Based on your reminder durations — restock before doses run out.
        </p>
        <ul className="mt-3 space-y-1.5">
          {top.map((a) => (
            <li
              key={a.reminder_id}
              className={`text-[13px] px-3 py-1.5 rounded-lg border ${bucketStyles[a.bucket] || ''}`}
            >
              <span className="font-bold">{a.medicine_name}</span>{' '}
              {a.days_left <= 0
                ? `is ${Math.abs(a.days_left)}d overdue`
                : `runs out in ${a.days_left}d`}
              {a.dose ? ` · ${a.dose}` : ''}
            </li>
          ))}
        </ul>
        <Link
          to="/dashboard/reminders"
          className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-[#0f803f] hover:underline"
        >
          <RefreshCw size={12} /> Update reminders
          {more > 0 ? ` (+${more} more)` : ''}
        </Link>
      </div>
    </div>
  );
};

export default RefillAlertsBanner;
