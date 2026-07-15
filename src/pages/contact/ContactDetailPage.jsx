import GenericDetailPage from '../GenericDetailPage'
import { useContact } from '../../hooks/useContact'

export default function ContactDetailPage() {
  const { getById } = useContact()
  return (
    <GenericDetailPage
      title="Contact"
      backTo="/contact"
      icon="mdi:card-account-phone-outline"
      idLabel="Contact"
      getById={getById}
      primaryKey="contactName"
      secondaryKey="contactEmail"
      fields={[
        { label: 'Mobile', key: 'contactMobileNo' },
        { label: 'Phone', key: 'contactPhoneNo' },
        { label: 'City', key: 'contactCity' },
        { label: 'State', key: 'contactState' },
        { label: 'Country', key: 'contactCountry' },
        { label: 'Postal Code', key: 'contactPostalCode' },
        { label: 'Address', key: 'contactAddress' },
        { label: 'Occasion', key: 'contactOccasion' },
      ]}
    />
  )
}
