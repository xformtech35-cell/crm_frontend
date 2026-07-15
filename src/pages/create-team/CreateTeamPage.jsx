import { useEffect, useMemo, useState } from 'react'
import AppDrawer from '../../components/common/AppDrawer'
import Icon from '../../components/Icon'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useTeam } from '../../hooks/useTeam'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useRole } from '../../hooks/useRole'

export default function CreateTeamPage() {
  const createTeamHook = useCreateTeam()
  const teamHook = useTeam()
  const teamMemberHook = useTeamMember()
  const roleHook = useRole()

  const [assignments, setAssignments] = useState([])
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [form, setForm] = useState({
    teamIdFk: '',
    teamMemberIdFk: '',
    roleIdFk: '',
  })

  async function loadData() {
    setLoading(true)
    try {
      const [assignmentData, teamData, memberData, roleData] = await Promise.all([
        createTeamHook.getAll(),
        teamHook.getAll(),
        teamMemberHook.getAll(),
        roleHook.getAll(),
      ])
      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
      setTeams(Array.isArray(teamData) ? teamData : [])
      setMembers(Array.isArray(memberData) ? memberData : [])
      setRoles(Array.isArray(roleData) ? roleData : [])
    } catch (error) {
      console.error('Failed to load team assignment data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getTeamName = (teamId) => {
    const teamObj = teams.find((t) => String(t.teamId) === String(teamId))
    return teamObj ? teamObj.teamName : `Team #${teamId}`
  }

  const getMemberName = (memberId) => {
    const memberObj = members.find((m) => String(m.teamMemberId) === String(memberId))
    return memberObj ? memberObj.teamMemberName : `Member #${memberId}`
  }

  const getMemberEmail = (memberId) => {
    const memberObj = members.find((m) => String(m.teamMemberId) === String(memberId))
    return memberObj ? memberObj.teamMemberEmail : ''
  }

  const getRoleName = (roleId) => {
    const roleObj = roles.find((r) => String(r.roleId) === String(roleId))
    return roleObj ? roleObj.roleName : `Role #${roleId}`
  }

  const filteredAssignments = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return assignments
    return assignments.filter((item) => {
      const teamName = getTeamName(item.teamIdFk).toLowerCase()
      const memberName = getMemberName(item.teamMemberIdFk).toLowerCase()
      const roleName = getRoleName(item.roleIdFk).toLowerCase()
      return teamName.includes(text) || memberName.includes(text) || roleName.includes(text)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, teams, members, roles, query])

  function openCreate() {
    setEditingAssignment(null)
    setForm({
      teamIdFk: '',
      teamMemberIdFk: '',
      roleIdFk: '',
    })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingAssignment(item)
    setForm({
      teamIdFk: item.teamIdFk || '',
      teamMemberIdFk: item.teamMemberIdFk || '',
      roleIdFk: item.roleIdFk || '',
    })
    setModalOpen(true)
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveAssignment(e) {
    e.preventDefault()
    if (!form.teamIdFk || !form.teamMemberIdFk || !form.roleIdFk) {
      alert('All fields are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        teamIdFk: Number(form.teamIdFk),
        teamMemberIdFk: Number(form.teamMemberIdFk),
        roleIdFk: Number(form.roleIdFk),
      }
      if (editingAssignment) {
        await createTeamHook.update(editingAssignment.createTeamId, payload)
      } else {
        await createTeamHook.create(payload)
      }
      setModalOpen(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save assignment:', error)
      alert('Failed to save assignment. This member might already be assigned.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAssignment(id) {
    if (!confirm('Are you sure you want to remove this team assignment?')) return
    setSaving(true)
    try {
      await createTeamHook.remove(id)
      await loadData()
    } catch (error) {
      console.error('Failed to remove assignment:', error)
      alert('Failed to remove assignment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manage Teams</h1>
          <p className="text-sm text-gray-500">Assign members and roles to specific teams dynamically.</p>
        </div>
        <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto">
          <Icon name="mdi:plus" className="h-5 w-5" />
          Assign Member to Team
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Search assignments..."
            type="search"
          />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Total Assignments" value={assignments.length} />
        <Stat label="Active Teams" value={new Set(assignments.map((a) => a.teamIdFk).filter(Boolean)).size} />
        <Stat label="Assigned Members" value={new Set(assignments.map((a) => a.teamMemberIdFk).filter(Boolean)).size} />
      </section>

      {/* Main Table */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading assignments...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No assignments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Team</th>
                  <th className="px-6 py-3">Team Member</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((item) => (
                  <tr key={item.createTeamId} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {getTeamName(item.teamIdFk)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{getMemberName(item.teamMemberIdFk)}</p>
                      {getMemberEmail(item.teamMemberIdFk) && (
                        <p className="text-xs text-gray-400">{getMemberEmail(item.teamMemberIdFk)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {getRoleName(item.roleIdFk)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edit assignment"
                        >
                          <Icon name="mdi:pencil-outline" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteAssignment(item.createTeamId)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove assignment"
                        >
                          <Icon name="mdi:trash-can-outline" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Dialog */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAssignment ? 'Edit Team Assignment' : 'Assign Member to Team'}
        subtitle={editingAssignment ? 'Update the team, member and role assignment' : 'Assign a team member to a team with a specific role'}
        icon="mdi:account-supervisor-circle-outline"
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              form="team-assign-form"
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Assign Member'}
            </button>
          </>
        }
      >
        <form id="team-assign-form" onSubmit={saveAssignment} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Select Team *">
              <select
                className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 transition-colors"
                value={form.teamIdFk}
                onChange={(e) => updateField('teamIdFk', e.target.value)}
                required
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName} (ID: {t.teamId})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Select Team Member *">
              <select
                className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 transition-colors"
                value={form.teamMemberIdFk}
                onChange={(e) => updateField('teamMemberIdFk', e.target.value)}
                required
              >
                <option value="">Select Member</option>
                {members.map((m) => (
                  <option key={m.teamMemberId} value={m.teamMemberId}>
                    {m.teamMemberName} ({m.teamMemberEmail || 'No email'})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Select Assignment Role *">
              <select
                className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 transition-colors"
                value={form.roleIdFk}
                onChange={(e) => updateField('roleIdFk', e.target.value)}
                required
              >
                <option value="">Select Role</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </AppDrawer>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
    </label>
  )
}
