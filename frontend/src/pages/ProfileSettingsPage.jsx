import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile, updateProfile } from '../services/api';
import { updateProfile as updateReduxProfile } from '../store/slices/authSlice';

const tabs = ['Profile', 'Preferences', 'Notifications'];

const GENDERS = ['', 'Male', 'Female', 'Other', 'Prefer not to say'];

const emptyProfile = {
  email: '',
  name: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  preferences: {},
  notifications_enabled: true,
  email_digest: false,
  sms_alerts: false,
};

const ProfileSettingsPage = () => {
  const dispatch = useDispatch();
  const reduxUser = useSelector((s) => s.auth.user);
  const [activeTab, setActiveTab] = useState('Profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [p, setP] = useState(emptyProfile);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProfile();
        setP({
          email: data?.email || reduxUser?.email || '',
          name: data?.name || '',
          phone: data?.phone || '',
          date_of_birth: data?.date_of_birth || '',
          gender: data?.gender || '',
          preferences: data?.preferences || {},
          notifications_enabled: Boolean(data?.notifications_enabled ?? true),
          email_digest: Boolean(data?.email_digest ?? false),
          sms_alerts: Boolean(data?.sms_alerts ?? false),
        });
      } catch (e) {
        setStatus({
          text: e.response?.data?.message || e.message || 'Could not load profile',
          kind: 'err',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [reduxUser?.email]);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  const save = async (partial, message = 'Saved.') => {
    setSaving(true);
    setStatus({ text: '', kind: '' });
    try {
      const data = await updateProfile(partial);
      setP((prev) => ({
        ...prev,
        ...partial,
        preferences: data?.preferences || prev.preferences,
      }));
      dispatch(
        updateReduxProfile({
          name: data?.name ?? partial.name ?? reduxUser?.name,
        }),
      );
      setStatus({ text: message, kind: 'ok' });
    } catch (e) {
      setStatus({
        text: e.response?.data?.message || e.message || 'Save failed',
        kind: 'err',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = (e) => {
    e.preventDefault();
    save(
      {
        name: p.name.trim(),
        phone: p.phone.trim(),
        date_of_birth: p.date_of_birth.trim(),
        gender: p.gender,
      },
      'Profile updated.',
    );
  };

  const saveNotifications = () =>
    save(
      {
        notifications_enabled: p.notifications_enabled,
        email_digest: p.email_digest,
        sms_alerts: p.sms_alerts,
      },
      'Notification preferences saved.',
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  const initials = (p.name || p.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-10 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 text-[15px] whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[#0f803f] text-[#0f803f] font-bold'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {status.text && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-green-100 bg-green-50 text-green-800'
              : 'border-red-100 bg-red-50 text-red-800'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="w-[120px] h-[120px] bg-[#E2E8F0] rounded-full flex items-center justify-center overflow-hidden mb-5 text-5xl font-extrabold text-[#0f803f]">
            {initials}
          </div>
          <h3 className="text-[20px] font-bold text-[#0B1B2B]">{p.name || '—'}</h3>
          <p className="text-[14px] font-medium text-gray-400 mb-6 break-all text-center max-w-full">
            {p.email}
          </p>
        </div>

        <div className="md:col-span-8">
          {activeTab === 'Profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#0B1B2B] mb-8">Personal information</h3>
              <form className="space-y-6" onSubmit={saveProfile}>
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-500">Full name</label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="w-full px-4 py-3 text-[14px] font-medium text-[#0B1B2B] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] outline-none transition-all shadow-sm bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-500">Email</label>
                  <input
                    type="email"
                    value={p.email}
                    readOnly
                    className="w-full px-4 py-3 text-[14px] font-medium text-gray-500 border border-gray-100 rounded-xl bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-500">Phone</label>
                  <input
                    type="text"
                    value={p.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 text-[14px] font-medium text-[#0B1B2B] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] outline-none transition-all shadow-sm bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-500">Date of birth</label>
                  <input
                    type="date"
                    value={p.date_of_birth}
                    onChange={(e) => setField('date_of_birth', e.target.value)}
                    className="w-full px-4 py-3 text-[14px] font-medium text-[#0B1B2B] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] outline-none transition-all shadow-sm bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-500">Gender</label>
                  <select
                    value={p.gender}
                    onChange={(e) => setField('gender', e.target.value)}
                    className="w-full px-4 py-3 text-[14px] font-medium text-[#0B1B2B] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] outline-none transition-all shadow-sm bg-white"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g || 'Select…'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#0f803f] text-white text-[14px] font-bold py-2.5 px-6 rounded-xl shadow-sm hover:bg-[#0c6b34] transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'Preferences' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
              <h3 className="text-[16px] font-bold text-[#0B1B2B]">System preferences</h3>
              <p className="text-sm text-gray-500">
                Language / time zone are fixed at English · Asia/Kolkata for now.
              </p>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#0B1B2B] mb-6">
                Notification preferences
              </h3>

              <div className="space-y-4">
                {[
                  {
                    key: 'notifications_enabled',
                    title: 'Medicine reminders',
                    desc: 'Receive daily alerts to take your medicines.',
                  },
                  {
                    key: 'email_digest',
                    title: 'Weekly email digest',
                    desc: 'Adherence summary and refill alerts on your email.',
                  },
                  {
                    key: 'sms_alerts',
                    title: 'SMS alerts',
                    desc: 'Critical reminders and refill warnings via SMS.',
                  },
                ].map((row) => (
                  <label
                    key={row.key}
                    className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <h4 className="text-[14px] font-bold text-[#0B1B2B]">{row.title}</h4>
                      <p className="text-[13px] text-gray-500 mt-0.5">{row.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(p[row.key])}
                      onChange={(e) => setField(row.key, e.target.checked)}
                      className="h-5 w-9 accent-[#0f803f]"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={saveNotifications}
                  disabled={saving}
                  className="bg-[#0f803f] text-white text-[14px] font-bold py-2.5 px-6 rounded-xl shadow-sm hover:bg-[#0c6b34] transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
