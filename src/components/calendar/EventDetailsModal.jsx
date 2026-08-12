import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import AppModal from '../common/AppModal';

export default function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onSnooze,
  onComplete,
}) {
  const navigate = useNavigate();
  const [snoozing, setSnoozing] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!isOpen || !event) return null;

  const handleSnooze = async (mins) => {
    setSnoozing(true);
    try {
      await onSnooze(event.id, mins);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSnoozing(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(event.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  };

  const openLinkedEntity = () => {
    if (event.leadIdFk) {
      navigate(`/lead/${event.leadIdFk}`);
      onClose();
    } else if (event.opportunityIdFk) {
      navigate(`/opportunity/${event.opportunityIdFk}`);
      onClose();
    } else if (event.taskIdFk) {
      navigate(`/task/${event.taskIdFk}`);
      onClose();
    }
  };

  const startDateFormatted = event.startDatetime
    ? new Date(event.startDatetime).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const endDateFormatted = event.endDatetime
    ? new Date(event.endDatetime).toLocaleTimeString('en-US', {
        timeStyle: 'short',
      })
    : '';

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="Event / Reminder Details" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Header Ribbon */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {event.eventType || 'EVENT'}
              </span>
              {event.status && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    event.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : event.status === 'OVERDUE'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {event.status}
                </span>
              )}
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{event.title}</h2>
          </div>

          {event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm hover:bg-purple-700 shrink-0"
            >
              <Icon name="mdi:video" className="w-4 h-4" />
              Join Teams
            </a>
          )}
        </div>

        {/* Date & Time info */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-2 dark:border-white/5 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Icon name="mdi:clock-outline" className="w-4 h-4 text-indigo-500" />
            <span>
              {startDateFormatted} {endDateFormatted ? `- ${endDateFormatted}` : ''}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Icon name="mdi:map-marker-outline" className="w-4 h-4 text-red-500" />
              <span>{event.location}</span>
            </div>
          )}

          {event.reminderEnabled && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Icon name="mdi:bell-outline" className="w-4 h-4 text-amber-500" />
              <span>Reminder: {event.reminderMinutes || 15} minutes before</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes & Description</h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-white/5">
              {event.description}
            </p>
          </div>
        )}

        {/* Linked CRM Entity Button */}
        {(event.leadIdFk || event.opportunityIdFk || event.taskIdFk) && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 flex items-center justify-between dark:border-indigo-500/20 dark:bg-indigo-950/30">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
              <Icon name="mdi:database-search-outline" className="w-4 h-4 text-indigo-600" />
              <span>
                Linked CRM Entity:{' '}
                {event.leadIdFk
                  ? `Lead #${event.leadIdFk}`
                  : event.opportunityIdFk
                  ? `Opportunity #${event.opportunityIdFk}`
                  : `Task #${event.taskIdFk}`}
              </span>
            </div>
            <button
              type="button"
              onClick={openLinkedEntity}
              className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              Open Record
            </button>
          </div>
        )}

        {/* Snooze Control Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Snooze Reminder</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSnooze(5)}
              disabled={snoozing}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              ⏱️ +5 mins
            </button>
            <button
              onClick={() => handleSnooze(10)}
              disabled={snoozing}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              ⏱️ +10 mins
            </button>
            <button
              onClick={() => handleSnooze(30)}
              disabled={snoozing}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              ⏱️ +30 mins
            </button>
            <button
              onClick={() => handleSnooze(60)}
              disabled={snoozing}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              ⏱️ +1 hour
            </button>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400"
          >
            <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onEdit(event);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              Edit
            </button>
            <button
              onClick={handleComplete}
              disabled={completing || event.status === 'COMPLETED'}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <Icon name="mdi:check-circle-outline" className="w-4 h-4" />
              {completing ? 'Completing...' : event.status === 'COMPLETED' ? 'Completed' : 'Mark Completed'}
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
