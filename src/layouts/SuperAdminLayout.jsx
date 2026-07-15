import { useState, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import AppModal from "../components/common/AppModal";
import { useAuthStore } from "../stores/auth";
import { useAuth } from "../hooks/useAuth";
import { getInitials } from "../utils/format";
import { useApi } from "../hooks/useApi";

const pageTitles = {
  "/super-admin": "Super Admin Dashboard",
  "/super-admin/companies": "Manage Companies",
  "/super-admin/integrations": "Integrations",
  "/super-admin/settings": "Platform Settings",
  "/super-admin/audit": "Audit Logs",
  "/super-admin/analytics": "Platform Analytics",
  "/super-admin/leadsource": "Lead Sources",
  "/super-admin/leadgroup": "Lead Groups",
  "/super-admin/home": "CRM Dashboard",
  "/super-admin/activities": "Activities",
  "/super-admin/emails": "Emails",
  "/super-admin/calendar": "Calendar",
  "/super-admin/attendance": "Attendance",
  "/super-admin/lead": "Leads",
  "/super-admin/contact": "Contacts",
  "/super-admin/organization": "Organizations",
  "/super-admin/opportunity": "Opportunities",
  "/super-admin/pipeline": "Pipeline",
  "/super-admin/deals": "Deals",
  "/super-admin/project": "Projects",
  "/super-admin/task": "Tasks",
  "/super-admin/team": "Teams",
  "/super-admin/team-member": "Team Members",
  "/super-admin/crm-analytics": "CRM Analytics",
  "/super-admin/reports": "Reports",
  "/super-admin/automation": "Automation",
  "/super-admin/create-team": "Manage Teams",
  "/super-admin/role": "Roles & Permissions",
  "/super-admin/crm-settings": "CRM Settings",
};

const navGroups = [
  {
    label: "OVERVIEW",
    items: [
      {
        to: "/super-admin",
        label: "Dashboard",
        icon: "mdi:view-dashboard-outline",
        exact: true,
      },
    ],
  },
  {
    label: "COMPANY MANAGEMENT",
    items: [
      {
        to: "/super-admin/companies",
        label: "Companies",
        icon: "mdi:office-building-outline",
      },
      {
        to: "/super-admin/integrations",
        label: "Integrations",
        icon: "mdi:puzzle-outline",
      },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      {
        to: "/super-admin/analytics",
        label: "Platform Analytics",
        icon: "mdi:chart-bar",
      },
      {
        to: "/super-admin/audit",
        label: "Audit Logs",
        icon: "mdi:file-search-outline",
      },
      {
        to: "/super-admin/settings",
        label: "Platform Settings",
        icon: "mdi:cog-outline",
      },
    ],
  },
  {
    label: "CRM WORKSPACE",
    items: [
      {
        to: "/super-admin/home",
        label: "CRM Dashboard",
        icon: "mdi:view-dashboard-variant-outline",
      },
      {
        to: "/super-admin/activities",
        label: "Activities",
        icon: "mdi:timeline-text-outline",
      },
      {
        to: "/super-admin/emails",
        label: "Emails",
        icon: "mdi:email-fast-outline",
      },
      {
        to: "/super-admin/calendar",
        label: "Calendar",
        icon: "mdi:calendar-month-outline",
      },
      {
        to: "/super-admin/attendance",
        label: "Attendance",
        icon: "mdi:clock-check-outline",
      },
      {
        to: "/super-admin/lead",
        label: "Leads",
        icon: "mdi:account-arrow-right-outline",
      },
      {
        to: "/super-admin/leadsource",
        label: "Lead Sources",
        icon: "mdi:account-group-outline",
      },
      {
        to: "/super-admin/leadgroup",
        label: "Lead Groups",
        icon: "mdi:account-group-outline",
      },
      {
        to: "/super-admin/contact",
        label: "Contacts",
        icon: "mdi:contacts-outline",
      },
      {
        to: "/super-admin/organization",
        label: "Organizations",
        icon: "mdi:office-building-outline",
      },
      {
        to: "/super-admin/opportunity",
        label: "Opportunities",
        icon: "mdi:chart-line",
      },
      {
        to: "/super-admin/pipeline",
        label: "Pipeline",
        icon: "mdi:view-kanban-outline",
      },
      {
        to: "/super-admin/deals",
        label: "Deals",
        icon: "mdi:cash-multiple",
      },
      {
        to: "/super-admin/project",
        label: "Projects",
        icon: "mdi:folder-outline",
      },
      {
        to: "/super-admin/task",
        label: "Tasks",
        icon: "mdi:checkbox-marked-circle-outline",
      },
      {
        to: "/super-admin/team",
        label: "Teams",
        icon: "mdi:account-group-outline",
      },
      {
        to: "/super-admin/team-member",
        label: "Team Members",
        icon: "mdi:account-multiple-outline",
      },
      {
        to: "/super-admin/crm-analytics",
        label: "CRM Analytics",
        icon: "mdi:chart-donut",
      },
      {
        to: "/super-admin/reports",
        label: "Reports",
        icon: "mdi:file-chart-outline",
      },
      {
        to: "/super-admin/automation",
        label: "Automation",
        icon: "mdi:robot-outline",
      },
      {
        to: "/super-admin/create-team",
        label: "Manage Teams",
        icon: "mdi:account-supervisor-circle-outline",
      },
      {
        to: "/super-admin/role",
        label: "Roles & Permissions",
        icon: "mdi:shield-account-outline",
      },
      {
        to: "/super-admin/crm-settings",
        label: "CRM Settings",
        icon: "mdi:cog-outline",
      },
    ],
  },
];

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const api = useApi();
  const [companies, setCompanies] = useState([]);
  const selectedCompanyId = useAuthStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useAuthStore((s) => s.setSelectedCompanyId);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [headerBadge, setHeaderBadge] = useState(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("crm-theme") || "dark";
  });

  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/superadmin/companies")
        .then((data) => {
          setCompanies(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch companies for dropdown", err);
        });
    }
  }, [isSuperAdmin]);

  const handleCompanyChange = (e) => {
    const val = e.target.value;
    setSelectedCompanyId(val ? Number(val) : null);
    window.location.reload();
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/home", { replace: true });
    }
  }, [isSuperAdmin, navigate]);

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

  const pageTitle = useMemo(() => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname === path || location.pathname.startsWith(`${path}/`)) {
        return title;
      }
    }
    return "Super Admin";
  }, [location.pathname]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={`flex h-screen overflow-hidden relative transition-colors duration-300 ${
        theme === "dark"
          ? "text-slate-200 superadmin-dark-mode dark-theme"
          : "text-slate-800 light-theme superadmin-light-mode"
      }`}
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(135deg, #090a16 0%, #0f132c 50%, #171b3d 100%)"
            : "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 46%, #f8fafc 100%)",
      }}
    >
      {/* Ambient background glow orbs */}
      {theme === "dark" && (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
          <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
          <div className="absolute top-[35%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-pink-600/5 blur-[130px] pointer-events-none" />
        </>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 border-r transition-all duration-300 ${
          theme === "dark" ? "border-white/5 shadow-2xl" : "border-gray-200/80 shadow-lg"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{
          background:
            theme === "dark" ? "rgba(10, 12, 28, 0.45)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(32px)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              <Icon name="mdi:shield-crown-outline" className="text-white w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-base leading-none tracking-tight ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Super Admin</span>
              <p className="text-[10px] text-purple-500 font-bold mt-0.5 tracking-wider uppercase">
                Platform Control
              </p>
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-2xl p-4 shadow-lg border border-white/5 backdrop-blur-md" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))" }}>
            <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Platform Status</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
              <span className="text-white font-bold text-xs">All Systems Operational</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-center py-1.5 rounded-lg border border-white/5 bg-white/5">
                <p className="text-[10px] text-slate-400">Companies</p>
                <p className="text-white font-bold text-base leading-tight">—</p>
              </div>
              <div className="text-center py-1.5 rounded-lg border border-white/5 bg-white/5">
                <p className="text-[10px] text-slate-400">Active</p>
                <p className="text-emerald-400 font-bold text-base leading-tight">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 mb-2 text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item)
                      ? "text-white shadow-[0_0_20px_rgba(139,92,246,0.15)] border border-purple-500/20 bg-gradient-to-r from-purple-600/25 to-indigo-600/15"
                      : theme === "dark"
                      ? "text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-1"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:translate-x-1"
                  }`}
                >
                  <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                  {isActive(item) && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
            theme === "dark"
              ? "border-white/5 bg-white/5"
              : "border-gray-200/80 bg-slate-50/80"
          }`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{user?.username || user?.userEmail}</p>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide">Super Admin</p>
            </div>
            <button
              onClick={logout}
              className={`p-2 rounded-lg text-slate-400 hover:text-red-500 transition-all ${theme === "dark" ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}
              title="Logout"
            >
              <Icon name="mdi:logout-variant" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 overflow-hidden relative z-10">
        {/* Header */}
        <header
          className="flex-shrink-0 border-b sticky top-0 z-30 transition-all duration-300"
          style={{
            background: theme === "dark" ? "rgba(10, 12, 28, 0.45)" : "rgba(255, 255, 255, 0.85)",
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className={`md:hidden h-10 w-10 flex items-center justify-center rounded-xl border transition-colors ${
                    theme === "dark" ? "text-slate-400 border-white/5 hover:bg-white/10" : "text-slate-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Icon name="mdi:menu" className="w-5 h-5" />
                </button>

                <div className="hidden h-8 w-[2px] rounded-full bg-gradient-to-b from-purple-500 to-indigo-500 md:block" />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className={`text-base font-bold tracking-tight leading-tight truncate ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{pageTitle}</h1>
                    {headerBadge != null && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {headerBadge}
                      </span>
                    )}
                  </div>
                  <p className="hidden text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5 lg:block">
                    Platform Control Panel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Company Context Selector */}
                <div className="flex items-center gap-2 mr-2">
                  <span className={`text-xs font-semibold ${theme === "dark" ? "text-purple-400" : "text-purple-700"} hidden lg:inline`}>
                    View Context:
                  </span>
                  <select
                    value={selectedCompanyId || ""}
                    onChange={handleCompanyChange}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer ${
                      theme === "dark"
                        ? "border-white/10 bg-[#0c0e1c] text-slate-200 hover:bg-[#131730]"
                        : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    <option value="">Global (All Companies)</option>
                    {companies.map((c) => (
                      <option key={c.userid} value={c.userid}>
                        {c.username || c.companyContactPersonName || c.userEmail}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${
                    theme === "dark"
                      ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/10 bg-white/5"
                      : "border-gray-200 text-slate-500 hover:text-slate-800 hover:bg-gray-100 bg-white"
                  }`}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <Icon name={theme === "dark" ? "mdi:white-balance-sunny" : "mdi:weather-night"} className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button
                  className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${
                    theme === "dark"
                      ? "border-white/5 text-slate-400 hover:text-white hover:bg-white/10 bg-white/5"
                      : "border-gray-200 text-slate-500 hover:text-slate-800 hover:bg-gray-100 bg-white"
                  }`}
                  onClick={() => setNotificationsOpen(true)}
                  title="Notifications"
                >
                  <Icon name="mdi:bell-outline" className="w-5 h-5" />
                </button>

                {/* Role badge */}
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                  theme === "dark"
                    ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                    : "border-purple-200 bg-purple-50 text-purple-700"
                }`}>
                  <Icon name="mdi:shield-crown-outline" className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wide uppercase">Super Admin</span>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all ${
                    theme === "dark"
                      ? "border-red-500/20 text-red-400 hover:bg-red-500/10 bg-red-500/5"
                      : "border-red-200 text-red-600 hover:bg-red-50 bg-white"
                  }`}
                >
                  <Icon name="mdi:logout-variant" className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </button>

                {/* Avatar */}
                <div className="h-10 w-10 flex items-center justify-center rounded-xl text-xs font-bold text-white shadow-md border border-white/10" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet context={{ setHeaderBadge }} />
        </main>
      </div>

      {/* Notifications Modal */}
      <AppModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
      >
        <div className={`py-8 text-center border rounded-xl ${
          theme === "dark"
            ? "bg-slate-900 border-white/5 text-slate-400"
            : "bg-gray-50 border-gray-100 text-gray-500"
        }`}>
          <Icon name="mdi:bell-check-outline" className="mx-auto h-12 w-12 opacity-55" />
          <p className="mt-2 text-sm font-medium">No new notifications</p>
        </div>
      </AppModal>
    </div>
  );
}
