import { useEffect, useMemo, useState } from 'react'
import AppDrawer from '../../components/common/AppDrawer'
import Icon from '../../components/Icon'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useTeam } from '../../hooks/useTeam'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useRole } from '../../hooks/useRole'
import { useAuthStore } from '../../stores/auth'
import {
  assignmentIdsForMember,
  getMemberId,
  getMemberLabel,
  getTeamLabel,
  teamsForMember,
} from '../../utils/teamRelations'

const emptyForm = {
  selectedMemberId: '',
  teamMemberName: '',
  teamMemberEmail: '',
  teamMemberMobile: '',
  teamIdFk: '',
  password: '',
}

export default function TeamLeadPage() {
  const teamMemberHook = useTeamMember()
  const teamHook = useTeam()
  const createTeamHook = useCreateTeam()
  const roleHook = useRole()

  const [members, setMembers] = useState([])
  const [teams, setTeams] = useState([])
  const [assignments, setAssignments] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [form, setForm] = useState(emptyForm)

  async function loadData() {
    setLoading(true)
    try {
      const [memberData, teamData, assignmentData, roleData] = await Promise.all([
        teamMemberHook.getAll(),
        teamHook.getAll(),
        createTeamHook.getAll(),
        roleHook.getAll(),
      ])
      setMembers(Array.isArray(memberData) ? memberData : [])
      setTeams(Array.isArray(teamData) ? teamData : [])
      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
      setRoles(Array.isArray(roleData) ? roleData : [])
    } catch (error) {
      console.error('Failed to load team lead master:', error)
      setMembers([])
      setTeams([])
      setAssignments([])
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Identify Team Lead role ID from roles catalog
  const teamLeadRoleObj = useMemo(() => {
    return roles.find(
      (r) =>
        r.roleName?.toUpperCase() === 'TEAM LEAD' ||
        r.roleName?.toUpperCase() === 'TEAM_LEAD' ||
        r.roleName?.toUpperCase() === 'TEAM LEADER'
    )
  }, [roles])

  const teamLeads = useMemo(() => {
    return members.filter((member) => {
      const roleObj = roles.find((r) => String(r.roleId) === String(member.teamMemberRole))
      const isRoleMatch = roleObj
        ? roleObj.roleName?.toUpperCase().includes('TEAM LEAD') || roleObj.roleName?.toUpperCase().includes('TEAM_LEAD')
        : String(member.teamMemberRole).toUpperCase().includes('LEAD')
      
      const isAssignedLead = teams.some((t) => Number(t.teamLeadId) === Number(getMemberId(member)))
      return isRoleMatch || isAssignedLead
    })
  }, [members, roles, teams])

  const filteredTeamLeads = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return teamLeads
    return teamLeads.filter((member) => {
      const linkedTeams = teamsForMember(getMemberId(member), teams, assignments)
      return [getMemberLabel(member), member.teamMemberMobile, ...linkedTeams.map(getTeamLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text)
    })
  }, [assignments, members, query, teamLeads, teams])

  function openCreate() {
    setEditingLead(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(member) {
    const linkedTeams = teamsForMember(getMemberId(member), teams, assignments)
    const firstTeam = linkedTeams[0]?.teamId || ''
    setEditingLead(member)
    setForm({
      selectedMemberId: String(getMemberId(member)),
      teamMemberName: member.teamMemberName || '',
      teamMemberEmail: member.teamMemberEmail || '',
      teamMemberMobile: member.teamMemberMobile || '',
      teamIdFk: firstTeam ? String(firstTeam) : '',
      password: '',
    })
    setModalOpen(true)
  }

  function handleSelectMember(memberId) {
    if (!memberId) {
      setForm((cur) => ({
        ...cur,
        selectedMemberId: '',
        teamMemberName: '',
        teamMemberEmail: '',
        teamMemberMobile: '',
      }))
      return
    }
    const found = members.find((m) => String(getMemberId(m)) === String(memberId))
    if (found) {
      setForm((cur) => ({
        ...cur,
        selectedMemberId: String(getMemberId(found)),
        teamMemberName: found.teamMemberName || '',
        teamMemberEmail: found.teamMemberEmail || '',
        teamMemberMobile: found.teamMemberMobile || '',
      }))
    }
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveLead(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const roleIdToUse = teamLeadRoleObj ? teamLeadRoleObj.roleId : 3
      const targetMemberId = form.selectedMemberId || (editingLead ? getMemberId(editingLead) : null)

      let savedMemberId = targetMemberId

      if (targetMemberId) {
        // Update existing member role to Team Lead
        const existingMember = members.find((m) => String(getMemberId(m)) === String(targetMemberId))
        const updatePayload = {
          teamMemberName: form.teamMemberName.trim(),
          teamMemberEmail: form.teamMemberEmail.trim(),
          teamMemberMobile: form.teamMemberMobile.trim(),
          teamMemberRole: roleIdToUse,
        }
        if (form.password) {
          updatePayload.password = form.password
        }
        await teamMemberHook.update(targetMemberId, updatePayload)
      } else {
        // Create new Team Member with Team Lead role
        const createPayload = {
          teamMemberName: form.teamMemberName.trim(),
          teamMemberEmail: form.teamMemberEmail.trim(),
          teamMemberMobile: form.teamMemberMobile.trim(),
          teamMemberRole: roleIdToUse,
          password: form.password,
        }
        const created = await teamMemberHook.create(createPayload)
        savedMemberId = getMemberId(created)
      }

      // Update designated team if selected
      if (form.teamIdFk && savedMemberId) {
        const teamObj = teams.find((t) => Number(t.teamId) === Number(form.teamIdFk))
        if (teamObj) {
          await teamHook.update(teamObj.teamId, {
            teamName: teamObj.teamName,
            teamLeadId: Number(savedMemberId),
          })
          // Also add team assignment record if missing
          const existingIds = assignmentIdsForMember(savedMemberId, assignments)
          if (existingIds.length === 0) {
            await createTeamHook.create({
              teamIdFk: Number(teamObj.teamId),
              teamMemberIdFk: Number(savedMemberId),
              roleIdFk: Number(roleIdToUse),
            })
          }
        }
      }

      setModalOpen(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save Team Lead:', error)
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        'Unable to save Team Lead. Please check details.'
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteLead(member) {
    if (!confirm(`Delete Team Lead "${member.teamMemberName || member.teamMemberEmail}"?`)) return
    setSaving(true)
    try {
      const assignmentIds = assignmentIdsForMember(getMemberId(member), assignments)
      await Promise.all(assignmentIds.map((id) => createTeamHook.remove(id)))
      await teamMemberHook.remove(getMemberId(member))
      await loadData()
    } catch (error) {
      console.error('Failed to delete Team Lead:', error)
      alert('Unable to delete Team Lead.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team Leads Master</h1>
          <p className="text-sm text-gray-500">Select team members from master to assign as Team Lead and manage team rosters.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Icon name="mdi:plus" className="h-4 w-4" />
          Add / Assign Team Lead
        </button>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Total Team Leads</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{teamLeads.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Total Teams</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{teams.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Total Members Master</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{members.length}</p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="relative w-full sm:w-80">
        <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          placeholder="Search Team Leads or teams..."
          type="search"
        />
      </div>

      {/* Main Table */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading Team Leads...</div>
        ) : filteredTeamLeads.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No Team Leads found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Team Lead</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Assigned Team(s)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamLeads.map((member) => {
                  const linkedTeams = teamsForMember(getMemberId(member), teams, assignments)
                  const ledTeams = teams.filter((t) => Number(t.teamLeadId) === Number(getMemberId(member)))
                  const displayTeams = Array.from(new Set([...linkedTeams, ...ledTeams]))

                  return (
                    <tr key={getMemberId(member)} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                            <Icon name="mdi:star" className="h-4 w-4 text-purple-600" />
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">{member.teamMemberName || '-'}</p>
                            <p className="text-xs text-gray-500">{member.teamMemberEmail || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{member.teamMemberMobile || '-'}</td>
                      <td className="px-4 py-3">
                        {displayTeams.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {displayTeams.map((team) => (
                              <span key={team.teamId} className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-100">
                                {getTeamLabel(team)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned to team</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600" onClick={() => openEdit(member)} title="Edit Team Lead">
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteLead(member)} title="Delete Team Lead">
                            <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AppDrawer Modal */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Team Lead' : 'Assign Team Lead from Members'}
        subtitle={editingLead ? 'Update Team Lead information and assigned team' : 'Select an existing team member from master to designate as Team Lead'}
        icon="mdi:account-star-outline"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button form="team-lead-form" type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Team Lead'}
            </button>
          </>
        }
      >
        <form id="team-lead-form" onSubmit={saveLead} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!editingLead && (
              <label className="md:col-span-2 block rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-purple-800">
                  Select Team Member from Master *
                </span>
                <select
                  className="input-field bg-white"
                  value={form.selectedMemberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                >
                  <option value="">-- Choose Existing Team Member --</option>
                  {members.map((member) => (
                    <option key={getMemberId(member)} value={getMemberId(member)}>
                      {getMemberLabel(member)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-purple-600">
                  Selecting a member auto-fills their details and assigns them the Team Lead role.
                </p>
              </label>
            )}

            <label className="md:col-span-2 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Team Lead Name *</span>
              <input
                className="input-field"
                value={form.teamMemberName}
                onChange={(e) => updateField('teamMemberName', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                required
                autoFocus={!editingLead}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Email *</span>
              <input
                className="input-field"
                type="email"
                value={form.teamMemberEmail}
                onChange={(e) => updateField('teamMemberEmail', e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Mobile</span>
              <input
                className="input-field"
                value={form.teamMemberMobile}
                onChange={(e) => updateField('teamMemberMobile', e.target.value.replace(/[^0-9]/g, ''))}
              />
            </label>
            <label className="md:col-span-2 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Assign Team Lead To Team</span>
              <select
                className="input-field"
                value={form.teamIdFk}
                onChange={(e) => updateField('teamIdFk', e.target.value)}
              >
                <option value="">Select Team (Optional)</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {form.selectedMemberId || editingLead ? 'Password (leave blank to keep unchanged)' : 'Password *'}
              </span>
              <input
                className="input-field"
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required={!form.selectedMemberId && !editingLead}
              />
            </label>
          </div>
        </form>
      </AppDrawer>
    </div>
  )
}
