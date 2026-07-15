import { useState, useEffect, useMemo } from "react";
import Icon from "../../components/Icon";
import { useRole } from "../../hooks/useRole";
import { useTeamMember } from "../../hooks/useTeamMember";
import { useAuthStore } from "../../stores/auth";

const groupedPermissions = [
  {
    group: "MAIN",
    icon: "mdi:apps",
    modules: [
      {
        name: "Dashboard",
        viewPermission: { key: "dashboard.view", label: "View Dashboard" },
        actions: []
      },
      {
        name: "Activities",
        viewPermission: { key: "activities.view", label: "View Activities" },
        actions: []
      },
      {
        name: "Emails",
        viewPermission: { key: "emails.view", label: "View Emails" },
        actions: []
      },
      {
        name: "Calendar",
        viewPermission: { key: "calendar.view", label: "View Calendar" },
        actions: [
          { key: "calendar.create", label: "Create" },
          { key: "calendar.edit", label: "Edit" },
          { key: "calendar.delete", label: "Delete" }
        ]
      },
      {
        name: "Attendance",
        viewPermission: { key: "attendance.view", label: "View Attendance" },
        actions: [
          { key: "attendance.edit", label: "Edit Attendance" }
        ]
      }
    ]
  },
  {
    group: "SALES",
    icon: "mdi:currency-usd",
    modules: [
      {
        name: "Leads",
        viewPermission: { key: "leads.view", label: "View Leads" },
        actions: [
          { key: "leads.create", label: "Create" },
          { key: "leads.edit", label: "Edit" },
          { key: "leads.delete", label: "Delete" },
          { key: "leads.import", label: "Import" }
        ]
      },
      {
        name: "Contacts",
        viewPermission: { key: "contacts.view", label: "View Contacts" },
        actions: [
          { key: "contacts.create", label: "Create" },
          { key: "contacts.edit", label: "Edit" },
          { key: "contacts.delete", label: "Delete" }
        ]
      },
      {
        name: "Organizations",
        viewPermission: { key: "organizations.view", label: "View Organizations" },
        actions: [
          { key: "organizations.create", label: "Create" },
          { key: "organizations.edit", label: "Edit" },
          { key: "organizations.delete", label: "Delete" }
        ]
      },
      {
        name: "Opportunities / Pipeline / Deals",
        viewPermission: { key: "opportunities.view", label: "View Opportunities" },
        actions: [
          { key: "opportunities.create", label: "Create" },
          { key: "opportunities.edit", label: "Edit" },
          { key: "opportunities.delete", label: "Delete" }
        ]
      }
    ]
  },
  {
    group: "PROJECTS",
    icon: "mdi:folder-outline",
    modules: [
      {
        name: "Projects",
        viewPermission: { key: "projects.view", label: "View Projects" },
        actions: [
          { key: "projects.create", label: "Create" },
          { key: "projects.edit", label: "Edit" },
          { key: "projects.delete", label: "Delete" }
        ]
      },
      {
        name: "Tasks",
        viewPermission: { key: "tasks.view", label: "View Tasks" },
        actions: [
          { key: "tasks.create", label: "Create" },
          { key: "tasks.edit", label: "Edit" },
          { key: "tasks.delete", label: "Delete" }
        ]
      },
      {
        name: "Teams",
        viewPermission: { key: "teams.view", label: "View Teams" },
        actions: [
          { key: "teams.create", label: "Create" },
          { key: "teams.edit", label: "Edit" },
          { key: "teams.delete", label: "Delete" }
        ]
      },
      {
        name: "Team Members",
        viewPermission: { key: "users.view", label: "View Team Members" },
        actions: [
          { key: "users.create", label: "Create" },
          { key: "users.edit", label: "Edit" },
          { key: "users.delete", label: "Delete" }
        ]
      }
    ]
  },
  {
    group: "ANALYTICS",
    icon: "mdi:chart-bar",
    modules: [
      {
        name: "Analytics",
        viewPermission: { key: "analytics.view", label: "View Analytics" },
        actions: []
      },
      {
        name: "Reports",
        viewPermission: { key: "reports.view", label: "View Reports" },
        actions: []
      },
      {
        name: "Automation",
        viewPermission: { key: "automation.view", label: "View Automation" },
        actions: []
      }
    ]
  },
  {
    group: "ADMINISTRATION",
    icon: "mdi:cog-outline",
    modules: [
      {
        name: "Manage Teams",
        viewPermission: { key: "teams.view", label: "View Team Management" },
        actions: []
      },
      {
        name: "Roles & Permissions",
        viewPermission: { key: "roles.view", label: "View Roles & Permissions" },
        actions: [
          { key: "roles.create", label: "Create" },
          { key: "roles.edit", label: "Edit" },
          { key: "roles.delete", label: "Delete" }
        ]
      },
      {
        name: "Integrations",
        viewPermission: { key: "integrations.view", label: "View Integrations" },
        actions: [
          { key: "integrations.edit", label: "Edit" }
        ]
      },
      {
        name: "Settings",
        viewPermission: { key: "settings.view", label: "View Settings" },
        actions: []
      }
    ]
  }
];

export default function RolePage() {
  const roleHook = useRole();
  const teamMemberHook = useTeamMember();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const currentUserPermissions = useAuthStore((s) => s.user?.permissions || []);
  const currentUser = useAuthStore((s) => s.user);

  const visibleGroups = useMemo(() => {
    if (isSuperAdmin) return groupedPermissions;
    
    // Only show groups and modules where the current user has permission
    return groupedPermissions.map(group => {
      const filteredModules = group.modules.map(mod => {
        const hasView = currentUserPermissions.includes(mod.viewPermission.key);
        const filteredActions = mod.actions.filter(act => currentUserPermissions.includes(act.key));
        
        if (!hasView) return null;
        return {
          ...mod,
          actions: filteredActions
        };
      }).filter(Boolean);

      if (filteredModules.length === 0) return null;
      return {
        ...group,
        modules: filteredModules
      };
    }).filter(Boolean);
  }, [isSuperAdmin, currentUserPermissions]);

  const [roles, setRoles] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (selectRoleId = null) => {
    setLoading(true);
    try {
      const [rolesData, membersData] = await Promise.all([
        roleHook.getAll(),
        teamMemberHook.getAll().catch(() => [])
      ]);
      const fetchedRoles = Array.isArray(rolesData) ? rolesData : [];
      setRoles(fetchedRoles);
      setTeamMembers(Array.isArray(membersData) ? membersData : []);

      if (fetchedRoles.length > 0) {
        let roleToSelect = null;
        if (selectRoleId) {
          roleToSelect = fetchedRoles.find(r => r.roleId === selectRoleId);
        }
        if (!roleToSelect) {
          roleToSelect = fetchedRoles[0];
        }
        setSelectedRole(roleToSelect);
      } else {
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Failed to load roles data:", error);
      showToast("Failed to load roles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRole) {
      setSelectedPermissions([]);
      return;
    }

    const fetchPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const permsData = await roleHook.getPermissions(selectedRole.roleId);
        const permKeys = Array.isArray(permsData) ? permsData.map(p => p.grpPerm) : [];
        setSelectedPermissions(permKeys);
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
        showToast("Failed to fetch permissions", "error");
        setSelectedPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]);

  const getRecordCount = (role) => {
    if (!role) return 0;
    return teamMembers.filter(m => {
      const memberRoleStr = String(m.teamMemberRole).trim().toUpperCase();
      const roleIdStr = String(role.roleId).trim().toUpperCase();
      const roleNameStr = String(role.roleName).trim().toUpperCase();
      return memberRoleStr === roleIdStr || memberRoleStr === roleNameStr;
    }).length;
  };

  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesSearch = role.roleName?.toLowerCase().includes(term);
      const count = getRecordCount(role);
      const matchesFilter = filterStatus === "all" ||
                           (filterStatus === "high" && count > 10) ||
                           (filterStatus === "medium" && count >= 5 && count <= 10) ||
                           (filterStatus === "low" && count < 5);
      return matchesSearch && matchesFilter;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, searchTerm, filterStatus, teamMembers]);

  const isAdminRole = (role) => {
    if (!role) return false;
    const name = role.roleName?.toUpperCase();
    return name === 'ADMIN' || name === 'SUPER_ADMIN' || name === 'SUPER ADMIN';
  };

  const canModifyRole = (role) => {
    if (!role) return false;
    if (isAdminRole(role)) {
      return isSuperAdmin;
    }
    return true;
  };

  const canDeleteOrRenameRole = (role) => {
    if (!role) return false;
    if (isSuperAdmin) return true;
    // Non-super-admins cannot rename/delete system template roles (where userIdFk is null/undefined)
    if (role.userIdFk === null || role.userIdFk === undefined) {
      return false;
    }
    // Non-super-admins can only rename/delete roles they created
    return Number(role.userIdFk) === Number(currentUser?.userid);
  };

  const exportToCSV = () => {
    const headers = ["Role ID", "Role Name", "Assigned Users Count"];
    const csvData = filteredRoles.map(role => [
      role.roleId,
      role.roleName,
      getRecordCount(role)
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roles_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export completed successfully", "success");
  };

  const openCreateDrawer = () => {
    setEditingRole(null);
    setRoleName("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (role) => {
    setEditingRole(role);
    setRoleName(role.roleName);
    setDrawerOpen(true);
  };

  const saveRole = async () => {
    if (!roleName.trim()) {
      showToast("Role name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await roleHook.update(editingRole.roleId, { roleName: roleName.trim() });
        showToast(`Role "${roleName}" updated successfully`, "success");
        await loadData(editingRole.roleId);
      } else {
        const newRole = await roleHook.create({ roleName: roleName.trim() });
        showToast(`Role "${roleName}" created successfully`, "success");
        await loadData(newRole.roleId);
      }
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to save role:", error);
      showToast(error.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await roleHook.remove(deleteTarget.roleId);
      showToast(`Role "${deleteTarget.roleName}" deleted successfully`, "success");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error("Failed to delete role:", error);
      showToast(error.message || "Failed to delete role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (permissionKey) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionKey)) {
        return prev.filter((p) => p !== permissionKey);
      } else {
        return [...prev, permissionKey];
      }
    });
  };

  const handleToggleModule = (mod, checked) => {
    const keys = [mod.viewPermission.key, ...mod.actions.map(a => a.key)];
    setSelectedPermissions(prev => {
      if (checked) {
        const toAdd = keys.filter(k => !prev.includes(k));
        return [...prev, ...toAdd];
      } else {
        return prev.filter(k => !keys.includes(k));
      }
    });
  };

  const isModuleAllChecked = (mod) => {
    const keys = [mod.viewPermission.key, ...mod.actions.map(a => a.key)];
    return keys.every(k => selectedPermissions.includes(k));
  };

  const isModuleSomeChecked = (mod) => {
    const keys = [mod.viewPermission.key, ...mod.actions.map(a => a.key)];
    const count = keys.filter(k => selectedPermissions.includes(k)).length;
    return count > 0 && count < keys.length;
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    try {
      await roleHook.savePermissions(selectedRole.roleId, selectedPermissions);
      showToast("Permissions updated successfully", "success");
    } catch (error) {
      console.error("Failed to save permissions:", error);
      showToast("Failed to save permissions", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-2rem)] bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Role & Permission Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Fine-grained access control — define roles and assign module permissions
            </p>
          </div>
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Icon name="mdi:plus" className="h-4 w-4" />
            Create Role
          </button>
        </div>

        {/* Filter & Export Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Records</option>
              <option value="high">High Usage (&gt;10 records)</option>
              <option value="medium">Medium Usage (5-10 records)</option>
              <option value="low">Low Usage (&lt;5 records)</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Icon name="mdi:export" className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Master-Detail Panel Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel: Role List (col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Roles</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {filteredRoles.length} Total
                </span>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Role list items */}
              <div className="space-y-1 overflow-y-auto max-h-[500px] pr-1">
                {loading ? (
                  <div className="py-8 text-center text-sm text-slate-500">Loading roles...</div>
                ) : filteredRoles.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No roles found</div>
                ) : (
                  filteredRoles.map((role) => {
                    const isSelected = selectedRole?.roleId === role.roleId;
                    const count = getRecordCount(role);
                    const isSystem = isAdminRole(role) || role.userIdFk === null || role.userIdFk === undefined;
                    return (
                      <div
                        key={role.roleId}
                        onClick={() => setSelectedRole(role)}
                        className={`group flex items-center justify-between rounded-lg p-3 text-left transition-all border cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 shadow-sm"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isSelected ? "bg-blue-600 text-white" : "bg-indigo-50 text-indigo-600"
                          }`}>
                            <Icon name="mdi:shield-account" className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-semibold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                              {role.roleName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {count} {count === 1 ? "user" : "users"} assigned
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSystem && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 font-semibold shadow-sm">
                              System
                            </span>
                          )}
                          {canDeleteOrRenameRole(role) && (
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDrawer(role);
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                title="Rename role"
                              >
                                <Icon name="mdi:pencil-outline" className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(role);
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete role"
                              >
                                <Icon name="mdi:trash-can-outline" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Permissions Configurator (col-span-8) */}
          <div className="lg:col-span-8">
            {selectedRole ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-955">{selectedRole.roleName}</h2>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        Permissions Configurator
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure fine-grained module access for team members assigned to this role.
                    </p>
                  </div>

                  {canModifyRole(selectedRole) && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allKeys = groupedPermissions.flatMap(g => 
                            g.modules.flatMap(m => [m.viewPermission.key, ...m.actions.map(a => a.key)])
                          );
                          setSelectedPermissions(allKeys);
                        }}
                        disabled={loadingPermissions}
                        className="inline-flex items-center rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        disabled={loadingPermissions}
                        className="inline-flex items-center rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {/* Security Notice */}
                {isAdminRole(selectedRole) && !isSuperAdmin && (
                  <div className="rounded-lg bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200 flex items-start gap-2">
                    <Icon name="mdi:alert" className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>System Protected Role:</strong> This is a core administrative role. Permissions can only be modified by a <strong>Super Admin</strong>.
                    </span>
                  </div>
                )}

                {/* Permissions Matrix */}
                {loadingPermissions ? (
                  <div className="py-20 text-center text-sm text-slate-500">Loading permissions...</div>
                ) : (
                  <div className="space-y-6">
                    {visibleGroups.map((group) => (
                      <div key={group.group} className="rounded-xl border border-slate-200 bg-slate-50/10 overflow-hidden shadow-sm">
                        {/* Group Header */}
                        <div className="flex items-center gap-2 bg-slate-100/80 px-4 py-3 border-b border-slate-200">
                          <Icon name={group.icon} className="h-5 w-5 text-slate-600" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            {group.group} Group
                          </h3>
                        </div>

                        {/* Modules Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th scope="col" className="px-4 py-3 font-semibold text-slate-700 w-1/4">Module Name</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-slate-700 w-1/3">Main Group Permission (Sidebar View)</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Sub Group Permissions (Actions)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {group.modules.map((mod) => {
                                const allChecked = isModuleAllChecked(mod);
                                const someChecked = isModuleSomeChecked(mod);
                                const isReadOnly = !canModifyRole(selectedRole);
                                const isViewChecked = selectedPermissions.includes(mod.viewPermission.key);

                                return (
                                  <tr key={mod.name} className="hover:bg-slate-50/50 transition-colors">
                                    {/* Module Name */}
                                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                                      <div className="flex items-center gap-2">
                                        {!isReadOnly && (
                                          <input
                                            type="checkbox"
                                            checked={allChecked}
                                            ref={(el) => {
                                              if (el) el.indeterminate = someChecked;
                                            }}
                                            onChange={(e) => handleToggleModule(mod, e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                            title="Toggle all module permissions"
                                          />
                                        )}
                                        <span>{mod.name}</span>
                                      </div>
                                    </td>

                                    {/* Main View Permission */}
                                    <td className="px-4 py-4">
                                      <div className="flex items-center justify-between gap-4">
                                        <label className="flex items-center cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={isViewChecked}
                                            disabled={isReadOnly}
                                            onChange={() => handleTogglePermission(mod.viewPermission.key)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                          />
                                          <span className={`ml-2 text-xs font-semibold ${isViewChecked ? "text-slate-800" : "text-slate-500"}`}>
                                            {mod.viewPermission.label}
                                          </span>
                                        </label>
                                        <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded border">
                                          {mod.viewPermission.key}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Sub Action Permissions */}
                                    <td className="px-4 py-4">
                                      {mod.actions.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">No sub-actions available</span>
                                      ) : (
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                          {mod.actions.map((act) => {
                                            const isChecked = selectedPermissions.includes(act.key);
                                            return (
                                              <div key={act.key} className="flex items-center gap-2">
                                                <label className="flex items-center cursor-pointer select-none">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={isReadOnly || !isViewChecked}
                                                    onChange={() => handleTogglePermission(act.key)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                  />
                                                  <span className={`ml-1.5 text-xs ${isChecked ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                                                    {act.label}
                                                  </span>
                                                </label>
                                                <span className="text-[8px] text-slate-400 font-mono">
                                                  ({act.key.split(".")[1]})
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Panel */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                  <div className="text-xs text-slate-500">
                    {selectedPermissions.length} active permissions selected
                  </div>
                  {canModifyRole(selectedRole) && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || loadingPermissions}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition"
                    >
                      {savingPermissions ? (
                        <>
                          <Icon name="mdi:loading" className="h-4 w-4 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Icon name="mdi:check" className="h-4 w-4" />
                          Save Permissions
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center text-slate-400">
                <Icon name="mdi:shield-account-outline" className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No Role Selected</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select a role from the list to manage its module permissions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== CREATE/EDIT DRAWER ========== */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-[640px] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingRole ? "Rename Role" : "Create New Role"}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <Icon name="mdi:close" className="h-5 w-5" />
              </button>
            </div>
           
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g., Sales Rep, Support Manager"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setDrawerOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRole}
                disabled={saving || !roleName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Icon name="mdi:loading" className="h-4 w-4 animate-spin" />}
                {editingRole ? "Update" : "Create"} Role
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
            <div className="text-center">
              <Icon name="mdi:alert-circle-outline" className="mx-auto mb-3 h-12 w-12 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900">Delete Role</h3>
              <p className="mt-2 text-sm text-slate-500">
                Are you sure you want to delete the role <span className="font-semibold">{deleteTarget?.roleName}</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteRole}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving && <Icon name="mdi:loading" className="h-4 w-4 animate-spin" />}
                Delete Role
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
          toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
        }`}>
          <Icon name={toast.type === "success" ? "mdi:check-circle" : "mdi:alert-circle"} className="h-4 w-4" />
          {toast.message}
        </div>
      )}
    </section>
  );
}
