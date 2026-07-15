import ModuleWorkspace from '../../components/module/ModuleWorkspace'
import { useEmail } from '../../hooks/useEmail'

const EMAIL_STATUSES = ['Sent', 'Read', 'Unread', 'Draft']

const EMAIL_STATUS_COLORS = {
  Sent: 'blue',
  Read: 'gray',
  Unread: 'indigo',
  Draft: 'yellow',
}

export default function EmailsPage() {
  const api = useEmail()

  const config = {
    title: 'Emails',
    singular: 'Email',
    subtitle: '',
    icon: 'mdi:email-multiple-outline',
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.id,
    primaryKey: 'subject',
    secondaryKey: 'from',
    statusKey: 'status',
    statusOptions: EMAIL_STATUSES,
    statusColors: EMAIL_STATUS_COLORS,
    searchKeys: ['subject', 'from', 'company', 'preview', 'linked'],
    columns: [
      { label: 'Subject', key: 'subject', strong: true, width: 'w-[28%]' },
      { label: 'From', key: 'from', width: 'w-[18%]' },
      { label: 'Company', key: 'company', width: 'w-[18%]' },
      { label: 'Status', key: 'status', status: true, width: 'w-[12%]' },
      { label: 'Linked', key: 'linked', width: 'w-[14%]' },
      { label: 'Time', key: 'time', width: 'w-[10%]' },
    ],
    formFields: [
      { name: 'firstName', label: 'Recipient First Name', required: true },
      { name: 'lastName', label: 'Recipient Last Name' },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'company', label: 'Company' },
      { name: 'subject', label: 'Subject', required: true },
      { name: 'message', label: 'Message', type: 'textarea', span: 2, rows: 4 },
      { name: 'status', label: 'Status', type: 'select', options: EMAIL_STATUSES, defaultValue: 'Sent' },
    ],
    toPayload: (form) => ({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      company: form.company,
      subject: form.subject,
      message: form.message,
      status: form.status,
    }),
  }

  return <ModuleWorkspace config={config} />
}
