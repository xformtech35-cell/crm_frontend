import { useEffect, useMemo, useState } from 'react'
import AppDrawer from '../../components/common/AppDrawer'
import Icon from '../../components/Icon'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useTeam } from '../../hooks/useTeam'
import { useTeamMember } from '../../hooks/useTeamMember'
import {
  assignmentIdsForTeam,
  getMemberId,
  getMemberLabel,
  getTeamId,
  getTeamLabel,
  membersForTeam,
} from '../../utils/teamRelations'

const emptyForm = { teamName: '', memberToAdd: '', memberIds: [] }

export default function TeamPage() {
  const teamHook = useTeam()
  const teamMemberHook = useTeamMember()
  const createTeamHook = useCreateTeam()
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [form, setForm] = useState(emptyForm)

  async function loadData() {
    setLoading(true)
    try {
      const [teamData, memberData, assignmentData] = await Promise.all([
        teamHook.getAll(),
        teamMemberHook.getAll(),
        createTeamHook.getAll(),
      ])
      setTeams(Array.isArray(teamData) ? teamData : [])
      setMembers(Array.isArray(memberData) ? memberData : [])
      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
    } catch (error) {
      console.error('Failed to load teams:', error)
      setTeams([])
      setMembers([])
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTeams = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return teams
    return teams.filter((team) => {
      const teamMembers = membersForTeam(getTeamId(team), members, assignments)
      return [getTeamLabel(team), ...teamMembers.map(getMemberLabel)]
        .join(' ')
        .toLowerCase()
        .includes(text)
    })
  }, [assignments, members, query, teams])

  const selectedMembers = useMemo(
    () => members.filter((member) => form.memberIds.includes(Number(getMemberId(member)))),
    [form.memberIds, members],
  )

  const availableMembers = useMemo(
    () => members.filter((member) => !form.memberIds.includes(Number(getMemberId(member)))),
    [form.memberIds, members],
  )

  function openCreate() {
    setEditingTeam(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(team) {
    const teamId = getTeamId(team)
    setEditingTeam(team)
    setForm({
      teamName: getTeamLabel(team),
      memberToAdd: '',
      memberIds: membersForTeam(teamId, members, assignments).map((member) => Number(getMemberId(member))),
    })
    setModalOpen(true)
  }

  function addMember() {
    const memberId = Number(form.memberToAdd)
    if (!memberId) return
    setForm((current) => ({
      ...current,
      memberToAdd: '',
      memberIds: [...current.memberIds, memberId],
    }))
  }

  function removeMember(memberId) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.filter((id) => id !== Number(memberId)),
    }))
  }

  async function syncTeamMembers(teamId, memberIds) {
    const existingAssignmentIds = assignmentIdsForTeam(teamId, assignments)
    await Promise.all(existingAssignmentIds.map((id) => createTeamHook.remove(id)))
    await Promise.all(
      memberIds.map((memberId) => {
        const member = members.find((item) => Number(getMemberId(item)) === Number(memberId))
        return createTeamHook.create({
          teamIdFk: teamId,
          teamMemberIdFk: memberId,
          roleIdFk: member?.teamMemberRole ? Number(member.teamMemberRole) : null,
        })
      }),
    )
  }

  async function saveTeam(e) {
    e.preventDefault()
    const teamName = form.teamName.trim()
    if (!teamName) return
    setSaving(true)
    try {
      const team = editingTeam
        ? await teamHook.update(getTeamId(editingTeam), { teamName })
        : await teamHook.create({ teamName })
      await syncTeamMembers(getTeamId(team), form.memberIds)
      setModalOpen(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save team:', error)
      alert('Unable to save team. Please check the details and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTeam(team) {
    if (!confirm(`Delete team "${getTeamLabel(team)}"?`)) return
    setSaving(true)
    try {
      await syncTeamMembers(getTeamId(team), [])
      await teamHook.remove(getTeamId(team))
      await loadData()
    } catch (error) {
      console.error('Failed to delete team:', error)
      alert('Unable to delete team.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Search teams or members"
            type="search"
          />
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Icon name="mdi:plus" className="h-4 w-4" />
          New Team
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Teams</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{teams.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Team Members</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{members.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Assignments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{assignments.length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading teams...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No teams found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => {
                  const teamMembers = membersForTeam(getTeamId(team), members, assignments)
                  return (
                    <tr key={getTeamId(team)} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{getTeamLabel(team)}</p>
                        <p className="text-xs text-gray-400">Team #{getTeamId(team)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {teamMembers.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {teamMembers.map((member) => (
                              <span key={getMemberId(member)} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {member.teamMemberName || member.teamMemberEmail}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No members assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(team)} title="Edit team">
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteTeam(team)} title="Delete team">
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

      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeam ? 'Edit Team' : 'Create New Team'}
        subtitle={editingTeam ? 'Update team name and members' : 'Create a new team and add members'}
        icon="mdi:account-group-outline"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button form="team-form" type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Team'}
            </button>
          </>
        }
      >
        <form id="team-form" onSubmit={saveTeam} className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Team Name *</span>
            <input
              value={form.teamName}
              onChange={(e) => setForm((current) => ({ ...current, teamName: e.target.value.replace(/[^a-zA-Z]/g, "") }))}
              className="input-field"
              required
              autoFocus
            />
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Add Team Member</label>
            <div className="flex gap-2">
              <select
                value={form.memberToAdd}
                onChange={(e) => setForm((current) => ({ ...current, memberToAdd: e.target.value }))}
                className="input-field"
              >
                <option value="">Select team member</option>
                {availableMembers.map((member) => (
                  <option key={getMemberId(member)} value={getMemberId(member)}>
                    {getMemberLabel(member)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addMember} disabled={!form.memberToAdd} className="btn-primary shrink-0 disabled:opacity-50">
                <Icon name="mdi:plus" className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100">
            <div className="border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
              Selected Members ({selectedMembers.length})
            </div>
            {selectedMembers.length ? (
              <div className="max-h-56 overflow-y-auto p-2">
                {selectedMembers.map((member) => (
                  <div key={getMemberId(member)} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{member.teamMemberName || member.teamMemberEmail}</p>
                      <p className="truncate text-xs text-gray-500">{member.teamMemberEmail}</p>
                    </div>
                    <button type="button" onClick={() => removeMember(getMemberId(member))} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Icon name="mdi:close" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">No members selected.</div>
            )}
          </div>
        </form>
      </AppDrawer>
    </div>
  )
}
