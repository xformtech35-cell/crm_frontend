import { useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

export function useCalendarEvents() {
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (startIso, endIso) => {
    setLoading(true);
    setError(null);
    try {
      let url = '/calendar/events';
      const params = new URLSearchParams();
      if (startIso) params.append('start', startIso);
      if (endIso) params.append('end', endIso);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      const data = res.data?.data || res.data || [];
      setEvents(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError('Failed to load calendar events');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/calendar/events/notifications');
      const list = res.data?.data || res.data || [];
      setNotifications(list);

      // Check for pending due notification for toast alert
      const dueNotif = list.find((n) => n.status === 'SENT' || n.status === 'PENDING');
      if (dueNotif && (!activeToast || activeToast.id !== dueNotif.id)) {
        setActiveToast(dueNotif);
      }
    } catch (err) {
      console.error('Failed to fetch calendar notifications:', err);
    }
  }, [activeToast]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s Teams-like polling fallback
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const createEvent = async (eventData) => {
    try {
      const res = await api.post('/calendar/events', eventData);
      await fetchEvents();
      return res.data?.data || res.data;
    } catch (err) {
      console.error('Failed to create calendar event:', err);
      throw err;
    }
  };

  const updateEvent = async (id, eventData) => {
    try {
      const res = await api.put(`/calendar/events/${id}`, eventData);
      await fetchEvents();
      return res.data?.data || res.data;
    } catch (err) {
      console.error('Failed to update calendar event:', err);
      throw err;
    }
  };

  const deleteEvent = async (id, deleteSeries = false) => {
    try {
      await api.delete(`/calendar/events/${id}?deleteSeries=${deleteSeries}`);
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      throw err;
    }
  };

  const snoozeEvent = async (id, minutes = 15) => {
    try {
      const res = await api.post(`/calendar/events/${id}/snooze?minutes=${minutes}`);
      if (activeToast && activeToast.eventIdFk === id) {
        setActiveToast(null);
      }
      await fetchNotifications();
      await fetchEvents();
      return res.data;
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      throw err;
    }
  };

  const completeEvent = async (id) => {
    try {
      const res = await api.post(`/calendar/events/${id}/complete`);
      if (activeToast && activeToast.eventIdFk === id) {
        setActiveToast(null);
      }
      await fetchNotifications();
      await fetchEvents();
      return res.data;
    } catch (err) {
      console.error('Failed to complete reminder:', err);
      throw err;
    }
  };

  const updateRsvp = async (id, status) => {
    try {
      const res = await api.post(`/calendar/events/${id}/rsvp?status=${status}`);
      await fetchEvents();
      return res.data;
    } catch (err) {
      console.error('Failed to update RSVP:', err);
      throw err;
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  return {
    events,
    notifications,
    activeToast,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    snoozeEvent,
    completeEvent,
    updateRsvp,
    dismissToast,
  };
}
