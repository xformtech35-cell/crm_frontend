import GenericDetailPage from '../GenericDetailPage'
import { useTeam } from '../../hooks/useTeam'

export default function TeamDetailPage() {
  const { getById } = useTeam()
  return (
    <GenericDetailPage
      title="Team"
      backTo="/team"
      icon="mdi:account-group-outline"
      idLabel="Team"
      getById={getById}
      primaryKey="teamName"
      secondaryKey="teamId"
      fields={[
        { label: 'Team ID', key: 'teamId' },
        { label: 'Team Name', key: 'teamName' },
      ]}
    />
  )
}
