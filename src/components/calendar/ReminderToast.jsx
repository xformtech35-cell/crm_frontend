import React from 'react';
import Icon from '../Icon';

export default function ReminderToast({ toast, onSnooze, onComplete, onDismiss, onOpen }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl shadow-indigo-900/20 dark:border-indigo-500/30 dark:bg-slate-900 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 animate-pulse">
            <Icon name="mdi:bell-ring" className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Teams Calendar Reminder
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{toast.title}</h4>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
        >
          <Icon name="mdi:close" className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
        {toast.message || 'You have an upcoming event / reminder scheduled now.'}
      </p>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSnooze(toast.eventIdFk, 15)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          >
            ⏱️ Snooze 15m
          </button>
          <button
            onClick={() => onComplete(toast.eventIdFk)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-700"
          >
            ✓ Complete
          </button>
        </div>

        <button
          onClick={() => onOpen(toast.eventIdFk)}
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
        >
          View Event
          <Icon name="mdi:chevron-right" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
