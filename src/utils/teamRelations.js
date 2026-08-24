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

  return members.filter((member) => {
    const mId = Number(getMemberId(member));
    if (selectedIds.has(mId)) return true;
    if (member?.teamIdFk != null && Number(member.teamIdFk) === Number(teamId)) return true;
    return false;
  })
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

export function teamsForMember(memberId, teams, assignments, memberObj) {
  const selectedIds = new Set(
    assignments
      .filter((assignment) => Number(getAssignmentMemberId(assignment)) === Number(memberId))
      .map((assignment) => Number(getAssignmentTeamId(assignment))),
  )

  return teams.filter((team) => {
    const tId = Number(getTeamId(team));
    if (selectedIds.has(tId)) return true;
    if (team?.teamLeadId != null && Number(team.teamLeadId) === Number(memberId)) return true;
    if (memberObj?.teamIdFk != null && Number(memberObj.teamIdFk) === Number(tId)) return true;
    return false;
  })
}

export function groupMembersByTeam(teams = [], members = [], assignments = []) {
  const assignedMemberIds = new Set();
  const groupedTeams = [];

  teams.forEach((team) => {
    const tId = Number(getTeamId(team));
    const mForTeam = membersForTeam(tId, members, assignments);
    if (mForTeam.length > 0) {
      groupedTeams.push({
        team,
        members: mForTeam,
      });
      mForTeam.forEach((m) => assignedMemberIds.add(Number(getMemberId(m))));
    }
  });

  const unassigned = members.filter((m) => !assignedMemberIds.has(Number(getMemberId(m))));

  return {
    groupedTeams,
    unassigned,
  };
}
