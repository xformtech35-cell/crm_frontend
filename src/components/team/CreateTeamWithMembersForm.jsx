// src/components/team/CreateTeamWithMembersForm.jsx
import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon';

export default function CreateTeamWithMembersForm({ 
  teamHook, 
  teamMemberHook, 
  createTeamHook,
  onSuccess, 
  onCancel 
}) {
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => new Set());
  const [teamData, setTeamData] = useState({
    teamName: '',
  });

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setMembersLoading(true);
      try {
        const data = await teamMemberHook.getAll();
        if (active) setAvailableMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load team members:', error);
        if (active) setAvailableMembers([]);
      } finally {
        if (active) setMembersLoading(false);
      }
    }

    loadMembers();
    return () => {
      active = false;
    };
  }, [teamMemberHook]);

  const selectedMembers = useMemo(
    () => availableMembers.filter((member) => selectedMemberIds.has(member.teamMemberId)),
    [availableMembers, selectedMemberIds],
  );

  const unselectedMembers = useMemo(
    () => availableMembers.filter((member) => !selectedMemberIds.has(member.teamMemberId)),
    [availableMembers, selectedMemberIds],
  );

  const addSelectedMember = () => {
    const memberId = Number(memberToAdd);
    if (!memberId) return;
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      next.add(memberId);
      return next;
    });
    setMemberToAdd('');
  };

  const removeMember = (memberId) => {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      next.delete(memberId);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamData.teamName.trim()) {
      alert('Team name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the team
      const team = await teamHook.create({
        teamName: teamData.teamName.trim(),
      });
      console.log('Team created:', team);
      
      // Assign selected existing members to the new team.
      const failedMembers = [];
      for (const member of selectedMembers) {
        try {
          await createTeamHook.create({
            teamIdFk: team.teamId,
            teamMemberIdFk: member.teamMemberId,
            roleIdFk: member.teamMemberRole ? Number(member.teamMemberRole) : null,
          });
          console.log(`Member ${member.teamMemberEmail} assigned successfully`);
        } catch (error) {
          console.error(`Failed to assign member ${member.teamMemberEmail}:`, error);
          failedMembers.push(member.teamMemberEmail || member.teamMemberName);
        }
      }
      
      // Show result
      if (failedMembers.length > 0) {
        alert(`Team "${team.teamName}" created!\n\nBut ${failedMembers.length} member(s) failed: ${failedMembers.join(', ')}\n\nYou can add them later.`);
      } else if (selectedMembers.length > 0) {
        alert(`Success! Team "${team.teamName}" created with ${selectedMembers.length} member(s)!`);
      } else {
        alert(`Success! Team "${team.teamName}" created!`);
      }
      
      onSuccess(team);
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('Failed to create team. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Team Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              required
              value={teamData.teamName}
              onChange={(e) => setTeamData({ ...teamData, teamName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Engineering Team"
              autoFocus
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Select Team Members
        </h3>
        <div className="rounded-lg border bg-gray-50 p-4">
          {membersLoading ? (
            <div className="text-center text-sm text-gray-500">Loading members...</div>
          ) : availableMembers.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              No team members found. Add members from the Team Member page first.
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Team Member
              </label>
              <div className="flex gap-2">
                <select
                  value={memberToAdd}
                  onChange={(e) => setMemberToAdd(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team member</option>
                  {unselectedMembers.map((member) => (
                    <option key={member.teamMemberId} value={member.teamMemberId}>
                      {member.teamMemberName || member.teamMemberEmail}
                      {member.teamMemberEmail ? ` - ${member.teamMemberEmail}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addSelectedMember}
                  disabled={!memberToAdd}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="mdi:plus" className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mt-4">
              <h4 className="font-medium text-gray-700">
                Selected members ({selectedMembers.length})
              </h4>
              <button
                type="button"
                onClick={() => setSelectedMemberIds(new Set())}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {selectedMembers.map((member) => (
                <div key={member.teamMemberId} className="flex justify-between items-center p-2 bg-white border rounded">
                  <div>
                    <p className="font-medium">{member.teamMemberName || member.teamMemberEmail}</p>
                    <p className="text-xs text-gray-500">{member.teamMemberEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(member.teamMemberId)}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : `Create Team ${selectedMembers.length > 0 ? `(+${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </form>
  );
}
