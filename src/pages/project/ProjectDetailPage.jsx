import GenericDetailPage from '../GenericDetailPage'
import { useProject } from '../../hooks/useProject'

export default function ProjectDetailPage() {
  const { getById } = useProject()
  return (
    <GenericDetailPage
      title="Project"
      backTo="/project"
      icon="mdi:clipboard-text-clock-outline"
      idLabel="Project"
      getById={getById}
      primaryKey="projectName"
      secondaryKey="organisationName"
      fields={[
        { label: 'Code', key: 'projectCode' },
        { label: 'Status', key: 'projectStatus' },
        { label: 'Start Date', key: 'projectStartDate' },
        { label: 'Forecast End', key: 'forecastCompletedDate' },
        { label: 'Completed Date', key: 'projectCompletedDate' },
        { label: 'Opportunity ID', key: 'oppIdFk' },
        { label: 'Description', key: 'projectDescription' },
      ]}
    />
  )
}
