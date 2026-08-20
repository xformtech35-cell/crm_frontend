import { useState, useEffect, useMemo } from "react";
import Icon from "../../components/Icon";
import { useRole } from "../../hooks/useRole";
import { useTeamMember } from "../../hooks/useTeamMember";
import { useUserPermission } from "../../hooks/useUserPermission";
import { useAuthStore } from "../../stores/auth";
import { useApi } from "../../hooks/useApi";

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
        name: "Negotiations",
        viewPermission: { key: "negotiations.view", label: "View Negotiations" },
        actions: [
          { key: "negotiations.edit", label: "Edit / Revise Quotations" }
        ]
      },
      {
        name: "IndiaMART Leads",
        viewPermission: { key: "indiamart.view", label: "View IndiaMART Leads" },
        actions: [
          { key: "indiamart.create", label: "Create / Sync" },
          { key: "indiamart.edit", label: "Edit" },
          { key: "indiamart.delete", label: "Delete" }
        ]
      },
      {
        name: "TradeIndia Leads",
        viewPermission: { key: "tradeindia.view", label: "View TradeIndia Leads" },
        actions: [
          { key: "tradeindia.create", label: "Create / Sync" },
          { key: "tradeindia.edit", label: "Edit" },
          { key: "tradeindia.delete", label: "Delete" }
        ]
      },
      {
        name: "Lead Masters (Status, Source, Group)",
        viewPermission: { key: "leads.view", label: "View Lead Masters" },
        actions: [
          { key: "leads.create", label: "Create Masters" },
          { key: "leads.edit", label: "Edit Masters" },
          { key: "leads.delete", label: "Delete Masters" }
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
        name: "Team Leads",
        viewPermission: { key: "team_leads.view", label: "View Team Leads" },
        actions: [
          { key: "team_leads.edit", label: "Manage Team Leads" }
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
        name: "Data Access Config",
        viewPermission: { key: "data_access.view", label: "View Data Access Config" },
        actions: [
          { key: "data_access.edit", label: "Configure Access Scopes" }
        ]
      },
      {
        name: "Settings",
        viewPermission: { key: "settings.view", label: "View Settings" },
        actions: []
      },
      {
        name: "Trash / Recycle Bin",
        viewPermission: { key: "trash.view", label: "View Trash" },
        actions: [
          { key: "trash.restore", label: "Restore Items" },
          { key: "trash.delete", label: "Permanently Delete" }
        ]
      }
    ]
  }
];

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: [
    "dashboard.view", "activities.view", "emails.view", "calendar.view", "calendar.create", "calendar.edit", "calendar.delete",
    "attendance.view", "attendance.edit", "leads.view", "leads.create", "leads.edit", "leads.delete", "leads.import",
    "negotiations.view", "negotiations.edit", "contacts.view", "contacts.create", "contacts.edit", "contacts.delete",
    "organizations.view", "organizations.create", "organizations.edit", "organizations.delete",
    "opportunities.view", "opportunities.create", "opportunities.edit", "opportunities.delete",
    "projects.view", "projects.create", "projects.edit", "projects.delete",
    "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
    "teams.view", "teams.create", "teams.edit", "teams.delete", "team_leads.view", "team_leads.edit",
    "users.view", "users.create", "users.edit", "users.delete",
    "analytics.view", "reports.view", "automation.view", "roles.view", "roles.create", "roles.edit", "roles.delete",
    "integrations.view", "integrations.edit", "data_access.view", "data_access.edit", "settings.view",
    "trash.view", "trash.restore", "trash.delete"
  ],
  "TEAM LEAD": [
    "dashboard.view", "activities.view", "emails.view", "calendar.view", "calendar.create", "calendar.edit", "calendar.delete",
    "attendance.view", "attendance.edit", "leads.view", "leads.create", "leads.edit", "leads.delete", "leads.import",
    "negotiations.view", "negotiations.edit", "contacts.view", "contacts.create", "contacts.edit",
    "organizations.view", "organizations.create", "organizations.edit",
    "opportunities.view", "opportunities.create", "opportunities.edit",
    "projects.view", "projects.create", "projects.edit", "tasks.view", "tasks.create", "tasks.edit",
    "teams.view", "teams.create", "team_leads.view", "users.view", "users.create",
    "analytics.view", "reports.view"
  ],
  "SALES EXECUTIVE": [
    "dashboard.view", "activities.view", "emails.view", "calendar.view", "calendar.create", "calendar.edit",
    "attendance.view", "leads.view", "leads.create", "leads.edit",
    "negotiations.view", "contacts.view", "contacts.create",
    "organizations.view", "organizations.create",
    "opportunities.view", "opportunities.create",
    "projects.view", "tasks.view", "tasks.create"
  ]
};

export default function RolePage() {
  const roleHook = useRole();
  const teamMemberHook = useTeamMember();
  const userPermissionHook = useUserPermission();
  const api = useApi();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const currentUserPermissions = useAuthStore((s) => s.user?.permissions || []);
  const currentUser = useAuthStore((s) => s.user);
  const selectedCompanyId = useAuthStore((s) => s.selectedCompanyId);
  const [contextCompany, setContextCompany] = useState(null);

  // Tab mode: "roles" (Manage by Roles) or "users" (Manage by User)
  const [activeTabMode, setActiveTabMode] = useState("roles");

  const visibleGroups = useMemo(() => {
    if (isSuperAdmin || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
      return groupedPermissions;
    }
    
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
  }, [isSuperAdmin, currentUser, currentUserPermissions]);

  const [roles, setRoles] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Selection states
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasCustomUserPerms, setHasCustomUserPerms] = useState(false);

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
        roleHook.getAll(selectedCompanyId),
        teamMemberHook.getAll().catch(() => [])
      ]);
      const fetchedRoles = Array.isArray(rolesData) ? rolesData : [];
      const fetchedMembers = Array.isArray(membersData) ? membersData : [];
      setRoles(fetchedRoles);
      setTeamMembers(fetchedMembers);

      if (fetchedRoles.length > 0) {
        let roleToSelect = selectRoleId ? fetchedRoles.find(r => r.roleId === selectRoleId) : fetchedRoles[0];
        setSelectedRole(roleToSelect || fetchedRoles[0]);
      } else {
        setSelectedRole(null);
      }

      if (fetchedMembers.length > 0 && !selectedUser) {
        setSelectedUser(fetchedMembers[0]);
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
  }, [selectedCompanyId]);

  useEffect(() => {
    if (isSuperAdmin && selectedCompanyId) {
      api.get("/superadmin/companies")
        .then((companies) => {
          const found = Array.isArray(companies)
            ? companies.find((c) => c.userid === selectedCompanyId || c.userid === Number(selectedCompanyId))
            : null;
          setContextCompany(found || null);
        })
        .catch(() => setContextCompany(null));
    } else {
      setContextCompany(null);
    }
  }, [isSuperAdmin, selectedCompanyId]);

  // Load Permissions for Selected Role (in "roles" mode)
  useEffect(() => {
    if (activeTabMode !== "roles") return;
    if (!selectedRole) {
      setSelectedPermissions([]);
      return;
    }

    const fetchPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const permsData = await roleHook.getPermissions(selectedRole.roleId).catch(() => []);
        let permKeys = Array.isArray(permsData) ? permsData.map(p => p.grpPerm) : [];
        const rName = selectedRole.roleName?.toUpperCase() || "";

        if (permKeys.length === 0 && DEFAULT_ROLE_PERMISSIONS[rName]) {
          permKeys = DEFAULT_ROLE_PERMISSIONS[rName];
        } else if (rName === "ADMIN") {
          const adminKeysToAdd = ["negotiations.view", "negotiations.edit"].filter(k => !permKeys.includes(k));
          if (adminKeysToAdd.length > 0) {
            permKeys = [...permKeys, ...adminKeysToAdd];
          }
        }

        const isGlobalAdminRole = selectedRole.roleName?.toUpperCase() === "ADMIN" && selectedRole.userIdFk == null;
        if (isSuperAdmin && contextCompany && isGlobalAdminRole) {
          const companyHasIntegrations = !!contextCompany.integrationsAccess;
          if (!companyHasIntegrations) {
            permKeys = permKeys.filter(k => k !== "integrations.view" && k !== "integrations.edit");
          } else {
            if (!permKeys.includes("integrations.view")) {
              permKeys = [...permKeys, "integrations.view", "integrations.edit"];
            }
          }
        }

        setSelectedPermissions(permKeys);
      } catch (error) {
        console.error("Failed to fetch role permissions:", error);
        const rName = selectedRole.roleName?.toUpperCase() || "";
        setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[rName] || []);
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, [activeTabMode, selectedRole, contextCompany]);

  // Load Permissions for Selected User (in "users" mode)
  useEffect(() => {
    if (activeTabMode !== "users") return;
    if (!selectedUser) {
      setSelectedPermissions([]);
      return;
    }

    const fetchUserPerms = async () => {
      setLoadingPermissions(true);
      try {
        const userId = selectedUser.userIdFk || selectedUser.userid || selectedUser.teamMemberId;
        const data = await userPermissionHook.getUserPermissions(userId).catch(() => ({ hasCustomPermissions: false, permissions: [] }));
        setHasCustomUserPerms(!!data.hasCustomPermissions);

        if (data.hasCustomPermissions && data.permissions && data.permissions.length > 0) {
          setSelectedPermissions(data.permissions);
        } else {
          // Inherit permissions from user's assigned role
          const userRoleNameOrId = String(selectedUser.teamMemberRole || selectedUser.role || "").trim();
          let matchingRole = roles.find(r => 
            String(r.roleId) === userRoleNameOrId || 
            String(r.roleName).trim().toUpperCase() === userRoleNameOrId.toUpperCase()
          );

          if (!matchingRole) {
            const userRoleStr = String(selectedUser.role || "").trim().toUpperCase();
            matchingRole = roles.find(r => 
              String(r.roleName).trim().toUpperCase() === userRoleStr
            );
          }

          if (!matchingRole) {
            const isCompanyAdmin = selectedUser.role === 'ADMIN' || selectedUser.role === 'SUPER_ADMIN' || userRoleNameOrId.toUpperCase() === 'ADMIN' || userRoleNameOrId.toUpperCase() === 'MEMBER';
            if (isCompanyAdmin) {
              matchingRole = roles.find(r => r.roleName?.toUpperCase() === 'ADMIN');
            }
          }

          if (matchingRole) {
            const rolePermsData = await roleHook.getPermissions(matchingRole.roleId).catch(() => []);
            let fetchedPerms = Array.isArray(rolePermsData) ? rolePermsData.map(p => p.grpPerm) : [];
            const rName = matchingRole.roleName?.toUpperCase() || "";

            if (fetchedPerms.length === 0 && DEFAULT_ROLE_PERMISSIONS[rName]) {
              fetchedPerms = DEFAULT_ROLE_PERMISSIONS[rName];
            } else if (rName === 'ADMIN') {
              const missingAdminKeys = ["negotiations.view", "negotiations.edit"].filter(k => !fetchedPerms.includes(k));
              if (missingAdminKeys.length > 0) {
                fetchedPerms = [...fetchedPerms, ...missingAdminKeys];
              }
            }
            setSelectedPermissions(fetchedPerms);
          } else {
            const userRoleStr = String(selectedUser.role || "").trim().toUpperCase();
            setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[userRoleStr] || DEFAULT_ROLE_PERMISSIONS["TEAM LEAD"] || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user permissions:", err);
        const userRoleStr = String(selectedUser.role || "").trim().toUpperCase();
        setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[userRoleStr] || DEFAULT_ROLE_PERMISSIONS["TEAM LEAD"] || []);
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchUserPerms();
  }, [activeTabMode, selectedUser, roles]);

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
    const seen = new Set();
    const uniqueRoles = roles.filter((role) => {
      const nameKey = (role.roleName || "").trim().toLowerCase();
      if (!nameKey || seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });

    return uniqueRoles.filter((role) => {
      const matchesSearch = role.roleName?.toLowerCase().includes(term);
      const count = getRecordCount(role);
      const matchesFilter = filterStatus === "all" ||
                           (filterStatus === "high" && count > 10) ||
                           (filterStatus === "medium" && count >= 5 && count <= 10) ||
                           (filterStatus === "low" && count < 5);
      return matchesSearch && matchesFilter;
    });
  }, [roles, searchTerm, filterStatus, teamMembers]);

  const resolveRoleLabel = (roleIdOrName) => {
    if (!roleIdOrName) return "MEMBER";
    const str = String(roleIdOrName).trim();
    const found = roles.find(r => String(r.roleId) === str || String(r.roleName).toUpperCase() === str.toUpperCase());
    return found ? found.roleName : str;
  };

  const handleTabModeChange = (mode) => {
    setActiveTabMode(mode);
    setSearchTerm("");
    if (mode === "roles") {
      if (!selectedRole && roles.length > 0) {
        setSelectedRole(roles[0]);
      }
    } else if (mode === "users") {
      if (!selectedUser && teamMembers.length > 0) {
        setSelectedUser(teamMembers[0]);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const seen = new Set();
    const uniqueMembers = teamMembers.filter((m) => {
      const email = (m.teamMemberEmail || m.userEmail || "").trim().toLowerCase();
      const idKey = m.teamMemberId ? `tm_${m.teamMemberId}` : (m.userIdFk || m.userid ? `usr_${m.userIdFk || m.userid}` : email);
      if (!idKey || seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });

    return uniqueMembers.filter((m) => {
      const name = String(m.teamMemberName || m.username || "").toLowerCase();
      const email = String(m.teamMemberEmail || m.userEmail || "").toLowerCase();
      const roleLabel = resolveRoleLabel(m.teamMemberRole || m.role).toLowerCase();
      return name.includes(term) || email.includes(term) || roleLabel.includes(term);
    });
  }, [teamMembers, searchTerm, roles]);

  const isAdminRole = (role) => {
    if (!role) return false;
    const name = role.roleName?.toUpperCase();
    return name === 'ADMIN' || name === 'SUPER_ADMIN' || name === 'SUPER ADMIN';
  };

  const canModifyRole = (role) => {
    if (!role) return false;
    if (isSuperAdmin) return true;
    return true;
  };

  const canDeleteOrRenameRole = (role) => {
    if (!role) return false;
    if (isAdminRole(role)) return false;
    return true;
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

  const handleSelectGroupAll = (group) => {
    const groupKeys = group.modules.flatMap(m => [m.viewPermission.key, ...m.actions.map(a => a.key)]);
    setSelectedPermissions(prev => {
      const toAdd = groupKeys.filter(k => !prev.includes(k));
      return [...prev, ...toAdd];
    });
  };

  const handleClearGroupAll = (group) => {
    const groupKeys = group.modules.flatMap(m => [m.viewPermission.key, ...m.actions.map(a => a.key)]);
    setSelectedPermissions(prev => prev.filter(k => !groupKeys.includes(k)));
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

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    try {
      const isGlobalAdminRole = selectedRole.roleName?.toUpperCase() === "ADMIN" && selectedRole.userIdFk == null;
      const integrationsNowEnabled = selectedPermissions.includes("integrations.view");

      await roleHook.savePermissions(selectedRole.roleId, selectedPermissions);

      if (isSuperAdmin && isGlobalAdminRole && contextCompany) {
        const currentCompanyIntegrations = !!contextCompany.integrationsAccess;
        if (currentCompanyIntegrations !== integrationsNowEnabled) {
          try {
            await api.put(`/superadmin/companies/${contextCompany.userid}`, {
              ...contextCompany,
              integrationsAccess: integrationsNowEnabled,
              password: undefined,
            });
            setContextCompany({ ...contextCompany, integrationsAccess: integrationsNowEnabled });
          } catch (syncErr) {
            console.error("Failed to sync integrationsAccess to company:", syncErr);
          }
        }
      }

      showToast("Role permissions updated successfully", "success");
    } catch (error) {
      console.error("Failed to save role permissions:", error);
      showToast(error.message || "Failed to save permissions", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    const userId = selectedUser.userIdFk || selectedUser.userid || selectedUser.teamMemberId;
    setSavingPermissions(true);
    try {
      await userPermissionHook.saveUserPermissions(userId, selectedPermissions);
      setHasCustomUserPerms(true);
      showToast(`Custom user permissions saved for ${selectedUser.teamMemberName || selectedUser.username || 'User'}`, "success");
    } catch (err) {
      console.error("Failed to save user permissions:", err);
      showToast(err.message || "Failed to save user permissions", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetUserPermissions = async () => {
    if (!selectedUser) return;
    const userId = selectedUser.userIdFk || selectedUser.userid || selectedUser.teamMemberId;
    setSavingPermissions(true);
    try {
      await userPermissionHook.resetUserPermissionsToDefault(userId);
      setHasCustomUserPerms(false);
      showToast(`Reset permissions to Role Default for ${selectedUser.teamMemberName || selectedUser.username || 'User'}`, "success");
      
      // Reload Role Defaults
      const userRoleNameOrId = String(selectedUser.teamMemberRole || selectedUser.role || "").trim();
      const matchingRole = roles.find(r => 
        String(r.roleId) === userRoleNameOrId || 
        String(r.roleName).trim().toUpperCase() === userRoleNameOrId.toUpperCase()
      );

      if (matchingRole) {
        const rolePermsData = await roleHook.getPermissions(matchingRole.roleId);
        setSelectedPermissions(Array.isArray(rolePermsData) ? rolePermsData.map(p => p.grpPerm) : []);
      } else {
        setSelectedPermissions([]);
      }
    } catch (err) {
      console.error("Failed to reset user permissions:", err);
      showToast(err.message || "Failed to reset user permissions", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-2rem)] bg-slate-50/60 dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Sleek Hero Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl shadow-indigo-950/15 border border-indigo-500/20">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold border border-indigo-500/30" style={{ color: '#a5b4fc' }}>
                <Icon name="mdi:shield-crown-outline" className="h-4 w-4 text-indigo-400" />
                <span style={{ color: '#c7d2fe' }}>Enterprise Access Control Studio</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: '#ffffff' }}>
                Roles & Permissions Management
              </h1>
              <p className="text-xs" style={{ color: '#cbd5e1' }}>
                Manage global role access matrices or configure granular custom permission overrides per user.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Premium Segmented Switcher */}
              <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80 shadow-inner backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => handleTabModeChange("roles")}
                  style={{ color: activeTabMode === "roles" ? "#ffffff" : "#cbd5e1" }}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeTabMode === "roles"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <Icon name="mdi:shield-account" className="h-4 w-4" />
                  Manage By Roles
                </button>

                <button
                  type="button"
                  onClick={() => handleTabModeChange("users")}
                  style={{ color: activeTabMode === "users" ? "#ffffff" : "#cbd5e1" }}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeTabMode === "users"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <Icon name="mdi:account-key-outline" className="h-4 w-4" />
                  Manage By User
                </button>
              </div>

              {activeTabMode === "roles" && (
                <button
                  onClick={openCreateDrawer}
                  style={{ color: '#ffffff' }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-400 hover:to-blue-500 active:scale-95"
                >
                  <Icon name="mdi:plus" className="h-4 w-4" />
                  Create Role
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master-Detail Layout Panel */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          {/* Left Master Panel: Roles or Users */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3.5 shadow-lg shadow-slate-200/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                    <Icon name={activeTabMode === "roles" ? "mdi:shield-outline" : "mdi:account-group-outline"} className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {activeTabMode === "roles" ? "Company Roles" : "Company Users"}
                  </h2>
                </div>
                <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 shadow-2xs">
                  {activeTabMode === "roles" ? `${filteredRoles.length} Roles` : `${filteredUsers.length} Users`}
                </span>
              </div>
              
              <div className="relative">
                <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={activeTabMode === "roles" ? "Search roles..." : "Search users by name/email..."}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
                />
              </div>

              <div key={`list-container-${activeTabMode}`} className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-500">Loading master items...</div>
                ) : activeTabMode === "roles" ? (
                  filteredRoles.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No matching roles found</div>
                  ) : (
                    filteredRoles.map((role, idx) => {
                      const isSelected = selectedRole?.roleId === role.roleId;
                      const count = getRecordCount(role);
                      const isSystem = isAdminRole(role) || role.userIdFk === null || role.userIdFk === undefined;
                      const itemKey = `role-item-${role.roleId || role.roleName || idx}`;
                      return (
                        <div
                          key={itemKey}
                          onClick={() => setSelectedRole(role)}
                          className={`group relative flex items-center justify-between rounded-xl p-3 text-left transition-all border cursor-pointer ${
                            isSelected
                              ? "border-indigo-500/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/40 shadow-sm border-l-4 border-l-indigo-600"
                              : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                              isSelected 
                                ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25" 
                                : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                            }`}>
                              <Icon name="mdi:shield-account" className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className={`text-xs font-bold ${isSelected ? "text-indigo-950 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"}`}>
                                {role.roleName}
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                {count} {count === 1 ? "user" : "users"} assigned
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSystem && (
                              <span className="rounded-md bg-indigo-100/80 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800 shadow-2xs">
                                SYSTEM
                              </span>
                            )}
                            {canDeleteOrRenameRole(role) && (
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDrawer(role);
                                  }}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                  title="Rename role"
                                >
                                  <Icon name="mdi:pencil-outline" className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(role);
                                  }}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
                  )
                ) : (
                  // User Cards List
                  filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">No matching users found</div>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const uKey = user.teamMemberId ? `tm_${user.teamMemberId}` : (user.userid ? `usr_${user.userid}` : (user.teamMemberEmail || user.userEmail || `idx_${idx}`));
                      const sKey = selectedUser ? (selectedUser.teamMemberId ? `tm_${selectedUser.teamMemberId}` : (selectedUser.userid ? `usr_${selectedUser.userid}` : (selectedUser.teamMemberEmail || selectedUser.userEmail || ""))) : "";
                      
                      const isSelected = !!uKey && !!sKey && uKey === sKey;
                      const itemKey = `user-item-${uKey}`;

                      return (
                        <div
                          key={itemKey}
                          onClick={() => setSelectedUser(user)}
                          className={`group relative flex items-center justify-between rounded-xl p-3 text-left transition-all border cursor-pointer ${
                            isSelected
                              ? "border-indigo-500/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/40 shadow-sm border-l-4 border-l-indigo-600"
                              : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                              isSelected 
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25" 
                                : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                            }`}>
                              <Icon name="mdi:account-outline" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`text-xs font-bold truncate ${isSelected ? "text-indigo-950 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"}`}>
                                {user.teamMemberName || user.username || "Team Member"}
                              </h3>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {user.teamMemberEmail || user.userEmail}
                              </p>
                            </div>
                          </div>

                          <div className="ml-2 flex flex-col items-end">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                              {resolveRoleLabel(user.teamMemberRole || user.role)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right Detail Panel: Permissions Configurator Matrix */}
          <div className="lg:col-span-8">
            {(activeTabMode === "roles" && selectedRole) || (activeTabMode === "users" && selectedUser) ? (
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-lg shadow-slate-200/50 space-y-3">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2.5 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {activeTabMode === "roles" 
                          ? selectedRole.roleName 
                          : (selectedUser.teamMemberName || selectedUser.username || selectedUser.teamMemberEmail)}
                      </h2>
                      
                      {activeTabMode === "roles" ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/60">
                          Role Permission Matrix
                        </span>
                      ) : (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          hasCustomUserPerms 
                            ? "bg-purple-100 text-purple-800 border border-purple-200" 
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {hasCustomUserPerms ? "👤 Custom User Overrides Active" : "🛡️ Role Default Permissions Inherited"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeTabMode === "roles" 
                        ? "Configure fine-grained module access for team members assigned to this role."
                        : `Configure specific custom permissions directly for ${selectedUser.teamMemberName || selectedUser.username}.`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = groupedPermissions.flatMap(g => 
                          g.modules.flatMap(m => [m.viewPermission.key, ...m.actions.map(a => a.key)])
                        );
                        setSelectedPermissions(allKeys);
                      }}
                      disabled={loadingPermissions}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPermissions([])}
                      disabled={loadingPermissions}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    >
                      Clear All
                    </button>

                    {activeTabMode === "users" && hasCustomUserPerms && (
                      <button
                        type="button"
                        onClick={handleResetUserPermissions}
                        disabled={savingPermissions || loadingPermissions}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                        title="Clear custom permissions and revert user to Role Default"
                      >
                        <Icon name="mdi:refresh" className="h-3.5 w-3.5" />
                        Reset to Role Default
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Matrix */}
                {loadingPermissions ? (
                  <div className="py-12 text-center text-xs text-slate-500">Loading permissions matrix...</div>
                ) : (
                  <div className="space-y-3">
                    {visibleGroups.map((group) => (
                      <div key={group.group} className="rounded-xl border border-slate-200 bg-slate-50/20 overflow-hidden shadow-xs">
                        <div className="flex items-center justify-between bg-slate-100/90 px-3.5 py-1.5 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <Icon name={group.icon} className="h-4 w-4 text-indigo-600" />
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              {group.group} Group
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectGroupAll(group)}
                              disabled={loadingPermissions}
                              className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                            >
                              Select Group All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearGroupAll(group)}
                              disabled={loadingPermissions}
                              className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition shadow-2xs"
                            >
                              Clear Group All
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="bg-slate-50/80">
                              <tr>
                                <th scope="col" className="px-3.5 py-1.5 font-bold text-slate-700 w-1/4">Module Name</th>
                                <th scope="col" className="px-3.5 py-1.5 font-bold text-slate-700 w-1/3">Main View Permission</th>
                                <th scope="col" className="px-3.5 py-1.5 font-bold text-slate-700">Sub Group Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900">
                              {group.modules.map((mod) => {
                                const allChecked = isModuleAllChecked(mod);
                                const someChecked = isModuleSomeChecked(mod);
                                const isViewChecked = selectedPermissions.includes(mod.viewPermission.key);

                                return (
                                  <tr key={mod.name} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="whitespace-nowrap px-3.5 py-1.5 font-bold text-slate-900 dark:text-white">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={allChecked}
                                          ref={(el) => {
                                            if (el) el.indeterminate = someChecked;
                                          }}
                                          onChange={(e) => handleToggleModule(mod, e.target.checked)}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                        />
                                        <span>{mod.name}</span>
                                      </div>
                                    </td>

                                    <td className="px-3.5 py-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="flex items-center cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={isViewChecked}
                                            onChange={() => handleTogglePermission(mod.viewPermission.key)}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                          />
                                          <span className={`ml-2 text-xs font-semibold ${isViewChecked ? "text-indigo-950" : "text-slate-500"}`}>
                                            {mod.viewPermission.label}
                                          </span>
                                        </label>
                                        <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 py-0.2 rounded border border-slate-200">
                                          {mod.viewPermission.key}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-3.5 py-1.5">
                                      {mod.actions.length === 0 ? (
                                        <span className="text-[11px] text-slate-400 italic">No sub-actions</span>
                                      ) : (
                                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                                          {mod.actions.map((act) => {
                                            const isChecked = selectedPermissions.includes(act.key);
                                            return (
                                              <button
                                                type="button"
                                                key={act.key}
                                                disabled={!isViewChecked}
                                                onClick={() => handleTogglePermission(act.key)}
                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all border select-none ${
                                                  isChecked
                                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                                                    : "bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200/60"
                                                } ${!isViewChecked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                              >
                                                <Icon 
                                                  name={isChecked ? "mdi:check-circle" : "mdi:circle-outline"} 
                                                  className={`h-3 w-3 ${isChecked ? "text-emerald-600" : "text-slate-400"}`} 
                                                />
                                                <span>{act.label}</span>
                                              </button>
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

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{selectedPermissions.length} active permissions selected</span>
                  </div>
                  
                  <button
                    onClick={activeTabMode === "roles" ? handleSaveRolePermissions : handleSaveUserPermissions}
                    disabled={savingPermissions || loadingPermissions}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {savingPermissions ? (
                      <>
                        <Icon name="mdi:loading" className="h-4 w-4 animate-spin" />
                        Saving Matrix...
                      </>
                    ) : (
                      <>
                        <Icon name="mdi:check-all" className="h-4 w-4" />
                        {activeTabMode === "roles" ? "Save Role Permissions" : "Save User Permissions"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center text-slate-400">
                <Icon name="mdi:shield-account-outline" className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <h3 className="text-sm font-bold text-slate-700">
                  {activeTabMode === "roles" ? "No Role Selected" : "No User Selected"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTabMode === "roles" 
                    ? "Select a company role from the left list to configure permissions."
                    : "Select a company user from the left list to configure custom permissions."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Drawer */}
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