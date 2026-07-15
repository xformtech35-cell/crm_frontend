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

const emptyMember = {
  teamMemberName: '',
  teamMemberEmail: '',
  teamMemberMobile: '',
  teamMemberRole: '',
  password: '',
}

export default function TeamMemberPage() {
  const teamMemberHook = useTeamMember()
  const teamHook = useTeam()
  const createTeamHook = useCreateTeam()
  const roleHook = useRole()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin())

  const [members, setMembers] = useState([])
  const [teams, setTeams] = useState([])
  const [assignments, setAssignments] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [form, setForm] = useState(emptyMember)

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
      console.error('Failed to load team members:', error)
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

  const getRoleName = (roleId) => {
    if (!roleId) return '-'
    const roleObj = roles.find((r) => r.roleId === roleId || r.roleId?.toString() === roleId?.toString())
    return roleObj ? roleObj.roleName : roleId
  }

  const filteredRoles = useMemo(() => {
    if (isSuperAdmin) return roles
    return roles.filter((r) => {
      const name = r.roleName?.toUpperCase()
      return name !== 'ADMIN' && name !== 'SUPER_ADMIN' && name !== 'SUPER ADMIN'
    })
  }, [roles, isSuperAdmin])

  const filteredMembers = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return members
    return members.filter((member) => {
      const linkedTeams = teamsForMember(getMemberId(member), teams, assignments)
      const roleName = getRoleName(member.teamMemberRole)
      return [getMemberLabel(member), member.teamMemberMobile, roleName, ...linkedTeams.map(getTeamLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text)
    })
  }, [assignments, members, query, teams, roles])

  function openCreate() {
    setEditingMember(null)
    setForm(emptyMember)
    setModalOpen(true)
  }

  function openEdit(member) {
    setEditingMember(member)
    setForm({
      teamMemberName: member.teamMemberName || '',
      teamMemberEmail: member.teamMemberEmail || '',
      teamMemberMobile: member.teamMemberMobile || '',
      teamMemberRole: member.teamMemberRole || '',
      password: '',
    })
    setModalOpen(true)
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toPayload() {
    return {
      teamMemberName: form.teamMemberName.trim(),
      teamMemberEmail: form.teamMemberEmail.trim(),
      teamMemberMobile: form.teamMemberMobile.trim(),
      teamMemberRole: form.teamMemberRole ? Number(form.teamMemberRole) : null,
      password: form.password,
    }
  }

  async function saveMember(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingMember) {
        await teamMemberHook.update(getMemberId(editingMember), toPayload())
      } else {
        await teamMemberHook.create(toPayload())
      }
      setModalOpen(false)
      await loadData()
    } catch (error) {
      console.error(error); 
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Something went wrong";

      alert(message);
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(member) {
    if (!confirm(`Delete team member "${member.teamMemberName || member.teamMemberEmail}"?`)) return
    setSaving(true)
    try {
      const assignmentIds = assignmentIdsForMember(getMemberId(member), assignments)
      await Promise.all(assignmentIds.map((id) => createTeamHook.remove(id)))
      await teamMemberHook.remove(getMemberId(member))
      await loadData()
    } catch (error) {
      console.error('Failed to delete team member:', error)
      alert('Unable to delete team member.')
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
            placeholder="Search members or teams"
            type="search"
          />
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Icon name="mdi:plus" className="h-4 w-4" />
          New Team Member
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="Members" value={members.length} />
        <Stat label="Assigned" value={new Set(assignments.map((item) => item.teamMemberIdFk).filter(Boolean)).size} />
        <Stat label="Teams" value={teams.length} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading team members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No team members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Teams</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const linkedTeams = teamsForMember(getMemberId(member), teams, assignments)
                  return (
                    <tr key={getMemberId(member)} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{member.teamMemberName || '-'}</p>
                        <p className="text-xs text-gray-500">{member.teamMemberEmail || '-'}</p>
                      </td>
                      <td className="px-4 py-3">{member.teamMemberMobile || '-'}</td>
                      <td className="px-4 py-3">{getRoleName(member.teamMemberRole)}</td>
                      <td className="px-4 py-3">
                        {linkedTeams.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedTeams.map((team) => (
                              <span key={team.teamId} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {getTeamLabel(team)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(member)} title="Edit member">
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteMember(member)} title="Delete member">
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
        title={editingMember ? 'Edit Team Member' : 'Create Team Member'}
        subtitle={editingMember ? 'Update team member information' : 'Register a new team member and assign role'}
        icon="mdi:account-outline"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button form="team-member-form" type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Member'}
            </button>
          </>
        }
      >
        <form id="team-member-form" onSubmit={saveMember} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name *" span>
              <input className="input-field" value={form.teamMemberName} onChange={(e) => updateField('teamMemberName', e.target.value.replace(/[^a-zA-Z\s]/g, ""))} required autoFocus />
            </Field>
            <Field label="Email *">
              <input className="input-field" type="email" value={form.teamMemberEmail} onChange={(e) => updateField('teamMemberEmail', e.target.value)} required />
            </Field>
            <Field label="Mobile">
              <input className="input-field" value={form.teamMemberMobile} onChange={(e) => updateField('teamMemberMobile', e.target.value.replace(/[^0-9]/g, ""))} />
            </Field>
            <Field label="Role">
              <select className="input-field" value={form.teamMemberRole} onChange={(e) => updateField('teamMemberRole', e.target.value)}>
                <option value="">Select Role</option>
                {filteredRoles.map((role) => (
                  <option key={role.roleId} value={role.roleId}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={editingMember ? 'Password (leave blank to keep unchanged)' : 'Password *'}>
              <input className="input-field" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} required={!editingMember} />
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

function Field({ label, children, span }) {
  return (
    <label className={span ? 'md:col-span-2' : ''}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
