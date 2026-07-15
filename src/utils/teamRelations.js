export function getTeamId(team) {
  return team?.teamId ?? team?.id
}

export function getMemberId(member) {
  return member?.teamMemberId ?? member?.id
}

export function getAssignmentTeamId(assignment) {
  return assignment?.teamIdFk ?? assignment?.teamId
}

export function getAssignmentMemberId(assignment) {
  return assignment?.teamMemberIdFk ?? assignment?.teamMemberId
}

export function getMemberLabel(member) {
  if (!member) return '-'
  const name = member.teamMemberName || member.name || member.teamMemberEmail || member.email
  const email = member.teamMemberEmail || member.email
  return email && email !== name ? `${name} - ${email}` : name || '-'
}

export function getTeamLabel(team) {
  return team?.teamName || team?.name || '-'
}

export function membersForTeam(teamId, members, assignments) {
  const selectedIds = new Set(
    assignments
      .filter((assignment) => Number(getAssignmentTeamId(assignment)) === Number(teamId))
      .map((assignment) => Number(getAssignmentMemberId(assignment))),
  )

  return members.filter((member) => selectedIds.has(Number(getMemberId(member))))
}

export function assignmentIdsForTeam(teamId, assignments) {
  return assignments
    .filter((assignment) => Number(getAssignmentTeamId(assignment)) === Number(teamId))
    .map((assignment) => assignment.createTeamId)
    .filter(Boolean)
}

export function assignmentIdsForMember(memberId, assignments) {
  return assignments
    .filter((assignment) => Number(getAssignmentMemberId(assignment)) === Number(memberId))
    .map((assignment) => assignment.createTeamId)
    .filter(Boolean)
}

export function teamsForMember(memberId, teams, assignments) {
  const selectedIds = new Set(
    assignments
      .filter((assignment) => Number(getAssignmentMemberId(assignment)) === Number(memberId))
      .map((assignment) => Number(getAssignmentTeamId(assignment))),
  )

  return teams.filter((team) => selectedIds.has(Number(getTeamId(team))))
}
