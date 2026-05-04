import React, { useEffect, useState } from 'react';
import {
  Bell,
  Clock,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import {
  createReminder,
  deleteReminder,
  getReminders,
  updateReminder,
} from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'thrice_daily', label: 'Three times daily' },
  { value: 'four_times_daily', label: 'Four times daily' },
  { value: 'as_needed', label: 'As needed' },
];

const emptyForm = {
  medicine_name: '',
  dose: '',
  frequency: 'once_daily',
  duration_days: 7,
  times: '09:00',
};

function toViewModel(r) {
  return {
    id: r.id,
    raw: r,
    name: r.medicine_name,
    dose: r.dose || '',
    time: r.next_trigger ? String(r.next_trigger).slice(11, 16) : '—',
    schedule:
      r.frequency ||
      (r.schedule?.times ? `Times: ${r.schedule.times.join(', ')}` : '—'),
    duration: r.duration_days ? `${r.duration_days}d` : null,
    active: r.enabled ?? r.status === 'active',
  };
}

const RemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const data = await getReminders();
      const list = Array.isArray(data) ? data : [];
      setReminders(list.map(toViewModel));
    } catch (e) {
      console.error(e);
      setErr(e.response?.data?.message || e.message || 'Could not load reminders');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.medicine_name.trim()) {
      setErr('Medicine name required');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const times = form.times
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await createReminder({
        medicine_name: form.medicine_name.trim(),
        dose: form.dose.trim() || null,
        frequency: form.frequency,
        duration_days: Number(form.duration_days) || null,
        times,
        schedule: { times },
      });
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r) => {
    const nextStatus = r.active ? 'paused' : 'active';
    setReminders((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)),
    );
    try {
      await updateReminder({ id: r.id, status: nextStatus });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Update failed');
      load();
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete reminder for ${r.name}?`)) return;
    setReminders((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await deleteReminder(r.id);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Delete failed');
      load();
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reminders & Schedule</h2>
          <p className="text-gray-600 mt-1">Manage medicine reminders and refill windows.</p>
        </div>
        <Button
          variant="primary"
          className="gap-2 shrink-0"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Close' : 'Add Reminder'}
        </Button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {showForm && (
        <Card>
          <Card.Body>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-1">
                  Medicine name
                </label>
                <input
                  type="text"
                  required
                  value={form.medicine_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, medicine_name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none"
                  placeholder="e.g. Metformin 500mg"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-1">Dose</label>
                <input
                  type="text"
                  value={form.dose}
                  onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none"
                  placeholder="1 tablet"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-1">
                  Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none bg-white"
                >
                  {FREQUENCIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-1">
                  Times (HH:MM, comma-sep)
                </label>
                <input
                  type="text"
                  value={form.times}
                  onChange={(e) => setForm((f) => ({ ...f, times: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none"
                  placeholder="09:00, 21:00"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_days: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  <Check size={16} className="mr-1" />
                  {saving ? 'Saving…' : 'Create reminder'}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      )}

      <div className="grid gap-4">
        {reminders.map((reminder) => (
          <Card
            key={reminder.id}
            className={`transition-all ${
              reminder.active
                ? 'border-green-200 shadow-sm'
                : 'border-gray-200 bg-gray-50 opacity-75'
            }`}
          >
            <Card.Body className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    reminder.active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Bell size={24} />
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      reminder.active ? 'text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {reminder.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                      <Clock size={14} className="text-gray-400" />
                      {reminder.time}
                    </span>
                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      {reminder.schedule}
                    </span>
                    {reminder.dose && (
                      <span className="text-xs text-gray-500">{reminder.dose}</span>
                    )}
                    {reminder.duration && (
                      <span className="text-xs text-gray-500">{reminder.duration}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-4 sm:pt-0">
                <button
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => handleDelete(reminder)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                <button
                  onClick={() => handleToggle(reminder)}
                  className={`flex items-center gap-2 font-medium transition-colors ${
                    reminder.active ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {reminder.active ? (
                    <>
                      On <ToggleRight size={32} className="text-green-500" />
                    </>
                  ) : (
                    <>
                      Off <ToggleLeft size={32} className="text-gray-400" />
                    </>
                  )}
                </button>
              </div>
            </Card.Body>
          </Card>
        ))}

        {reminders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reminders set</h3>
            <p className="text-gray-500 mb-6">
              You haven't set up any medicine reminders yet.
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Create First Reminder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemindersPage;
