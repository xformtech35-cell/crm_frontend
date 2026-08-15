import { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import { useDataScopeConfig } from '../../hooks/useDataScopeConfig'
import { useRole } from '../../hooks/useRole'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useAuthStore } from '../../stores/auth'

const MODULES = [
  // MAIN
  { id: 'DASHBOARD', name: 'Dashboard', category: 'MAIN', icon: 'mdi:view-dashboard-outline', desc: 'Overview & workspace dashboard' },
  { id: 'ACTIVITIES', name: 'Activities', category: 'MAIN', icon: 'mdi:timeline-text-outline', desc: 'Activity timeline & audit logs' },
  { id: 'EMAILS', name: 'Emails', category: 'MAIN', icon: 'mdi:email-fast-outline', desc: 'Email communications & tracking' },
  { id: 'CALENDAR', name: 'Calendar', category: 'MAIN', icon: 'mdi:calendar-month-outline', desc: 'Events & reminders' },
  { id: 'ATTENDANCE', name: 'Attendance', category: 'MAIN', icon: 'mdi:clock-check-outline', desc: 'Attendance & time tracking' },

  // SALES
  { id: 'LEADS', name: 'Leads', category: 'SALES', icon: 'mdi:account-arrow-right-outline', desc: 'Inbound and sales leads' },
  { id: 'NEGOTIATIONS', name: 'Negotiations', category: 'SALES', icon: 'mdi:handshake-outline', desc: 'Quotation revisions & negotiation deals' },
  { id: 'LEAD_STATUS', name: 'Lead Masters', category: 'SALES', icon: 'mdi:tag-outline', desc: 'Lead status, source, and group masters' },
  { id: 'CONTACTS', name: 'Contacts', category: 'SALES', icon: 'mdi:contacts-outline', desc: 'People & organization contacts' },
  { id: 'ORGANIZATIONS', name: 'Organizations', category: 'SALES', icon: 'mdi:office-building-outline', desc: 'Companies & organization accounts' },
  { id: 'OPPORTUNITIES', name: 'Opportunities', category: 'SALES', icon: 'mdi:chart-line', desc: 'Deals & pipeline stages' },

  // PROJECTS
  { id: 'PROJECTS', name: 'Projects', category: 'PROJECTS', icon: 'mdi:folder-outline', desc: 'Project boards & milestones' },
  { id: 'TASKS', name: 'Tasks', category: 'PROJECTS', icon: 'mdi:checkbox-marked-circle-outline', desc: 'Action items & assignments' },
  { id: 'TEAMS', name: 'Teams', category: 'PROJECTS', icon: 'mdi:account-group-outline', desc: 'Teams & departments' },
  { id: 'TEAM_LEADS', name: 'Team Leads', category: 'PROJECTS', icon: 'mdi:account-star-outline', desc: 'Team leads management' },
  { id: 'TEAM_MEMBERS', name: 'Team Members', category: 'PROJECTS', icon: 'mdi:account-multiple-outline', desc: 'Team member accounts & profiles' },

  // ANALYTICS
  { id: 'ANALYTICS', name: 'Analytics', category: 'ANALYTICS', icon: 'mdi:chart-donut', desc: 'Performance analytics & charts' },
  { id: 'REPORTS', name: 'Reports', category: 'ANALYTICS', icon: 'mdi:file-chart-outline', desc: 'CRM reports' },
  { id: 'AUTOMATION', name: 'Automation', category: 'ANALYTICS', icon: 'mdi:robot-outline', desc: 'Automation rules & workflows' },

  // ADMINISTRATION
  { id: 'ROLES', name: 'Roles & Permissions', category: 'ADMINISTRATION', icon: 'mdi:shield-key-outline', desc: 'Role access matrix' },
  { id: 'INTEGRATIONS', name: 'Integrations', category: 'ADMINISTRATION', icon: 'mdi:api', desc: 'Third-party integrations' },
  { id: 'DATA_ACCESS', name: 'Data Access Module', category: 'ADMINISTRATION', icon: 'mdi:shield-account-outline', desc: 'Data Access & visibility scoping configuration' },
  { id: 'SETTINGS', name: 'Settings', category: 'ADMINISTRATION', icon: 'mdi:cog-outline', desc: 'System settings' },
  { id: 'TRASH', name: 'Trash / Recycle Bin', category: 'ADMINISTRATION', icon: 'mdi:delete-outline', desc: 'Recycle bin & deleted items' },
]

const SCOPES = [
  {
    id: 'ALL_DATA',
    name: 'Global (All Data)',
    shortName: 'Global',
    icon: 'mdi:earth',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
    desc: 'Full visibility over all company records across the workspace.',
  },
  {
    id: 'TEAM_DATA',
    name: 'Team Data',
    shortName: 'Team',
    icon: 'mdi:account-group-outline',
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    activeBg: 'bg-purple-600 text-white border-purple-600',
    desc: 'Can view/manage records belonging to members of assigned team(s).',
  },
  {
    id: 'OWN_DATA_ONLY',
    name: 'Own Data Only',
    shortName: 'Own Only',
    icon: 'mdi:account-outline',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    activeBg: 'bg-blue-600 text-white border-blue-600',
    desc: 'Restricted exclusively to records created by or assigned to themselves.',
  },
]

export default function DataAccessConfigPage() {
  const dataScopeHook = useDataScopeConfig()
  const roleHook = useRole()
  const teamMemberHook = useTeamMember()
  const selectedCompanyId = useAuthStore((s) => s.selectedCompanyId)

  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'users'
  const [roles, setRoles] = useState([])
  const [members, setMembers] = useState([])
  const [configs, setConfigs] = useState([])
  const [matrix, setMatrix] = useState({}) // key: `${roleId/userId}_${moduleName}` -> scopeMode
  const [initialMatrix, setInitialMatrix] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedUserForOverride, setSelectedUserForOverride] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  const visibleModules = useMemo(() => {
    if (selectedCategory === 'ALL') return MODULES
    return MODULES.filter((m) => m.category === selectedCategory)
  }, [selectedCategory])

  async function loadData() {
    setLoading(true)
    try {
      const [configData, roleData, memberData] = await Promise.all([
        dataScopeHook.getAll().catch((err) => { console.error('Config fetch error:', err); return []; }),
        roleHook.getAll().catch((err) => { console.error('Role fetch error:', err); return []; }),
        teamMemberHook.getAll().catch((err) => { console.error('Member fetch error:', err); return []; }),
      ])

      function extractArray(res) {
        if (Array.isArray(res)) return res
        if (Array.isArray(res?.data)) return res.data
        if (Array.isArray(res?.data?.data)) return res.data.data
        return []
      }

      const fetchedConfigs = extractArray(configData)
      const fetchedRoles = extractArray(roleData)
      const fetchedMembers = extractArray(memberData)

      setConfigs(fetchedConfigs)
      setRoles(fetchedRoles)
      setMembers(fetchedMembers)

      // Build matrix state
      const initialMap = {}
      fetchedConfigs.forEach((cfg) => {
        if (cfg.userIdFk) {
          initialMap[`user_${cfg.userIdFk}_${cfg.moduleName}`] = cfg.scopeMode
        } else if (cfg.roleIdFk) {
          initialMap[`role_${cfg.roleIdFk}_${cfg.moduleName}`] = cfg.scopeMode
        }
      })

      // Populate default fallback scopes for roles if unconfigured
      fetchedRoles.forEach((r) => {
        const roleName = r.roleName?.toUpperCase() || ''
        const defaultScope = roleName.includes('ADMIN')
          ? 'ALL_DATA'
          : roleName.includes('LEAD')
          ? 'TEAM_DATA'
          : 'OWN_DATA_ONLY'

        MODULES.forEach((m) => {
          const key = `role_${r.roleId}_${m.id}`
          if (!initialMap[key]) {
            initialMap[key] = defaultScope
          }
        })
      })

      setMatrix(initialMap)
      setInitialMatrix(initialMap)
    } catch (error) {
      console.error('Failed to load data access configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(matrix) !== JSON.stringify(initialMatrix)
  }, [matrix, initialMatrix])

  function getScope(type, id, moduleName) {
    const key = `${type}_${id}_${moduleName}`
    if (matrix[key]) return matrix[key]
    if (type === 'user') {
      // Fallback to user's role scope
      const member = members.find((m) => String(m.userid) === String(id) || String(m.teamMemberId) === String(id) || String(m.id) === String(id))
      if (member) {
        return getScope('role', member.teamMemberRole, moduleName)
      }
    }
    return 'OWN_DATA_ONLY'
  }

  function setScope(type, id, moduleName, scopeMode) {
    const key = `${type}_${id}_${moduleName}`
    setMatrix((prev) => ({
      ...prev,
      [key]: scopeMode,
    }))
  }

  function batchSetScopeForTarget(type, id, scopeMode) {
    setMatrix((prev) => {
      const updated = { ...prev }
      visibleModules.forEach((m) => {
        updated[`${type}_${id}_${m.id}`] = scopeMode
      })
      return updated
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payloadList = []
      Object.entries(matrix).forEach(([key, scopeMode]) => {
        // Key format: 'role_${roleId}_${moduleName}' or 'user_${userId}_${moduleName}'
        // moduleName may contain underscores like 'TEAM_MEMBERS' or 'DATA_ACCESS'
        const firstUnderscore = key.indexOf('_')
        const secondUnderscore = key.indexOf('_', firstUnderscore + 1)
        if (firstUnderscore !== -1 && secondUnderscore !== -1) {
          const targetType = key.substring(0, firstUnderscore)
          const targetId = Number(key.substring(firstUnderscore + 1, secondUnderscore))
          const moduleName = key.substring(secondUnderscore + 1)

          if (targetType === 'role') {
            payloadList.push({ roleIdFk: targetId, moduleName, scopeMode })
          } else if (targetType === 'user') {
            payloadList.push({ userIdFk: targetId, moduleName, scopeMode })
          }
        }
      })

      await dataScopeHook.saveBatch(payloadList)
      setInitialMatrix(matrix)
      alert('Data Access Scoping rules updated successfully!')
      await loadData()
    } catch (error) {
      console.error('Failed to save data access configurations:', error)
      alert('Failed to save configurations. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredRoles = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return roles
    return roles.filter((r) => r.roleName?.toLowerCase().includes(text))
  }, [query, roles])

  const filteredMembers = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return members
    return members.filter(
      (m) =>
        m.teamMemberName?.toLowerCase().includes(text) ||
        m.teamMemberEmail?.toLowerCase().includes(text)
    )
  }, [members, query])

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Icon name="mdi:shield-key-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Data Access Scoping Module</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configure dynamic data visibility rules across all CRM modules by Role or User account.
          </p>
        </div>

        {hasUnsavedChanges && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <Icon name="mdi:alert-circle-outline" className="h-4 w-4 text-amber-600 animate-pulse" />
            Unsaved Changes Detected
          </div>
        )}
      </div>

      {/* Scope Mode Key Summary */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SCOPES.map((s) => (
          <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold ${s.color}`}>
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{s.name}</h3>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon name="mdi:shield-account-outline" className="h-4 w-4" />
            Role Scoping Matrix ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon name="mdi:account-cog-outline" className="h-4 w-4" />
            User Specific Overrides ({members.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            placeholder={activeTab === 'roles' ? 'Filter roles...' : 'Filter user members...'}
            type="search"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="font-semibold text-gray-500 mr-1 flex items-center gap-1">
          <Icon name="mdi:filter-variant" className="w-3.5 h-3.5" /> Modules:
        </span>
        {[
          { id: 'ALL', label: `All Modules (${MODULES.length})` },
          { id: 'MAIN', label: `Main (${MODULES.filter(m => m.category === 'MAIN').length})` },
          { id: 'SALES', label: `Sales (${MODULES.filter(m => m.category === 'SALES').length})` },
          { id: 'PROJECTS', label: `Projects (${MODULES.filter(m => m.category === 'PROJECTS').length})` },
          { id: 'ANALYTICS', label: `Analytics (${MODULES.filter(m => m.category === 'ANALYTICS').length})` },
          { id: 'ADMINISTRATION', label: `Administration (${MODULES.filter(m => m.category === 'ADMINISTRATION').length})` },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer border ${
              selectedCategory === cat.id
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Scoping Matrix Table */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading access configuration matrix...</div>
        ) : activeTab === 'roles' ? (
          /* Role Scoping Matrix */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 min-w-[200px] sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">System Role</th>
                  {visibleModules.map((m) => (
                    <th key={m.id} className="px-4 py-3 text-center min-w-[170px]">
                      <div className="inline-flex items-center gap-1.5 font-bold text-gray-700">
                        <Icon name={m.icon} className="h-4 w-4 text-purple-600" />
                        {m.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right sticky right-0 bg-gray-50 z-10 border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">Quick Shortcut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.roleId} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <p className="font-bold text-gray-900">{role.roleName}</p>
                      <p className="text-xs text-gray-400">ID: #{role.roleId}</p>
                    </td>

                    {visibleModules.map((m) => {
                      const currentScopeMode = getScope('role', role.roleId, m.id)
                      const scopeInfo = SCOPES.find((s) => s.id === currentScopeMode) || SCOPES[2]

                      return (
                        <td key={m.id} className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <select
                              value={currentScopeMode}
                              onChange={(e) => setScope('role', role.roleId, m.id, e.target.value)}
                              className={`w-full max-w-[150px] rounded-lg border px-2.5 py-1 text-xs font-semibold focus:outline-none transition-colors ${scopeInfo.color}`}
                            >
                              {SCOPES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.shortName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      )
                    })}

                    <td className="px-4 py-3 text-right sticky right-0 bg-white z-10 border-l border-gray-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <select
                        onChange={(e) => {
                          if (e.target.value) batchSetScopeForTarget('role', role.roleId, e.target.value)
                        }}
                        defaultValue=""
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 focus:outline-none"
                      >
                        <option value="" disabled>Set Visible Modules...</option>
                        {SCOPES.map((s) => (
                          <option key={s.id} value={s.id}>Set Visible to {s.shortName}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* User Specific Overrides Matrix */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 min-w-[220px] sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">User Member</th>
                  {visibleModules.map((m) => (
                    <th key={m.id} className="px-4 py-3 text-center min-w-[170px]">
                      <div className="inline-flex items-center gap-1.5 font-bold text-gray-700">
                        <Icon name={m.icon} className="h-4 w-4 text-purple-600" />
                        {m.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right sticky right-0 bg-gray-50 z-10 border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">Quick Shortcut</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const memberId = member.userid || member.teamMemberId || member.id

                  return (
                    <tr key={memberId} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <p className="font-bold text-gray-900">{member.teamMemberName || '-'}</p>
                        <p className="text-xs text-gray-500">{member.teamMemberEmail || '-'}</p>
                      </td>

                      {visibleModules.map((m) => {
                        const hasExplicitOverride = !!matrix[`user_${memberId}_${m.id}`]
                        const currentScopeMode = getScope('user', memberId, m.id)
                        const scopeInfo = SCOPES.find((s) => s.id === currentScopeMode) || SCOPES[2]

                        return (
                          <td key={m.id} className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                hasExplicitOverride 
                                  ? "bg-purple-100 text-purple-700 border border-purple-200" 
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {hasExplicitOverride ? "⚡ User Override" : "🌐 Role Inherited"}
                              </span>
                              <select
                                value={currentScopeMode}
                                onChange={(e) => setScope('user', memberId, m.id, e.target.value)}
                                className={`w-full max-w-[150px] rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none transition-colors ${scopeInfo.color}`}
                              >
                                {SCOPES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.shortName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        )
                      })}

                      <td className="px-4 py-3 text-right sticky right-0 bg-white z-10 border-l border-gray-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <select
                          onChange={(e) => {
                            if (e.target.value) batchSetScopeForTarget('user', memberId, e.target.value)
                          }}
                          defaultValue=""
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 focus:outline-none"
                        >
                          <option value="" disabled>Set Visible Modules...</option>
                          {SCOPES.map((s) => (
                            <option key={s.id} value={s.id}>Set Visible to {s.shortName}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-gray-200 bg-white/95 px-6 py-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Icon name="mdi:shield-check-outline" className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-xs font-bold text-gray-900">Dynamic Data Visibility Scoping Active</p>
            <p className="text-xs text-gray-500">Changes update database access rules across API endpoints instantly upon saving.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMatrix(initialMatrix)}
            disabled={!hasUnsavedChanges || saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset Changes
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Icon name="mdi:content-save-outline" className="h-4 w-4" />
            {saving ? 'Saving Rules...' : 'Save Data Access Matrix'}
          </button>
        </div>
      </div>
    </div>
  )
}
