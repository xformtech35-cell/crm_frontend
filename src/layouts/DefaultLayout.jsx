import { useState, useEffect, useMemo } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import AppModal from "../components/common/AppModal";
import { useAuthStore } from "../stores/auth";
import { useAuth } from "../hooks/useAuth";
import { useLead } from "../hooks/useLead";
import { useOpportunity } from "../hooks/useOpportunity";
import { useCalendar } from "../hooks/useCalendar";
import { getInitials } from "../utils/format";

const pageTitles = {
  "/home": "Dashboard",
  "/lead": "Leads",
  "/negotiation": "Negotiations",
  "/opportunity": "Opportunities",
  "/contact": "Contacts",
  "/organization": "Organizations",
  "/pipeline": "Pipeline",
  "/deals": "Deals",
  "/activities": "Activities",
  "/emails": "Email",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/automation": "Automation",
  "/project": "Projects",
  "/task": "Tasks",
  "/calendar": "Calendar",
  "/attendance": "Attendance",
  "/team": "Teams",
  "/leadsource": "Lead Sources",
  "/leadgroup": "Lead Groups",
  "/team-member": "Team Members",
  "/create-team": "Manage Teams",
  "/role": "Roles & Permissions",
  "/settings": "Settings",
};

function getDateValue(...values) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function formatRelativeTime(date) {
  if (!date) return "Open now";
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);
  const suffix = diffMs >= 0 ? "from now" : "ago";

  if (minutes < 60) return `${Math.max(minutes, 1)} min ${suffix}`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ${suffix}`;
  return `${days} day${days === 1 ? "" : "s"} ${suffix}`;
}

function sortByNewest(items, getDate) {
  return [...items].sort((a, b) => {
    const bDate = getDate(b)?.getTime() || 0;
    const aDate = getDate(a)?.getTime() || 0;
    return bDate - aDate;
  });
}

export default function DefaultLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const { logout } = useAuth();
  const leadApi = useLead();
  const opportunityApi = useOpportunity();
  const calendarApi = useCalendar();

  // All useState hooks MUST come before any early returns (Rules of Hooks)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [headerBadge, setHeaderBadge] = useState(null);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("crm-read-notifications") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [notificationItems, setNotificationItems] = useState([]);

  const [activeNotifTab, setActiveNotifTab] = useState("all");
  const [notifSearch, setNotifSearch] = useState("");
  const [expandedNotifIds, setExpandedNotifIds] = useState(new Set());
  const [notifMenuOpenId, setNotifMenuOpenId] = useState(null);
  const [ignoredNotificationIds, setIgnoredNotificationIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("crm-ignored-notifications") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem("crm-ignored-notifications", JSON.stringify([...ignoredNotificationIds]));
  }, [ignoredNotificationIds]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("crm-theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("crm-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const initials = useMemo(
    () => getInitials(user?.username || user?.userEmail || ""),
    [user]
  );

  useEffect(() => {
    localStorage.setItem("crm-read-notifications", JSON.stringify([...readNotificationIds]));
  }, [readNotificationIds]);

  useEffect(() => {
    let alive = true;

    async function loadNotifications() {
      const [leadsData, opportunities, calendarData, notesData] = await Promise.all([
        leadApi.getAll().catch(() => []),
        opportunityApi.getAll().catch(() => []),
        calendarApi.getAllEvents().catch(() => ({ events: [], reminders: [] })),
        leadApi.getAllNotes().catch(() => []),
      ]);

      const leads = Array.isArray(leadsData) ? leadsData : [];
      const leadMap = {};
      leads.forEach((l) => {
        const id = l.leadId || l.id;
        if (id) {
          const name = `${l.leadFirstName || ""} ${l.leadLastName || ""}`.trim() || l.leadOrganisationName || "Lead";
          leadMap[id] = { name, ...l };
        }
      });

      const nextItems = [];

      // 1. Process Leads
      leads.forEach((lead) => {
        const leadId = lead.leadId || lead.id;
        const createdDate = getDateValue(lead.leadCreatedDate, lead.inquiryDate, lead.createdAt);
        if (createdDate && leadId) {
          const leadName = `${lead.leadFirstName || ""} ${lead.leadLastName || ""}`.trim() || lead.leadOrganisationName || "Lead";
          nextItems.push({
            id: `lead-${leadId}`,
            title: "New Lead Assigned",
            description: `${leadName} from ${lead.leadOrganisationName || "No Company"} is ready for follow-up`,
            time: formatRelativeTime(createdDate),
            dateValue: createdDate,
            icon: "mdi:account-arrow-right-outline",
            path: `/lead/${leadId}`,
            type: "lead",
          });
        }
      });

      // 2. Process Won Deals
      const opps = Array.isArray(opportunities) ? opportunities : [];
      opps.forEach((opp) => {
        const oppStatus = String(opp.oppStatus || opp.status || "").toLowerCase();
        if (oppStatus.includes("won")) {
          const closeDate = getDateValue(opp.oppActualCloseDate, opp.oppForcastCloseDate, opp.createdAt);
          if (closeDate) {
            nextItems.push({
              id: `deal-${opp.oppId || opp.id}`,
              title: "Deal Won",
              description: `${opp.oppName || "Opportunity"} closed successfully`,
              time: formatRelativeTime(closeDate),
              dateValue: closeDate,
              icon: "mdi:trophy-outline",
              path: "/deals",
              type: "deal",
            });
          }
        }
      });

      // 3. Process Reminders
      const remindersList = Array.isArray(calendarData.reminders) ? calendarData.reminders : [];
      remindersList.forEach((r) => {
        if (r.leadIdFk && leadMap[r.leadIdFk]) {
          const reminderDate = getDateValue(r.reminderDate);
          if (reminderDate) {
            const lead = leadMap[r.leadIdFk];
            nextItems.push({
              id: `reminder-${r.leadReminderId}`,
              title: `Reminder: ${lead.name}`,
              description: r.reminderText,
              time: formatRelativeTime(reminderDate),
              dateValue: reminderDate,
              icon: "mdi:bell-outline",
              path: `/lead/${r.leadIdFk}`,
              type: "reminder",
            });
          }
        }
      });

      // 4. Process Notes
      const notesList = Array.isArray(notesData) ? notesData : [];
      notesList.forEach((n) => {
        if (n.leadIdFk && leadMap[n.leadIdFk]) {
          const noteDate = getDateValue(n.noteDate);
          if (noteDate) {
            const lead = leadMap[n.leadIdFk];
            nextItems.push({
              id: `note-${n.leadNoteId}`,
              title: `New Note: ${lead.name}`,
              description: n.noteText,
              time: formatRelativeTime(noteDate),
              dateValue: noteDate,
              icon: "mdi:notebook-outline",
              path: `/lead/${n.leadIdFk}`,
              type: "note",
            });
          }
        }
      });

      // 5. Sort by date value descending
      const sorted = nextItems
        .filter((item) => item.dateValue)
        .sort((a, b) => b.dateValue.getTime() - a.dateValue.getTime());

      // Limit to top 20 notifications to keep it responsive
      if (alive) setNotificationItems(sorted.slice(0, 20));
    }

    loadNotifications();

    const handleRefresh = () => {
      if (alive) loadNotifications();
    };
    window.addEventListener("crm-notification-refresh", handleRefresh);

    return () => {
      alive = false;
      window.removeEventListener("crm-notification-refresh", handleRefresh);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const notifications = useMemo(
    () => (notificationItems || [])
      .filter((item) => !ignoredNotificationIds.has(item.id))
      .map((item) => ({
        ...item,
        read: readNotificationIds.has(item.id),
      })),
    [notificationItems, readNotificationIds, ignoredNotificationIds]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const tabCounts = useMemo(() => {
    const counts = { all: notifications.length, lead: 0, reminder: 0, note: 0, deal: 0 };
    notifications.forEach((n) => {
      if (counts[n.type] !== undefined) counts[n.type]++;
    });
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeNotifTab !== "all") {
      list = list.filter((n) => n.type === activeNotifTab);
    }
    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, activeNotifTab, notifSearch]);

  const markAllAsRead = () => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  };

  const clearAllRead = () => {
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    setIgnoredNotificationIds((prev) => {
      const next = new Set(prev);
      readIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearNotification = (id, e) => {
    if (e) e.stopPropagation();
    setIgnoredNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleRead = (id, e) => {
    if (e) e.stopPropagation();
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedNotifIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canAccess = (item) => {
    if (isSuperAdmin) return true;
    if (item.to === "/integrations") {
      return !!user?.integrationsAccess || hasAnyPermission(item.permissions);
    }
    if (!item.permissions || item.permissions.length === 0) return true;
    return hasAnyPermission(item.permissions);
  };

  const navGroups = useMemo(() => {
    const groups = [
      {
        label: "MAIN",
        items: [
          {
            to: "/home",
            label: "Dashboard",
            icon: "mdi:view-dashboard-outline",
            permissions: ["dashboard.view"],
          },
          {
            to: "/activities",
            label: "Activities",
            icon: "mdi:timeline-text-outline",
            permissions: ["activities.view"],
          },
          {
            to: "/emails",
            label: "Email",
            icon: "mdi:email-fast-outline",
            badge: "Live",
            permissions: ["emails.view"],
          },
          {
            to: "/calendar",
            label: "Calendar",
            icon: "mdi:calendar-month-outline",
            permissions: ["calendar.view"],
          },
          {
            to: "/attendance",
            label: "Attendance",
            icon: "mdi:clock-check-outline",
            permissions: ["attendance.view"],
          },
        ],
      },
      {
        label: "SALES",
        items: [
          {
            to: "/lead",
            label: "Leads",
            icon: "mdi:account-arrow-right-outline",
            permissions: ["leads.view"],
          },
           {
            to: "/leadsource",
            label: "Lead Sources",
            icon: "mdi:vector-link",
            permissions: ["leads.view"],
          },
          {
            to: "/leadgroup",
            label: "Lead Groups",
            icon: "mdi:folder-multiple-outline",
            permissions: ["leads.view"],
          },
          {
            to: "/contact",
            label: "Contacts",
            icon: "mdi:contacts-outline",
            permissions: ["contacts.view"],
          },
          {
            to: "/organization",
            label: "Organizations",
            icon: "mdi:office-building-outline",
            permissions: ["organizations.view"],
          },
          {
            to: "/opportunity",
            label: "Opportunities",
            icon: "mdi:chart-line",
            permissions: ["opportunities.view"],
          },
          {
            to: "/pipeline",
            label: "Pipeline",
            icon: "mdi:vector-polyline",
            permissions: ["opportunities.view"],
          },
          {
            to: "/deals",
            label: "Deals",
            icon: "mdi:cash-multiple",
            permissions: ["opportunities.view"],
          },
        ],
      },
      {
        label: "PROJECTS",
        items: [
          {
            to: "/project",
            label: "Projects",
            icon: "mdi:folder-outline",
            permissions: ["projects.view"],
          },
          {
            to: "/task",
            label: "Tasks",
            icon: "mdi:checkbox-marked-circle-outline",
            permissions: ["tasks.view"],
          },
          {
            to: "/team",
            label: "Teams",
            icon: "mdi:account-group-outline",
            permissions: ["teams.view"],
          },
          {
            to: "/team-member",
            label: "Team Members",
            icon: "mdi:account-multiple-outline",
            permissions: ["users.view"],
          },
        ],
      },
      {
        label: "ANALYTICS",
        items: [
          {
            to: "/analytics",
            label: "Analytics",
            icon: "mdi:chart-donut",
            permissions: ["analytics.view"],
          },
          {
            to: "/reports",
            label: "Reports",
            icon: "mdi:file-chart-outline",
            permissions: ["reports.view"],
          },
          {
            to: "/automation",
            label: "Automation",
            icon: "mdi:robot-outline",
            permissions: ["automation.view"],
          },
        ],
      },
    ];

    if (isAdmin) {
      groups.push({
        label: "ADMINISTRATION",
        items: [
          {
            to: "/create-team",
            label: "Manage Teams",
            icon: "mdi:account-supervisor-circle-outline",
            permissions: ["teams.view"],
          },
          {
            to: "/role",
            label: "Roles & Permissions",
            icon: "mdi:shield-account-outline",
            permissions: ["roles.view"],
          },
          {
            to: "/integrations",
            label: "Integrations",
            icon: "mdi:connection",
            permissions: ["integrations.view"],
          },
          {
            to: "/settings",
            label: "Settings",
            icon: "mdi:cog-outline",
            permissions: ["settings.view"],
          },
        ],
      });
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(canAccess),
      }))
      .filter((group) => group.items.length > 0);
  }, [isAdmin]);

  const filteredNavGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.to.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, searchQuery]);

  const commandItems = useMemo(() => {
    const allItems = navGroups.flatMap((g) => g.items);
    const query = commandSearch.trim().toLowerCase();
    if (!query) return allItems.slice(0, 10);
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.to.toLowerCase().includes(query)
    );
  }, [navGroups, commandSearch]);

  const quickCreateItems = [
    { to: "/lead", label: "New Lead", icon: "mdi:account-plus-outline", color: "blue" },
    { to: "/deals", label: "New Deal", icon: "mdi:cash-plus", color: "green" },
    { to: "/activities", label: "Log Activity", icon: "mdi:timeline-plus-outline", color: "purple" },
    { to: "/contact", label: "New Contact", icon: "mdi:account-plus", color: "orange" },
  ];

  const pageTitle = useMemo(() => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname === path || location.pathname.startsWith(`${path}/`)) {
        return title;
      }
    }
    return "Dashboard";
  }, [location.pathname]);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navigateTo = (path) => {
    setQuickCreateOpen(false);
    setNotificationsOpen(false);
    setCommandPaletteOpen(false);
    setUserMenuOpen(false);
    setSidebarOpen(false);
    navigate(path);
  };

  const openNotification = (notification) => {
    // console.log("Opening notification:", notification);
    setReadNotificationIds((prev) => new Set(prev).add(notification.id));
    setNotificationsOpen(false);
    navigate(notification.path || "/home");
  };

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuOpen && !e.target.closest(".user-menu")) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [userMenuOpen]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsOpen && !e.target.closest(".relative-notif-container")) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    if (isSuperAdmin) {
      const currentPath = location.pathname;
      if (currentPath === "/home" || currentPath === "/" || currentPath === "") {
        navigate("/super-admin", { replace: true });
      } else {
        const cleanPath = currentPath.startsWith("/super-admin") ? currentPath : `/super-admin${currentPath}`;
        navigate(cleanPath, { replace: true });
      }
    }
  }, [isSuperAdmin, location.pathname, navigate]);

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${theme === "dark" ? "text-slate-200 dark-theme" : "text-slate-800"
        }`}
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(135deg, #090a16 0%, #0f132c 50%, #171b3d 100%)"
            : "radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 46%, #f8fafc 100%)",
      }}
    >
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 border-r transition-all duration-300 ${theme === "dark"
          ? "border-white/5 bg-slate-950/45 shadow-2xl backdrop-blur-2xl"
          : "border-white/60 bg-white/92 shadow-[0_22px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          } ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo Area */}
        <div className={`px-5 py-4 border-b ${theme === "dark" ? "border-white/5" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_52%,#0f172a_100%)] flex items-center justify-center shadow-md shadow-blue-200/70">
              <Icon name="mdi:orbit-variant" className="text-white w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-lg leading-none ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                Xform CRM
              </span>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5 tracking-wide uppercase">
                Revenue Control Center
              </p>
            </div>
          </div>

          {/* <div className="mt-3 rounded-2xl bg-slate-950 text-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Quarter Momentum
                </p>
                <p className="text-2xl font-bold mt-2">78%</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                +12%
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,#60a5fa,#34d399)]" />
            </div>
          </div> */}

          <div className="mt-3 relative">
            <Icon
              name="mdi:magnify"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sidebar modules..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {filteredNavGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="nav-section-label">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-link ${isActive(item.to) ? "active" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon name={item.icon} className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className={`px-3 py-4 border-t ${theme === "dark" ? "border-white/5" : "border-slate-100"}`}>
          <div className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition-colors group ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                {user?.username}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 overflow-hidden">
        {/* Header - Fixed positioning */}
        <header
          className="flex-shrink-0 border-b sticky top-0 z-30 transition-all duration-300"
          style={{
            background: theme === "dark" ? "rgba(10, 12, 28, 0.45)" : "rgba(255, 255, 255, 0.85)",
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            backdropFilter: "blur(20px)",
            boxShadow: theme === "dark" ? "none" : "0 1px 8px rgb(0 0 0 / 0.06)",
          }}
        >
          <div className="px-4 md:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left section */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className={`md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors flex-shrink-0 ${theme === "dark" ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  <Icon name="mdi:menu" className="w-5 h-5" />
                </button>

                <div className="hidden h-9 w-1 rounded-full bg-gradient-to-b from-indigo-600 to-sky-500 md:block flex-shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className={`text-xl font-bold truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      {pageTitle}
                    </h1>
                    {headerBadge != null && (
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                        {headerBadge}
                      </span>
                    )}
                  </div>
                  <p className="hidden truncate text-xs leading-5 text-slate-500 lg:block">
                    Command center for pipeline and team operations.
                  </p>
                </div>
              </div>

              {/* Right section */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Search Button */}
                {/* <button
                  type="button"
                  className="hidden lg:flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 whitespace-nowrap"
                  onClick={() => setCommandPaletteOpen(true)}
                >
                  <Icon name="mdi:magnify" className="h-4 w-4 shrink-0" />
                  <span className="truncate">Search...</span>
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    ⌘K
                  </kbd> */}
                {/* </button> */}

                {/* Quick Create */}
                <button
                  type="button"
                  className="hidden md:flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm whitespace-nowrap"
                  onClick={() => setQuickCreateOpen(true)}
                >
                  <Icon name="mdi:plus" className="w-4 h-4" />
                  <span>Quick Create</span>
                </button>

                {/* Calendar */}
                <div className="hidden xl:flex h-10 items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 text-sm text-slate-500 shadow-sm whitespace-nowrap">
                  <Icon name="mdi:calendar-today" className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}</span>
                </div>

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`h-10 w-10 items-center justify-center rounded-xl border shadow-sm hidden md:inline-flex flex-shrink-0 transition-colors ${theme === "dark"
                    ? "border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                    : "border-slate-100 bg-white text-slate-500 hover:text-slate-800"
                    }`}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <Icon name={theme === "dark" ? "mdi:white-balance-sunny" : "mdi:weather-night"} className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <div className="relative relative-notif-container">
                  <button
                    type="button"
                    className={`relative h-10 w-10 items-center justify-center rounded-xl border shadow-sm hidden md:inline-flex flex-shrink-0 transition-colors ${theme === "dark"
                      ? "border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                      : "border-slate-100 bg-white text-slate-500 hover:text-slate-800"
                      }`}
                    onClick={() => setNotificationsOpen((v) => !v)}
                  >
                    <Icon name="mdi:bell-outline" className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {notificationsOpen && (
                    <div
                      className="absolute right-[-80px] md:right-[-120px] lg:right-[-140px] top-full mt-2.5 z-50 w-[460px] transition-all duration-200 origin-top-right transform scale-100"
                    >                      {/* Arrow pointing to bell icon */}
                      <div className={`absolute -top-1.5 right-[94px] md:right-[134px] lg:right-[154px] w-3 h-3 rotate-45 border-t border-l z-0 shadow-sm ${
                        theme === "dark" ? "bg-black border-white/10" : "bg-white border-slate-200/50"
                      }`} />

                      {/* Dropdown content wrapper */}
                      <div className={`relative z-10 rounded-2xl border shadow-2xl flex flex-col max-h-[550px] overflow-hidden ${
                        theme === "dark" ? "bg-black border-white/10" : "bg-white border-slate-200/50"
                      }`}>
                        {/* Header */}
                        <div className={`p-4 border-b flex items-center justify-between ${
                          theme === "dark" ? "border-white/5 bg-black" : "border-slate-100 bg-white"
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              theme === "dark" ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                            }`}>
                              <Icon name="mdi:bell" className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className={`font-semibold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Notification Center</h3>
                              {unreadCount > 0 && (
                                <p className={`text-[11px] font-semibold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>{unreadCount} unread items</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={markAllAsRead}
                              className={`p-1.5 rounded-lg transition-colors ${
                                theme === "dark"
                                  ? "text-slate-400 hover:bg-white/5 hover:text-white"
                                  : "text-gray-500 hover:bg-slate-100 hover:text-gray-800"
                              }`}
                              title="Mark all as read"
                            >
                              <Icon name="mdi:check-all" className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={clearAllRead}
                              className={`p-1.5 rounded-lg transition-colors ${
                                theme === "dark"
                                  ? "text-slate-400 hover:bg-white/5 hover:text-red-400"
                                  : "text-gray-500 hover:bg-slate-100 hover:text-red-600"
                              }`}
                              title="Clear all read"
                            >
                              <Icon name="mdi:playlist-remove" className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => setNotificationsOpen(false)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                theme === "dark"
                                  ? "text-slate-500 hover:bg-white/5 hover:text-white"
                                  : "text-gray-400 hover:bg-slate-100 hover:text-gray-650"
                              }`}
                            >
                              <Icon name="mdi:close" className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Tabs */}
                        <div className={`border-b p-2 ${
                          theme === "dark" ? "border-white/5 bg-neutral-900" : "border-slate-100 bg-slate-50"
                        }`}>
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                            {["all", "lead", "reminder", "note", "deal"].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveNotifTab(tab)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap flex items-center gap-1 ${activeNotifTab === tab
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : theme === "dark"
                                    ? "text-slate-400 hover:bg-white/5 hover:text-white"
                                    : "text-gray-500 hover:bg-slate-200/50 hover:text-gray-800"
                                  }`}
                              >
                                {tab === "all" ? "All" : tab + "s"}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  activeNotifTab === tab
                                    ? "bg-white/25 text-white"
                                    : theme === "dark"
                                      ? "bg-white/10 text-slate-300"
                                      : "bg-slate-200 text-gray-600"
                                }`}>
                                  {tabCounts[tab] || 0}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 border-b border-slate-100 dark:border-white/5">
                          <div className="relative">
                            <Icon name="mdi:magnify" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={notifSearch}
                              onChange={(e) => setNotifSearch(e.target.value)}
                              placeholder="Search notifications..."
                              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 ${
                                theme === "dark"
                                  ? "border-white/10 bg-slate-900 text-slate-200"
                                  : "border-slate-200 bg-slate-50 text-gray-700"
                              }`}
                            />
                            {notifSearch && (
                              <button
                                onClick={() => setNotifSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <Icon name="mdi:close-circle" className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent">
                          {filteredNotifications.length === 0 ? (
                            <div className="py-12 text-center">
                              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                <Icon name="mdi:bell-off" className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications found</p>
                            </div>
                          ) : (
                            filteredNotifications.map((n) => {
                              const isExpanded = expandedNotifIds.has(n.id);

                              const typeConfig = {
                                lead: {
                                  bg: theme === "dark" ? "bg-blue-500/10" : "bg-blue-50",
                                  text: theme === "dark" ? "text-blue-400" : "text-blue-600",
                                  label: "Lead"
                                },
                                reminder: {
                                  bg: theme === "dark" ? "bg-amber-500/10" : "bg-amber-50",
                                  text: theme === "dark" ? "text-amber-400" : "text-amber-600",
                                  label: "Reminder"
                                },
                                note: {
                                  bg: theme === "dark" ? "bg-violet-500/10" : "bg-violet-50",
                                  text: theme === "dark" ? "text-violet-400" : "text-violet-600",
                                  label: "Note"
                                },
                                deal: {
                                  bg: theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50",
                                  text: theme === "dark" ? "text-emerald-400" : "text-emerald-600",
                                  label: "Deal Won"
                                }
                              }[n.type] || {
                                bg: theme === "dark" ? "bg-white/5" : "bg-gray-50",
                                text: theme === "dark" ? "text-gray-400" : "text-gray-600",
                                label: "System"
                              };

                              return (
                                <div
                                  key={n.id}
                                  className={`group relative rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${n.read
                                    ? theme === "dark"
                                      ? "border-white/5 bg-black opacity-85"
                                      : "border-slate-100 bg-white opacity-85"
                                    : theme === "dark"
                                      ? "border-blue-500/20 bg-blue-500/5 shadow-sm"
                                      : "border-blue-100 bg-blue-50/15 shadow-sm"
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${typeConfig.bg} ${typeConfig.text}`}>
                                      <Icon name={n.icon || "mdi:bell-outline"} className="h-5 w-5" />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.text}`}>
                                          {typeConfig.label}
                                        </span>
                                        {!n.read && (
                                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                        )}
                                      </div>

                                      <p className={`text-sm font-semibold leading-snug ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                        {n.title}
                                      </p>

                                      <p className={`mt-1 text-xs transition-all ${isExpanded ? "" : "line-clamp-2"} ${theme === "dark" ? "text-gray-300" : "text-gray-555"}`}>
                                        {n.description}
                                      </p>

                                      {n.description && n.description.length > 80 && (
                                        <button
                                          onClick={(e) => toggleExpand(n.id, e)}
                                          className="mt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                        >
                                          {isExpanded ? "Show Less" : "Show More"}
                                          <Icon name={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      <div className="mt-2.5 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400 dark:text-slate-400 flex items-center gap-1">
                                          <Icon name="mdi:clock-outline" className="w-3 h-3" />
                                          {n.time}
                                        </span>

                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={(e) => toggleRead(n.id, e)}
                                            className={`p-1 rounded-md transition-colors ${n.read ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 dark:hover:bg-white/10'}`}
                                            title={n.read ? "Mark as unread" : "Mark as read"}
                                          >
                                            <Icon name={n.read ? "mdi:email-outline" : "mdi:email-open-outline"} className="w-3.5 h-3.5" />
                                          </button>

                                          {n.type === "reminder" && (
                                            <button
                                              onClick={(e) => clearNotification(n.id, e)}
                                              className="p-1 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-white/10 transition-colors"
                                              title="Snooze reminder"
                                            >
                                              <Icon name="mdi:alarm-snooze" className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          {n.path && (
                                            <button
                                              onClick={() => openNotification(n)}
                                              className="p-1 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-white/10 transition-colors"
                                              title="Go to details"
                                            >
                                              <Icon name="mdi:open-in-new" className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          <button
                                            onClick={(e) => clearNotification(n.id, e)}
                                            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/10 transition-colors"
                                            title="Dismiss"
                                          >
                                            <Icon name="mdi:close-circle-outline" className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className={`flex h-10 items-center gap-2 rounded-xl border transition-all shadow-sm whitespace-nowrap ${theme === "dark"
                    ? "border-red-500/20 text-red-400 hover:bg-red-500/10 bg-red-500/5"
                    : "border-red-200 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300"
                    }`}
                >
                  <Icon name="mdi:logout-variant" className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </button>

                {/* User Avatar */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-xs font-bold text-white shadow-sm flex-shrink-0">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-5 animate-fade-in">
          <Outlet context={{ setHeaderBadge }} />
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Quick Create Modal */}
      <AppModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        title="Quick Create"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {quickCreateItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigateTo(item.to)}
              className="group flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-200 hover:bg-blue-50"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg bg-${item.color}-50 text-${item.color}-600`}
              >
                <Icon name={item.icon} className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">Create a new {item.label.toLowerCase()}</p>
              </div>
            </button>
          ))}
        </div>
      </AppModal>

      {/* Notifications Modal Overlay - Removed and replaced by dropdown in header */}

      {/* Command Palette Modal */}
      <AppModal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        title="Command Palette"
        size="2xl"
      >
        <div className="relative mb-4">
          <Icon
            name="mdi:magnify"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={commandSearch}
            onChange={(e) => setCommandSearch(e.target.value)}
            placeholder="Search for pages, actions, or settings..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {commandItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No results found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {commandItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigateTo(item.to)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  <Icon name={item.icon} className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.to}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </AppModal>
    </div>
  );
}
