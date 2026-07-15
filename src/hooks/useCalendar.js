import { useApi } from "./useApi";

export function useCalendar() {
  const api = useApi();
  const getEvents = (date) => {
    const url = date ? `/calendar/${date}` : "/calendar";
    return api.get(url);
  };
  const getAllEvents = () => api.get("/calendar/all");
  const deleteEvent = (id, type) =>
    api.del(`/calendar/events/${id}?type=${encodeURIComponent(type)}`);
  return { getEvents, getAllEvents, deleteEvent };
}
