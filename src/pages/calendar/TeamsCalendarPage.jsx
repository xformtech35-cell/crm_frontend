import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/Icon';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import EventModal from '../../components/calendar/EventModal';
import EventDetailsModal from '../../components/calendar/EventDetailsModal';
import ReminderToast from '../../components/calendar/ReminderToast';

export default function TeamsCalendarPage() {
  const {
    events,
    activeToast,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    snoozeEvent,
    completeEvent,
    updateRsvp,
    dismissToast,
  } = useCalendarEvents();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'day', 'workweek', 'week', 'month'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, viewMode]);

  const loadCalendarData = () => {
    // Calculate range based on viewMode
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week' || viewMode === 'workweek') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Day view
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    fetchEvents(start.toISOString(), end.toISOString());
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week' || viewMode === 'workweek') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const handleSaveEvent = async (formData) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, formData);
    } else {
      await createEvent(formData);
    }
  };

  // Helper date generators for Views
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const days = [];
    const count = viewMode === 'workweek' ? 5 : 7;
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate, viewMode]);

  const monthGridDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastDayOfMonth.getDate();

    const grid = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }
    // Next month padding
    const remaining = 35 - grid.length;
    for (let i = 1; i <= (remaining < 0 ? 42 - grid.length : remaining); i++) {
      grid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return grid;
  }, [currentDate, viewMode]);

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 AM to 10:00 PM

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getEventsForDay = (day) => {
    if (!Array.isArray(events)) return [];
    return events.filter((e) => isSameDay(e.startDatetime, day));
  };

  const getCategoryColor = (category, priority) => {
    if (priority === 'URGENT') return 'bg-red-500 text-white border-red-600';
    switch (category) {
      case 'SALES':
        return 'bg-blue-600 text-white border-blue-700';
      case 'DEMO':
        return 'bg-purple-600 text-white border-purple-700';
      case 'FOLLOW_UP':
        return 'bg-amber-500 text-white border-amber-600';
      case 'CLIENT_CALL':
        return 'bg-emerald-600 text-white border-emerald-700';
      default:
        return 'bg-indigo-600 text-white border-indigo-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Teams Calendar Header Toolbar */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
              <Icon name="mdi:calendar-month-outline" className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teams Calendar & Reminder Operations Hub
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Today Button */}
            <button
              onClick={setToday}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              Today
            </button>

            {/* Prev / Next Nav */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-slate-800">
              <button
                onClick={() => navigateDate(-1)}
                className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <Icon name="mdi:chevron-left" className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateDate(1)}
                className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <Icon name="mdi:chevron-right" className="h-4 w-4" />
              </button>
            </div>

            {/* View Selector */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-slate-800">
              {['day', 'workweek', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    viewMode === mode
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {mode === 'workweek' ? 'Work Week' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* New Event Button */}
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-blue-500"
            >
              <Icon name="mdi:plus" className="h-4 w-4" />
              + New Event
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar View Body */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-xs font-bold text-slate-400">
            <Icon name="mdi:loading" className="h-6 w-6 animate-spin mr-2 text-indigo-600" />
            Loading Teams Calendar...
          </div>
        ) : viewMode === 'month' ? (
          /* MONTH VIEW */
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((cell, idx) => {
                const dayEvents = getEventsForDay(cell.date);
                const isToday = isSameDay(cell.date, new Date());

                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] rounded-2xl border p-2 flex flex-col justify-between transition-all ${
                      cell.isCurrentMonth
                        ? 'bg-slate-50/50 border-slate-100 dark:bg-slate-800/40 dark:border-white/5'
                        : 'bg-slate-100/30 border-transparent opacity-40 dark:bg-slate-900/50'
                    } ${isToday ? 'ring-2 ring-indigo-500/80 bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold ${
                          isToday
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white'
                            : cell.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                    </div>

                    {/* Events List */}
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[80px]">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          onClick={() => setSelectedEventDetails(e)}
                          className={`cursor-pointer truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold border shadow-2xs ${getCategoryColor(
                            e.category,
                            e.priority
                          )}`}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* WEEK & WORK WEEK & DAY VIEW */
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Header Row */}
              <div className="grid grid-cols-8 border-b border-slate-100 pb-2 dark:border-white/10">
                <div className="text-center text-xs font-bold text-slate-400">Time</div>
                {(viewMode === 'day' ? [currentDate] : weekDays).map((day, dIdx) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={dIdx}
                      className={`text-center ${
                        viewMode === 'day' ? 'col-span-7' : ''
                      }`}
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {day.toLocaleString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hourly Time Slots */}
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 min-h-[50px]">
                    <div className="pr-2 py-2 text-right text-[11px] font-semibold text-slate-400 border-r border-slate-100 dark:border-white/5">
                      {hour}:00
                    </div>

                    {(viewMode === 'day' ? [currentDate] : weekDays).map((day, dIdx) => {
                      const dayEvents = getEventsForDay(day).filter((e) => {
                        if (!e.startDatetime) return false;
                        const evHour = new Date(e.startDatetime).getHours();
                        return evHour === hour;
                      });

                      return (
                        <div
                          key={dIdx}
                          className={`p-1 border-r border-slate-100 dark:border-white/5 relative hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                            viewMode === 'day' ? 'col-span-7' : ''
                          }`}
                        >
                          {dayEvents.map((e) => (
                            <div
                              key={e.id}
                              onClick={() => setSelectedEventDetails(e)}
                              className={`cursor-pointer rounded-xl p-2 text-xs font-bold border shadow-xs mb-1 transition-transform hover:scale-[1.02] ${getCategoryColor(
                                e.category,
                                e.priority
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">{e.title}</span>
                                <span className="text-[9px] opacity-80 shrink-0">
                                  {new Date(e.startDatetime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              {e.location && (
                                <div className="text-[10px] opacity-90 truncate font-normal">
                                  📍 {e.location}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Popups */}
      <EventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={editingEvent}
      />

      <EventDetailsModal
        isOpen={!!selectedEventDetails}
        onClose={() => setSelectedEventDetails(null)}
        event={selectedEventDetails}
        onEdit={(e) => {
          setEditingEvent(e);
          setIsCreateModalOpen(true);
        }}
        onDelete={deleteEvent}
        onSnooze={snoozeEvent}
        onComplete={completeEvent}
      />

      {/* Teams Real-Time Toast Notification */}
      <ReminderToast
        toast={activeToast}
        onSnooze={snoozeEvent}
        onComplete={completeEvent}
        onDismiss={dismissToast}
        onOpen={(eventId) => {
          const ev = events.find((e) => e.id === eventId);
          if (ev) setSelectedEventDetails(ev);
        }}
      />
    </div>
  );
}
