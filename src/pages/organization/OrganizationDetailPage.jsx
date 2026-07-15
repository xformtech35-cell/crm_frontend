import GenericDetailPage from '../GenericDetailPage'
import { useOrganization } from '../../hooks/useOrganization'

export default function OrganizationDetailPage() {
  const { getById } = useOrganization()
  return (
    <GenericDetailPage
      title="Organization"
      backTo="/organization"
      icon="mdi:office-building-outline"
      idLabel="Organization"
      getById={getById}
      primaryKey="organizationName"
      secondaryKey="organizationEmail"
      fields={[
        { label: 'Mobile', key: 'organizationMoblieNo' },
        { label: 'City', key: 'organizationCity' },
        { label: 'State', key: 'organizationState' },
        { label: 'Country', key: 'organizationCountry' },
        { label: 'Postcode', key: 'organizationPostcode' },
        { label: 'Occasion', key: 'organizationOccasion' },
        { label: 'Address', key: 'organizationAddress' },
        { label: 'Background', key: 'organizationBackground' },
      ]}
    />
  )
}
