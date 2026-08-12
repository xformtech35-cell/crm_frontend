import React, { useState, useEffect } from 'react';
import Icon from '../Icon';
import AppModal from '../common/AppModal';
import api from '../../utils/api';

export default function EventModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDatetime: '',
    endDatetime: '',
    isAllDay: false,
    eventType: 'MEETING',
    priority: 'MEDIUM',
    category: 'SALES',
    location: '',
    meetingLink: '',
    reminderEnabled: true,
    reminderMinutes: 15,
    recurrenceType: 'NONE',
    assignedTo: '',
    leadIdFk: '',
    opportunityIdFk: '',
    taskIdFk: '',
    attendeeUserIds: [],
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          startDatetime: initialData.startDatetime ? initialData.startDatetime.substring(0, 16) : '',
          endDatetime: initialData.endDatetime ? initialData.endDatetime.substring(0, 16) : '',
          isAllDay: initialData.isAllDay || false,
          eventType: initialData.eventType || 'MEETING',
          priority: initialData.priority || 'MEDIUM',
          category: initialData.category || 'SALES',
          location: initialData.location || '',
          meetingLink: initialData.meetingLink || '',
          reminderEnabled: initialData.reminderEnabled !== false,
          reminderMinutes: initialData.reminderMinutes || 15,
          recurrenceType: initialData.recurrenceType || 'NONE',
          assignedTo: initialData.assignedTo || '',
          leadIdFk: initialData.leadIdFk || '',
          opportunityIdFk: initialData.opportunityIdFk || '',
          taskIdFk: initialData.taskIdFk || '',
          attendeeUserIds: initialData.attendees ? initialData.attendees.map((a) => a.userId) : [],
        });
      } else {
        // Defaults
        const now = new Date();
        const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
        const endIso = new Date(now.getTime() + 60 * 60000 - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
        setFormData({
          title: '',
          description: '',
          startDatetime: nowIso,
          endDatetime: endIso,
          isAllDay: false,
          eventType: 'MEETING',
          priority: 'MEDIUM',
          category: 'SALES',
          location: '',
          meetingLink: '',
          reminderEnabled: true,
          reminderMinutes: 15,
          recurrenceType: 'NONE',
          assignedTo: '',
          leadIdFk: '',
          opportunityIdFk: '',
          taskIdFk: '',
          attendeeUserIds: [],
        });
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [membersRes, leadsRes, oppsRes, tasksRes] = await Promise.all([
        api.get('/team-members').catch(() => ({ data: [] })),
        api.get('/leads').catch(() => ({ data: [] })),
        api.get('/opportunities').catch(() => ({ data: [] })),
        api.get('/tasks').catch(() => ({ data: [] })),
      ]);

      setTeamMembers(Array.isArray(membersRes.data?.data) ? membersRes.data.data : Array.isArray(membersRes.data) ? membersRes.data : []);
      setLeads(Array.isArray(leadsRes.data?.data) ? leadsRes.data.data : Array.isArray(leadsRes.data) ? leadsRes.data : []);
      setOpportunities(Array.isArray(oppsRes.data?.data) ? oppsRes.data.data : Array.isArray(oppsRes.data) ? oppsRes.data : []);
      setTasks(Array.isArray(tasksRes.data?.data) ? tasksRes.data.data : Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (e) {
      console.error('Failed to load modal options:', e);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAttendeeToggle = (userId) => {
    setFormData((prev) => {
      const exists = prev.attendeeUserIds.includes(userId);
      return {
        ...prev,
        attendeeUserIds: exists ? prev.attendeeUserIds.filter((id) => id !== userId) : [...prev.attendeeUserIds, userId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please enter a title for the event.');
      return;
    }
    if (formData.startDatetime && formData.endDatetime && formData.endDatetime < formData.startDatetime) {
      setError('End time cannot be before start time.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event / Reminder' : 'New Teams Event / Reminder'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Sales Meeting with ABC Industries"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
            required
          />
        </div>

        {/* Type, Priority, Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Type</label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <option value="MEETING">📅 Meeting</option>
              <option value="REMINDER">🔔 Reminder</option>
              <option value="FOLLOW_UP">📞 Follow-up Call</option>
              <option value="TASK">📋 Task</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <option value="SALES">Sales</option>
              <option value="DEMO">Demo</option>
              <option value="FOLLOW_UP">Follow-Up</option>
              <option value="INTERNAL">Internal</option>
              <option value="CLIENT_CALL">Client Call</option>
            </select>
          </div>
        </div>

        {/* Start / End Datetime & All-day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
            <input
              type="datetime-local"
              name="startDatetime"
              value={formData.startDatetime}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
            <input
              type="datetime-local"
              name="endDatetime"
              value={formData.endDatetime}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isAllDay"
            name="isAllDay"
            checked={formData.isAllDay}
            onChange={handleChange}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isAllDay" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            All-Day Event
          </label>
        </div>

        {/* Reminder Before & Recurrence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reminder Before</label>
            <select
              name="reminderMinutes"
              value={formData.reminderMinutes}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <option value={0}>At time of event</option>
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before</option>
              <option value={15}>15 minutes before (Default)</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Repeat Recurrence</label>
            <select
              name="recurrenceType"
              value={formData.recurrenceType}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Every day</option>
              <option value="WEEKLY">Every week</option>
              <option value="MONTHLY">Every month</option>
            </select>
          </div>
        </div>

        {/* Location & Meeting Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location / Office Room</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Conference Room A / Client Office"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Virtual Meeting Link</label>
            <input
              type="url"
              name="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              placeholder="https://teams.microsoft.com/..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Link CRM Entity */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-3 dark:border-indigo-500/20 dark:bg-indigo-950/20">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <Icon name="mdi:link-variant" className="w-4 h-4 text-indigo-600" />
            Link to CRM Entity (Optional)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Link Lead</label>
              <select
                name="leadIdFk"
                value={formData.leadIdFk}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- No Lead --</option>
                {leads.map((l) => (
                  <option key={l.leadId || l.id} value={l.leadId || l.id}>
                    {l.leadName || l.companyName || `Lead #${l.leadId || l.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Link Opportunity</label>
              <select
                name="opportunityIdFk"
                value={formData.opportunityIdFk}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- No Opportunity --</option>
                {opportunities.map((o) => (
                  <option key={o.opportunityId || o.id} value={o.opportunityId || o.id}>
                    {o.opportunityTitle || o.title || `Opp #${o.opportunityId || o.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Link Task</label>
              <select
                name="taskIdFk"
                value={formData.taskIdFk}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- No Task --</option>
                {tasks.map((t) => (
                  <option key={t.taskId || t.id} value={t.taskId || t.id}>
                    {t.taskName || `Task #${t.taskId || t.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
          <textarea
            name="description"
            rows="2"
            value={formData.description}
            onChange={handleChange}
            placeholder="Agenda, notes, or client context..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50"
          >
            <Icon name="mdi:check" className="w-4 h-4" />
            {submitting ? 'Saving...' : initialData ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </AppModal>
  );
}
