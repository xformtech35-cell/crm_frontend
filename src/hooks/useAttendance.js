import { useApi } from "./useApi";

export function useAttendance() {
  const api = useApi();

  const punchIn = (location, status) => api.post("/attendance/punch-in", { location, status });
  const punchOut = () => api.post("/attendance/punch-out", {});
  const getToday = () => api.get("/attendance/today");
  const getHistory = () => api.get("/attendance/history");

  return { punchIn, punchOut, getToday, getHistory };
}
