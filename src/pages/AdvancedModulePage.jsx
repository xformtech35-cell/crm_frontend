import { useState, useEffect } from "react";
import ModuleWorkspace from "../components/module/ModuleWorkspace";
import { useAdvancedCrmData } from "../hooks/useAdvancedCrmData";
import { useNavigate } from "react-router-dom";
import { staticWorkspaceConfig } from "./moduleConfigs";
import { useActivity } from "../hooks/useActivity";
import { useCalendar } from "../hooks/useCalendar";
import { ACTIVITY_TYPE_COLORS } from "./activities/ActivitiesPage";
import Icon from "../components/Icon";
import AppDrawer from "../components/common/AppDrawer";
import { useTask } from "../hooks/useTask";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function parseCalendarDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDay(value, date) {
  const parsed = parseCalendarDate(value);
  return !!parsed && !!date &&
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth() &&
    parsed.getDate() === date.getDate();
}

function formatCalendarTime(value) {
  const parsed = parseCalendarDate(value);
  if (!parsed || String(value || "").match(/^\d{4}-\d{2}-\d{2}$/)) return "";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  const parsed = parseCalendarDate(value);
  if (!parsed) return "No date";
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const moduleMap = {
  pipeline: {
    title: "Pipeline",
    singular: "Pipeline Stage",
    subtitle: "",
    icon: "mdi:chart-timeline-variant",
    source: "pipelineStages",
    mapRows: (rows) =>
      rows.map((row, index) => ({
        id: index + 1,
        name: row.name,
        status: row.deals.length ? "Active" : "Open",
        count: row.deals.length,
        value: row.deals.reduce(
          (total, deal) => total + Number(deal.value || 0),
          0,
        ),
        linked: `${row.deals.length} opportunities`,
      })),
    primaryKey: "name",
    secondaryKey: "linked",
    statusKey: "status",
    statusOptions: ["Active", "Open"],
    columns: [
      { label: "Stage", key: "name", strong: true, width: "w-[28%]" },
      { label: "Status", key: "status", status: true, width: "w-[16%]" },
      { label: "Deals", key: "count", align: "right", width: "w-[12%]" },
      {
        label: "Forecast Value",
        key: "value",
        type: "currency",
        align: "right",
        width: "w-[20%]",
      },
      { label: "Linked", key: "linked", width: "w-[24%]" },
    ],
  },
  deals: {
    title: "Deals",
    singular: "Deal",
    subtitle: "",
    icon: "mdi:briefcase-variant-outline",
    source: "dealsList",
    mapRows: (rows) => rows,
    primaryKey: "title",
    secondaryKey: "company",
    statusKey: "stage",
    columns: [
      { label: "Deal", key: "title", strong: true, width: "w-[23%]" },
      { label: "Company", key: "company", width: "w-[19%]" },
      { label: "Stage", key: "stage", status: true, width: "w-[15%]" },
      { label: "Owner", key: "owner", width: "w-[15%]" },
      {
        label: "Value",
        key: "value",
        type: "currency",
        align: "right",
        width: "w-[15%]",
      },
      {
        label: "Probability",
        key: (item) => `${item.probability}%`,
        align: "right",
        width: "w-[13%]",
      },
    ],
  },
  activities: {
    title: "Activities",
    singular: "Activity",
    subtitle:
      "Unified activity feed from backend tasks and lead follow-up records.",
    icon: "mdi:timeline-clock-outline",
    source: "activityFeed",
    mapRows: (rows) => rows,
    primaryKey: "title",
    secondaryKey: "subject",
    statusKey: "type",
    statusOptions: ["Call", "Email", "Meeting", "Note"],
    columns: [
      { label: "Activity", key: "title", strong: true, width: "w-[24%]" },
      { label: "Type", key: "type", status: true, width: "w-[12%]" },
      { label: "Subject", key: "subject", width: "w-[22%]" },
      { label: "Owner", key: "owner", width: "w-[14%]" },
      { label: "Time", key: "time", width: "w-[12%]" },
      { label: "Note", key: "note", width: "w-[16%]" },
    ],
  },
  emails: {
    title: "Emails",
    singular: "Email Thread",
    subtitle:
      "Threaded inbox with lead, account, and deal context side by side.",
    icon: "mdi:email-multiple-outline",
    source: "inboxThreads",
    mapRows: (rows) =>
      rows.map((row) => ({ ...row, status: row.unread ? "Unread" : "Read" })),
    primaryKey: "subject",
    secondaryKey: "from",
    statusKey: "status",
    statusOptions: ["Unread", "Read"],
    columns: [
      { label: "Subject", key: "subject", strong: true, width: "w-[28%]" },
      { label: "From", key: "from", width: "w-[18%]" },
      { label: "Company", key: "company", width: "w-[18%]" },
      { label: "Status", key: "status", status: true, width: "w-[12%]" },
      { label: "Linked", key: "linked", width: "w-[14%]" },
      { label: "Time", key: "time", width: "w-[10%]" },
    ],
  },
  inbox: {
    title: "Inbox",
    singular: "Inbox Item",
    subtitle: "Prioritized inbound lead conversations and CRM context.",
    icon: "mdi:inbox-arrow-down-outline",
    source: "inboxThreads",
    mapRows: (rows) =>
      rows.map((row) => ({ ...row, status: row.unread ? "Unread" : "Read" })),
    primaryKey: "from",
    secondaryKey: "subject",
    statusKey: "status",
    statusOptions: ["Unread", "Read"],
    columns: [
      { label: "From", key: "from", strong: true, width: "w-[18%]" },
      { label: "Subject", key: "subject", width: "w-[24%]" },
      { label: "Company", key: "company", width: "w-[16%]" },
      { label: "Status", key: "status", status: true, width: "w-[12%]" },
      { label: "Preview", key: "preview", width: "w-[20%]" },
      { label: "Time", key: "time", width: "w-[10%]" },
    ],
  },
  analytics: {
    title: "Analytics",
    singular: "Analytics Dashboard",
    subtitle: "Overview of your sales & leads performance",
    icon: "mdi:chart-box-outline",
    isCustomComponent: true,
  },
  reports: {
    title: "Reports",
    singular: "Report",
    subtitle: "",
    icon: "mdi:file-chart-outline",
    source: "reportLibrary",
    mapRows: (rows) =>
      rows.map((row, index) => ({ ...row, id: index + 1, status: "Ready" })),
    primaryKey: "title",
    secondaryKey: "category",
    statusKey: "status",
    statusOptions: ["Ready"],
    columns: [
      { label: "Report", key: "title", strong: true, width: "w-[28%]" },
      { label: "Category", key: "category", width: "w-[16%]" },
      { label: "Status", key: "status", status: true, width: "w-[12%]" },
      { label: "Uses", key: "uses", align: "right", width: "w-[12%]" },
      { label: "Description", key: "description", width: "w-[32%]" },
    ],
  },
  automation: {
    title: "Automation",
    singular: "Workflow",
    subtitle: "",
    icon: "mdi:robot-outline",
    source: "workflows",
    mapRows: (rows) =>
      rows.map((row) => ({
        ...row,
        status: row.enabled ? "Enabled" : "Paused",
      })),
    primaryKey: "name",
    secondaryKey: "description",
    statusKey: "status",
    statusOptions: ["Enabled", "Paused"],
    columns: [
      { label: "Workflow", key: "name", strong: true, width: "w-[34%]" },
      { label: "Status", key: "status", status: true, width: "w-[16%]" },
      { label: "Description", key: "description", width: "w-[50%]" },
    ],
  },
  settings: {
    title: "Settings",
    singular: "Settings Section",
    subtitle: "",
    icon: "mdi:cog-outline",
    source: "settingsSections",
    mapRows: (rows) =>
      rows.map((row, index) => ({
        ...row,
        id: index + 1,
        status: "Active",
        summary: row.items.join(", "),
      })),
    primaryKey: "title",
    secondaryKey: "summary",
    statusKey: "status",
    statusOptions: ["Active"],
    columns: [
      { label: "Section", key: "title", strong: true, width: "w-[30%]" },
      { label: "Status", key: "status", status: true, width: "w-[16%]" },
      { label: "Items", key: "summary", width: "w-[54%]" },
    ],
  },
  calendar: {
    title: "Calendar",
    singular: "Event",
    subtitle: "Manage your events and reminders.",
    icon: "mdi:calendar-month-outline",
    source: "activityFeed",
    mapRows: (rows) =>
      rows.filter((row) => ["Meeting", "Reminder"].includes(row.type)),
    primaryKey: "title",
    secondaryKey: "subject",
    statusKey: "type",
    statusOptions: ["Meeting", "Reminder"],
    statusColors: ACTIVITY_TYPE_COLORS,
    searchKeys: ["title", "type", "subject", "owner", "note"],
    columns: [
      { label: "Event/Reminder", key: "title", strong: true, width: "w-[24%]" },
      { label: "Type", key: "type", status: true, width: "w-[12%]" },
      { label: "Subject", key: "subject", width: "w-[22%]" },
      { label: "Owner", key: "owner", width: "w-[14%]" },
      { label: "Time", key: "time", type: "date", width: "w-[12%]" },
      { label: "Note", key: "note", width: "w-[16%]" },
    ],
    formFields: [
      { name: "title", label: "Title", required: true, span: 2 },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: ["Meeting", "Reminder"],
        defaultValue: "Meeting",
      },
      { name: "subject", label: "Subject / Related To" },
      { name: "owner", label: "Owner" },
      { name: "time", label: "Date / Time", type: "datetime-local" },
      { name: "note", label: "Note", type: "textarea", span: 2 },
    ],
  },
};

// Analytics Dashboard Component - No external dependencies
function AnalyticsDashboard() {
  const { load } = useAdvancedCrmData();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeLeads: 0,
    conversionRate: 0,
  });
  const [salesData, setSalesData] = useState([
    { name: "Mon", value: 0 },
    { name: "Tue", value: 0 },
    { name: "Wed", value: 0 },
    { name: "Thu", value: 0 },
    { name: "Fri", value: 0 },
    { name: "Sat", value: 0 },
    { name: "Sun", value: 0 },
  ]);
  const [leadData, setLeadData] = useState([
    { name: "New Leads", value: 0 },
    { name: "Converted", value: 0 },
    { name: "Lost", value: 0 },
  ]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const state = await load(true);
        
        // Calculate revenue from deals
        const deals = state.dealsList || [];
        const totalRevenue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
        
        // Calculate leads data (adjust based on your actual leads structure)
        const leads = state.leadsList || [];
        const activeLeads = leads.length;
        // const convertedLeads = leads.filter(l => l.status === "Converted" || l.stage === "Closed Won").length;
        const lostLeads = leads.filter(l => l.status === "Lost" || l.stage === "Closed Lost").length;
        const conversionRate = activeLeads ? ((convertedLeads / activeLeads) * 100).toFixed(1) : 0;
        
        setStats({
          totalRevenue,
          activeLeads,
          conversionRate,
        });
        
        setLeadData([
          { name: "New Leads", value: Math.max(0, activeLeads - convertedLeads - lostLeads) },
          { name: "Converted", value: convertedLeads },
          { name: "Lost", value: lostLeads },
        ]);
        
        // Process weekly sales data from deals closed dates
        const weeklySales = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        deals.forEach(deal => {
          if (deal.closeDate && deal.status === "Closed Won") {
            const closeDate = new Date(deal.closeDate);
            if (closeDate >= startOfWeek && closeDate <= today) {
              const dayIndex = closeDate.getDay();
              weeklySales[dayIndex] += Number(deal.value) || 0;
            }
          }
        });
        
        setSalesData([
          { name: "Mon", value: weeklySales[1] },
          { name: "Tue", value: weeklySales[2] },
          { name: "Wed", value: weeklySales[3] },
          { name: "Thu", value: weeklySales[4] },
          { name: "Fri", value: weeklySales[5] },
          { name: "Sat", value: weeklySales[6] },
          { name: "Sun", value: weeklySales[0] },
        ]);
        
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    };
    
    fetchAnalyticsData();
  }, [load]);

  const COLORS = ["#6366F1", "#22C55E", "#EF4444"];

  const handleExportReport = () => {
    console.log("Exporting report...");
    alert("Report export feature coming soon!");
  };

  // Simple Card component inline
  const StatCard = ({ title, value }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold mt-1">
        {typeof value === 'number' && title === 'Total Revenue' ? `$${value.toLocaleString()}` : 
         typeof value === 'number' ? value.toLocaleString() : 
         value}
      </h2>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics CRM</h1>
          <p className="text-gray-500 text-sm">Overview of your sales & leads performance</p>
        </div>
        <button 
          onClick={handleExportReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Revenue" value={stats.totalRevenue} />
        <StatCard title="Active Leads" value={stats.activeLeads} />
        <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="font-semibold mb-4">Weekly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="font-semibold mb-4">Lead Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
              >
                {leadData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CalendarMonthView() {
  const { load } = useAdvancedCrmData();
  const calendarApi = useCalendar();
  const taskApi = useTask();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Meeting",
    time: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("All");

  const fetchEvents = async () => {
    try {
      const [calendarData, savedTasks] = await Promise.all([
        calendarApi.getAllEvents().catch(() => ({ events: [] })),
        taskApi.getAll().catch(() => []),
      ]);
      const taskEvents = (Array.isArray(savedTasks) ? savedTasks : []).map(
        (task) => ({
          type: "task",
          id: task.taskId,
          title: task.taskName,
          date:
            task.taskDueDate || task.taskStartDate || task.taskCompletedDate,
          priority: task.taskPriority,
          status: task.taskPercentageCompleted,
          note: task.taskDescription,
          owner: task.taskAssign || task.taskAssignedTo,
        }),
      );
      const calendarEvents = Array.isArray(calendarData.events) ? calendarData.events : [];
      const taskIds = new Set(taskEvents.map((event) => String(event.id)));
      const syncedEvents = calendarEvents.filter(
        (event) => event.type !== "task" || !taskIds.has(String(event.id)),
      );
      const rawReminderRows = Array.isArray(calendarData.reminders)
        ? calendarData.reminders.map((reminder) => ({
            type: "reminder",
            id: reminder.leadReminderId || reminder.id,
            title: reminder.reminderText || reminder.title,
            date: reminder.reminderDate || reminder.date,
            leadId: reminder.leadIdFk || reminder.leadId,
          }))
        : [];
      const reminderIds = new Set(syncedEvents.map((event) => `reminder-${event.id}`));
      const reminderEvents = rawReminderRows.filter(
        (event) => !reminderIds.has(`reminder-${event.id}`),
      );
      const rawEvents = [...taskEvents, ...syncedEvents, ...reminderEvents];

      const mappedEvents = rawEvents.map((e) => {
        let type;
        if (e.type === "task") {
          const priority = String(e.priority || "").toLowerCase();
          if (priority === "meeting") {
            type = "Meeting";
          } else if (priority === "reminder") {
            type = "Reminder";
          } else {
            type = "Task";
          }
        } else if (String(e.type || "").toLowerCase() === "meeting") {
          type = "Meeting";
        } else {
          type = "Reminder";
        }
        return {
          id: `${e.type}-${e.id}`,
          title: e.title || "Untitled",
          type,
          time: e.time || e.date,
          note: e.note || "",
          owner: e.owner || (e.leadId ? `Lead #${e.leadId}` : "Unassigned"),
        };
      });

      setEvents(mappedEvents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(
      new Date(year, month - 1, prevMonthDays - firstDayOfMonth + i + 1),
    );
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const remainder = days.length % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  const totalWeeks = days.length / 7;

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDay(date);
    setDayDetailOpen(true);
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter((e) => {
      if (
        filterType !== "All" &&
        String(e.type).toLowerCase() !== String(filterType).toLowerCase()
      )
        return false;
      return isSameCalendarDay(e.time, date);
    });
  };

  const getCalendarDate = () => (form.time ? form.time.slice(0, 10) : "");
  const getCalendarPriority = () => {
    if (form.type === "Meeting") return "meeting";
    if (form.type === "Reminder") return "reminder";
    return "Medium";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isoTime = form.time ? new Date(form.time).toISOString() : "";
      const calendarDate = getCalendarDate();

      const taskPayload = {
        taskName: form.title,
        taskDueDate: calendarDate,
        taskStartDate: calendarDate,
        taskDescription: form.note,
        taskPriority: getCalendarPriority(),
        taskPercentageCompleted: 0,
      };
      const createdTask = await taskApi.create(taskPayload);
      setEvents((prev) => [
        ...prev,
        {
          id: `task-${createdTask?.taskId || Date.now()}`,
          title: form.title,
          type: form.type,
          time: isoTime,
          note: form.note,
          owner: createdTask?.taskAssign || createdTask?.taskAssignedTo,
        },
      ]);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const badgeColor = (type) => {
    const color =
      ACTIVITY_TYPE_COLORS[type] || (type === "Task" ? "cyan" : "gray");
    const map = {
      blue: "bg-blue-100 text-blue-700 border border-blue-200",
      orange: "bg-orange-100 text-orange-700 border border-orange-200",
      yellow: "bg-amber-100 text-amber-700 border border-amber-200",
      indigo: "bg-indigo-100 text-indigo-700 border border-indigo-200",
      purple: "bg-purple-100 text-purple-700 border border-purple-200",
      cyan: "bg-cyan-100 text-cyan-700 border border-cyan-200",
      gray: "bg-gray-100 text-gray-700 border border-gray-200",
    };
    return map[color] || map.gray;
  };

  const selectedDayEvents = getEventsForDate(selectedDay);

  return (
    <div className="animate-fade-in flex flex-col gap-4 h-[calc(100vh-120px)] pb-4">
      <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Icon name="mdi:calendar-month" className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-semibold leading-none text-gray-900">Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T10:00`;
                setForm({
                  title: "",
                  type: "Task",
                  time: formattedDate,
                  note: "",
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 transition-colors whitespace-nowrap"
            >
              <Icon
                name="mdi:clipboard-check-outline"
                className="w-3.5 h-3.5"
              />
              Add Task
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T10:00`;
                setForm({
                  title: "",
                  type: "Reminder",
                  time: formattedDate,
                  note: "",
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors whitespace-nowrap"
            >
              <Icon name="mdi:bell-plus-outline" className="w-3.5 h-3.5" />
              Add Reminder
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T10:00`;
                setForm({
                  title: "",
                  type: "Meeting",
                  time: formattedDate,
                  note: "",
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors whitespace-nowrap"
            >
              <Icon name="mdi:calendar-plus" className="w-3.5 h-3.5" />
              Add Event
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800 w-36">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-0.5 bg-gray-50 rounded-md p-0.5 border border-gray-200">
              <button
                onClick={prevMonth}
                className="p-1 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
              >
                <Icon name="mdi:chevron-left" className="w-4 h-4" />
              </button>
              <button
                onClick={goToday}
                className="px-2 py-1 text-xs font-semibold rounded hover:bg-white hover:shadow-sm text-gray-700 transition-all"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-white hover:shadow-sm text-gray-600 transition-all"
              >
                <Icon name="mdi:chevron-right" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 rounded-md p-0.5 border border-gray-200">
            {[
              { label: "All", value: "All", dot: null },
              { label: "Meetings", value: "Meeting", dot: "bg-orange-500" },
              { label: "Reminders", value: "Reminder", dot: "bg-amber-500" },
              { label: "Tasks", value: "Task", dot: "bg-cyan-500" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                  filterType === f.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                {f.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              {d}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-7 flex-1 bg-gray-200 gap-px overflow-y-auto"
          style={{
            gridTemplateRows: `repeat(${totalWeeks}, minmax(120px, 1fr))`,
          }}
        >
          {days.map((date, i) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();

            const dayEvents = events.filter((e) => {
              if (
                filterType !== "All" &&
                String(e.type).toLowerCase() !==
                  String(filterType).toLowerCase()
              )
                return false;
              return isSameCalendarDay(e.time, date);
            });

            return (
              <div
                key={i}
                className={`p-2 flex flex-col cursor-pointer transition-colors ${isCurrentMonth ? "bg-white hover:bg-blue-50/30" : "bg-gray-50/50 hover:bg-gray-100"}`}
                onClick={() => handleDayClick(date)}
              >
                <div className="flex justify-end mb-1">
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-bold ${isToday ? "bg-blue-600 text-white shadow-sm" : isCurrentMonth ? "text-gray-700" : "text-gray-400"}`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {dayEvents.slice(0, dayEvents.length > 3 ? 2 : 3).map((e) => {
                    const timeStr = formatCalendarTime(e.time);

                    return (
                      <div
                        key={e.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate shrink-0 ${badgeColor(e.type)} ${!isCurrentMonth ? "opacity-60" : ""}`}
                        title={e.title}
                      >
                        {timeStr && <span className="mr-1">{timeStr}</span>}
                        {e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-blue-600 bg-blue-50 border border-blue-100 text-center shrink-0 hover:bg-blue-100 transition-colors"
                    >
                      + {dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AppDrawer
        open={dayDetailOpen}
        onClose={() => setDayDetailOpen(false)}
        title={selectedDay ? selectedDay.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) : "Calendar day"}
        subtitle="All events, tasks and meetings for this date"
        icon="mdi:calendar-month-outline"
        footer={
          <button
            type="button"
            onClick={() => {
              const date = selectedDay || new Date();
              const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T10:00`;
              setForm({ title: "", type: "Task", time: formattedDate, note: "" });
              setDayDetailOpen(false);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Icon name="mdi:plus" className="h-4 w-4" />
            Add Item
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {["All", "Meeting", "Reminder", "Task"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "All" ? "All" : `${type}s`}
              </button>
            ))}
          </div>

          {selectedDayEvents.length ? (
            <div className="space-y-2">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${badgeColor(event.type)}`}>
                      <Icon
                        name={event.type === "Meeting" ? "mdi:calendar-clock-outline" : event.type === "Reminder" ? "mdi:bell-outline" : "mdi:checkbox-marked-circle-outline"}
                        className="h-5 w-5"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{event.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeColor(event.type)}`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        {formatDateTime(event.time)}
                      </p>
                      {event.owner && (
                        <p className="mt-1 text-xs text-gray-400">Owner: {event.owner}</p>
                      )}
                      {event.note && (
                        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{event.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
              <Icon name="mdi:calendar-blank-outline" className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-700">No items on this date</p>
              <p className="mt-1 text-xs text-gray-400">Tasks, reminders, and events for the selected date will appear here.</p>
            </div>
          )}
        </div>
      </AppDrawer>

      <AppDrawer
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Add ${form.type}`}
        subtitle="Fill in the details to add this item to your calendar"
        icon="mdi:calendar-plus-outline"
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              form="calendar-item-form"
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="calendar-item-form" onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Event or reminder title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="Meeting">Event (Meeting)</option>
                <option value="Reminder">Reminder</option>
                <option value="Task">Task</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date / Time <span className="text-red-500">*</span></label>
              <input
                required
                type="datetime-local"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Note</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Optional details..."
            />
          </div>
        </form>
      </AppDrawer>
    </div>
  );
}

export default function AdvancedModulePage({ type }) {
  const { load } = useAdvancedCrmData();
  const activityApi = useActivity();
  const navigate = useNavigate();
  const definition = moduleMap[type];

  // Check for custom component first
  if (definition?.isCustomComponent) {
    if (type === "analytics") {
      return <AnalyticsDashboard />;
    }
  }

  const config = staticWorkspaceConfig({
    ...definition,
    rows: [],
  });

  const finalConfig = {
    ...config,
    load: async () => {
      const state = await load(true);
      return definition.mapRows(state[definition.source] || []);
    },
  };

  if (type === "calendar") {
    return <CalendarMonthView />;
  }

  return <ModuleWorkspace config={finalConfig} />;
}
